// src/store/contactsStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axiosClient from "../api/axiosClient.ts";

export interface Contact {
  email: string;
  name: string;
}

interface ContactsStore {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
}

export const useContactsStore = create<ContactsStore>()(
  devtools((set, get) => ({
    contacts: [],
    isLoading: false,
    error: null,

    fetchContacts: async () => {
      // ❗ Prevent refetch if already loaded
      if (get().contacts.length > 0) {
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const response = await axiosClient.get<Contact[]>('/contacts/');
        set({ contacts: response.data, isLoading: false });
      } catch (err: any) {
        set({ error: err.message || 'Failed to load contacts', isLoading: false });
      }
    },
  }))
);
