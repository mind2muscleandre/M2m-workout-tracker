import { supabase } from './supabase';
import { PLATFORM_DB } from './dbTables';

export type SharedScopes = {
  nutrition: boolean;
  training: boolean;
  goals: boolean;
};

export type ScopeKey = keyof SharedScopes;

const DEFAULT_SCOPES: SharedScopes = {
  nutrition: false,
  training: false,
  goals: false,
};

/** Read athlete consent scopes for the current coach ↔ athlete relationship. */
export async function getSharedScopesForAthlete(athleteId: string): Promise<SharedScopes> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_SCOPES };

  const { data } = await supabase
    .from(PLATFORM_DB.coachingRelationships)
    .select('shared_scopes')
    .eq('coach_id', user.id)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle();

  const scopes = data?.shared_scopes as Partial<SharedScopes> | null;
  return { ...DEFAULT_SCOPES, ...scopes };
}

/**
 * Mirrors `coach_athlete_has_scope` (RLS + legacy clients fallback).
 * Returns false when scope is not shared or coach is unauthenticated.
 */
export async function coachAthleteHasScope(
  athleteId: string,
  scope: ScopeKey
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc('coach_athlete_has_scope', {
    target_athlete_id: athleteId,
    scope_key: scope,
  });

  if (error) {
    // Migration not applied yet — preserve prior coach access via clients table.
    if (error.code === '42883' || error.message?.includes('does not exist')) {
      return true;
    }
    console.warn('coach_athlete_has_scope:', error.message);
    return false;
  }

  return data === true;
}
