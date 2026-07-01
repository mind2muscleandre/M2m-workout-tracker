import { create } from 'zustand';
import {
  listConversations,
  listMessages,
  sendMessage as sendMessageApi,
  getOrCreateConversation,
  getUnreadCount,
  type Conversation,
  type Message,
} from '../services/messages';

interface MessageState {
  conversations: Conversation[];
  messages: Message[];
  activeConversationId: string | null;
  unreadCount: number;
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  openConversation: (clientId: string) => Promise<Conversation>;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  messages: [],
  activeConversationId: null,
  unreadCount: 0,
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const conversations = await listConversations();
      set({ conversations });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    const messages = await listMessages(conversationId);
    set({ messages, activeConversationId: conversationId });
  },

  openConversation: async (clientId) => {
    const conv = await getOrCreateConversation(clientId);
    await get().fetchConversations();
    await get().fetchMessages(conv.id);
    return conv;
  },

  sendMessage: async (conversationId, body) => {
    const msg = await sendMessageApi(conversationId, body);
    set({ messages: [...get().messages, msg] });
    await get().fetchConversations();
  },

  fetchUnreadCount: async () => {
    const unreadCount = await getUnreadCount();
    set({ unreadCount });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
