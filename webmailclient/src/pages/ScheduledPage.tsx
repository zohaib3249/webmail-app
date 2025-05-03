import React from 'react';
import MessageList from '../components/messages/MessageList';

export const ScheduledPage: React.FC = () => {
  return <MessageList type="scheduled" />;
};

export default ScheduledPage;