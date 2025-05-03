from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EmailAlias, EmailConfiguration


@receiver(post_save, sender=EmailAlias)
def ensure_default_alias(sender, instance, created, **kwargs):
    """
    Ensure that a configuration has at least one default email alias
    If the current alias was set as default, unset defaults for other aliases under same configuration
    """
    if instance.is_default:
        # Set all other aliases under same configuration to non-default
        EmailAlias.objects.filter(
            configuration=instance.configuration
        ).exclude(
            id=instance.id
        ).update(is_default=False)
    else:
        # If no default alias exists under configuration, make first active alias default
        if not EmailAlias.objects.filter(configuration=instance.configuration, is_default=True).exists():
            first_active = EmailAlias.objects.filter(
                configuration=instance.configuration,
                is_active=True
            ).first()

            if first_active:
                first_active.is_default = True
                first_active.save(update_fields=['is_default'])


@receiver(post_save, sender=EmailConfiguration)
def create_default_email_alias(sender, instance, created, **kwargs):
    """
    Optionally create a default alias when a new email configuration is created
    Only if username is provided
    """
    if created and instance.username and '@' in instance.username:
        # Check if alias already exists with this email
        alias, created = EmailAlias.objects.get_or_create(
            email=instance.username,
            defaults={
                'is_default': True,
                'is_active': True,
                'configuration': instance,
                'password': '',  # You might want to set a random or blank password here
            }
        )
