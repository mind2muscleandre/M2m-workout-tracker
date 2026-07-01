import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type { PlannedSessionRow, WorkoutSessionRow } from '../types/platform';

export async function fetchWorkoutSessionsForUser(
  userId: string,
  limit = 20
): Promise<WorkoutSessionRow[]> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.workoutSessions)
    .select(
      'id, user_id, program_type, completed_at, duration_seconds, intensity, workout_type, exercises_completed, total_exercises'
    )
    .eq('user_id', userId)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as WorkoutSessionRow[];
}

export async function fetchWorkoutSessionsForUsers(
  userIds: string[],
  limitPerUser = 5
): Promise<WorkoutSessionRow[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from(PLATFORM_DB.workoutSessions)
    .select(
      'id, user_id, program_type, completed_at, duration_seconds, intensity, workout_type, exercises_completed, total_exercises'
    )
    .in('user_id', userIds)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(userIds.length * limitPerUser);

  if (error) throw error;
  return (data ?? []) as WorkoutSessionRow[];
}

export async function fetchPlannedSessionsForUser(
  userId: string,
  options?: { fromDate?: string; limit?: number }
): Promise<PlannedSessionRow[]> {
  let query = supabase
    .from(PLATFORM_DB.plannedSessions)
    .select(
      'id, user_id, session_date, session_type, session_name, intensity, duration_minutes, is_completed, completed_at'
    )
    .eq('user_id', userId)
    .order('session_date', { ascending: true });

  if (options?.fromDate) {
    query = query.gte('session_date', options.fromDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PlannedSessionRow[];
}

export async function fetchTodayPlannedSessions(userId: string): Promise<PlannedSessionRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from(PLATFORM_DB.plannedSessions)
    .select(
      'id, user_id, session_date, session_type, session_name, intensity, duration_minutes, is_completed, completed_at'
    )
    .eq('user_id', userId)
    .eq('session_date', today);

  if (error) throw error;
  return (data ?? []) as PlannedSessionRow[];
}

export function formatSessionDateLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Idag';
  if (diffDays === 1) return 'Igår';
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

export function sessionLoadLabel(session: WorkoutSessionRow): string {
  if (session.intensity != null) return String(session.intensity);
  if (session.duration_seconds) return String(Math.round(session.duration_seconds / 60));
  return '—';
}
