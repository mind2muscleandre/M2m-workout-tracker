// ============================================
// PT Workout Tracker - Client Store
// ============================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { resolveUserId } from '../lib/resolveUserId';
import { Client, ClientInsert } from '../types/database';
import type { AthleteProfile } from '../types/athlete';
import { listAssignableAthletes } from '../services/athleteCatalog';

// ============================================
// Types
// ============================================

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  /** True only while loading the client list from the server (not mutations). */
  isFetching: boolean;
}

interface ClientActions {
  fetchClients: () => Promise<void>;
  /** Load one client by id and merge into `clients` (for deep links / missing cache). */
  fetchClientById: (id: string) => Promise<Client | null>;
  addClient: (data: ClientInsert) => Promise<Client>;
  assignAthlete: (athlete: AthleteProfile, coachId?: string) => Promise<Client>;
  fetchAssignableAthletes: (query?: string) => Promise<AthleteProfile[]>;
  isClientAssignedToCurrentUser: (client: Client | null, userId?: string | null) => boolean;
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
// Store
// ============================================

export const useClientStore = create<ClientStore>((set, get) => ({
  // State
  clients: [],
  selectedClient: null,
  isFetching: false,

  // Actions
  fetchClients: async () => {
    try {
      set({ isFetching: true });

      const userId = await resolveUserId();

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
      set({ isFetching: false });
    }
  },

  fetchClientById: async (id: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Fetch client by id error:', error.message);
      throw error;
    }
    if (!data) {
      return null;
    }

    set((state) => {
      const exists = state.clients.some((c) => c.id === id);
      const clients = exists
        ? state.clients.map((c) => (c.id === id ? data : c))
        : [...state.clients, data].sort((a, b) => a.name.localeCompare(b.name));
      return { clients };
    });

    return data;
  },

  assignAthlete: async (athlete: AthleteProfile, coachId?: string) => {
    try {
      const userId = await resolveUserId();
      const targetCoachId = coachId ?? userId;

      const { data: assigned, error: rpcError } = await supabase.rpc('coach_assign_athlete', {
        p_athlete_user_id: athlete.user_id,
        p_coach_id: targetCoachId,
        p_name: athlete.name,
        p_email: athlete.email || null,
        p_team: athlete.team,
      });

      if (!rpcError && assigned) {
        const client = assigned as Client;
        set((state) => {
          const exists = state.clients.some((c) => c.id === client.id);
          const clients = exists
            ? state.clients.map((c) => (c.id === client.id ? client : c))
            : [...state.clients, client].sort((a, b) => a.name.localeCompare(b.name));
          return { clients };
        });
        return client;
      }

      if (rpcError?.code !== 'PGRST202') {
        throw rpcError ?? new Error('Kunde inte tilldela atlet');
      }

      const { data: existing, error: existingError } = await supabase
        .from('clients')
        .select('*')
        .eq('assigned_pt_id', targetCoachId)
        .eq('client_user_id', athlete.user_id)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        const { data: reactivated, error: updateError } = await supabase
          .from('clients')
          .update({
            name: athlete.name,
            email: athlete.email || existing.email,
            is_active: true,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        set((state) => {
          const clients = state.clients.some((c) => c.id === reactivated.id)
            ? state.clients.map((c) => (c.id === reactivated.id ? reactivated : c))
            : [...state.clients, reactivated].sort((a, b) => a.name.localeCompare(b.name));
          return { clients };
        });
        return reactivated;
      }

      const email = athlete.email?.trim() || null;
      if (email) {
        const { data: byEmail } = await supabase
          .from('clients')
          .select('*')
          .eq('assigned_pt_id', targetCoachId)
          .ilike('email', email)
          .is('client_user_id', null)
          .maybeSingle();

        if (byEmail) {
          const { data: linked, error: linkError } = await supabase
            .from('clients')
            .update({
              client_user_id: athlete.user_id,
              name: athlete.name,
              is_active: true,
            })
            .eq('id', byEmail.id)
            .select()
            .single();

          if (linkError) throw linkError;

          set((state) => ({
            clients: state.clients
              .map((c) => (c.id === linked.id ? linked : c))
              .sort((a, b) => a.name.localeCompare(b.name)),
          }));
          return linked;
        }
      }

      const { data: created, error: insertError } = await supabase
        .from('clients')
        .insert({
          assigned_pt_id: targetCoachId,
          client_user_id: athlete.user_id,
          name: athlete.name,
          email,
          phone: null,
          notes: athlete.team ? `Lag: ${athlete.team}` : null,
          sport: null,
          age: null,
          weight_kg: null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      set((state) => ({
        clients: [...state.clients, created].sort((a, b) => a.name.localeCompare(b.name)),
      }));

      return created;
    } catch (error) {
      console.error('Assign athlete error:', (error as Error).message);
      throw error;
    }
  },

  isClientAssignedToCurrentUser: (client, userId) => {
    if (!client || !userId) return false;
    return client.assigned_pt_id === userId && client.is_active;
  },

  fetchAssignableAthletes: async (query?: string) => {
    return listAssignableAthletes({ query, limit: 80 });
  },

  addClient: async (data: ClientInsert) => {
    try {
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
    }
  },

  updateClient: async (
    id: string,
    data: Partial<Omit<Client, 'id' | 'created_at'>>
  ) => {
    try {
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
