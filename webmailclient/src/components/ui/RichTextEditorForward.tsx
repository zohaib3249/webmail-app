import React, {useEffect, useRef, useState} from 'react';
import { useForm } from 'react-hook-form';
import { Paperclip, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { MessageDetails } from '../../types';
import MyRichTextEditor from './MyRichTextEditor';
import { Button } from '../ui/Button';
import toast from "react-hot-toast";
import { useMessagesStore } from "../../store/messagesStore";
import EmailMultiSelect from "./EmailMultiSelect.tsx";
import {useContactsStore} from "../../store/contactsStore.tsx";

interface Props {
  onCancel?: () => void;
  selectedMessage: MessageDetails;
}

interface FormValues {
  subject: string;
  from_mailbox_id: string | number;
  to: { email: string; name?: string }[];
}

const RichTextEditorForward: React.FC<Props> = ({ onCancel, selectedMessage }) => {
  const { mailboxes = [] } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { composeMessage } = useMessagesStore();
    const { contacts, fetchContacts } = useContactsStore();


  const { register, watch, setValue } = useForm<FormValues>({
  defaultValues: {
    subject: `FWD: ${selectedMessage.subject}`,
    from_mailbox_id: mailboxes.find(m => m.is_default)?.id ?? '',
    to: [],
  }
});

  const [editorContent, setEditorContent] = useState<string>(selectedMessage.body_html || '');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...newFiles]);
  };


useEffect(() => {
  if (fetchContacts) {
    fetchContacts();
  }
}, [fetchContacts]);


  const handleRemoveFile = (file: File) => {
    setAttachments(prev => prev.filter(f => f !== file));
  };

  const handleSend = async () => {
    const subject = watch('subject');
    const fromMailboxId = watch('from_mailbox_id');
    const toEmails = watch('to');
    if (!toEmails || toEmails.length === 0) {
      toast.error('Please add at least one recipient.');
      return;
    }

    const formData = new FormData();
    formData.append('subject', subject || '');
    formData.append('body_text', editorContent.replace(/<[^>]+>/g, '') || '');
    formData.append('body_html', editorContent || '');
    formData.append('from_mailbox_id', String(fromMailboxId || ''));
    console.log("toEmails", )
    // Add recipients manually split (comma separated)
    formData.append('to', JSON.stringify(toEmails));

    // Attachments
    if (attachments.length > 0) {
      attachments.forEach(file => {
        formData.append('attachments[]', file);
      });
    }

    try {
      await composeMessage(formData);
      toast.success('Message forwarded!');
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Failed to forward message.');
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4 bg-white">
      {/* Top Fields */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <span className="w-12 text-gray-500">From:</span>
          <select {...register('from_mailbox_id')} className="flex-1 border rounded px-2 py-1">
            {mailboxes.map(mb => (
              <option key={mb.id} value={mb.id}>
                {mb.display_name || mb.email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-12 text-gray-500">To:</span>
          <EmailMultiSelect
                  value={watch('to')}
                  onChange={(v) => setValue('to', v)}
                  contacts={contacts}
                  placeholder="Select recipients"
              />
        </div>

        <div className="flex items-center space-x-2">
          <span className="w-12 text-gray-500">Subject:</span>
          <input
            {...register('subject')}
            className="flex-1 border rounded px-2 py-1"
            placeholder="Subject"
          />
        </div>
      </div>

      {/* Rich Text Editor */}
      <div className="border rounded-md bg-white p-2 min-h-[150px]">
        <MyRichTextEditor value={editorContent} onChange={setEditorContent} />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-2 py-2 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs"
              >
                <span className="truncate max-w-[150px]">{file.name}</span>
                <X
                  className="ml-1 cursor-pointer"
                  size={14}
                  onClick={() => handleRemoveFile(file)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="p-3 border-t flex items-center justify-between">
        <div className="flex space-x-2">
          <Button type="button" onClick={handleSend}>
            Send
          </Button>
          <Paperclip
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
};

export default RichTextEditorForward;
