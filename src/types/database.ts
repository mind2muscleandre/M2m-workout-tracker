// ============================================
// PT Workout Tracker - Database Types
// ============================================

export type UserRole = 'pt' | 'client';

export type ExerciseCategory =
  | 'strength'
  | 'power'
  | 'conditioning'
  | 'mobility'
  | 'injury_prevention';

export type WorkoutStatus = 'planned' | 'in_progress' | 'completed';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'calves'
  | 'forearms'
  | 'full_body';

// ============================================
// Database Row Types
// ============================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  gym_id: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  assigned_pt_id: string;
  client_user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscle_group: string[];
  equipment: string | null;
  description: string | null;
  video_url: string | null;
  is_favorite: boolean;
  created_by_pt_id: string;
  created_at: string;
}

export interface Workout {
  id: string;
  client_id: string;
  created_by_pt_id: string;
  date: string;
  title: string | null;
  notes: string | null;
  total_duration_seconds: number | null;
  is_template: boolean;
  template_name: string | null;
  status: WorkoutStatus;
  created_at: string;
  completed_at: string | null;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  notes: string | null;
  is_superset_with_next: boolean;
  // Joined data
  exercise?: Exercise;
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rest_time_seconds: number | null;
  rpe: number | null;
  rir: number | null;
  notes: string | null;
  is_pr: boolean;
  completed_at: string;
}

// ============================================
// Insert Types (for creating new records)
// ============================================

export type ClientInsert = Omit<Client, 'id' | 'created_at'> & {
  id?: string;
};

export type ExerciseInsert = Omit<Exercise, 'id' | 'created_at'> & {
  id?: string;
};

export type WorkoutInsert = Omit<Workout, 'id' | 'created_at'> & {
  id?: string;
};

export type WorkoutExerciseInsert = Omit<WorkoutExercise, 'id' | 'exercise'> & {
  id?: string;
};

export type WorkoutSetInsert = Omit<WorkoutSet, 'id' | 'is_pr'> & {
  id?: string;
};

// ============================================
// Expanded types with relations
// ============================================

export interface WorkoutWithExercises extends Workout {
  workout_exercises: (WorkoutExercise & {
    exercise: Exercise;
    sets: WorkoutSet[];
  })[];
  client?: Client;
}

export interface ClientWithStats extends Client {
  total_workouts: number;
  last_workout_date: string | null;
}

export interface ExerciseHistory {
  date: string;
  sets: WorkoutSet[];
  workout_id: string;
}

export interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  volume: number;
  date: string;
  estimated_1rm: number;
}

// ============================================
// Supabase Database type (for typed client)
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: Partial<Omit<Client, 'id' | 'created_at'>>;
        Relationships: [];
      };
      exercises: {
        Row: Exercise;
        Insert: ExerciseInsert;
        Update: Partial<Omit<Exercise, 'id' | 'created_at'>>;
        Relationships: [];
      };
      workouts: {
        Row: Workout;
        Insert: WorkoutInsert;
        Update: Partial<Omit<Workout, 'id' | 'created_at'>>;
        Relationships: [];
      };
      workout_exercises: {
        Row: WorkoutExercise;
        Insert: WorkoutExerciseInsert;
        Update: Partial<Omit<WorkoutExercise, 'id'>>;
        Relationships: [];
      };
      sets: {
        Row: WorkoutSet;
        Insert: WorkoutSetInsert;
        Update: Partial<Omit<WorkoutSet, 'id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      exercise_category: ExerciseCategory;
      workout_status: WorkoutStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
