import datetime
import os
import logging
from django.core.files.base import ContentFile
from django.utils import timezone
from ..models import EmailAlias, EmailMessage, EmailParticipant, EmailAttachment
from .gmail_service import GmailService
from .imap_service import IMAPService

logger = logging.getLogger(__name__)

class MailService:
    def __init__(self, config):
        self.config = config
        self.domain = config.username.split('@')[-1].lower()

        if config.provider == 'GMAIL':
            self.service = GmailService(config)
        elif config.provider == 'IMAP':
            self.service = IMAPService(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")

        logger.info(f"[MailService] Initialized service for provider {config.provider}")

    def _get_or_create_alias(self, email_address):
        """Helper to find or create an alias based on email address."""
        domain = email_address.split('@')[-1].lower()

        if domain != self.domain:
            logger.debug(f"[MailService] Ignoring alias creation for external domain {email_address}")
            return None

        alias, created = EmailAlias.objects.get_or_create(
            email=email_address.lower(),
            defaults={
                'is_active': True,
                'configuration': self.config,
                'password': '',
                'display_name': '',
                'is_default': False
            }
        )
        if created:
            logger.info(f"[MailService] Created new alias for {email_address}")
        return alias

    def sync_all_emails(self, minutes=None):
        """Fetch all emails and create missing aliases properly."""
        emails = self.service.fetch_emails(minutes)
        inserted_count = 0
        alias_created_count = 0
        logger.info(f"[MailService] Fetched {len(emails)} emails to process.")

        for parsed in emails:
            if not parsed.get('external_id'):
                continue

            # Skip if external ID already exists
            if EmailMessage.objects.filter(external_id=parsed['external_id'], configuration=self.config).exists():
                continue

            # 1. Handle sender (SENT mail)
            sender = parsed.get('from')
            if sender and 'email' in sender:
                from_email = sender['email'].lower()
                if self.domain in from_email:
                    alias = self._get_or_create_alias(from_email)
                    if alias:
                        self._create_email(parsed, alias, status='SENT')
                        alias_created_count += 1
                        inserted_count += 1

            # 2. Handle recipients (RECEIVED mails)
            for field in ['to', 'cc', 'bcc']:
                for recipient in parsed.get(field, []):
                    recipient_email = recipient['email'].lower()
                    if self.domain in recipient_email:
                        alias = self._get_or_create_alias(recipient_email)
                        if alias:
                            self._create_email(parsed, alias, status='RECEIVED')
                            alias_created_count += 1
                            inserted_count += 1

        return {
            'inserted_emails': inserted_count,
            'aliases_created': alias_created_count
        }

    def sync_new_emails(self, alias, minutes=5):
        """Fetch only new incoming emails within last X minutes for a given alias."""
        now = timezone.now()
        window_start = now - datetime.timedelta(minutes=minutes)

        # Get the newest existing email for this alias
        latest_message = EmailMessage.objects.filter(
            configuration=self.config,
            user=alias
        ).order_by('-date').first()

        emails = self.service.fetch_new_emails_for_alias(alias)  # Pull from service (Gmail/IMAP)
        inserted_count = 0

        logger.info(f"[MailService] Fetched {len(emails)} emails for alias {alias.email}")
        new_mails = []
        for parsed in emails:
            # 🧹 Skip if no external_id
            if not parsed.get('external_id'):
                continue
            if EmailMessage.objects.filter(
                    external_id=parsed['external_id'],
                    configuration=self.config
            ).exists():
                continue

            status = self._detect_status(alias, parsed)
            message = self._create_email(parsed, alias, status=status)
            inserted_count += 1
            new_mails.append(message)
        return {
            'inserted_new_emails': inserted_count,
            "new_mails": new_mails
        }

    def _detect_status(self, alias, parsed):
        """Detect whether the email is SENT or RECEIVED based on alias."""
        sender = parsed.get('from')
        if sender and 'email' in sender:
            sender_email = sender['email'].lower()
            alias_email = alias.email.lower()
            if sender_email == alias_email:
                return 'SENT'
        return 'RECEIVED'

    def _create_email(self, parsed, alias, status):
        """Helper to create EmailMessage, Participants, and Attachments."""
        in_reply_to_id = None
        if parsed.get('in_reply_to'):
            try:
                replied_message = EmailMessage.objects.filter(
                    external_id=parsed['in_reply_to'],
                    configuration=self.config
                ).first()
                if replied_message:
                    in_reply_to_id = replied_message.id
            except Exception as e:
                logger.warning(f"[MailService] Failed to find in_reply_to message: {e}")

        message = EmailMessage.objects.create(
            external_id=parsed['external_id'],
            subject=parsed['subject'],
            date=parsed['date'],
            status=status,
            is_read=False,
            is_starred=False,
            is_spam=False,
            user=alias,
            in_reply_to_id=in_reply_to_id,
            configuration=self.config,
            thread_id=parsed.get('thread_id'),
            body_text=parsed.get('body_text', ''),
            body_html=parsed.get('body_html', ''),
        )

        logger.info(f"[MailService] Created EmailMessage ID {message.id} (status {status}) for alias {alias.email}")

        self._save_participants(message, parsed)
        self._save_attachments(message, parsed)
        return message

    def _save_participants(self, message, parsed):
        """Save email participants (FROM, TO, CC, BCC)."""
        if parsed.get('from'):
            EmailParticipant.objects.create(
                email_message=message,
                email=parsed['from']['email'],
                name=parsed['from'].get('name', ''),
                role='FROM'
            )

        for role, field in [('TO', 'to'), ('CC', 'cc'), ('BCC', 'bcc')]:
            for participant in parsed.get(field, []):
                EmailParticipant.objects.create(
                    email_message=message,
                    email=participant['email'],
                    name=participant.get('name', ''),
                    role=role
                )

    def _save_attachments(self, message, parsed):
        """Save email attachments."""
        now = timezone.now()

        for attachment in parsed.get('attachments', []):
            if not attachment.get('data'):
                logger.warning(f"[MailService] Attachment data missing for {attachment['filename']}")
                continue
            content_file = ContentFile(attachment['data'])

            attachment_record = EmailAttachment(
                email=message,
                filename=attachment['filename'],
                content_type=attachment.get('content_type', 'application/octet-stream'),
                size=attachment.get('size', len(attachment['data']))
            )

            file_path = f'email_attachments/{now.year}/{now.month}/{now.day}/{attachment["filename"]}'
            attachment_record.file.save(os.path.basename(file_path), content_file)
            attachment_record.save()

            logger.info(f"[MailService] Saved attachment {attachment_record.filename} for Email ID {message.id}")

    def compose_mail(self, email):
        self.service.send_email(email, self.domain)