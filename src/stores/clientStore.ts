// ============================================
// PT Workout Tracker - Client Store
// ============================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Client, ClientInsert } from '../types/database';

// ============================================
// Types
// ============================================

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  isLoading: boolean;
}

interface ClientActions {
  fetchClients: () => Promise<void>;
  addClient: (data: ClientInsert) => Promise<Client>;
  updateClient: (
    id: string,
    data: Partial<Omit<Client, 'id' | 'created_at'>>
  ) => Promise<void>;
  toggleClientActive: (id: string) => Promise<void>;
  setSelectedClient: (client: Client | null) => void;
  searchClients: (query: string) => Client[];
}

type ClientStore = ClientState & ClientActions;

// ============================================
// Helper: Get current user ID
// ============================================

const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('User not authenticated');
  }

  return user.id;
};

// ============================================
// Store
// ============================================

export const useClientStore = create<ClientStore>((set, get) => ({
  // State
  clients: [],
  selectedClient: null,
  isLoading: false,

  // Actions
  fetchClients: async () => {
    try {
      set({ isLoading: true });

      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('assigned_pt_id', userId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      set({ clients: data ?? [] });
    } catch (error) {
      console.error('Fetch clients error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addClient: async (data: ClientInsert) => {
    try {
      set({ isLoading: true });

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        clients: [...state.clients, newClient].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

      return newClient;
    } catch (error) {
      console.error('Add client error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateClient: async (
    id: string,
    data: Partial<Omit<Client, 'id' | 'created_at'>>
  ) => {
    try {
      set({ isLoading: true });

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        clients: state.clients
          .map((client) => (client.id === id ? updatedClient : client))
          .sort((a, b) => a.name.localeCompare(b.name)),
        selectedClient:
          state.selectedClient?.id === id
            ? updatedClient
            : state.selectedClient,
      }));
    } catch (error) {
      console.error('Update client error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleClientActive: async (id: string) => {
    try {
      const client = get().clients.find((c) => c.id === id);

      if (!client) {
        throw new Error('Client not found');
      }

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? updatedClient : c
        ),
        selectedClient:
          state.selectedClient?.id === id
            ? updatedClient
            : state.selectedClient,
      }));
    } catch (error) {
      console.error('Toggle client active error:', (error as Error).message);
      throw error;
    }
  },

  setSelectedClient: (client: Client | null) => {
    set({ selectedClient: client });
  },

  searchClients: (query: string) => {
    const { clients } = get();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return clients;
    }

    return clients.filter((client) =>
      client.name.toLowerCase().includes(lowerQuery)
    );
  },
}));
