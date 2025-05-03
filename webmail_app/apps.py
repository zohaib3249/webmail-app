
from django.apps import AppConfig


class WebmailAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'webmail_app'
    
    def ready(self):
        import webmail_app.signals
