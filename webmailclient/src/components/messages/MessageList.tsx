// src/components/messages/MessageList.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  MailOpen,
  Mail as MailIcon,
  Star,
  AlertOctagon
} from 'lucide-react';
import { useMessagesStore } from '../../store/messagesStore';
import { Message } from '../../types';
import MessageItem from './MessageItem';
import { Button } from '../ui/Button';
import toast from "react-hot-toast";

interface MessageListProps {
  type?: 'inbox' | 'starred' | 'sent' | 'drafts' | 'spam' | 'scheduled';
}

const MessageList: React.FC<MessageListProps> = ({ type = 'inbox' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    messages,
    totalCount,
    isLoading,
    searchQuery,
      selectedLabel,
    fetchMessages,
    bulkMarkMessages,
  } = useMessagesStore();

  // initialize current page from URL ?page=
  const params = new URLSearchParams(location.search);
  const initialPage = Math.max(1, parseInt(params.get('page') || '1', 10));

  const [currentPage, setCurrentPage] = useState(initialPage);

  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [selectAll, setSelectAll]           = useState(false);

  const perPage    = 20;
  const totalPages = Math.ceil(totalCount / perPage);

  const hasMounted = useRef(false);

  // Build API params including global search & type
  const buildParams = (page: number) => {
    const p: any = { page, per_page: perPage };
      if (searchQuery)  p.search = searchQuery;
  if (selectedLabel) p.label = selectedLabel;

    switch (type) {
      case 'inbox':    p.status = 'RECEIVED';  break;
      case 'sent':     p.status = 'SENT';      break;
      case 'drafts':   p.status = 'DRAFT';     break;
      case 'starred':  p.is_starred = true;    break;
      case 'spam':     p.is_spam = true;       break;
      case 'scheduled':p.status = 'SCHEDULED'; break;
    }
    return p;
  };

  // Fetch when currentPage changes (including initial)
  // const didFetchOnMount = useRef(false);

useEffect(() => {
  // if (!didFetchOnMount.current) {
  //   didFetchOnMount.current = true;
  //   return;              // skip the first mount
  // }
  fetchMessages(buildParams(currentPage));
  navigate({ search: `?page=${currentPage}` }, { replace: true });
}, [currentPage, selectedLabel]);


  // Reset to page 1 when type or search changes (skip initial mount)
  console.log("searchQuery",searchQuery, "type",type)
useEffect(() => {
  // on first mount just mark that we've been here and do nothing
  if (!hasMounted.current) {
    hasMounted.current = true;
    return;
  }

  setCurrentPage(1);
}, [type, searchQuery]);

  // Clear selection when messages change
  useEffect(() => {
    setSelectAll(false);
    setSelectedMessages([]);
  }, [messages]);

  // Handle select-all toggle
  useEffect(() => {
    if (selectAll) {
      setSelectedMessages(messages.map(m => m.id));
    } else {
      setSelectedMessages([]);
    }
  }, [selectAll, messages]);

  const startCount = totalCount > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const endCount   = Math.min(currentPage * perPage, totalCount);

  // Bulk action handler
  const handleBulk = async (action: 'read' | 'star' | 'spam' |'delete', ids?: number[], value: boolean= true) => {
  const targetIds = ids || selectedMessages;
  if (targetIds.length === 0) return;

  let field: 'is_read' | 'is_starred' | 'is_spam' | 'is_deleted' | null = null;
    let successMessage = '';
  if (action === 'read') {
    if (type === 'sent') return;
    field = 'is_read';
      const hasUnread = targetIds.some(id => {
      const msg = messages.find(m => m.id === id);
      return msg && !msg.is_read;
    });
        value = hasUnread;
        successMessage = value ? 'Marked as read.' : 'Marked as unread.';

  } else if (action === 'star') {
    field = 'is_starred';
    const hasUnstarred = targetIds.some(id => {
      const msg = messages.find(m => m.id === id);
      return msg && !msg.is_starred;
    });
    value = hasUnstarred;
    successMessage = value ? 'Marked as starred.' : 'Removed from starred.';
  } else if (action === 'spam') {
    const hasNotSpam = targetIds.some(id => {
      const msg = messages.find(m => m.id === id);
      return msg && !msg.is_spam;
    });
    value = hasNotSpam;

    successMessage = value ? 'Marked as spam.' : 'Marked as not spam.';

    if (type === 'sent') return;
    field = 'is_spam';
  }
  else if (action === 'delete') {
    field = 'is_deleted';
    value = true; // always true when deleting
    successMessage = 'Moved to trash.';
  }

  if (field) {
    try {
      await bulkMarkMessages(targetIds, field, value);
      toast.success(successMessage);
      setSelectAll(false);
      setSelectedMessages([]);
      fetchMessages(buildParams(currentPage));
    } catch (error) {
      toast.error('Bulk action failed.');
    }
  }
};

  // Refresh current page
  const handleRefresh = () => {
    setSelectAll(false);
    fetchMessages(buildParams(currentPage));
  };

  // Navigate to detail preserving current query
  const handleClickMsg = async (msg: Message) => {
      if (type !== 'sent') {
      const idsToMark: number[] = [];

      if (!msg.is_read) {
        idsToMark.push(msg.id);
      }

      if (msg.replies && msg.replies.length > 0) {
        msg.replies.forEach(reply => {
          if (!reply.is_read) {
            idsToMark.push(reply.id);
          }
        });
      }

      if (idsToMark.length > 0) {
        await bulkMarkMessages(idsToMark, 'is_read', true);
        await  useMessagesStore.getState().updateMessagesLocally(idsToMark, { is_read: true });

      }
    }

    // preserve ?page=...&search=... in URL
    navigate({
      pathname: `/messages/${msg.id}`,
      search: location.search
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Toolbar */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={() => setSelectAll(v => !v)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          {selectedMessages.length > 0 ? (
            <>
              {type !== 'sent' && (
                <Button variant="ghost" size="icon" onClick={() => handleBulk('read')} title="Mark read">
                  <MailOpen size={18} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleBulk('star')} title="Star">
                <Star size={18} />
              </Button>
              {type !== 'sent' && (
                <Button variant="ghost" size="icon" onClick={() => handleBulk('spam')} title="Report spam">
                  <AlertOctagon size={18} />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleBulk('delete')} title="Delete">
              <Trash2 size={18} />
            </Button>
            </>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} title="Refresh">
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-700">
          <span>{startCount}-{endCount} of {totalCount}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            title="Prev"
          >
            <ChevronLeft size={20} />
          </Button>
          <span>Page {currentPage} of {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
            title="Next"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-auto">
        {isLoading && !messages.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : !messages.length ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MailIcon size={48} className="mb-4" />
            <p>No messages to display</p>
          </div>
        ) : (
            <ul className="divide-y divide-gray-200">
                {messages.map(msg => {
                  const sortedReplies = msg.replies ? [...msg.replies].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
                  const latest = sortedReplies.length > 0 ? sortedReplies[sortedReplies.length - 1] : msg;

                  const isThreadUnread = !msg.is_read || (sortedReplies.length > 0 && sortedReplies.some(r => !r.is_read));
                  if (isThreadUnread) {
                    console.log("msg", msg.id, isThreadUnread, msg.is_read, sortedReplies)
                  }
                  const totalMessages = sortedReplies.length + 1; // parent + replies

                  return (
                      <MessageItem
                          key={`${msg.id}-${isThreadUnread ? 'read' : 'unread'}`}
                          latest={latest}
                          threadCount={totalMessages}
                          isUnread={isThreadUnread}
                          isSelected={selectedMessages.includes(msg.id)}
                          onSelect={() =>
                              setSelectedMessages(prev =>
                                  prev.includes(msg.id) ? prev.filter(x => x !== msg.id) : [...prev, msg.id]
                              )
                          }
                          onClick={() => handleClickMsg(msg)}
                          onStarToggle={() => handleBulk('star', [msg.id], !msg.is_starred)}
                          onSpamToggle={() => handleBulk('spam', [msg.id], !msg.is_spam)}
                      />
                  );
                })}
            </ul>
        )}
      </div>
    </div>
  );
};

export default MessageList;
