// src/components/Sidebar.tsx
import React, { useState } from 'react';
import {
  Inbox,
  Star,
  Send,
  File,
  CalendarClock,
  AlertOctagon,
  ChevronRight,
  ChevronDown,
  PencilLine,
  Users
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMessagesStore } from '../../store/messagesStore';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import Avatar from '../ui/Avatar';

interface SidebarItemProps {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label, icon, count, active, onClick
}) => (
  <li
    className={cn(
      "flex items-center px-3 h-10 rounded-md cursor-pointer transition-colors",
      active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
    )}
    onClick={onClick}
  >
    <span className="mr-3">{icon}</span>
    <span className="flex-1 text-sm">{label}</span>
    {count != null && count > 0 && (
      <span className="bg-blue-100 text-blue-700 text-xs font-semibold rounded-full px-2 py-0.5">
        {count}
      </span>
    )}
  </li>
);

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mailboxes = useAuthStore(state => state.mailboxes);
  // Call the selector to get the actual mailbox object
  const defaultBox = useAuthStore(state => state.defaultMailbox());
  const {
    labels,
    selectedLabel,
    setSelectedLabel,
    selectedMailboxes,
    setSelectedMailboxes,
    toggleCompose
  } = useMessagesStore();

  const [expandedLabels, setExpandedLabels] = useState(true);
  const [expandedMailboxes, setExpandedMailboxes] = useState(true);

  const shortcuts = [
    { label: 'Inbox',      icon: <Inbox size={18}/>,         path: '/inbox' },
    { label: 'Starred',    icon: <Star size={18}/>,          path: '/starred' },
    { label: 'Sent',       icon: <Send size={18}/>,          path: '/sent' },
    { label: 'Drafts',     icon: <File size={18}/>,          path: '/drafts' },
    { label: 'Scheduled',  icon: <CalendarClock size={18}/>, path: '/scheduled' },
    { label: 'Spam',       icon: <AlertOctagon size={18}/>,  path: '/spam' },
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4">
        <Button
          onClick={() => toggleCompose(true)}
          className="w-full justify-start gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          <PencilLine size={18}/> Compose
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {shortcuts.map(({ label, icon, path }) => (
            <SidebarItem
              key={path}
              label={label}
              icon={icon}
              active={location.pathname === path || (path === '/inbox' && location.pathname === '/')}
              onClick={() => navigate(path)}
            />
          ))}
        </ul>

        {/* Labels */}
        <div className="mt-6">
          <div
            className="flex items-center px-3 py-2 cursor-pointer select-none"
            onClick={() => setExpandedLabels(v => !v)}
          >
            {expandedLabels ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            <span className="ml-2 text-sm font-medium text-gray-600">Labels</span>
          </div>
          {expandedLabels && (
            <ul className="mt-1 pl-6 space-y-1">
              {labels.map(lbl => (
                <SidebarItem
                  key={lbl}
                  label={lbl}
                  icon={<span className="block w-3 h-3 rounded-full bg-blue-500" />}
                  active={selectedLabel === lbl}
                  onClick={() => {
                    const next = selectedLabel === lbl ? '' : lbl;
                    setSelectedLabel(next);
                    navigate('/');
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Mailboxes */}
        <div className="mt-6">
          <div
            className="flex items-center px-3 py-2 cursor-pointer select-none"
            onClick={() => setExpandedMailboxes(v => !v)}
          >
            {expandedMailboxes ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
            <span className="ml-2 text-sm font-medium text-gray-600">Mailboxes</span>
          </div>
          {expandedMailboxes && (
            <ul className="mt-1 pl-6 space-y-1">
              {mailboxes.map(box => (
                <SidebarItem
                  key={box.id}
                  label={box.name || box.email.split('@')[0]}
                  icon={<Users size={18}/>}
                  active={selectedMailboxes.includes(box.id)}
                  onClick={() => {
                    const next = selectedMailboxes.includes(box.id)
                      ? selectedMailboxes.filter(x => x !== box.id)
                      : [...selectedMailboxes, box.id];
                    setSelectedMailboxes(next);
                    navigate('/');
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Footer: default mailbox */}
      {defaultBox && (
        <div className="p-4 border-t border-gray-200 flex items-center">
          <Avatar name={defaultBox.name} email={defaultBox.email} size="sm"/>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {defaultBox.name || defaultBox.email}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {defaultBox.email}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
