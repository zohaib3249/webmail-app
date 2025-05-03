// src/components/layout/AppLayout.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/messagesStore';
import Header from './Header';
import Sidebar from './Sidebar';
import ComposeModal from '../messages/ComposeModal';
import ProfileModal from '../auth/ProfileModal';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loadUserProfile } = useAuthStore();
  const { isComposeOpen } = useMessagesStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (isAuthenticated) {
        await loadUserProfile().catch(console.error);
      } else {
        navigate('/login');
      }
      setIsInitialized(true);
    };
    initializeApp();
  }, [isAuthenticated, loadUserProfile, navigate]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 rounded-full" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(v => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className={`${isSidebarOpen ? 'block' : 'hidden'} lg:block`}>
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {isComposeOpen && <ComposeModal />}
      <ProfileModal />
    </div>
  );
};

export default AppLayout;
