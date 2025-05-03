
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _


class EmailConfiguration(models.Model):
    PROVIDER_CHOICES = [
        ('IMAP', 'IMAP/SMTP'),
        ('GMAIL', 'Google Mail'),
    ]
    
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES)
    is_active = models.BooleanField(default=True)
    
    # For IMAP/SMTP
    imap_server = models.CharField(max_length=255, blank=True, null=True)
    imap_port = models.PositiveIntegerField(blank=True, null=True)
    imap_use_ssl = models.BooleanField(default=True)
    smtp_server = models.CharField(max_length=255, blank=True, null=True)
    smtp_port = models.PositiveIntegerField(blank=True, null=True)
    smtp_use_ssl = models.BooleanField(default=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=255, blank=True, null=True)
    
    # For Google Mail
    oauth_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    token_expiry = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Email Configuration")
        verbose_name_plural = _("Email Configurations")
    
    def __str__(self):
        return f"{self.provider} - {self.imap_server}"

class EmailAlias(models.Model):
    email = models.EmailField(unique=True)
    is_default = models.BooleanField(default=False)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=255)  # Should be hashed
    is_active = models.BooleanField(default=True)
    configuration = models.ForeignKey('EmailConfiguration', on_delete=models.CASCADE, related_name='aliases')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = _("Email Alias")
        verbose_name_plural = _("Email Aliases")


class AliasMailboxAccess(models.Model):
    owner = models.ForeignKey(EmailAlias, on_delete=models.CASCADE, related_name="mailboxes")
    mailbox = models.ForeignKey(EmailAlias, on_delete=models.CASCADE, related_name="accessible_mailboxes")
    is_default = models.BooleanField(default=False)  # per user: which mailbox they are default sending from
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('owner', 'mailbox')
        verbose_name = _("Alias Mailbox Access")
        verbose_name_plural = _("Alias Mailbox Accesses")

    def __str__(self):
        return f"{self.owner.email} -> {self.mailbox.email}"

class EmailMessage(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('RECEIVED', 'Received'),
        ('ARCHIVED', 'Archived'),
        ('DELETED', 'Deleted'),
    ]
    label = models.CharField(max_length=255, blank=True, default="Personal")
    user = models.ForeignKey(EmailAlias, on_delete=models.CASCADE, related_name='email_messages', null=True, blank=True)
    external_id = models.CharField(max_length=255, blank=True, null=True)  # ID from external provider
    subject = models.CharField(max_length=255, blank=True)
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    date = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='RECEIVED')
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    is_spam = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    configuration = models.ForeignKey(EmailConfiguration, on_delete=models.CASCADE, related_name='messages')
    thread_id = models.CharField(max_length=255, blank=True, null=True)
    in_reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Email Message")
        verbose_name_plural = _("Email Messages")
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['external_id']),
            models.Index(fields=['thread_id']),
        ]
    
    def __str__(self):
        return self.subject or "(No Subject)"

class EmailAttachment(models.Model):
    email = models.ForeignKey(EmailMessage, on_delete=models.CASCADE, related_name='attachments')
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    file = models.FileField(upload_to='email_attachments/%Y/%m/%d/')
    external_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Email Attachment")
        verbose_name_plural = _("Email Attachments")
    
    def __str__(self):
        return self.filename

class EmailParticipant(models.Model):
    ROLE_CHOICES = [
        ('FROM', 'From'),
        ('TO', 'To'),
        ('CC', 'CC'),
        ('BCC', 'BCC'),
    ]
    
    email_message = models.ForeignKey(EmailMessage, on_delete=models.CASCADE, related_name='participants')
    email = models.EmailField()
    name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=4, choices=ROLE_CHOICES)
    
    class Meta:
        verbose_name = _("Email Participant")
        verbose_name_plural = _("Email Participants")
    
    def __str__(self):
        if self.name:
            return f"{self.name} <{self.email}>"
        return self.email
