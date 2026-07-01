import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type {
  TrackerProgramView,
  TrackerSessionRow,
  TrackerSetRow,
  TrackerTrendPoint,
  TrainingProgramRow,
  WorkoutTemplateRow,
  ProgramScheduleSlotRow,
} from '../types/platform';

export async function fetchActiveTrackerProgram(
  userId: string
): Promise<TrainingProgramRow | null> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .select(
      'id, coach_id, user_id, name, description, program_type, duration_weeks, weeks, status, sport_tag, start_date'
    )
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return (data as TrainingProgramRow | null) ?? null;
}

export async function fetchTrackerSessions(
  userId: string,
  limit = 30
): Promise<TrackerSessionRow[]> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.workoutSessionsTracker)
    .select('id, user_id, client_session_id, goal_key, started_at, ended_at, sets')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...(row as Omit<TrackerSessionRow, 'sets'>),
    sets: parseSets((row as { sets: unknown }).sets),
  }));
}

function parseSets(raw: unknown): TrackerSetRow[] {
  if (!Array.isArray(raw)) return [];
  return raw as TrackerSetRow[];
}

export function computeTrackerTrends(sessions: TrackerSessionRow[]): TrackerTrendPoint[] {
  const byDateGoal = new Map<string, { sets: number; restTotal: number; restCount: number }>();

  for (const session of sessions) {
    const date = session.ended_at.slice(0, 10);
    const key = `${date}:${session.goal_key}`;
    const entry = byDateGoal.get(key) ?? { sets: 0, restTotal: 0, restCount: 0 };
    entry.sets += session.sets.length;
    for (const s of session.sets) {
      if (s.restSec != null) {
        entry.restTotal += s.restSec;
        entry.restCount += 1;
      }
    }
    byDateGoal.set(key, entry);
  }

  const points: TrackerTrendPoint[] = [];
  for (const [key, val] of byDateGoal) {
    const [date, goalKey] = key.split(':');
    points.push({
      date,
      goalKey,
      totalSets: val.sets,
      avgRestSec: val.restCount > 0 ? Math.round(val.restTotal / val.restCount) : null,
    });
  }

  return points.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchTrackerViewForUser(userId: string): Promise<TrackerProgramView | null> {
  const program = await fetchActiveTrackerProgram(userId);
  if (!program) {
    const sessions = await fetchTrackerSessions(userId);
    if (sessions.length === 0) return null;
    return {
      program: {
        id: 'none',
        coach_id: null,
        user_id: userId,
        name: 'Inget aktivt program',
        description: null,
        program_type: null,
        duration_weeks: null,
        weeks: null,
        status: null,
        sport_tag: null,
      },
      templates: [],
      slots: [],
      sessions,
      trends: computeTrackerTrends(sessions),
    };
  }

  const [templatesRes, slotsRes, sessions] = await Promise.all([
    supabase
      .from(PLATFORM_DB.workoutTemplates)
      .select('id, user_id, program_id, name, goal_key, exercise_count, sort_order, content')
      .eq('program_id', program.id)
      .order('sort_order'),
    supabase
      .from(PLATFORM_DB.programScheduleSlots)
      .select('id, program_id, week_index, day_index, template_id')
      .eq('program_id', program.id)
      .order('week_index')
      .order('day_index'),
    fetchTrackerSessions(userId),
  ]);

  if (templatesRes.error) throw templatesRes.error;
  if (slotsRes.error) throw slotsRes.error;

  return {
    program,
    templates: (templatesRes.data ?? []) as WorkoutTemplateRow[],
    slots: (slotsRes.data ?? []) as ProgramScheduleSlotRow[],
    sessions,
    trends: computeTrackerTrends(sessions),
  };
}

export async function fetchCoachTrackerPrograms(): Promise<TrainingProgramRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .select(
      'id, coach_id, user_id, name, description, program_type, duration_weeks, weeks, status, sport_tag, start_date'
    )
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrainingProgramRow[];
}
