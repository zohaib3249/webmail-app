import { create } from 'zustand';
import { Message, MessageDetails } from '../types';
import messagesApi from '../api/messagesApi';

interface MessagesState {
  messages: Message[];
  selectedMessage: MessageDetails | null;
  totalCount: number;
  labels: string[],
   selectedLabel: string;
  setSelectedLabel: (label: string) => void;
  nextPage: string | null;
  isLoading: boolean;
  isComposeOpen: boolean;
  selectedMailboxes: number[];
  error: string | null;
  searchQuery: string;
  downloadAttachment: (fileId: number) => Promise<void>;
  setSearchQuery: (q: string) => void;
  fetchMessages: (params?: any) => Promise<void>;
updateMessagesLocally: (ids: number[], updates: Partial<Message>) => void;
  fetchMoreMessages: () => Promise<void>;
  fetchMessageDetails: (id: number) => Promise<void>;
  syncNewMessages: () => Promise<number>;
  composeMessage: (data: FormData) => Promise<number>;
  toggleCompose: (open?: boolean) => void;
  setSelectedMailboxes: (mailboxIds: number[]) => void;
    bulkMarkMessages: (ids: number[], field: 'is_read' | 'is_starred' | 'is_spam' | 'is_deleted', value: boolean) => Promise<void>;

}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  selectedMessage: null,
  totalCount: 0,
  nextPage: null,
  isLoading: false,

  isComposeOpen: false,
  selectedMailboxes: [],
  searchQuery: '',                              // ← initial

  error: null,
  labels: ['Work', 'Personal', 'Important'],               // filled from your API on init
  selectedLabel: '',
  setSelectedLabel: label => set({ selectedLabel: label }),

  setSearchQuery: (q: string) => {
    set({ searchQuery: q });
  },

  downloadAttachment: async (fileId: number) => {
  try {
    await messagesApi.downloadAttachment(fileId);
  } catch (error: any) {
    set({ error: error.message || 'Failed to download attachment.' });
  }
},
   bulkMarkMessages: async (ids, field, value) => {
    try {
      await messagesApi.bulkMark({ ids, field, value });
      const messages = get().messages.map(message => {
        if (ids.includes(message.id)) {
          return { ...message, [field]: value };
        }
        return message;
      });
      const selectedMessage = get().selectedMessage;
      if (selectedMessage && ids.includes(selectedMessage.id)) {
        selectedMessage[field] = value;
      }
      set({ messages, selectedMessage: selectedMessage ? { ...selectedMessage } : null });
    } catch (error: any) {
      set({ error: error.message || `Failed to mark messages as ${field}.` });
    }
  },

  fetchMessages: async (params = {}) => {

    console.log("calling");
    try {
      set({ isLoading: true, error: null });
      
      // Include selected mailboxes in params
      const selectedMailboxes = get().selectedMailboxes;
      if (selectedMailboxes.length > 0 && !params.mailboxes) {
        params.mailboxes = selectedMailboxes;
      }
      const q = get().searchQuery.trim();
      if (q) {
        params.search = q;
      }
      const { selectedLabel } = get();
      console.log("selectedLabel1",selectedLabel)
    if (selectedLabel) params.label = selectedLabel;


      const response = await messagesApi.getMessages(params);
      
      set({ 
        messages: response.results,
        totalCount: response.count,
        nextPage: response.next,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch messages.' 
      });
    }
  },
  
  fetchMoreMessages: async () => {
    const { nextPage, messages } = get();
    if (!nextPage) return;
    
    try {
      set({ isLoading: true, error: null });
      
      // Extract page number from nextPage URL
      const url = new URL(nextPage);
      const page = url.searchParams.get('page');
      
      const selectedMailboxes = get().selectedMailboxes;
      const params: any = { page };
      if (selectedMailboxes.length > 0) {
        params.mailboxes = selectedMailboxes;
      }
       const q = get().searchQuery.trim();
        if (q) {
          params.search = q;
        }
      const response = await messagesApi.getMessages(params);
      
      set({ 
        messages: [...messages, ...response.results],
        nextPage: response.next,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch more messages.' 
      });
    }
  },
  updateMessagesLocally: (ids: number[], updates: Partial<Message>) => {
  console.log("updating messages locally", ids, updates);
  set(state => {
    const updatedMessages = state.messages.map(msg => {
      if (ids.includes(msg.id)) {
        return { ...msg, ...updates };
      }
      if (msg.replies && msg.replies.length > 0) {
        return {
          ...msg,
          replies: msg.replies.map(reply =>
            ids.includes(reply.id) ? { ...reply, ...updates } : reply
          )
        };
      }
      return msg;
    });
    return {
      messages: [...updatedMessages]
    };
  });
},

  fetchMessageDetails: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const messageDetails = await messagesApi.getMessage(id);

      // if(!messageDetails.is_read) {
      //   await messagesApi.bulkMark({ids: [id], field: 'is_read', value: true});
      //
      // }
      const updatedMessages = get().messages.map(message =>
        message.id === id ? { ...message, is_read: true } : message
      );
      set({
        selectedMessage: messageDetails,
        messages: updatedMessages,
        isLoading: false
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch message details.' 
      });
    }
  },
  
  syncNewMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await messagesApi.syncNewMessages();
      
      if (response.inserted_new_emails > 0) {
        // Refresh the message list to include new messages
        await get().fetchMessages();
      }
      
      set({ isLoading: false });
      return response.inserted_new_emails;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to sync new messages.' 
      });
      return 0;
    }
  },
  
  composeMessage: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await messagesApi.compose(data);
      
      // Refresh messages to include the new sent message
      await get().fetchMessages();
      
      set({ 
        isComposeOpen: false,
        isLoading: false 
      });
      
      return response.message_id;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to send message.' 
      });
      throw error;
    }
  },
  toggleCompose: (open) => {
    set({ isComposeOpen: open !== undefined ? open : !get().isComposeOpen });
  },
  
  setSelectedMailboxes: (mailboxIds) => {
    set({ selectedMailboxes: mailboxIds });
    // Fetch messages for the newly selected mailboxes
    get().fetchMessages();
  }
}));