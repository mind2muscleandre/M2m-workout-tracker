import { supabase } from '../lib/supabase';
import { COACH_DB, PLATFORM_DB } from '../lib/dbTables';
import type { Client } from '../types/database';
import type { PlatformUserProfile } from '../types/platform';

export async function fetchUserProfile(userId: string): Promise<PlatformUserProfile | null> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.userProfiles)
    .select(
      'user_id, name, email, sport, team, position, age, points, current_streak, last_workout_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as PlatformUserProfile | null;
}

export async function fetchUserProfileByEmail(
  email: string
): Promise<PlatformUserProfile | null> {
  const normalized = email.trim();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from(PLATFORM_DB.userProfiles)
    .select(
      'user_id, name, email, sport, team, position, age, points, current_streak, last_workout_at'
    )
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as PlatformUserProfile | null;
}

export async function fetchUserProfilesForClients(
  clients: Client[]
): Promise<Map<string, PlatformUserProfile>> {
  const userIds = clients
    .map((c) => c.client_user_id)
    .filter((id): id is string => Boolean(id));

  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from(PLATFORM_DB.userProfiles)
    .select(
      'user_id, name, email, sport, team, position, age, points, current_streak, last_workout_at'
    )
    .in('user_id', userIds);

  if (error) throw error;

  const map = new Map<string, PlatformUserProfile>();
  for (const row of (data ?? []) as PlatformUserProfile[]) {
    map.set(row.user_id, row);
  }
  return map;
}

export function enrichClientWithProfile(
  client: Client,
  profile: PlatformUserProfile | null
): Client {
  if (!profile) return client;
  return {
    ...client,
    sport: client.sport ?? profile.sport ?? null,
    age: client.age ?? profile.age ?? null,
    name: client.name || profile.name || client.name,
  };
}

export async function getClientUserId(clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(COACH_DB.clients)
    .select('client_user_id')
    .eq('id', clientId)
    .maybeSingle();

  if (error) throw error;
  return data?.client_user_id ?? null;
}
