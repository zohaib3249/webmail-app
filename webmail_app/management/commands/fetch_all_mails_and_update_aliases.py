# webmail_app/management/commands/fetch_all_emails.py

from django.core.management.base import BaseCommand
from webmail_app.models import EmailConfiguration
from webmail_app.services.mail_service import MailService
import traceback

class Command(BaseCommand):
    help = 'Fetch emails using configurations and create EmailAliases from sender if missing.'

    def handle(self, *args, **options):
        configs = EmailConfiguration.objects.filter(is_active=True)

        if not configs.exists():
            self.stdout.write(self.style.WARNING('No active email configurations found.'))
            return

        self.stdout.write(self.style.SUCCESS(f'Found {configs.count()} active configurations.'))

        for config in configs:
            try:
                self.stdout.write(self.style.NOTICE(f'Processing configuration {config.id} ({config.provider})'))

                mail_service = MailService(config)

                result = mail_service.sync_all_emails()

                self.stdout.write(self.style.SUCCESS(
                    f"Fetched {result['inserted_emails']} emails and created {result['aliases_created']} new aliases."
                ))

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'Error processing configuration {config.id}: {str(e)}'
                ))
                traceback.print_exc()
