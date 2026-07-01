import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type {
  AdaptProgramView,
  ProgramAssignmentRow,
  SessionExerciseRow,
  TrainingProgramRow,
  TrainingSessionRow,
} from '../types/platform';

const DAY_LABELS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? `D${dayOfWeek}`;
}

export async function fetchActiveProgramForAthlete(
  athleteUserId: string
): Promise<AdaptProgramView | null> {
  const { data: assignments, error: assignErr } = await supabase
    .from(PLATFORM_DB.programAssignments)
    .select('id, program_id, athlete_id, coach_id, start_date, end_date, status')
    .eq('athlete_id', athleteUserId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (assignErr) throw assignErr;
  const assignment = (assignments?.[0] ?? null) as ProgramAssignmentRow | null;
  if (!assignment) return null;

  const { data: program, error: progErr } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .select(
      'id, coach_id, name, description, program_type, duration_weeks, weeks, status, sport_tag'
    )
    .eq('id', assignment.program_id)
    .maybeSingle();

  if (progErr) throw progErr;
  if (!program) return null;

  const { data: sessions, error: sessErr } = await supabase
    .from(PLATFORM_DB.trainingSessions)
    .select(
      'id, program_id, week_number, day_of_week, session_name, estimated_duration_minutes, warmup_notes, cooldown_notes'
    )
    .eq('program_id', assignment.program_id)
    .order('week_number')
    .order('day_of_week');

  if (sessErr) throw sessErr;

  const startDate = new Date(assignment.start_date);
  const weeksSinceStart = Math.max(
    1,
    Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  );

  return {
    program: program as TrainingProgramRow,
    assignment,
    sessions: (sessions ?? []) as TrainingSessionRow[],
    currentWeek: Math.min(weeksSinceStart, program.duration_weeks ?? program.weeks ?? weeksSinceStart),
  };
}

export async function fetchSessionExercises(sessionId: string): Promise<SessionExerciseRow[]> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.sessionExercises)
    .select(
      'id, session_id, exercise_id, order_index, sets, reps, load_prescription, rest_seconds, coach_notes'
    )
    .eq('session_id', sessionId)
    .order('order_index');

  if (error) throw error;
  return (data ?? []) as SessionExerciseRow[];
}

export async function fetchCoachPrograms(): Promise<TrainingProgramRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  let q = supabase
    .from(PLATFORM_DB.trainingPrograms)
    .select(
      'id, coach_id, user_id, name, description, program_type, duration_weeks, weeks, status, sport_tag'
    )
    .order('created_at', { ascending: false });

  if (user) {
    q = q.eq('coach_id', user.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TrainingProgramRow[];
}

export function weekScheduleForProgram(
  view: AdaptProgramView,
  weekNumber?: number
): { day: number; label: string; session: TrainingSessionRow | null; isRest: boolean }[] {
  const week = weekNumber ?? view.currentWeek;
  const weekSessions = view.sessions.filter((s) => s.week_number === week);
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const session = weekSessions.find((s) => s.day_of_week === day) ?? null;
    return {
      day,
      label: dayLabel(day),
      session,
      isRest: !session,
    };
  });
}

export function todayAdaptSession(view: AdaptProgramView): TrainingSessionRow | null {
  const todayDow = new Date().getDay();
  return (
    view.sessions.find(
      (s) => s.week_number === view.currentWeek && s.day_of_week === todayDow
    ) ?? null
  );
}
