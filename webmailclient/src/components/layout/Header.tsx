// src/components/layout/Header.tsx
import React, { useEffect, useState } from 'react';
import {
  Search,
  Bell,
  Settings as SettingsIcon,
  Menu,
  X,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/messagesStore';
import { useThemeStore } from '../../store/themeStore'; // added this
import Avatar from '../ui/Avatar';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { logout, user, toggleProfileModal } = useAuthStore();
  const { syncNewMessages, isLoading: syncing, fetchMessages, setSearchQuery } = useMessagesStore();
  const { theme } = useThemeStore(); // added this
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const q = searchTerm.trim();
    setSearchQuery(q);
    fetchMessages({ page: 1 });
  }, [searchTerm]);

  const handleSync = async () => {
    try {
      const count = await syncNewMessages();
      toast.success(count > 0 ? `${count} new emails received` : 'Your inbox is up to date');
    } catch {
      toast.error('Failed to sync messages');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  useEffect(() => {
    const onClick = () => setIsUserMenuOpen(false);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <header className="border-b">
      <div className={`px-4 py-3 flex items-center justify-between transition-all 
        ${theme === 'dark' ? 'bg-gray-900 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>

        {/* mobile hamburger */}
        <button
          className="lg:hidden p-2 mr-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={e => {
            e.stopPropagation();
            onToggleSidebar();
          }}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">W</span>
          </div>
          <span className="hidden md:block text-lg font-bold">WebMail</span>
        </div>

        {/* Search */}
        <div className="flex-1 mx-4 max-w-xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search in emails"
              className={`w-full pl-10 pr-4 py-2 rounded-md transition-all border 
              ${theme === 'dark' ? 'bg-gray-800 border-gray-700 focus:border-blue-500 focus:ring-blue-500' : 'bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSync}
            disabled={syncing}
            title="Sync new messages"
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </Button>
          <Button variant="ghost" size="icon" title="Notifications">
            <Bell size={20} />
          </Button>
          <Button variant="ghost" size="icon" title="Settings">
            <SettingsIcon size={20} />
          </Button>

          {/* Avatar + Menu */}
          <div className="relative">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600"
              onClick={e => {
                e.stopPropagation();
                setIsUserMenuOpen(v => !v);
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </button>
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg z-10 border 
                ${theme === 'dark' ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
                onClick={e => e.stopPropagation()}
              >
                <div className="px-4 py-3 flex items-center space-x-3 border-b">
                  <Avatar name={user?.name} email={user!.email} size="sm" />
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate">
                      {user?.display_name || user?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  className="w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => toggleProfileModal(true)}
                >
                  <SettingsIcon size={16} className="mr-2" /> Change password
                </button>
                <button
                  className="w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
