from django.contrib import admin
from .models import (
    EmailAlias,
    EmailMessage,
    EmailAttachment,
    EmailParticipant,
    EmailConfiguration, AliasMailboxAccess
)

@admin.register(EmailConfiguration)
class EmailConfigurationAdmin(admin.ModelAdmin):
    list_display = ('provider', 'username', 'is_active', 'created_at')
    list_filter = ('provider', 'is_active')
    search_fields = ('username',)
    readonly_fields = ('created_at', 'updated_at')

class AliasMailboxAccessInline(admin.TabularInline):
    model = AliasMailboxAccess
    fk_name = 'owner'  # Important: link with the owner (who can access other mailboxes)
    extra = 1
    autocomplete_fields = ['mailbox']  # Makes mailbox selection easier

@admin.register(EmailAlias)
class EmailAliasAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_default', 'is_active', 'configuration', 'created_at')
    list_filter = ('is_default', 'is_active')
    search_fields = ('email', 'configuration__username')
    readonly_fields = ('created_at',)
    inlines = [AliasMailboxAccessInline]


class EmailAttachmentInline(admin.TabularInline):
    model = EmailAttachment
    extra = 0
    readonly_fields = ('file', 'filename', 'content_type', 'size', 'created_at')

class EmailParticipantInline(admin.TabularInline):
    model = EmailParticipant
    extra = 0

@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'date', 'status', 'is_read')
    list_filter = ('status', 'is_read', 'is_starred', 'is_spam')
    search_fields = ('subject', 'body_text', 'email_alias__email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [EmailParticipantInline, EmailAttachmentInline]



@admin.register(EmailAttachment)
class EmailAttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'email', 'content_type', 'size', 'created_at')
    search_fields = ('filename', 'email__subject')
    readonly_fields = ('created_at',)

@admin.register(EmailParticipant)
class EmailParticipantAdmin(admin.ModelAdmin):
    list_display = ('email', 'name', 'role', 'email_message')
    list_filter = ('role',)
    search_fields = ('email', 'name', 'email_message__subject')
