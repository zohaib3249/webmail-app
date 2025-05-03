import React from 'react';
import MessageList from '../components/messages/MessageList';

export const StarredPage: React.FC = () => {
  return <MessageList type="starred" />;
};

export default StarredPage;