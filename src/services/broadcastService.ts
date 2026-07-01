import { supabase } from '../lib/supabase';
import { COACH_DB, PLATFORM_DB } from '../lib/dbTables';
import type { AppId, BroadcastRow, DirectoryUser } from '../types/platform';
import { fetchAllPlatformUsers, fetchPtClientDirectory } from './platformUsers';
import type { Client } from '../types/database';

export type BroadcastTargetScope =
  | 'all'
  | 'clients'
  | `app:${AppId}`;

export type SendBroadcastPayload = {
  title: string;
  body: string;
  targetScope: BroadcastTargetScope;
  channels?: string[];
  clients?: Client[];
  isAdmin?: boolean;
};

async function resolveRecipients(
  scope: BroadcastTargetScope,
  clients: Client[],
  isAdmin: boolean
): Promise<DirectoryUser[]> {
  if (scope === 'clients') {
    return fetchPtClientDirectory(clients).then((rows) =>
      rows.filter((r) => r.clientId && clients.find((c) => c.id === r.clientId)?.client_user_id)
    );
  }

  if (!isAdmin && scope === 'all') {
    return fetchPtClientDirectory(clients);
  }

  const all = await fetchAllPlatformUsers('', 500, 0);

  if (scope === 'all') return all;

  const app = scope.replace('app:', '') as AppId;
  return all.filter((u) => u.apps[app]);
}

export async function previewBroadcastRecipients(
  payload: Pick<SendBroadcastPayload, 'targetScope' | 'clients' | 'isAdmin'>
): Promise<number> {
  const recipients = await resolveRecipients(
    payload.targetScope,
    payload.clients ?? [],
    payload.isAdmin ?? false
  );
  return recipients.filter((r) => r.userId).length;
}

export async function sendBroadcast(payload: SendBroadcastPayload): Promise<BroadcastRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const recipients = await resolveRecipients(
    payload.targetScope,
    payload.clients ?? [],
    payload.isAdmin ?? false
  );
  const userIds = [...new Set(recipients.map((r) => r.userId).filter(Boolean))];
  const channels = payload.channels ?? ['in_app'];

  const { data: broadcast, error: broadcastErr } = await supabase
    .from(COACH_DB.broadcasts)
    .insert({
      sender_id: user.id,
      title: payload.title.trim(),
      body: payload.body.trim(),
      target_scope: payload.targetScope,
      recipient_count: userIds.length,
      channels,
      sent_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (broadcastErr) throw broadcastErr;

  if (userIds.length > 0) {
    const rows = userIds.map((uid) => ({
      broadcast_id: broadcast.id,
      user_id: uid,
    }));
    const { error: recipErr } = await supabase
      .from(COACH_DB.broadcastRecipients)
      .insert(rows);
    if (recipErr) throw recipErr;
  }

  if (channels.includes('email')) {
    try {
      await supabase.functions.invoke('coach-broadcast', {
        body: {
          broadcast_id: broadcast.id,
          user_ids: userIds,
        },
      });
    } catch {
      // Email delivery is best-effort until edge function is configured
    }
  }

  return broadcast as BroadcastRow;
}

export async function fetchBroadcasts(): Promise<BroadcastRow[]> {
  const { data, error } = await supabase
    .from(COACH_DB.broadcasts)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as BroadcastRow[];
}

export async function fetchMyBroadcastInbox(): Promise<
  Array<BroadcastRow & { read_at: string | null }>
> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(COACH_DB.broadcastRecipients)
    .select('read_at, coach_broadcasts(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as unknown as { coach_broadcasts: BroadcastRow; read_at: string | null };
    return { ...r.coach_broadcasts, read_at: r.read_at };
  });
}
