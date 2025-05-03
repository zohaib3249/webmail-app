# services/gmail_service.py

import base64
import email
import datetime
from email.mime.application import MIMEApplication

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from django.conf import settings
from django.utils import timezone

class GmailService:
    def __init__(self, config):
        self.config = config
        self.service = self.connect()

    def connect(self):
        if not self.config.oauth_token or not self.config.refresh_token:
            raise ValueError("Gmail OAuth tokens are missing")

        credentials = Credentials(
            token=self.config.oauth_token,
            refresh_token=self.config.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=[
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.send"
            ]
        )
        try:
            service = build('gmail', 'v1', credentials=credentials)
            return service
        except Exception as e:
            raise Exception(f"Failed to connect to Gmail API: {str(e)}")

    def fetch_new_emails_for_alias(self, alias, minutes=5):
        """Fetch new emails only related to alias within X minutes."""
        now = timezone.now()
        min_date = now - datetime.timedelta(minutes=minutes)

        result = self.service.users().messages().list(
            userId='me',
            labelIds=['INBOX'],
            q=f"after:{int(min_date.timestamp())}",
            maxResults=50,
        ).execute()

        messages = result.get('messages', [])
        parsed_emails = []

        for message in messages:
            msg_detail = self.service.users().messages().get(
                userId='me',
                id=message['id'],
                format='full'
            ).execute()

            parsed_email = self._parse_email(msg_detail)

            if parsed_email['date'] >= min_date:
                # 👇 Match From / To / Cc / Bcc to alias email
                emails_involved = []

                if parsed_email.get('from'):
                    emails_involved.append(parsed_email['from']['email'].lower())
                emails_involved += [p['email'].lower() for p in parsed_email.get('to', [])]
                emails_involved += [p['email'].lower() for p in parsed_email.get('cc', [])]
                emails_involved += [p['email'].lower() for p in parsed_email.get('bcc', [])]

                if alias.email.lower() in emails_involved:
                    parsed_emails.append(parsed_email)

        return parsed_emails

    def fetch_new_emails_for_alias(self, alias, minutes=5):
        """Fetch new emails only related to alias within X minutes."""
        now = timezone.now()
        min_date = now - datetime.timedelta(minutes=minutes)

        self.connection.select('INBOX')
        typ, data = self.connection.search(None, 'ALL')
        email_ids = data[0].split()

        parsed_emails = []

        for eid in reversed(email_ids):
            typ, msg_data = self.connection.fetch(eid, '(RFC822)')
            if typ != 'OK':
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            parsed_email = self._parse_email(msg)

            if parsed_email['date'] >= min_date:
                # 👇 Match From / To / Cc / Bcc to alias email
                emails_involved = []

                if parsed_email.get('from'):
                    emails_involved.append(parsed_email['from']['email'].lower())
                emails_involved += [p['email'].lower() for p in parsed_email.get('to', [])]
                emails_involved += [p['email'].lower() for p in parsed_email.get('cc', [])]
                emails_involved += [p['email'].lower() for p in parsed_email.get('bcc', [])]

                if alias.email.lower() in emails_involved:
                    parsed_emails.append(parsed_email)

        return parsed_emails

    def fetch_emails(self, max_results=100):
        """Fetch emails from Gmail and return parsed structured list."""
        result = self.service.users().messages().list(
            userId='me',
            labelIds=['INBOX'],
            maxResults=max_results
        ).execute()

        messages = result.get('messages', [])
        parsed_emails = []

        for message in messages:
            msg_detail = self.service.users().messages().get(
                userId='me',
                id=message['id'],
                format='full'
            ).execute()

            parsed_email = self._parse_email(msg_detail)
            parsed_emails.append(parsed_email)

        return parsed_emails

    def _parse_email(self, msg):
        """Parse a single Gmail API message into our standard dict."""
        headers = msg['payload'].get('headers', [])
        header_dict = {h['name'].lower(): h['value'] for h in headers}

        external_id = msg.get('id')
        subject = header_dict.get('subject', '(No Subject)')
        thread_id = msg.get('threadId', '')

        date_str = header_dict.get('date', '')
        try:
            parsed_date = email.utils.parsedate_to_datetime(date_str)
        except:
            parsed_date = timezone.now()

        from_field = header_dict.get('from', '')
        to_field = header_dict.get('to', '')
        cc_field = header_dict.get('cc', '')
        bcc_field = header_dict.get('bcc', '')

        body_text = ''
        body_html = ''
        attachments = []

        parts = [msg['payload']]
        while parts:
            part = parts.pop(0)

            if 'parts' in part:
                parts.extend(part['parts'])

            if 'body' in part and 'data' in part['body']:
                mime_type = part.get('mimeType', '')
                body_data = part['body']['data']
                decoded_body = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')

                if mime_type == 'text/plain':
                    body_text = decoded_body
                elif mime_type == 'text/html':
                    body_html = decoded_body

            # Handle attachments
            if 'filename' in part and part.get('filename', ''):
                filename = part['filename']
                if 'body' in part and 'attachmentId' in part['body']:
                    attachment_id = part['body']['attachmentId']
                    attachment_detail = self.service.users().messages().attachments().get(
                        userId='me',
                        messageId=external_id,
                        id=attachment_id
                    ).execute()
                    attachment_data = base64.urlsafe_b64decode(attachment_detail['data'])

                    attachments.append({
                        'filename': filename,
                        'content_type': part.get('mimeType', 'application/octet-stream'),
                        'content': attachment_data
                    })

        return {
            'external_id': external_id,
            'subject': subject,
            'date': parsed_date,
            'thread_id': thread_id,
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

    def send_email(self, from_alias, subject, body_text, body_html, to_recipients, cc_recipients=None, bcc_recipients=None, attachments=None):
        """Send email using Gmail API."""
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = from_alias.email
        message['To'] = ', '.join(to_recipients)

        if cc_recipients:
            message['Cc'] = ', '.join(cc_recipients)

        if body_text:
            message.attach(MIMEText(body_text, 'plain'))
        if body_html:
            message.attach(MIMEText(body_html, 'html'))

        # Attachments
        attachments = attachments or []
        for attachment in attachments:
            part = MIMEApplication(attachment['content'])
            part.add_header('Content-Disposition', 'attachment', filename=attachment['filename'])
            part.add_header('Content-Type', attachment['content_type'])
            message.attach(part)

        raw_message = base64.urlsafe_b64encode(message.as_string().encode('utf-8')).decode('utf-8')

        try:
            self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to send email via Gmail API: {str(e)}")
