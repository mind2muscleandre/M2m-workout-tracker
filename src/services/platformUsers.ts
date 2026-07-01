import { supabase } from '../lib/supabase';
import { COACH_DB, PLATFORM_DB } from '../lib/dbTables';
import type { AppBadges, AppId, DirectoryUser } from '../types/platform';
import type { Client } from '../types/database';

const EMPTY_APPS: AppBadges = {
  perform: false,
  tracker: false,
  macro: false,
  goalsetter: false,
};

export function isAdminRole(role: string | undefined | null): boolean {
  const r = (role ?? '').toLowerCase();
  return r === 'admin' || r === 'moderator';
}

/** Source of truth: DB function checks user_profiles.role for auth.uid(). */
export async function fetchPlatformAdminFlag(): Promise<boolean> {
  const { data, error } = await supabase.rpc('coach_is_admin');
  if (error) {
    console.warn('coach_is_admin RPC:', error.message);
    return false;
  }
  return data === true;
}

async function detectAppUsage(userIds: string[]): Promise<Map<string, AppBadges>> {
  const result = new Map<string, AppBadges>();
  if (userIds.length === 0) return result;

  for (const id of userIds) {
    result.set(id, { ...EMPTY_APPS });
  }

  const checks: Array<{
    app: AppId;
    table: string;
    column: string;
  }> = [
    { app: 'perform', table: PLATFORM_DB.screeningUploads, column: 'user_id' },
    { app: 'perform', table: PLATFORM_DB.screeningResults, column: 'user_id' },
    { app: 'perform', table: PLATFORM_DB.mobilityPrograms, column: 'user_id' },
    { app: 'perform', table: PLATFORM_DB.ohsPrograms, column: 'user_id' },
    { app: 'perform', table: PLATFORM_DB.workoutSessions, column: 'user_id' },
    { app: 'tracker', table: PLATFORM_DB.trainingPrograms, column: 'user_id' },
    { app: 'tracker', table: PLATFORM_DB.workoutSessionsTracker, column: 'user_id' },
    { app: 'macro', table: PLATFORM_DB.nutritionGoals, column: 'user_id' },
    { app: 'macro', table: PLATFORM_DB.meals, column: 'user_id' },
    { app: 'goalsetter', table: PLATFORM_DB.gsGoals, column: 'user_id' },
    { app: 'goalsetter', table: PLATFORM_DB.plannedSessions, column: 'user_id' },
  ];

  await Promise.all(
    checks.map(async ({ app, table, column }) => {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .in(column, userIds);

      if (error) return;

      const seen = new Set<string>();
      for (const row of data ?? []) {
        const uid = (row as unknown as Record<string, string>)[column];
        if (uid && !seen.has(uid)) {
          seen.add(uid);
          const badges = result.get(uid) ?? { ...EMPTY_APPS };
          badges[app] = true;
          result.set(uid, badges);
        }
      }
    })
  );

  return result;
}

function clientToDirectoryUser(client: Client, apps: AppBadges): DirectoryUser {
  return {
    userId: client.client_user_id ?? client.id,
    clientId: client.id,
    name: client.name,
    email: client.email,
    sport: client.sport,
    apps,
    lastActivityAt: client.created_at,
  };
}

export async function fetchPtClientDirectory(clients: Client[]): Promise<DirectoryUser[]> {
  const active = clients.filter((c) => c.is_active);
  const linked = active.filter((c) => c.client_user_id);
  const unlinked = active.filter((c) => !c.client_user_id);

  const userIds = linked.map((c) => c.client_user_id!).filter(Boolean);
  const appMap = await detectAppUsage(userIds);

  const linkedRows = linked.map((c) =>
    clientToDirectoryUser(c, appMap.get(c.client_user_id!) ?? { ...EMPTY_APPS })
  );

  const unlinkedRows = unlinked.map((c) =>
    clientToDirectoryUser(c, { ...EMPTY_APPS })
  );

  return [...linkedRows, ...unlinkedRows];
}

type DirectoryProfileRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  sport: string | null;
  last_workout_at: string | null;
};

async function fetchAllPlatformUserRows(
  query: string,
  limit: number,
  offset: number
): Promise<DirectoryProfileRow[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'coach_list_directory_users',
    {
      p_query: query.trim(),
      p_limit: limit,
      p_offset: offset,
    }
  );

  if (rpcError) {
    if (rpcError.code === 'PGRST202') {
      throw new Error(
        'Admin-lista kräver RPC coach_list_directory_users. Kör migration 20260611130000_admin_rls_hardening.sql.'
      );
    }
    throw new Error(rpcError.message || 'Kunde inte hämta användarlistan');
  }

  return (rpcData ?? []) as DirectoryProfileRow[];
}

export async function fetchAllPlatformUsers(
  query = '',
  limit = 500,
  offset = 0
): Promise<DirectoryUser[]> {
  const profiles = await fetchAllPlatformUserRows(query, limit, offset);
  const userIds = profiles.map((p) => p.user_id as string);
  const appMap = await detectAppUsage(userIds);

  const { data: clientLinks } = await supabase
    .from(COACH_DB.clients)
    .select('id, client_user_id')
    .in('client_user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

  const clientByUser = new Map<string, string>();
  for (const c of clientLinks ?? []) {
    if (c.client_user_id) clientByUser.set(c.client_user_id, c.id);
  }

  return profiles.map((p) => ({
    userId: p.user_id as string,
    clientId: clientByUser.get(p.user_id as string) ?? null,
    name: (p.name as string) || (p.email as string) || 'Okänd',
    email: (p.email as string) ?? null,
    sport: (p.sport as string) ?? null,
    apps: appMap.get(p.user_id as string) ?? { ...EMPTY_APPS },
    lastActivityAt: (p.last_workout_at as string) ?? null,
  }));
}

export async function fetchAppBadgesForUser(userId: string): Promise<AppBadges> {
  const map = await detectAppUsage([userId]);
  return map.get(userId) ?? { ...EMPTY_APPS };
}

export type TrainerProfile = {
  user_id: string;
  name: string;
  email: string | null;
};

export async function fetchTrainers(query = ''): Promise<TrainerProfile[]> {
  const { data, error } = await supabase.rpc('coach_list_trainers', {
    p_query: query.trim(),
  });

  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(
        'Tränarlistan kräver migration coach_assign_athlete_rpc. Kör senaste Supabase-migrationerna.'
      );
    }
    throw new Error(error.message || 'Kunde inte hämta tränare');
  }

  return (data ?? []).map((row: { user_id: string; name: string; email: string | null }) => ({
    user_id: row.user_id,
    name: row.name || row.email || 'Tränare',
    email: row.email,
  }));
}
