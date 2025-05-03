
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, EmailConfiguration, EmailAlias, EmailMessage

class EmailModelTests(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        
        # Create a test email configuration
        self.config = EmailConfiguration.objects.create(
            user=self.user,
            provider='IMAP',
            imap_server='imap.example.com',
            imap_port=993,
            imap_use_ssl=True,
            smtp_server='smtp.example.com',
            smtp_port=587,
            smtp_use_ssl=True,
            username='test@example.com',
            password='password123'
        )
        
        # Create a test email alias
        self.alias = EmailAlias.objects.create(
            user=self.user,
            email='test@example.com',
            is_default=True,
            is_active=True,
            configuration=self.config
        )

    def test_email_configuration_str(self):
        self.assertEqual(
            str(self.config),
            f"{self.user.email} - {self.config.provider}"
        )
    
    def test_email_alias_str(self):
        self.assertEqual(str(self.alias), self.alias.email)
    
    def test_default_alias_signal(self):
        # Create a second alias and set it as default
        alias2 = EmailAlias.objects.create(
            user=self.user,
            email='test2@example.com',
            is_default=True,
            is_active=True,
            configuration=self.config
        )
        
        # Refresh the first alias from database
        self.alias.refresh_from_db()
        
        # Check that the first alias is no longer default
        self.assertFalse(self.alias.is_default)
        self.assertTrue(alias2.is_default)

class EmailAPITests(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        
        # Create a test email configuration
        self.config = EmailConfiguration.objects.create(
            user=self.user,
            provider='IMAP',
            imap_server='imap.example.com',
            imap_port=993,
            imap_use_ssl=True,
            smtp_server='smtp.example.com',
            smtp_port=587,
            smtp_use_ssl=True,
            username='test@example.com',
            password='password123'
        )
        
        # Create a test email alias
        self.alias = EmailAlias.objects.create(
            user=self.user,
            email='test@example.com',
            is_default=True,
            is_active=True,
            configuration=self.config
        )
        
        # Create test message
        self.message = EmailMessage.objects.create(
            user=self.user,
            subject='Test Subject',
            body_text='Test body text',
            date='2023-01-01T12:00:00Z',
            status='RECEIVED',
            email_alias=self.alias,
            configuration=self.config
        )
        
        # Set up API client
        self.client = APIClient()
        
    def test_unauthenticated_access(self):
        url = reverse('email-message-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_authenticate_and_get_messages(self):
        # Get token
        response = self.client.post(
            reverse('rest_login'),
            {'username': 'testuser', 'password': 'password123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data['access_token']
        
        # Use token to access messages
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('email-message-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['subject'], 'Test Subject')
    
    def test_mark_message_as_read(self):
        # Authenticate
        self.client.force_authenticate(user=self.user)
        
        # Mark message as read
        url = reverse('email-message-mark-read', args=[self.message.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'email marked as read')
        
        # Verify the message is marked as read
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_read)
