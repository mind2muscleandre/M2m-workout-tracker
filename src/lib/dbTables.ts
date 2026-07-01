/** Coach-owned tables (pt_* prefix avoids platform collisions). */
export const COACH_DB = {
  users: 'pt_users',
  exercises: 'pt_exercises',
  coachNotes: 'pt_coach_notes',
  clients: 'clients',
  workouts: 'workouts',
  workoutExercises: 'workout_exercises',
  sets: 'sets',
  conversations: 'conversations',
  messages: 'messages',
  ptSettings: 'pt_settings',
  broadcasts: 'coach_broadcasts',
  broadcastRecipients: 'coach_broadcast_recipients',
} as const;

/** Platform tables owned by other M2M apps — coach app reads (mostly) via RLS. */
export const PLATFORM_DB = {
  userProfiles: 'user_profiles',
  // Screening / Perform
  screeningUploads: 'screening_uploads',
  screeningResults: 'screening_results',
  screeningQueue: 'screening_queue',
  mobilityPrograms: 'mobility_programs',
  ohsPrograms: 'ohs_programs',
  exerciseBank: 'exercise_bank',
  movementAssessmentResults: 'movement_assessment_results',
  activityStreaks: 'activity_streaks',
  // Timer (Perform corrective)
  workoutSessions: 'workout_sessions',
  plannedSessions: 'planned_sessions',
  userProgramSubscriptions: 'user_program_subscriptions',
  // Adapt / Tracker
  trainingPrograms: 'training_programs_tracker',
  workoutTemplates: 'workout_templates_tracker',
  programScheduleSlots: 'program_schedule_slots_tracker',
  workoutSessionsTracker: 'workout_sessions_tracker',
  programAssignments: 'program_assignments',
  trainingSessions: 'training_sessions',
  sessionExercises: 'session_exercises',
  platformExercises: 'exercises',
  // Macro
  nutritionGoals: 'nutrition_goals',
  nutritionPlans: 'nutrition_plans',
  nutritionPlanAssignments: 'nutrition_plan_assignments',
  meals: 'meals',
  mealItems: 'meal_items',
  tdeeHistory: 'tdee_history',
  physicalTestResults: 'physical_test_results',
  weightEntries: 'weight_entries',
  waterEntries: 'water_entries',
  seasonCalendar: 'season_calendar',
  coachingRelationships: 'coaching_relationships',
  // Goalsetter
  gsGoals: 'gs_goals',
  gsHabits: 'gs_habits',
  gsTasks: 'gs_tasks',
  gsHabitCompletions: 'gs_habit_completions',
} as const;

/** @deprecated Use COACH_DB — kept for existing imports */
export const DB = COACH_DB;
