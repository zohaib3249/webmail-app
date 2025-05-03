import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import { useTheme } from './hooks/useTheme';
import InboxPage from './pages/InboxPage';
import StarredPage from './pages/StarredPage';
import SentPage from './pages/SentPage';
import DraftsPage from './pages/DraftsPage';
import ScheduledPage from './pages/ScheduledPage';
import SpamPage from './pages/SpamPage';
import MessageDetailPage from './pages/MessageDetailPage';

const getBaseName = () => {
  const [, first] = window.location.pathname.split('/');
  return first ? `/${first}` : '/';
};

const basename = getBaseName();

const App: React.FC = () => {
  useTheme();
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<AppLayout />}>
          <Route index element={<InboxPage />} />
          <Route path="starred" element={<StarredPage />} />
          <Route path="sent" element={<SentPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="scheduled" element={<ScheduledPage />} />
          <Route path="spam" element={<SpamPage />} />
          <Route path="messages/:id" element={<MessageDetailPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;