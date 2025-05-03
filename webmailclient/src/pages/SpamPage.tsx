import React from 'react';
import MessageList from '../components/messages/MessageList';

export const SpamPage: React.FC = () => {
  return <MessageList type="spam" />;
};

export default SpamPage;