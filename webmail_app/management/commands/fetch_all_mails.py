from django.core.management.base import BaseCommand
from webmail_app.models import EmailConfiguration
from webmail_app.services import connect_imap_account, connect_gmail_account, fetch_emails_for_user

class Command(BaseCommand):
    help = 'Fetch emails for all active configurations'

    def handle(self, *args, **kwargs):
        configs = EmailConfiguration.objects.filter(is_active=True)

        if not configs.exists():
            self.stdout.write(self.style.WARNING('No active email configurations found.'))
            return

        self.stdout.write(self.style.SUCCESS(f'Found {configs.count()} active configurations.'))

        for config in configs:
            self.stdout.write(self.style.NOTICE(f"Fetching emails for configuration ID {config.id} ({config.provider})..."))

            try:
                if config.provider == 'IMAP':
                    connection = connect_imap_account(config)
                    if connection:
                        count = fetch_emails_for_user(config.aliases.first(), config)
                        connection.logout()
                        self.stdout.write(self.style.SUCCESS(f"Fetched {count} emails via IMAP."))
                elif config.provider == 'GMAIL':
                    connection = connect_gmail_account(config)
                    if connection:
                        count = fetch_emails_for_user(config.aliases.first(), config)
                        # Gmail API might not need manual logout
                        self.stdout.write(self.style.SUCCESS(f"Fetched {count} emails via GMAIL."))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to fetch emails for configuration ID {config.id}: {str(e)}"))
