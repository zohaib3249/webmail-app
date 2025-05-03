import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  AlertOctagon,
  Reply,
  CornerUpRight,
  Printer,
  MoreHorizontal,
  Mail,
  MailOpen,
} from 'lucide-react';
import { useMessagesStore } from '../../store/messagesStore';
import { formatDetailedDate } from '../../utils/formatters';
import { Button } from '../ui/Button';
import Avatar from '../ui/Avatar';
import { MessageDetails } from "../../types";
import RichTextEditorReply from "../ui/RichTextEditorReply.tsx";
import RichTextEditorForward from "../ui/RichTextEditorForward.tsx";
import toast from 'react-hot-toast';
import EmailBodyViewer from "../ui/EmailBodyViewer.tsx";
import { useEffect, useState } from "react";

export const MessageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedMessage, fetchMessageDetails, isLoading, downloadAttachment, bulkMarkMessages } = useMessagesStore();
const [collapsedReplies, setCollapsedReplies] = useState(true);

  const [isReplying, setIsReplying] = useState(false);
  const [replyTarget, setReplyTarget] = useState<MessageDetails | null>(null);  // ⭐ new: dynamic target
  const [isForwarding, setIsForwarding] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll'>('reply');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (id) fetchMessageDetails(parseInt(id));
  }, [id, fetchMessageDetails]);

  const handleBack = () => navigate(-1);

  const handleReply = (mode: 'reply' | 'replyAll' = 'reply', targetMessage?: MessageDetails) => {
    setReplyMode(mode);
    setReplyTarget(targetMessage || selectedMessage);  // ⭐ use target or parent
    setIsReplying(true);
    setIsForwarding(false);
  };

  const handleForward = () => {
    setIsForwarding(true);
    setIsReplying(false);
  };

  const handleToggleSpam = async () => {
    if (!selectedMessage) return;
    try {
      await bulkMarkMessages([selectedMessage.id], 'is_spam', !selectedMessage.is_spam);
      toast.success(selectedMessage.is_spam ? "Marked as not spam" : "Reported as spam");
    } catch {
      toast.error("Failed to mark spam status");
    }
  };

  const handleToggleRead = async () => {
    if (!selectedMessage) return;
    try {
      await bulkMarkMessages([selectedMessage.id], 'is_read', !selectedMessage.is_read);
      toast.success(selectedMessage.is_read ? "Marked as unread" : "Marked as read");
    } catch {
      toast.error("Failed to toggle read status");
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    if (!confirm('Are you sure you want to move this message to Trash?')) return;
    try {
      await bulkMarkMessages([selectedMessage.id], 'is_deleted', true);
      toast.success('Message moved to Trash.');
      navigate('/messages');
    } catch {
      toast.error('Failed to delete message.');
    }
  };

  const handlePrint = () => {
    if (!selectedMessage) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${selectedMessage.subject}</title></head>
          <body>
            ${getRenderBody(selectedMessage)}
          </body>
        </html>
      `);
      newWindow.document.close();
      newWindow.print();
    }
  };

  const handleViewOriginal = () => {
    if (!selectedMessage) return;
    const originalWindow = window.open('', '_blank');
    if (originalWindow) {
      originalWindow.document.write(`
        <html>
          <head><title>Original Message</title></head>
          <body>
            <pre>${selectedMessage.body_text || 'No original body available.'}</pre>
          </body>
        </html>
      `);
      originalWindow.document.close();
    }
  };

  const getRenderBody = (message: MessageDetails) => {
    if (message.body_html) return message.body_html;
    if (message.body_text?.startsWith('<!DOCTYPE html>') || message.body_text?.startsWith('<html')) {
      return message.body_text;
    }
    return `<pre>${message.body_text || ''}</pre>`;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!selectedMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500">Message not found</p>
        <Button variant="outline" onClick={handleBack}>Back to inbox</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="p-4 border-b flex flex-wrap items-center gap-2 relative">
        <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={handleToggleSpam}>
          <AlertOctagon size={18} className={selectedMessage.is_spam ? 'fill-red-500 text-red-500' : ''} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete}><Trash2 size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={handleToggleRead}>
          {selectedMessage.is_read ? <Mail size={18} /> : <MailOpen size={18} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleReply('reply', selectedMessage)}><Reply size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={handleForward}><CornerUpRight size={18} /></Button>
        <Button variant="ghost" size="icon" onClick={handlePrint}><Printer size={18} /></Button>

        {/* 3-dot MoreHorizontal Dropdown */}
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowDropdown(!showDropdown)}>
            <MoreHorizontal size={18} />
          </Button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-20">
              <button
                className="block w-full text-left text-sm p-2 hover:bg-gray-100"
                onClick={() => {
                  handleViewOriginal();
                  setShowDropdown(false);
                }}
              >
                View Original
              </button>
              <button
                className="block w-full text-left text-sm p-2 hover:bg-gray-100"
                onClick={() => {
                  handleReply('replyAll', selectedMessage);
                  setShowDropdown(false);
                }}
              >
                Reply All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex space-x-4">
          <Avatar name={selectedMessage.from_email.name} email={selectedMessage.from_email.email} size="lg" />
          <div>
            <h1 className="text-xl font-semibold">{selectedMessage.subject}</h1>
            <div className="text-gray-500 text-sm">
              From: {selectedMessage.from_email.name || selectedMessage.from_email.email} &lt;{selectedMessage.from_email.email}&gt;
              <br />
              Date: {formatDetailedDate(selectedMessage.date)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <EmailBodyViewer html={getRenderBody(selectedMessage)} />

      {/* Attachments */}
      {selectedMessage.attachments.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="font-semibold mb-2">Attachments:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {selectedMessage.attachments.map(file => (
              <div key={file.id} className="border p-2 rounded flex justify-between items-center">
                <span className="truncate">{file.filename}</span>
                <Button variant="link" onClick={() => downloadAttachment(file.id)}>Download</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Replies */}
      {selectedMessage.replies && selectedMessage.replies.length > 0 && (
  <div className="p-6 border-t space-y-6">
    {(() => {
      const replies = selectedMessage.replies;
      const showCollapseButton = replies.length > 3; // Collapse if more than 3 replies

      let visibleReplies = replies;
      if (showCollapseButton && collapsedReplies) {
        visibleReplies = [...replies.slice(0, 1), ...replies.slice(-1)]; // Show first + last
      }

      const hiddenCount = replies.length - visibleReplies.length;

      return (
        <>
          {visibleReplies.map((reply, index) => (
            <div
              key={reply.id || `reply-${index}`}
              className="border rounded p-4 bg-gray-50 relative transition-all duration-300 ease-in-out"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{reply.from_email.name || reply.from_email.email}</h4>
                  <p className="text-xs text-gray-500">{formatDetailedDate(reply.date)}</p>
                </div>
                <div className="relative">
                  <Button variant="outline" onClick={() => handleReply('reply', reply)} className="flex items-center">
                    <Reply size={16} className="mr-2" />
                    Reply
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <EmailBodyViewer html={getRenderBody(reply)} />
              </div>
            </div>
          ))}

          {showCollapseButton && collapsedReplies && hiddenCount > 0 && (
            <div className="flex justify-center my-4">
              <Button
                variant="ghost"
                onClick={() => setCollapsedReplies(false)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-all"
              >
                Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
              </Button>
            </div>
          )}
        </>
      );
    })()}
  </div>
)}


      {/* Reply/Forward editor */}
      {isReplying && replyTarget && (
        <div className="p-4 border-t">
          <RichTextEditorReply
            onCancel={() => setIsReplying(false)}
            selectedMessage={replyTarget}  // ⭐ use correct target
            mode={replyMode}
          />
        </div>
      )}

      {isForwarding && (
        <div className="p-4 border-t">
          <RichTextEditorForward onCancel={() => setIsForwarding(false)} selectedMessage={selectedMessage} />
        </div>
      )}

      {/* Bottom Reply toolbar */}
      <div className="mt-auto p-4 border-t border-gray-200 flex justify-between">
        <Button variant="outline" onClick={() => handleReply('replyAll', selectedMessage)} className="flex items-center">
          <Reply size={16} className="mr-2" />
          Reply
        </Button>
        <Button variant="outline" onClick={handleForward} className="flex items-center">
          <CornerUpRight size={16} className="mr-2" />
          Forward
        </Button>
      </div>
    </div>
  );
};

export default MessageDetail;
