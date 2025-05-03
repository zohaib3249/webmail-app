from celery import shared_task
from celery.schedules import crontab
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404


from .models import EmailConfiguration, EmailAlias, EmailMessage, EmailParticipant, EmailAttachment
from .services import IMAPService, GmailService, MailService
# tasks/email_tasks.py
from celery import shared_task
from django.utils import timezone
from django.shortcuts import get_object_or_404

User = get_user_model()


@shared_task
def fetch_emails():
    """
    Task to fetch emails for all users with active email configurations
    """
    for config in EmailConfiguration.objects.filter(is_active=True):
        try:
            user = config.user
            client = MailService(config)
            client.sync_all_emails()
        except Exception as e:
            print(f"Error fetching emails for {config.user.email}: {str(e)}")
    
    return "Email fetch completed"


@shared_task
def send_email_by_id_task(email_id):
    """
    Send an email based on a saved EmailMessage.
    Update status accordingly (SENT or FAILED).
    """
    email_message = get_object_or_404(EmailMessage, id=email_id)

    if not email_message.configuration or not email_message.user:
        raise Exception("Configuration or alias missing for email.")

    # 🧹 Mark as "Pending Sending"
    email_message.status = 'PENDING'
    email_message.save(update_fields=['status'])

    try:
        # 🛠 Setup
        config = email_message.configuration

        # 🛫 Choose correct service
        service = MailService(config)
        service.compose_mail(email_message)

        # ✅ Success
        email_message.status = 'SENT'
        email_message.date = timezone.now()
        email_message.save(update_fields=['status', 'date'])

        return f"Email {email_id} sent successfully."

    except Exception as e:
        # ❌ Failure
        email_message.status = 'FAILED'
        email_message.save(update_fields=['status'])
        raise Exception(f"Failed to send email {email_id}: {str(e)}")
