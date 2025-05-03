import React from 'react';
import MessageList from '../components/messages/MessageList';

export const DraftsPage: React.FC = () => {
  return <MessageList type="drafts" />;
};

export default DraftsPage;