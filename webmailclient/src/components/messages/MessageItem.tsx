import React from 'react';
import { Star, AlertOctagon } from 'lucide-react';
import { Message } from '../../types';
import { formatEmailDate, truncateString, decodeMessageSubject } from '../../utils/formatters';
import Avatar from '../ui/Avatar';

interface MessageItemProps {
  latest: Message;
  threadCount: number;
  isUnread: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onStarToggle: () => void;
  onSpamToggle: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  latest,
  threadCount,
  isUnread,
  isSelected,
  onSelect,
  onClick,
  onStarToggle,
  onSpamToggle
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStarToggle();
  };

  const handleSpamClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSpamToggle();
  };
  return (
    <li
      className={`
        relative cursor-pointer
        ${isUnread ? 'bg-white':'bg-blue-50'}
        hover:bg-gray-100
        ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center px-4 py-3">
        <div className="flex items-center space-x-3 pr-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />

          <button
            onClick={handleStarClick}
            className="text-gray-400 hover:text-yellow-500 focus:outline-none"
          >
            <Star
              size={18}
              className={latest.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}
            />
          </button>

          <button
            onClick={handleSpamClick}
            className="text-gray-400 hover:text-red-500 focus:outline-none"
          >
            <AlertOctagon
              size={18}
              className={latest.is_spam ? 'fill-red-500 text-red-500' : ''}
            />
          </button>
        </div>

        <div className="flex-shrink-0 mr-3">
          <Avatar
            name={latest.from_email?.name || latest.from_email?.email}
            email={latest.from_email.email}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
              {latest.from_email.name || latest.from_email.email}
              {threadCount > 1 && (
                <span className="text-xs text-gray-400 ml-1">(+{threadCount})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{formatEmailDate(latest.date)}</p>
          </div>

          <div className="mt-1">
            <p className={`text-sm ${isUnread ? 'text-blue-900' : 'text-gray-900'}`}>
              {decodeMessageSubject(latest.subject)}
            </p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {latest.status === 'SENT'
                ? 'You: ' + truncateString(latest.body_text || '', 50)
                : truncateString(latest.body_text || '', 50)}
            </p>
          </div>
        </div>

        <div className="ml-2 flex-shrink-0">
          {latest.attachments_count > 0 && (
            <span className="inline-block h-5 w-5" title={`${latest.attachments_count} attachments`}>
              📎
            </span>
          )}
          {latest.status === 'PENDING' && (
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" title="Pending" />
          )}
          {latest.status === 'FAILED' && (
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" title="Failed" />
          )}
        </div>
      </div>
    </li>
  );
};

export default MessageItem;
