from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailMessageViewSet, AuthViewSet, EmailAliasViewSet, index, download_file_endpoint, ContactView

router = DefaultRouter()
router.register(r'messages', EmailMessageViewSet, basename='email-message')
router.register(r'me', EmailAliasViewSet, basename='me')
router.register(r'auth', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
    path('webmail', index, name='index'),
    path('download/', download_file_endpoint, name='download-file'),
    path('contacts/', ContactView.as_view(), name='contacts-list'),

]
