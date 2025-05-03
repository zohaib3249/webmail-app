import json
import os
from tokenize import TokenError

from django.conf import settings
from django.db.models import Q, OuterRef, Exists, F
from django.http import JsonResponse, Http404, FileResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_GET
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated

from .authentication import EmailAliasJWTAuthentication
from .models import EmailAlias, EmailMessage, EmailAttachment, EmailParticipant, EmailConfiguration, AliasMailboxAccess
from .serializers import (
    EmailAliasSerializer, EmailAttachmentSerializer,
    EmailParticipantSerializer,
    ComposeEmailSerializer, LoginSerializer, PasswordUpdateSerializer, FullEmailMessageSerializer,
    EmailMessageSerializer
)
from .services import MailService
from .tasks import send_email_by_id_task


class AuthViewSet(viewsets.ViewSet):
    def get_tokens_for_alias(self, alias):
        refresh = RefreshToken.for_user(alias)
        refresh['alias_id'] = alias.id
        refresh['email'] = alias.email
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        alias = EmailAlias.objects.filter(email=email, is_active=True).first()
        if not alias:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        if alias.password != password:  # Replace with actual hashed password check
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        tokens = self.get_tokens_for_alias(alias)
        return Response(tokens)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def refresh(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            return Response({'access': access_token}, status=status.HTTP_200_OK)

        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['patch'],url_path='change-password', permission_classes=[IsAuthenticated], authentication_classes = [EmailAliasJWTAuthentication])
    def update_password(self, request):
        serializer = PasswordUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        alias = request.user
        current_password = serializer.validated_data['current_password']
        new_password = serializer.validated_data['new_password']

        if alias.password != current_password:  # Replace with hashed password check
            return Response({'error': 'Current password incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        alias.password = new_password  # Remember to hash password
        alias.save()
        return Response({'status': 'password updated'}, status=status.HTTP_200_OK)


class EmailAliasViewSet(viewsets.ModelViewSet):
    serializer_class = EmailAliasSerializer
    authentication_classes = [EmailAliasJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        alias = self.request.user  # current logged-in alias
        accessible_ids = AliasMailboxAccess.objects.filter(owner=alias).values_list('mailbox_id', flat=True)
        return EmailAlias.objects.filter(id__in=accessible_ids, is_active=True)

    @action(detail=False, methods=['post'], url_path='set-default')
    def set_default_mailbox(self, request):
        """
        Set one of the accessible mailboxes as default for sending.
        """
        alias = request.user
        mailbox_id = request.data.get('mailbox_id')

        if not mailbox_id:
            return Response({"detail": "Mailbox ID required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mailbox = EmailAlias.objects.get(id=mailbox_id, is_active=True)
        except EmailAlias.DoesNotExist:
            return Response({"detail": "Mailbox not found."}, status=status.HTTP_404_NOT_FOUND)

        # 💥 Validate: does the alias have access?
        access = AliasMailboxAccess.objects.filter(owner=alias, mailbox=mailbox).first() or EmailAlias.objects.get(id=self.request.user.id, is_active=True)
        if not access:
            return Response({"detail": "You don't have access to this mailbox."}, status=status.HTTP_403_FORBIDDEN)

        # 💥 Unset previous defaults for this owner
        EmailAlias.objects.filter(id=alias.id).update(is_default=False)
        AliasMailboxAccess.objects.filter(owner=alias).update(is_default=False)

        # 💥 Set new default
        access.is_default = True
        access.save()

        return Response({"status": "Default mailbox set successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='profile')
    def me(self, request):
        """
        Return the list of accessible mailboxes for this alias.
        """
        serializer = self.get_serializer(self.request.user)
        return Response(serializer.data)


class EmailMessageViewSet(viewsets.ModelViewSet):
    serializer_class = EmailMessageSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [EmailAliasJWTAuthentication]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_read', 'is_starred', 'is_spam', 'user', 'label']
    search_fields = ['subject', 'body_text', 'participants__email', 'participants__name']
    ordering_fields = ['date', 'subject']
    ordering = ['-date']

    def get_queryset(self):
        alias = self.request.user
        alias_ids = self.request.query_params.getlist('mailboxes')
        alias_ids = [int(id) for id in alias_ids if id.isdigit()]
        parent_condition = Q(thread_id__isnull=True) | Q(external_id=F('thread_id'))

        # 🎯 Base queryset: only parent mails, not deleted
        queryset = EmailMessage.objects.filter(is_deleted=False).filter(parent_condition)

        accessible_ids = list(alias.mailboxes.values_list('mailbox__id', flat=True)) + [alias.id]

        # 🔥 Start building base queryset
        if alias_ids:
            # Validate access
            if not all(id in accessible_ids for id in alias_ids):
                raise PermissionDenied("You are not allowed to access some selected mailboxes.")

            queryset =queryset.filter(user__id__in=alias_ids)
        else:
            # Default mailbox
            if alias.is_default:
                queryset = queryset.filter(user=alias)
            else:
                default_mailbox = alias.mailboxes.filter(is_default=True).first()
                if default_mailbox:
                    queryset = queryset.filter(user=default_mailbox.mailbox)
                else:
                    return EmailMessage.objects.none()
        # 🎯 Now handle custom status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter.lower() in ['inbox', 'RECEIVED', 'received']:
                replies_qs = queryset.model.objects.filter(
                    thread_id=OuterRef('external_id'),  # child points to parent external_id
                    is_deleted=False,
                    status='SENT',
                )

                # 🔥 Respect mailbox access on replies also
                if alias_ids:
                    replies_qs = replies_qs.filter(user__id__in=alias_ids)
                else:
                    replies_qs = replies_qs.filter(user__in=accessible_ids)
                queryset = queryset.filter(
                    Q(status='RECEIVED') | Exists(replies_qs)
                )
            elif status_filter.lower() == 'sent':
                queryset = queryset.filter(status__in=['PENDING', 'FAILED', 'SENT', 'DRAFT'])
            else:
                # Apply normally if they provided a valid status
                queryset = queryset.filter(status=status_filter.upper())

        return queryset.order_by('-date')

    @action(detail=False, methods=['patch'])
    def bulk_mark(self, request):
        """Bulk mark emails as read/starred/spam."""
        ids = request.data.get('ids', [])
        field = request.data.get('field', None)
        value = request.data.get('value', None)

        if not ids or not field or value is None:
            return Response({'detail': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_fields = ['is_read', 'is_starred', 'is_spam', 'is_deleted']
        if field not in allowed_fields:
            return Response({'detail': 'Invalid field'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = EmailMessage.objects.filter(id__in=ids).update(**{field: value})
        return Response({'status': 'success', 'updated_count': updated_count})

    @action(detail=False, methods=['get'], url_path='sync-new')
    def sync_new_mails(self, request):
        """Sync new incoming mails for current user."""
        alias = self.request.user

        if not alias or not alias.is_active:
            return Response({"detail": "Invalid alias."}, status=status.HTTP_400_BAD_REQUEST)

        if not alias.configuration:
            return Response({"detail": "Alias is not linked to any configuration."}, status=status.HTTP_400_BAD_REQUEST)

        mail_service = MailService(alias.configuration)
        result = mail_service.sync_all_emails(minutes=5)
        # result = mail_service.sync_all_emails()
        inserted_emails = result.get('new_mails', [])
        serializer = FullEmailMessageSerializer(inserted_emails, many=True, context={'request': request})

        return Response({
            "status": "success",
            "inserted_new_emails": result.get('inserted_new_emails'),
            "emails": serializer.data
        }, status=status.HTTP_200_OK)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FullEmailMessageSerializer
        if self.action in ['compose']:
            return ComposeEmailSerializer
        return EmailMessageSerializer

    def get_object(self):
        """
        For retrieve/detail views, allow any message
        in any accessible mailbox (instead of only the default).
        """
        alias = self.request.user
        accessible_ids = list(alias.mailboxes.values_list('mailbox__id', flat=True)) + [alias.id]

        # lookup_field is 'pk' by default
        lookup_value = self.kwargs.get(self.lookup_field)
        obj = get_object_or_404(
            EmailMessage,
            pk=lookup_value,
            user__id__in=accessible_ids
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def parse_form_data_recursively(self, form_data):
        """
        Parse a FormData (request.data) into real Python types recursively.
        """
        parsed = {}

        for key, value in form_data.items():
            # If value is not string, just assign
            if not isinstance(value, str):
                parsed[key] = value
                continue

            val = value.strip()

            # Try to parse boolean
            if val.lower() == 'true':
                parsed[key] = True
                continue
            if val.lower() == 'false':
                parsed[key] = False
                continue

            # Try to parse integer
            if val.isdigit():
                parsed[key] = int(val)
                continue

            # Try to parse float
            try:
                if '.' in val:
                    parsed[key] = float(val)
                    continue
            except ValueError:
                pass

            # Try to parse JSON object or array
            if (val.startswith('{') and val.endswith('}')) or (val.startswith('[') and val.endswith(']')):
                try:
                    loaded = json.loads(val)

                    # Recursively parse nested structures
                    if isinstance(loaded, dict):
                        parsed[key] = {
                            nested_k: self.parse_form_data_recursively({'__temp__': nested_v})['__temp__']
                            for nested_k, nested_v in loaded.items()
                        }
                    elif isinstance(loaded, list):
                        parsed[key] = [
                            self.parse_form_data_recursively({'__temp__': item})['__temp__']
                            for item in loaded
                        ]
                    else:
                        parsed[key] = loaded
                    continue
                except (json.JSONDecodeError, TypeError):
                    pass

            # Fallback to plain string
            parsed[key] = value

        return parsed

    @action(detail=False, methods=['post'], parser_classes = [MultiPartParser, FormParser,JSONParser
])
    def compose(self, request):
        data = request.data.copy()
        data = self.parse_form_data_recursively(data)# make mutable copy
        files = request.FILES.getlist('attachments[]')  # get attachments from files
        # Now create serializer
        serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        alias = request.user
        mode = data.get('mode', 'reply')
        from_mailbox_id = data.get('from_mailbox_id')
        if from_mailbox_id:
            from_alias = get_object_or_404(EmailAlias, id=from_mailbox_id, is_active=True)
            accessible_aliases = [alias.id] + list(alias.mailboxes.values_list('mailbox__id', flat=True))
            if from_alias.id not in accessible_aliases:
                return Response({'detail': 'You do not have access to this alias for sending.'},
                                status=status.HTTP_403_FORBIDDEN)
        else:
            # fallback: current logged alias
            from_alias = alias

        in_reply_to_id = data.get('in_reply_to')
        thread_id = None

        if in_reply_to_id:
            thread_id = in_reply_to_id.thread_id or in_reply_to_id.external_id or str(in_reply_to_id.id)

        # Create new EmailMessage
        email_message = EmailMessage.objects.create(
            subject=data.get('subject', '(No Subject)'),
            date=timezone.now(),
            status='DRAFT' if data.get('save_as_draft') else 'Pending',
            is_read=True,
            is_starred=False,
            is_spam=False,
            user=from_alias,
            thread_id=thread_id,
            configuration=from_alias.configuration,
            body_text=data.get('body_text', ''),
            body_html=data.get('body_html', ''),
            in_reply_to=in_reply_to_id
        )
        if mode == 'reply' and in_reply_to_id:
            # Only reply to the main sender
            EmailParticipant.objects.create(
                email_message=email_message,
                email=from_alias.email,
                name=from_alias.display_name or '',
                role='FROM'
            )

            from_participant = in_reply_to_id.participants.filter(role='FROM').first()
            if from_participant:
                EmailParticipant.objects.create(
                    email_message=email_message,
                    email=from_participant.email,
                    name=from_participant.display_name or '',
                    role='TO'
                )

        elif mode == 'replyAll' and in_reply_to_id:
            # Reply to sender + all TO/CC except self
            participants = in_reply_to_id.participants.exclude(email=from_alias.email)
            EmailParticipant.objects.create(
                email_message=email_message,
                email=from_alias.email,
                name=from_alias.display_name or '',
                role='FROM'
            )
            for p in participants:
                created = EmailParticipant.objects.create(
                    email_message=email_message,
                    email=p.email,
                    name=p.name or '',
                    role=p.role  # preserve TO, CC, BCC roles
                )
        else:
            # Save participants
            EmailParticipant.objects.create(
                email_message=email_message,
                email=from_alias.email,
                name=from_alias.display_name or '',
                role='FROM'
            )

            for field, role in [('to', 'TO'), ('cc', 'CC'), ('bcc', 'BCC')]:
                for recipient in data.get(field, []):
                    EmailParticipant.objects.create(
                        email_message=email_message,
                        email=recipient['email'],
                        name=recipient.get('name', ''),
                        role=role
                    )

        # Save new uploaded attachments
        for file in files or []:
            EmailAttachment.objects.create(
                email=email_message,
                filename=file.name,
                size=file.size,
                file=file,
                content_type=file.content_type
            )

        for attachment_id in data.get('attachment_ids', []):
            try:
                attachment = EmailAttachment.objects.get(id=attachment_id)
                attachment.email = email_message
                attachment.save()
            except EmailAttachment.DoesNotExist:
                pass
        if email_message.status in ["pending", "Pending"]:
            send_email_by_id_task.delay(email_message.id)
        return Response({'status': 'saved', 'message_id': email_message.id}, status=status.HTTP_201_CREATED)


def index(request):
    """Return a simple HTML response"""
    return render(request, 'index.html', {'title': 'Webmail App', "base_url":"http://127.0.0.1:8000/api/"})

def download_file_view(request, file_path, filename=None):
    if not os.path.exists(file_path):
        raise Http404("File not found.")

    response = FileResponse(open("/Users/apple/Desktop/Backend_v2/media/email_attachments/2025/04/27/Logo_fan_ticket_black.png", 'rb'))

    # Set Content-Disposition header to force download
    download_name = filename or os.path.basename(file_path)
    response['Content-Disposition'] = f'attachment; filename="{download_name}"'

    return response


# 📄 in your views.py

from rest_framework.views import APIView

class ContactView(APIView):
    authentication_classes = [EmailAliasJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alias = request.user

        # Fetch accessible mailbox IDs (including self)
        accessible_ids = list(alias.mailboxes.values_list('mailbox__id', flat=True)) + [alias.id]

        # Filter participants linked to accessible emails
        participants = EmailParticipant.objects.filter(
            email_message__user__id__in=accessible_ids
        ).exclude(role='FROM')  # You usually want to collect TO, CC, BCC, not yourself (FROM)

        # Build a simple contact map {email: name}
        contacts = {}
        for p in participants:
            if p.email not in contacts:
                contacts[p.email] = p.name or ""

        # Transform into list
        contact_list = [{"email": email, "name": name} for email, name in contacts.items()]

        return Response(contact_list)

@require_GET
def download_file_endpoint(request):
    file_id = request.GET.get('file_id')
    if not file_id:
        return JsonResponse({'error': 'file id required'}, status=400)
    file: EmailAttachment = EmailAttachment.objects.filter(id=file_id).first()
    if not file:
        raise Http404("File not found.")
    response = FileResponse(open(file.file.path, 'rb'))
    response['Content-Disposition'] = f'attachment; filename="{file.filename}"'
    return response

