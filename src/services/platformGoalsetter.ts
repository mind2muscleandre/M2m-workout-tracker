import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import type {
  GoalsetterView,
  GsGoalRow,
  GsHabitRow,
  GsTaskRow,
  NutritionGoalRow,
  PhysicalTestResultRow,
  PlannedSessionRow,
  ActivityStreakRow,
} from '../types/platform';

export async function fetchGoalsetterViewForUser(userId: string): Promise<GoalsetterView> {
  const [nutritionRes, routinesRes, testsRes, goalsRes, habitsRes, tasksRes, streakRes] =
    await Promise.all([
      supabase
        .from(PLATFORM_DB.nutritionGoals)
        .select('id, user_id, calories, protein_g, carbs_g, fat_g, goal_type, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from(PLATFORM_DB.plannedSessions)
        .select(
          'id, user_id, session_date, session_type, session_name, intensity, duration_minutes, is_completed, completed_at'
        )
        .eq('user_id', userId)
        .gte('session_date', new Date().toISOString().slice(0, 10))
        .order('session_date')
        .limit(14),
      supabase
        .from(PLATFORM_DB.physicalTestResults)
        .select('id, user_id, test_type, performed_at, result')
        .eq('user_id', userId)
        .order('performed_at', { ascending: false })
        .limit(10),
      supabase
        .from(PLATFORM_DB.gsGoals)
        .select('id, user_id, title, deadline, factors, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from(PLATFORM_DB.gsHabits)
        .select('id, goal_id, user_id, name, frequency, streak_current, streak_longest, last_done_at')
        .eq('user_id', userId)
        .order('created_at'),
      supabase
        .from(PLATFORM_DB.gsTasks)
        .select('id, goal_id, habit_id, user_id, title, due_date, is_completed, created_by_coach')
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(30),
      supabase
        .from(PLATFORM_DB.activityStreaks)
        .select('id, athlete_id, current_streak, longest_streak, last_active_date')
        .eq('athlete_id', userId)
        .maybeSingle(),
    ]);

  const safe = <T>(res: { data: T | null; error: { code?: string; message?: string } | null }) => {
    if (res.error?.code === '42P01' || res.error?.message?.includes('does not exist')) {
      return null;
    }
    if (res.error) throw res.error;
    return res.data;
  };

  const goals = (safe(goalsRes) ?? []) as GsGoalRow[];
  const habits = (safe(habitsRes) ?? []) as GsHabitRow[];
  const tasks = (safe(tasksRes) ?? []) as GsTaskRow[];

  if (nutritionRes.error) throw nutritionRes.error;
  if (routinesRes.error) throw routinesRes.error;
  if (testsRes.error) throw testsRes.error;

  return {
    nutritionGoal: (nutritionRes.data as NutritionGoalRow | null) ?? null,
    routines: (routinesRes.data ?? []) as PlannedSessionRow[],
    physicalTests: (testsRes.data ?? []) as PhysicalTestResultRow[],
    hasSportGoals: goals.length > 0,
    goals: goals.map((g) => ({
      ...g,
      factors: Array.isArray(g.factors) ? g.factors : [],
    })),
    habits,
    tasks,
    activityStreak: (safe(streakRes) as ActivityStreakRow | null) ?? null,
  };
}

export function nutritionGoalSummary(goal: NutritionGoalRow | null): string {
  if (!goal) return 'Inget aktivt näringsmål';
  const parts: string[] = [];
  if (goal.calories) parts.push(`${goal.calories} kcal`);
  if (goal.protein_g) parts.push(`${goal.protein_g}g protein`);
  return parts.join(' · ') || 'Näringsmål aktivt';
}

export async function createGsGoal(
  userId: string,
  title: string,
  deadline?: string | null,
  factors: string[] = []
): Promise<string> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.gsGoals)
    .insert({ user_id: userId, title, deadline: deadline ?? null, factors })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createGsHabit(
  userId: string,
  goalId: string,
  name: string,
  frequency = 'daily'
): Promise<string> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.gsHabits)
    .insert({ user_id: userId, goal_id: goalId, name, frequency })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function createGsTask(
  userId: string,
  goalId: string,
  title: string,
  dueDate?: string | null,
  habitId?: string | null
): Promise<string> {
  const { data, error } = await supabase
    .from(PLATFORM_DB.gsTasks)
    .insert({
      user_id: userId,
      goal_id: goalId,
      habit_id: habitId ?? null,
      title,
      due_date: dueDate ?? null,
      created_by_coach: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function completeGsTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from(PLATFORM_DB.gsTasks)
    .update({ is_completed: true })
    .eq('id', taskId);
  if (error) throw error;
}

export async function completeGsHabit(habitId: string): Promise<void> {
  const { data: habit, error: fetchErr } = await supabase
    .from(PLATFORM_DB.gsHabits)
    .select('streak_current, streak_longest')
    .eq('id', habitId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = ((habit as { streak_current: number }).streak_current ?? 0) + 1;
  const longest = Math.max(current, (habit as { streak_longest: number }).streak_longest ?? 0);

  const { error: updateErr } = await supabase
    .from(PLATFORM_DB.gsHabits)
    .update({
      streak_current: current,
      streak_longest: longest,
      last_done_at: new Date().toISOString(),
    })
    .eq('id', habitId);
  if (updateErr) throw updateErr;

  await supabase.from(PLATFORM_DB.gsHabitCompletions).insert({ habit_id: habitId });
}
