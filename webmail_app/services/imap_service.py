# services/imap_service.py

import imaplib
import email
import datetime
import smtplib
import ssl
import uuid
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.utils import timezone


class IMAPService:
    def __init__(self, config):
        self.config = config
        self.connection = self.connect()

    def connect(self):
        if not self.config.imap_server or not self.config.username or not self.config.password:
            raise ValueError("IMAP configuration is incomplete")

        try:
            if self.config.imap_use_ssl:
                imap = imaplib.IMAP4_SSL(self.config.imap_server, self.config.imap_port or 993)
            else:
                imap = imaplib.IMAP4(self.config.imap_server, self.config.imap_port or 143)

            imap.login(self.config.username, self.config.password)
            return imap
        except Exception as e:
            raise Exception(f"Failed to connect to IMAP server: {str(e)}")

    def fetch_emails(self, minutes: int = None, ):
        """Fetch emails from all main folders (Inbox + Sent) and return parsed structured list."""
        folders = self.list_folders()
        # We only care about folders related to INBOX and SENT
        interesting_folders = [folder for folder in folders if any(
            keyword in folder.lower() for keyword in ['inbox', 'sent'])]

        parsed_emails = []
        if minutes:
            cutoff_time = timezone.now() - datetime.timedelta(minutes=minutes)
            imap_date = cutoff_time.strftime("%d-%b-%Y")  # e.g., "27-Apr-2025"
            search_criteria = f'SINCE {imap_date}'
            interesting_folders = ['inbox']

        else:
            search_criteria = 'ALL'

        for folder in interesting_folders:
            try:
                typ, _ = self.connection.select(folder)
                if typ != 'OK':
                    continue

                typ, data = self.connection.search(None, search_criteria)
                if typ != 'OK':
                    continue
                email_ids = data[0].split()
                for eid in reversed(email_ids):  # Get latest emails first
                    typ, msg_data = self.connection.fetch(eid, '(RFC822)')
                    if typ != 'OK':
                        continue
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    parsed_email = self._parse_email(msg)
                    parsed_emails.append(parsed_email)

            except Exception as e:
                continue  # Skip folder if error

        return parsed_emails

    def list_folders(self):
        """List all folders (mailboxes) available on the IMAP server."""
        typ, data = self.connection.list()
        if typ != 'OK':
            raise Exception("Failed to list folders.")

        folders = []
        for item in data:
            parts = item.decode().split(' "/" ')
            if len(parts) == 2:
                folder_name = parts[1].strip('"')
                folders.append(folder_name)

        return folders

    def fetch_new_emails_for_alias(self, alias, minutes=10):
        """Fetch only new emails for the given alias within last X minutes, from both Inbox and Sent."""
        folders = self.list_folders()

        # We only care about folders related to INBOX and SENT
        interesting_folders = [folder for folder in folders if any(
            keyword in folder.lower() for keyword in ['inbox', 'sent'])]

        cutoff_time = timezone.now() - datetime.timedelta(minutes=minutes)
        imap_date = cutoff_time.strftime("%d-%b-%Y")

        alias_email = alias.email.lower()
        parsed_emails = []

        for folder in interesting_folders:
            try:
                typ, _ = self.connection.select(folder)
                if typ != 'OK':
                    continue  # Folder might not exist

                typ, data = self.connection.search(None, f'SINCE {imap_date}')
                if typ != 'OK':
                    continue

                email_ids = data[0].split()

                for eid in reversed(email_ids):
                    typ, msg_data = self.connection.fetch(eid, '(RFC822)')
                    if typ != 'OK':
                        continue

                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)

                    parsed_email = self._parse_email(msg)
                    # 📌 Match alias in participants
                    if self._email_matches_alias(parsed_email, alias_email):
                        parsed_emails.append(parsed_email)

            except Exception as e:
                # Skip folder if error occurs
                continue

        return parsed_emails

    def _email_matches_alias(self, parsed_email, alias_email):
        """Helper to check if alias email is involved in parsed email."""
        participants = []

        if parsed_email.get('from'):
            participants.append(parsed_email['from']['email'].lower())

        for role in ['to', 'cc', 'bcc']:
            for recipient in parsed_email.get(role, []):
                participants.append(recipient['email'].lower())

        return alias_email in participants

    def _parse_email(self, msg):
        """Parse a single IMAP email into our standard dict."""
        message_id = msg.get('Message-ID', '')
        subject = msg.get('Subject', '(No Subject)')
        thread_id = msg.get('Thread-Index', '')  # IMAP doesn't have thread ID, fallback to Message-ID
        references = msg.get('References', '')  # IMAP doesn't have thread ID, fallback to Message-ID
        thread_id = thread_id or references or message_id
        in_reply_to = msg.get('In-Reply-To', '')  # 🧠 New addition
        date_str = msg.get('Date', '')
        try:
            parsed_date = email.utils.parsedate_to_datetime(date_str)
        except:
            parsed_date = timezone.now()

        from_field = msg.get('From', '')
        to_field = msg.get('To', '')
        cc_field = msg.get('Cc', '')
        bcc_field = msg.get('Bcc', '')

        body_text = ''
        body_html = ''
        attachments = []

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                if "attachment" not in content_disposition:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or 'utf-8'
                        decoded = payload.decode(charset, errors='ignore')

                        if content_type == "text/plain":
                            body_text = decoded
                        elif content_type == "text/html":
                            body_html = decoded
                else:
                    filename = part.get_filename()
                    if filename:
                        payload = part.get_payload(decode=True)
                        if payload:
                            attachments.append({
                                'filename': filename,
                                'content_type': part.get_content_type() or 'application/octet-stream',
                                'content': payload
                            })
        else:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or 'utf-8'
            if payload:
                body_text = payload.decode(charset, errors='ignore')

        return {
            'external_id': message_id,
            'subject': subject,
            'date': parsed_date,
            'thread_id': thread_id,
            'in_reply_to': in_reply_to,
            'from': self._parse_addresses(from_field)[0] if from_field else None,
            'to': self._parse_addresses(to_field),
            'cc': self._parse_addresses(cc_field),
            'bcc': self._parse_addresses(bcc_field),
            'body_text': body_text,
            'body_html': body_html,
            'attachments': attachments,
        }

    def _parse_addresses(self, header_value):
        """Parse email addresses from header."""
        addresses = email.utils.getaddresses([header_value])
        return [{'name': name, 'email': address} for name, address in addresses if address]

    def send_email(self, email_message, domain):
        """Send an EmailMessage object via SMTP, managing Message-ID, In-Reply-To, References properly."""

        if not self.config.smtp_server or not self.config.username or not self.config.password:
            raise ValueError("SMTP configuration missing")

        alias = email_message.user
        if not alias:
            raise ValueError("Email alias missing for sending email")

        to_recipients = email_message.participants.filter(role='TO').values_list('email', flat=True)
        cc_recipients = email_message.participants.filter(role='CC').values_list('email', flat=True)
        bcc_recipients = email_message.participants.filter(role='BCC').values_list('email', flat=True)

        message = MIMEMultipart('alternative')
        message['Subject'] = email_message.subject or '(No Subject)'
        message['From'] = alias.email
        message['To'] = ', '.join(to_recipients)
        if cc_recipients:
            message['Cc'] = ', '.join(cc_recipients)

        # 🧠 Handle Message-ID
        if not email_message.external_id:
            # If no external_id yet, generate one
            message_id = f"<{uuid.uuid4()}@{domain}>"
            email_message.external_id = message_id
            email_message.save(update_fields=['external_id'])
        else:
            message_id = email_message.external_id
        message.add_header('Return-Path', alias.email)
        message.add_header('Message-ID', message_id)
        if not email_message.thread_id:
            email_message.thread_id = email_message.external_id
            email_message.save(update_fields=['thread_id'])

        # 🧠 Handle In-Reply-To and References
        if email_message.in_reply_to:
            in_reply_to_id = email_message.in_reply_to.external_id
            message.add_header('In-Reply-To', in_reply_to_id)
            message.add_header('References', in_reply_to_id)

        # ✍ Attach text and HTML
        if email_message.body_text:
            message.attach(MIMEText(email_message.body_text, 'plain'))
        if email_message.body_html:
            message.attach(MIMEText(email_message.body_html, 'html'))

        # ✍ Attachments
        for attachment in email_message.attachments.all():
            with attachment.file.open('rb') as f:
                part = MIMEApplication(f.read())
                part.add_header('Content-Disposition', 'attachment', filename=attachment.filename)
                part.add_header('Content-Type', attachment.content_type)
                message.attach(part)

        try:
            if self.config.smtp_use_ssl:
                server = smtplib.SMTP_SSL(self.config.smtp_server, self.config.smtp_port or 465)
            else:
                server = smtplib.SMTP(self.config.smtp_server, self.config.smtp_port or 25)
                server.starttls(context=ssl.create_default_context())

            server.login(self.config.username, self.config.password)
            all_recipients = list(to_recipients) + list(cc_recipients) + list(bcc_recipients)
            server.sendmail(alias.email, all_recipients, message.as_string())
            server.quit()
            self._save_to_sent_folder(message, alias)
            return True
        except Exception as e:
            raise Exception(f"Failed to send email via SMTP: {str(e)}")

    def _save_to_sent_folder(self, mime_message, alias):
        """Save the sent email manually into Sent Folder via IMAP."""
        import imaplib, time

        try:
            imap = imaplib.IMAP4_SSL(self.config.imap_server, self.config.imap_port or 993)
            imap.login(self.config.username, self.config.password)

            sent_folder = "Sent"
            typ, folders = imap.list()
            if folders:
                for folder in folders:
                    decoded_folder = folder.decode()
                    if "Sent" in decoded_folder or "Sent Items" in decoded_folder:
                        parts = decoded_folder.split(' "/" ')
                        if len(parts) == 2:
                            sent_folder = parts[1].strip('"')
                            break

            # Save the message
            raw_bytes = mime_message.as_bytes()
            imap.append(sent_folder, '', imaplib.Time2Internaldate(time.time()), raw_bytes)
            imap.logout()

        except Exception as e:
            raise Exception(f"Failed to save email to Sent folder: {str(e)}")
