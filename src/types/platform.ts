/** Platform table row shapes (read-model for coach aggregation). */

export type AppId = 'perform' | 'tracker' | 'macro' | 'goalsetter';

export type AppBadges = Record<AppId, boolean>;

export type PlatformUserProfile = {
  user_id: string;
  name: string | null;
  email: string | null;
  sport: string | null;
  team: string | null;
  position: string | null;
  age: number | null;
  points: number | null;
  current_streak: number | null;
  last_workout_at: string | null;
  goal_weight?: number | null;
  activity_level?: string | null;
  goal_type?: string | null;
  macro_mode?: string | null;
  current_tdee_estimate?: number | null;
};

export type DirectoryUser = {
  userId: string;
  clientId: string | null;
  name: string;
  email: string | null;
  sport: string | null;
  apps: AppBadges;
  lastActivityAt: string | null;
};

export type WorkoutSessionRow = {
  id: string;
  user_id: string;
  program_type: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  intensity: number | null;
  workout_type: string | null;
  exercises_completed: number | null;
  total_exercises: number | null;
};

export type TrackerSessionRow = {
  id: string;
  user_id: string;
  client_session_id: number;
  goal_key: string;
  started_at: string;
  ended_at: string;
  sets: TrackerSetRow[];
};

export type TrackerSetRow = {
  reps?: number;
  restSec?: number;
  durationSec?: number;
  weight?: number;
};

export type PlannedSessionRow = {
  id: string;
  user_id: string;
  session_date: string;
  session_type: string | null;
  session_name: string | null;
  intensity: number | null;
  duration_minutes: number | null;
  is_completed: boolean;
  completed_at: string | null;
};

export type TrainingProgramRow = {
  id: string;
  coach_id: string | null;
  user_id?: string | null;
  name: string;
  description: string | null;
  program_type: string | null;
  duration_weeks: number | null;
  weeks: number | null;
  status: string | null;
  sport_tag: string | null;
  start_date?: string | null;
};

export type WorkoutTemplateRow = {
  id: string;
  user_id: string;
  program_id: string | null;
  name: string;
  goal_key: string;
  exercise_count: number;
  sort_order: number;
  content?: { blocks?: unknown[] };
};

export type ProgramScheduleSlotRow = {
  id: string;
  program_id: string;
  week_index: number;
  day_index: number;
  template_id: string | null;
};

export type ProgramAssignmentRow = {
  id: string;
  program_id: string;
  athlete_id: string;
  coach_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type TrainingSessionRow = {
  id: string;
  program_id: string;
  week_number: number;
  day_of_week: number;
  session_name: string;
  estimated_duration_minutes: number | null;
  warmup_notes: string | null;
  cooldown_notes: string | null;
};

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  order_index: number;
  sets: number | null;
  reps: string | null;
  load_prescription: string | null;
  rest_seconds: number | null;
  coach_notes: string | null;
};

export type NutritionGoalRow = {
  id: string;
  user_id: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g?: number | null;
  goal_type: string | null;
  is_active: boolean;
};

export type MealRow = {
  id: string;
  user_id: string;
  name: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string | null;
  logged_at: string | null;
};

export type WeightEntryRow = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
};

export type TdeeHistoryRow = {
  id: string;
  user_id: string;
  week_start: string;
  estimated_tdee: number | null;
  target_calories: number | null;
  confidence: number | null;
};

export type PhysicalTestResultRow = {
  id: string;
  user_id: string;
  test_type: string;
  performed_at: string;
  result: Record<string, unknown> | null;
};

export type ScreeningUploadRow = {
  id: string;
  screening_id: string;
  user_id: string | null;
  analysis_type: string | null;
  created_at: string | null;
  uploaded_at?: string | null;
  email?: string | null;
  video_url?: string | null;
};

