import React, {useState, useRef, useEffect} from 'react';
import { useForm } from 'react-hook-form';
import { X, Minimize, Maximize, Paperclip } from 'lucide-react';
import { Button } from '../ui/Button';
import { useMessagesStore } from '../../store/messagesStore';
import { useAuthStore } from '../../store/authStore';
import {ComposeMessageData, EmailAddress} from '../../types';
import toast from 'react-hot-toast';
import MyRichTextEditor from "../ui/MyRichTextEditor.tsx";
import {useContactsStore} from "../../store/contactsStore.tsx";
import EmailMultiSelect from "../ui/EmailMultiSelect.tsx";


export const ComposeModal: React.FC = () => {
  const { toggleCompose, composeMessage, isLoading } = useMessagesStore();
  const { mailboxes = [] } = useAuthStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { contacts, fetchContacts } = useContactsStore();


  const defaultValues: Partial<ComposeMessageData> = {
    to: [], cc: [], bcc: [], subject: '',
    body_text: '', body_html: '',
    attachments: [], save_as_draft: false
  };
  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<ComposeMessageData>({ defaultValues });

    const [editorContent, setEditorContent] = useState<string>("");


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter(f => {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`File too large: ${f.name}`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...newFiles]);
  };
  const handleRemoveFile = (f: File) =>
    setFiles(prev => prev.filter(x => x !== f));

  const onSubmit = async (data: ComposeMessageData) => {
    try {
      const formData = new FormData();
      ['to', 'cc', 'bcc'].forEach(field => {
    const recipients = data[field as keyof ComposeMessageData] as { email: string; name: string }[];
    if (recipients?.length) {
      formData.append(field, JSON.stringify(recipients));
    }
  });


    formData.append('subject', data.subject || '');
     formData.append('body_text', editorContent.replace(/<[^>]+>/g, '') || '');
    formData.append('body_html', editorContent || '');
    formData.append('from_mailbox_id', String(data.from_mailbox_id || ''));
    formData.append('save_as_draft', String(data.save_as_draft || false));

      ['to', 'cc', 'bcc'].forEach(field => {
    const recipients = data[field as keyof ComposeMessageData] as { email: string; name: string }[];
    if (recipients?.length) {
      formData.append(field, JSON.stringify(recipients));  // ✅ send JSON list
    }
  });


    // ✅ Attach files if any
    if (files.length) {
    files.forEach(file => {
      formData.append('attachments[]', file); // ✅ correct
    });
  }

    // ✅ Send FormData
    await composeMessage(formData);

    toast.success('Message sent!');
    toggleCompose(false);
  } catch (err: any) {
    toast.error(err.message || 'Send failed');
  }
};


  const handleSaveAsDraft = () => {
    const d = watch(); d.save_as_draft = true;
    setValue('save_as_draft', true);
    handleSubmit(onSubmit)();
  };

  const handleClose = () => {
    const s = watch('subject'), b = watch('body_text');
    if ((s?.trim()) || (b?.trim()) && confirm('Save as draft?')) {
      handleSaveAsDraft();
      return;
    }
    toggleCompose(false);
  };

  const getModalClasses = () => {
    if (isMinimized) return 'fixed bottom-0 right-0 w-80 h-14 rounded-t-lg shadow-lg';
    if (isMaximized) return 'fixed inset-0 z-50';
    return 'fixed bottom-0 right-0 w-[600px] h-[600px] rounded-t-lg shadow-xl';
  };

  const defaultMailboxId = mailboxes.find(m => m.is_default)?.id ?? '';
  useEffect(() => {
  if (defaultMailboxId) {
    setValue('from_mailbox_id', String(defaultMailboxId));
  }
  fetchContacts();
}, [defaultMailboxId, setValue, fetchContacts]);

  return (
    <div className={`${getModalClasses()} bg-white flex flex-col max-h-screen`}>
      {/* header controls */}
      <div className="bg-blue-700 text-white p-3 flex justify-between rounded-t-lg cursor-move">
        <span className="text-sm font-medium">
          {isMinimized ? 'New Message' : 'Compose Message'}
        </span>
        <div className="flex space-x-2">
          {isMinimized
            ? <Maximize onClick={() => setIsMinimized(false)} className="cursor-pointer"/>
            : <Minimize onClick={() => setIsMinimized(true)} className="cursor-pointer"/>}
          {!isMaximized && <Maximize onClick={() => setIsMaximized(true)} className="cursor-pointer"/>}
          {isMaximized && <Minimize onClick={() => setIsMaximized(false)} className="cursor-pointer"/>}
          <X onClick={handleClose} className="cursor-pointer"/>
        </div>
      </div>

      {!isMinimized && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-auto">
          {/* header fields */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center">
              <span className="w-16 text-sm text-gray-600">From:</span>
              <select
                  {...register('from_mailbox_id')}
                  defaultValue={defaultMailboxId}
                  className="flex-1 bg-transparent border-b border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-transparent"
              >
                {mailboxes.map(mb => (
                    <option key={mb.id} value={mb.id}>
                      {mb.display_name || mb.email}
                    </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="w-16 text-sm text-gray-600">To:</label>
              <EmailMultiSelect
                  value={watch('to')}
                  onChange={(v) => setValue('to', v as EmailAddress[])}
                  contacts={contacts}
                  placeholder="Select recipients"
              />
              {errors.to && <p className="text-red-500 text-xs">{errors.to.message}</p>}
            </div>
            <button
                type="button"
                onClick={() => {
                  setShowCc(true);
                  setShowBcc(true);
                }}
                className="ml-2 text-blue-600 text-sm"
            >
              Cc/Bcc
            </button>
            {errors.to && <p className="text-red-500 text-xs ml-16">{errors.to.message}</p>}
            {showCc && (
                <div className="flex flex-col">
                  <label className="w-16 text-sm text-gray-600">Cc:</label>
                  <EmailMultiSelect
                      value={watch('cc') || []}
                      onChange={(v) => setValue('cc', v as EmailAddress[])}
                      contacts={contacts}
                      placeholder="Select Cc recipients"
                  />
                </div>
            )}
            {showBcc && (
                <div className="flex flex-col">
                  <label className="w-16 text-sm text-gray-600">Bcc:</label>
                  <EmailMultiSelect
                      value={watch('bcc') || []}
                      onChange={(v) => setValue('bcc', v as EmailAddress[])}
                      contacts={contacts}
                      placeholder="Select Bcc recipients"
                  />
                </div>
            )}
            <div className="flex items-center">
              <label className="w-16 text-sm text-gray-600">Subject:</label>
              <input
                  {...register('subject', {required: 'Subject required'})}
                  className="flex-1 bg-transparent border-b border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-transparent"
                  placeholder="Subject"
              />
            </div>
            {errors.subject && <p className="text-red-500 text-xs ml-16">{errors.subject.message}</p>}
          </div>

          {/* whole editor component */}
          <div className="flex-1 p-0">
            <MyRichTextEditor value={editorContent} onChange={setEditorContent}/>

          </div>

          {/* attachments */}
          {files.length > 0 && (
              <div className="px-4 py-2 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                      <div key={i} className="flex items-center bg-gray-100 rounded px-2 py-1 text-xs">
                    <span className="truncate max-w-[150px]">{f.name}</span>
                    <X onClick={() => handleRemoveFile(f)} className="ml-1 cursor-pointer"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* send / draft */}
          <div className="p-3 border-t flex items-center justify-between">
            <div className="flex space-x-2">
              <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                Send
              </Button>
              <Paperclip onClick={() => fileInputRef.current?.click()} className="cursor-pointer"/>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Save as draft
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ComposeModal;
