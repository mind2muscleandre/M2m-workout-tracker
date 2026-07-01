import { supabase } from '../lib/supabase';
import { DB } from '../lib/dbTables';
import { resolveUserId } from '../lib/resolveUserId';

export interface CoachNote {
  id: string;
  pt_id: string;
  client_id: string | null;
  title: string;
  body: string;
  tags: string[];
  updated_at: string;
  created_at: string;
  client?: { id: string; name: string } | null;
}

export async function listCoachNotes(query?: string): Promise<CoachNote[]> {
  const userId = await resolveUserId();
  let q = supabase
    .from(DB.coachNotes)
    .select('*, client:clients(id, name)')
    .eq('pt_id', userId)
    .order('updated_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let notes = (data ?? []) as CoachNote[];
  if (query?.trim()) {
    const lower = query.toLowerCase();
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        n.body.toLowerCase().includes(lower) ||
        n.client?.name?.toLowerCase().includes(lower)
    );
  }
  return notes;
}

export async function createCoachNote(
  input: Pick<CoachNote, 'title' | 'body' | 'client_id' | 'tags'>
): Promise<CoachNote> {
  const userId = await resolveUserId();
  const { data, error } = await supabase
    .from(DB.coachNotes)
    .insert({ ...input, pt_id: userId })
    .select('*, client:clients(id, name)')
    .single();

  if (error) throw error;
  return data as CoachNote;
}

export async function updateCoachNote(
  id: string,
  input: Partial<Pick<CoachNote, 'title' | 'body' | 'client_id' | 'tags'>>
): Promise<CoachNote> {
  const { data, error } = await supabase
    .from(DB.coachNotes)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, client:clients(id, name)')
    .single();

  if (error) throw error;
  return data as CoachNote;
}

export async function deleteCoachNote(id: string): Promise<void> {
  const { error } = await supabase.from(DB.coachNotes).delete().eq('id', id);
  if (error) throw error;
}
