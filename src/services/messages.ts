import { supabase } from '../lib/supabase';
import { resolveUserId } from '../lib/resolveUserId';

export interface Conversation {
  id: string;
  pt_id: string;
  client_id: string;
  last_message_at: string;
  created_at: string;
  client?: { id: string; name: string; sport: string | null };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const userId = await resolveUserId();
  const { data, error } = await supabase
    .from('conversations')
    .select('*, client:clients(id, name, sport)')
    .eq('pt_id', userId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function getOrCreateConversation(clientId: string): Promise<Conversation> {
  const userId = await resolveUserId();

  const { data: existing } = await supabase
    .from('conversations')
    .select('*, client:clients(id, name, sport)')
    .eq('pt_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ pt_id: userId, client_id: clientId })
    .select('*, client:clients(id, name, sport)')
    .single();

  if (error) throw error;
  return data as Conversation;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const userId = await resolveUserId();

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, body })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function getUnreadCount(): Promise<number> {
  const userId = await resolveUserId();
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .eq('pt_id', userId);

  if (!convos?.length) return 0;

  const ids = convos.map((c) => c.id);
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}