export type ScreeningResultRow = {
  id: string;
  screening_id: string;
  user_id: string | null;
  testområde: string | null;
  score: number | null;
  analysed_at: string | null;
  feedback?: string | null;
  /** Legacy shape — not present on unified production schema */
  poäng_per_område?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type MovementAssessmentRow = {
  id: string;
  user_id: string;
  created_at: string;
  assessment_date: string;
  client_name: string;
  client_email: string;
  resultat_hallning: number | null;
  resultat_rorlighet: number | null;
  resultat_karna: number | null;
  resultat_stabilitet: number | null;
  resultat_totalt: number | null;
  resultat_band: string | null;
  raw_assessment: Record<string, unknown> | null;
  export_payload: Record<string, unknown> | null;
};

export type ScreeningSessionGroup = {
  screeningId: string;
  analysedAt: string | null;
  areas: { testområde: string | null; score: number | null }[];
  uploadMeta?: ScreeningUploadRow | null;
  mobilityProgram?: MobilityProgramRow | null;
  ohsProgram?: OhsProgramRow | null;
};

export type MobilityProgramRow = {
  id: string;
  screening_id: string;
  user_id: string | null;
  program_full: Record<string, unknown>;
  program_short: Record<string, unknown>;
  exercise_substitutions: Record<string, unknown> | null;
};

export type OhsProgramRow = {
  id: string;
  screening_id: string;
  user_id: string | null;
  program_full: Record<string, unknown>;
  program_short: Record<string, unknown> | null;
  exercise_substitutions: Record<string, unknown> | null;
};

export type ActivityStreakRow = {
  id: string;
  athlete_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type GsGoalRow = {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  factors: string[];
  status: string;
};

export type GsHabitRow = {
  id: string;
  goal_id: string;
  user_id: string;
  name: string;
  frequency: string;
  streak_current: number;
  streak_longest: number;
  last_done_at: string | null;
};

export type GsTaskRow = {
  id: string;
  goal_id: string;
  habit_id: string | null;
  user_id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  created_by_coach: boolean;
};

export type TrackerProgramView = {
  program: TrainingProgramRow;
  templates: WorkoutTemplateRow[];
  slots: ProgramScheduleSlotRow[];
  sessions: TrackerSessionRow[];
  trends: TrackerTrendPoint[];
};

export type TrackerTrendPoint = {
  date: string;
  goalKey: string;
  totalSets: number;
  avgRestSec: number | null;
};

export type PerformView = {
  screeningSessions: ScreeningSessionGroup[];
  screenings: ScreeningUploadRow[];
  screeningResults: ScreeningResultRow[];
  movementAssessments: MovementAssessmentRow[];
  mobilityPrograms: MobilityProgramRow[];
  ohsPrograms: OhsProgramRow[];
  workoutHistory: WorkoutSessionRow[];
  loadErrors?: string[];
};

export type MacroView = {
  nutritionGoal: NutritionGoalRow | null;
  recentMeals: MealRow[];
  weightEntries: WeightEntryRow[];
  tdeeHistory: TdeeHistoryRow[];
};

export type AdaptProgramView = {
  program: TrainingProgramRow;
  assignment: ProgramAssignmentRow | null;
  sessions: TrainingSessionRow[];
  currentWeek: number;
};

export type GoalsetterView = {
  nutritionGoal: NutritionGoalRow | null;
  routines: PlannedSessionRow[];
  physicalTests: PhysicalTestResultRow[];
  hasSportGoals: boolean;
  goals: GsGoalRow[];
  habits: GsHabitRow[];
  tasks: GsTaskRow[];
  activityStreak: ActivityStreakRow | null;
};

export type AthleteAggregateView = {
  clientId: string;
  userId: string | null;
  linkedUserId: string | null;
  profile: PlatformUserProfile | null;
  apps: AppBadges;
  timerSessions: WorkoutSessionRow[];
  coachWorkouts: import('./database').Workout[];
  adapt: AdaptProgramView | null;
  perform: PerformView | null;
  tracker: TrackerProgramView | null;
  macro: MacroView | null;
  goalsetter: GoalsetterView;
  lastActivityAt: string | null;
  loadWarnings: string[];
};

export type BroadcastRow = {
  id: string;
  sender_id: string;
  title: string;
  body: string;
  target_scope: string;
  recipient_count: number;
  channels: string[];
  sent_at: string | null;
  created_at: string;
};
