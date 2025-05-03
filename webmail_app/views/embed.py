
from django.views.generic import TemplateView
from django.utils import timezone
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework_simplejwt.tokens import RefreshToken

class EmbeddedMailView(LoginRequiredMixin, TemplateView):
    """View for the embeddable iframe version of the webmail client"""
    template_name = 'webmail_app/embed.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Generate a token for API access
        refresh = RefreshToken.for_user(self.request.user)
        access_token = str(refresh.access_token)
        
        # Add API endpoint and token to context
        context['api_endpoint'] = self.request.build_absolute_uri('/').rstrip('/')
        context['api_token'] = access_token
        
        return context
