// ============================================
// PT Workout Tracker - Navigation Types
// ============================================

import type { NavigatorScreenParams } from '@react-navigation/native';

// ============================================
// Root Stack (Auth + Main + Modal/Detail screens)
// ============================================

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ClientDetail: { clientId: string };
  WorkoutCreate: { clientId: string; templateWorkoutId?: string };
  WorkoutActive: { workoutId: string };
  ExercisePicker: { workoutId: string };
  ExerciseDetail: { exerciseId: string };
  Progression: { clientId: string; exerciseId?: string };
};

// ============================================
// Bottom Tab Navigator
// ============================================

export type MainTabParamList = {
  Clients: undefined;
  Workouts: undefined;
  Exercises: undefined;
  Profile: undefined;
};
