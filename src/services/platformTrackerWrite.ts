import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type { TrainingProgramRow } from '../types/platform';

export type CreateTrackerProgramPayload = {
  athleteUserId: string;
  name: string;
  weeks: number;
  startDate?: string | null;
  programType?: string;
  status?: 'active' | 'paused' | 'completed';
};

const DEFAULT_GOAL_KEYS = ['hypertrophy', 'maxstrength', 'functional', 'endurance'] as const;

export async function createTrackerProgramForAthlete(
  payload: CreateTrackerProgramPayload
): Promise<TrainingProgramRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const status = payload.status ?? 'active';

  if (status === 'active') {
    await supabase
      .from(PLATFORM_DB.trainingPrograms)
      .update({ status: 'paused' })
      .eq('user_id', payload.athleteUserId)
      .eq('status', 'active');
  }

  const { data: program, error } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .insert({
      coach_id: user.id,
      user_id: payload.athleteUserId,
      name: payload.name.trim(),
      weeks: payload.weeks,
      duration_weeks: payload.weeks,
      program_type: payload.programType ?? 'strength',
      is_template: false,
      is_shared_template: false,
      start_date: payload.startDate ?? null,
      status,
    })
    .select(
      'id, coach_id, user_id, name, description, program_type, duration_weeks, weeks, status, sport_tag, start_date'
    )
    .single();

  if (error) throw error;

  const programId = (program as TrainingProgramRow).id;
  await seedDefaultTemplates(programId, payload.athleteUserId);
  await seedDefaultSchedule(programId, payload.weeks);

  return program as TrainingProgramRow;
}

async function seedDefaultTemplates(programId: string, userId: string): Promise<void> {
  const rows = DEFAULT_GOAL_KEYS.map((goal_key, index) => ({
    user_id: userId,
    program_id: programId,
    name: goal_key.charAt(0).toUpperCase() + goal_key.slice(1),
    goal_key,
    exercise_count: 0,
    sort_order: index,
    content: { blocks: [] },
  }));

  const { error } = await supabase.from(PLATFORM_DB.workoutTemplates).insert(rows);
  if (error) throw error;
}

async function seedDefaultSchedule(programId: string, weeks: number): Promise<void> {
  const { data: templates } = await supabase
    .from(PLATFORM_DB.workoutTemplates)
    .select('id, sort_order')
    .eq('program_id', programId)
    .order('sort_order');

  const templateIds = (templates ?? []).map((t) => t.id as string);
  const rows: Array<{
    program_id: string;
    week_index: number;
    day_index: number;
    template_id: string | null;
  }> = [];

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const isTraining = d === 1 || d === 3 || d === 5;
      const templateIndex = d === 1 ? 0 : d === 3 ? 1 : d === 5 ? 2 : -1;
      rows.push({
        program_id: programId,
        week_index: w,
        day_index: d,
        template_id: isTraining && templateIndex >= 0 ? templateIds[templateIndex] ?? null : null,
      });
    }
  }

  const { error } = await supabase.from(PLATFORM_DB.programScheduleSlots).insert(rows);
  if (error) throw error;
}

export async function schedulePlannedSession(
  userId: string,
  sessionDate: string,
  sessionName: string,
  sessionType = 'training'
): Promise<void> {
  const { error } = await supabase.from(PLATFORM_DB.plannedSessions).insert({
    user_id: userId,
    session_date: sessionDate,
    session_type: sessionType,
    session_name: sessionName,
    is_completed: false,
  });
  if (error) throw error;
}

export async function updateTrackerProgramStatus(
  programId: string,
  athleteUserId: string,
  status: 'active' | 'paused' | 'completed'
): Promise<void> {
  if (status === 'active') {
    await supabase
      .from(PLATFORM_DB.trainingPrograms)
      .update({ status: 'paused' })
      .eq('user_id', athleteUserId)
      .eq('status', 'active');
  }

  const { error } = await supabase
    .from(PLATFORM_DB.trainingPrograms)
    .update({ status })
    .eq('id', programId);

  if (error) throw error;
}
