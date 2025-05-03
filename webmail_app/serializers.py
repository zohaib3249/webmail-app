from rest_framework import serializers
from .models import (
    EmailAlias,
    EmailMessage,
    EmailAttachment,
    EmailParticipant, AliasMailboxAccess
)

# --- Login / Password Update ---
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class PasswordUpdateSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


# --- Email Alias Serializer ---
class MailboxAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAlias
        fields = ['id', 'email', 'display_name', 'is_active']

class EmailAliasSerializer(serializers.ModelSerializer):
    mailboxes = serializers.SerializerMethodField()

    def get_mailboxes(self, obj):
        """Return list of mailboxes accessible by this alias."""
        accesses = AliasMailboxAccess.objects.filter(owner=obj).select_related('mailbox')

        return [
            {
                'id': access.mailbox.id,
                'email': access.mailbox.email,
                'display_name': access.mailbox.display_name,
                'is_active': access.mailbox.is_active,
                'is_default': access.is_default
            }
            for access in accesses
        ] + [
            {
                'id': obj.id,
                'email': obj.email,
                'display_name': obj.display_name,
                'is_active': obj.is_active,
                'is_default': obj.is_default
            }
        ]

    class Meta:
        model = EmailAlias
        fields = [
            'id', 'email', 'display_name', 'is_default',
            'is_active', 'mailboxes', 'created_at'
        ]
        read_only_fields = ['created_at']

# --- Email Participant Serializer ---
class EmailParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailParticipant
        fields = ['id', 'email', 'name', 'role']

# --- Email Attachment Serializer ---
class EmailAttachmentSerializer(serializers.ModelSerializer):
    path = serializers.SerializerMethodField()

    class Meta:
        model = EmailAttachment
        fields = ['id', 'filename', 'content_type', 'size', 'file','path', 'created_at']
        read_only_fields = ['created_at']

    def get_path(self, obj):
        return obj.file.url

# --- Recursive Serializer for "in_reply_to" nesting ---
class RecursiveEmailSerializer(serializers.ModelSerializer):
    from_email = serializers.SerializerMethodField()
    to = serializers.SerializerMethodField()
    cc = serializers.SerializerMethodField()
    bcc = serializers.SerializerMethodField()
    attachments = EmailAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = EmailMessage
        fields = [
            'id', 'subject', 'date', 'status', 'is_read', 'is_starred', 'is_spam',
             'from_email', 'to', 'cc', 'bcc',
            'attachments', 'body_text', 'body_html', 'thread_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_from_email(self, obj):
        sender = obj.participants.filter(role='FROM').first()
        return {
            "email": sender.email,
            "name": sender.name or ""
        } if sender else None

    def get_to(self, obj):
        recipients = obj.participants.filter(role='TO')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_cc(self, obj):
        recipients = obj.participants.filter(role='CC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_bcc(self, obj):
        recipients = obj.participants.filter(role='BCC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

class EmailMessageChildSerializer(serializers.ModelSerializer):
    from_email = serializers.SerializerMethodField()
    to = serializers.SerializerMethodField()
    cc = serializers.SerializerMethodField()
    bcc = serializers.SerializerMethodField()
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    in_reply_to = serializers.SerializerMethodField()


    class Meta:
        model = EmailMessage
        fields = [
            'id', 'subject', 'date', 'status', 'is_read', 'is_starred', 'is_spam',
            'from_email', 'to', 'cc', 'bcc',
            'attachments', 'body_text', 'body_html', 'thread_id',
            'in_reply_to', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


    def get_from_email(self, obj):
        sender = obj.participants.filter(role='FROM').first()
        return {
            "email": sender.email,
            "name": sender.name or ""
        } if sender else None

    def get_to(self, obj):
        recipients = obj.participants.filter(role='TO')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_cc(self, obj):
        recipients = obj.participants.filter(role='CC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_bcc(self, obj):
        recipients = obj.participants.filter(role='BCC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_in_reply_to(self, obj):
        if obj.in_reply_to:
            return None  # Because in Simple serializer, we don't want to expand deeply
        return None


# --- Full Email Serializer (Main Public) ---
class FullEmailMessageSerializer(serializers.ModelSerializer):
    from_email = serializers.SerializerMethodField()
    to = serializers.SerializerMethodField()
    cc = serializers.SerializerMethodField()
    bcc = serializers.SerializerMethodField()
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    in_reply_to = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            'id', 'subject', 'date', 'status', 'is_read', 'is_starred', 'is_spam',
            'from_email', 'to', 'cc', 'bcc',
            'attachments', 'body_text', 'body_html', 'thread_id',
            'in_reply_to', 'created_at', 'updated_at', 'replies'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_replies(self, obj):
        replies = EmailMessage.objects.filter(
            thread_id=obj.thread_id,
            thread_id__isnull=False,
        ).exclude(external_id=obj.thread_id).order_by('date')  # sort by date
        return EmailMessageChildSerializer(replies, many=True, context=self.context).data

    def get_from_email(self, obj):
        sender = obj.participants.filter(role='FROM').first()
        return {
            "email": sender.email,
            "name": sender.name or ""
        } if sender else None

    def get_to(self, obj):
        recipients = obj.participants.filter(role='TO')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_cc(self, obj):
        recipients = obj.participants.filter(role='CC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_bcc(self, obj):
        recipients = obj.participants.filter(role='BCC')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_in_reply_to(self, obj):
        if obj.in_reply_to:
            return RecursiveEmailSerializer(obj.in_reply_to, context=self.context).data
        return None


# serializers.py

class EmailMessageSerializer(serializers.ModelSerializer):
    from_email = serializers.SerializerMethodField()
    to_emails = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            'id', 'subject', 'date', 'status', 'is_read', 'is_starred', 'is_spam',
            'from_email', 'to_emails', 'attachments_count', 'thread_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_status(self, obj):
        if EmailMessage.objects.filter(
            thread_id=obj.thread_id,
        ).exclude(external_id=obj.thread_id):
            return "RECEIVED"
        return obj.status

    def get_from_email(self, obj):
        sender = obj.participants.filter(role='FROM').first()
        return {
            "email": sender.email,
            "name": sender.name or ""
        } if sender else None

    def get_to_emails(self, obj):
        recipients = obj.participants.filter(role='TO')
        return [{"email": r.email, "name": r.name or ""} for r in recipients]

    def get_attachments_count(self, obj):
        return obj.attachments.count()


# --- Compose Email Serializer ---
class EmailParticipantWriteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ComposeEmailSerializer(serializers.Serializer):
    to = EmailParticipantWriteSerializer(many=True)
    cc = EmailParticipantWriteSerializer(many=True, required=False, default=list)
    bcc = EmailParticipantWriteSerializer(many=True, required=False, default=list)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    mode = serializers.CharField(max_length=255, required=False, allow_blank=True)
    body_text = serializers.CharField(required=False, allow_blank=True)
    from_mailbox_id = serializers.CharField(required=False, allow_blank=True)
    body_html = serializers.CharField(required=False, allow_blank=True)
    attachments = serializers.ListField(
        child=serializers.FileField(), required=False, default=list
    )
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    save_as_draft = serializers.BooleanField(required=False, default=False)
    in_reply_to = serializers.PrimaryKeyRelatedField(
        queryset=EmailMessage.objects.all(), required=False, allow_null=True
    )

    def validate(self, data):
        if not data.get('body_text') and not data.get('body_html'):
            raise serializers.ValidationError("Either body_text or body_html must be provided.")

        if not data.get('to'):
            raise serializers.ValidationError("At least one recipient is required.")

        return data
