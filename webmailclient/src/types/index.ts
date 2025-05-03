// Auth types

export interface Mailbox {
  id: number;
  email: string;
  name?: string;
  display_name?: string,
  is_default: boolean;
}


export interface User {
  id: number;
  email: string;
  name?: string;
  display_name?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  created_at?: string;
  mailboxes: Mailbox[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Mailbox types

export interface Profile {
  user: User;
  mailboxes: Mailbox[];
}

// Message types
export interface EmailAddress {
  email: string;
  name: string;
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  size: number;
  url: string;
  path: string;
  file: string;
}

export type MessageStatus = 'SENT' | 'RECEIVED' | 'FAILED' | 'PENDING';

export interface Message {
  id: number;
  subject: string;
  date: string;
  body_text: string;
  status: MessageStatus;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  is_spam: boolean;
  from_email: EmailAddress;
  to_emails: EmailAddress[];
  attachments_count: number;
  thread_id: string;
  created_at: string;
  updated_at: string;
  replies:Message[]

}

export interface MessageDetails extends Message {
  email_alias: string | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  body_text: string;
  body_html: string;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  is_spam: boolean;
  from_mailbox_id: string;
  attachments: Attachment[];
  in_reply_to: string | null;
  replies: MessageDetails[]
}

export interface ComposeMessageData {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body_text: string;
  body_html: string;
  from_mailbox_id: number | string;
  attachments?: File[];
  attachment_ids?: number[];
  save_as_draft: boolean;
  in_reply_to?: string | null;
}

export interface MessageResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Message[];
}

export interface SyncNewResponse {
  status: string;
  inserted_new_emails: number;
  emails: MessageDetails[];
}

export interface MarkActionResponse {
  status: string;
  is_read?: boolean;
  is_starred?: boolean;
  is_spam?: boolean;
}

export interface ComposeResponse {
  status: string;
  message_id: number;
}

export interface ValidationErrors {
  [key: string]: string[];
}

export interface ApiError {
  message: string;
  status: number;
  errors?: ValidationErrors;
}