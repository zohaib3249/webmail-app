import React from 'react';
import MessageList from '../components/messages/MessageList';

export const SentPage: React.FC = () => {
  return <MessageList type="sent" />;
};

export default SentPage;