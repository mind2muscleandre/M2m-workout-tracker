import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import { coachAthleteHasScope } from '../lib/consent';
import type { MacroView, MealRow, NutritionGoalRow } from '../types/platform';

const EMPTY_MACRO_VIEW: MacroView = {
  nutritionGoal: null,
  recentMeals: [],
  weightEntries: [],
  tdeeHistory: [],
};

type MealDbRow = Omit<MealRow, 'logged_at'> & { created_at: string | null };

function mapMealRow(row: MealDbRow): MealRow {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    calories: row.calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    meal_type: row.meal_type,
    logged_at: row.created_at,
  };
}

export async function fetchMacroViewForUser(userId: string): Promise<MacroView> {
  const hasScope = await coachAthleteHasScope(userId, 'nutrition');
  if (!hasScope) return { ...EMPTY_MACRO_VIEW };

  const [goalRes, mealsRes, weightRes, tdeeRes] = await Promise.all([
    supabase
      .from(PLATFORM_DB.nutritionGoals)
      .select('id, user_id, calories, protein_g, carbs_g, fat_g, fiber_g, goal_type, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from(PLATFORM_DB.meals)
      .select('id, user_id, name, calories, protein_g, carbs_g, fat_g, meal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(14),
    supabase
      .from(PLATFORM_DB.weightEntries)
      .select('id, user_id, weight_kg, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(14),
    supabase
      .from(PLATFORM_DB.tdeeHistory)
      .select('id, user_id, week_start, estimated_tdee, target_calories, confidence')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(8),
  ]);

  if (goalRes.error) throw goalRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (weightRes.error) throw weightRes.error;
  if (tdeeRes.error) throw tdeeRes.error;

  return {
    nutritionGoal: (goalRes.data as NutritionGoalRow | null) ?? null,
    recentMeals: (mealsRes.data ?? []).map((row) => mapMealRow(row as MealDbRow)),
    weightEntries: weightRes.data ?? [],
    tdeeHistory: tdeeRes.data ?? [],
  };
}

export type MacroGoalUpdate = {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  goal_type?: string | null;
};

export async function updateNutritionGoal(
  goalId: string,
  updates: MacroGoalUpdate
): Promise<void> {
  const { error } = await supabase
    .from(PLATFORM_DB.nutritionGoals)
    .update(updates)
    .eq('id', goalId);
  if (error) throw error;
}

export async function createNutritionGoal(
  userId: string,
  goal: MacroGoalUpdate
): Promise<string> {
  await supabase
    .from(PLATFORM_DB.nutritionGoals)
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data, error } = await supabase
    .from(PLATFORM_DB.nutritionGoals)
    .insert({
      user_id: userId,
      is_active: true,
      ...goal,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
