import React from 'react';
import MessageList from '../components/messages/MessageList';

export const InboxPage: React.FC = () => {
  return <MessageList type="inbox" />;
};

export default InboxPage;