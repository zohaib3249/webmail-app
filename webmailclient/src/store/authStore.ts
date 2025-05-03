import { create } from 'zustand';
import { User, Mailbox } from '../types';
import authApi from '../api/authApi';

interface AuthState {
  user: User | null;
  mailboxes: Mailbox[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUserProfile: () => Promise<void>;
  defaultMailbox: () => Mailbox;
  setDefaultMailbox: (mailboxId: number) => Promise<void>;
  updatePassword: (current: string, next: string) => Promise<void>;

  // new:
  isProfileModalOpen: boolean;
  toggleProfileModal: (open?: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  mailboxes: [],
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
  try {
    set({ isLoading: true, error: null });
    const response = await authApi.login({ email, password });

    localStorage.setItem('accessToken', response.access);
    if (response.refresh) {
      localStorage.setItem('refreshToken', response.refresh);
    }

    set({
      isAuthenticated: true,
      user: response.user || null,
      isLoading: false,
    });

    await get().loadUserProfile();

  } catch (error: any) {
    set({
      isLoading: false,
      error: error.message || 'Failed to login. Please check your credentials.',
      isAuthenticated: false
    });
    throw error;  // <===== 🔥 throws back to component
  }
},
  defaultMailbox: () => {
  const mailboxes = get().mailboxes;
  return mailboxes.find(m => m.is_default) ?? mailboxes[0];
},

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ 
      user: null, 
      mailboxes: [],
      isAuthenticated: false, 
      error: null 
    });
  },
  
  loadUserProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const profile = await authApi.getUserProfile();
      set({
        user: profile,
        mailboxes: profile.mailboxes,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to load user profile.' 
      });
      throw error;
    }
  },
  
  setDefaultMailbox: async (mailboxId) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.setDefaultMailbox(mailboxId);
      
      // Update the mailbox list to reflect the change
      const mailboxes = get().mailboxes.map(mailbox => ({
        ...mailbox,
        is_default: mailbox.id === mailboxId
      }));
      
      set({ mailboxes, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to set default mailbox.' 
      });
      throw error;
    }
  },
    updatePassword: async (current:string, next: string) => {
    await authApi.changePassword({ current_password: current, new_password: next });
  },
   isProfileModalOpen: false,
  toggleProfileModal: (open) => {
    const next = open === undefined ? !get().isProfileModalOpen : open;
    set({ isProfileModalOpen: next });
  },
}));