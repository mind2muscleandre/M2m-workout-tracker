// ============================================
// PT Workout Tracker - Exercise Store
// ============================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DB } from '../lib/dbTables';
import { resolveUserId } from '../lib/resolveUserId';
import { Exercise, ExerciseInsert, ExerciseCategory } from '../types/database';

// ============================================
// Types
// ============================================

interface ExerciseState {
  exercises: Exercise[];
  /** True only while loading the exercise list from the server (not mutations). */
  isFetching: boolean;
  /** Set after a successful `fetchExercises` (for skipping redundant refetches). */
  lastFetchedAt: number | null;
}

interface ExerciseActions {
  fetchExercises: () => Promise<void>;
  addExercise: (data: ExerciseInsert) => Promise<Exercise>;
  updateExercise: (
    id: string,
    data: Partial<Omit<Exercise, 'id' | 'created_at'>>
  ) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getExercisesByCategory: (category: ExerciseCategory) => Exercise[];
  searchExercises: (query: string) => Exercise[];
}

type ExerciseStore = ExerciseState & ExerciseActions;

// ============================================
// Store
// ============================================

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  // State
  exercises: [],
  isFetching: false,
  lastFetchedAt: null,

  // Actions
  fetchExercises: async () => {
    try {
      set({ isFetching: true });

      const userId = await resolveUserId();

      const { data, error } = await supabase
        .from(DB.exercises)
        .select('*')
        .eq('created_by_pt_id', userId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      set({ exercises: data ?? [], lastFetchedAt: Date.now() });
    } catch (error) {
      console.error('Fetch exercises error:', (error as Error).message);
      throw error;
    } finally {
      set({ isFetching: false });
    }
  },

  addExercise: async (data: ExerciseInsert) => {
    try {
      const { data: newExercise, error } = await supabase
        .from(DB.exercises)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        exercises: [...state.exercises, newExercise].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));

      return newExercise;
    } catch (error) {
      console.error('Add exercise error:', (error as Error).message);
      throw error;
    }
  },

  updateExercise: async (
    id: string,
    data: Partial<Omit<Exercise, 'id' | 'created_at'>>
  ) => {
    try {
      const { data: updatedExercise, error } = await supabase
        .from(DB.exercises)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        exercises: state.exercises
          .map((exercise) => (exercise.id === id ? updatedExercise : exercise))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    } catch (error) {
      console.error('Update exercise error:', (error as Error).message);
      throw error;
    }
  },

  deleteExercise: async (id: string) => {
    try {
      const { error } = await supabase
        .from(DB.exercises)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      set((state) => ({
        exercises: state.exercises.filter((exercise) => exercise.id !== id),
      }));
    } catch (error) {
      console.error('Delete exercise error:', (error as Error).message);
      throw error;
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const exercise = get().exercises.find((e) => e.id === id);

      if (!exercise) {
        throw new Error('Exercise not found');
      }

      const { data: updatedExercise, error } = await supabase
        .from(DB.exercises)
        .update({ is_favorite: !exercise.is_favorite })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        exercises: state.exercises.map((e) =>
          e.id === id ? updatedExercise : e
        ),
      }));
    } catch (error) {
      console.error('Toggle favorite error:', (error as Error).message);
      throw error;
    }
  },

  getExercisesByCategory: (category: ExerciseCategory) => {
    const { exercises } = get();
    return exercises.filter((exercise) => exercise.category === category);
  },

  searchExercises: (query: string) => {
    const { exercises } = get();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return exercises;
    }

    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(lowerQuery) ||
        exercise.muscle_group.some((mg) =>
          mg.toLowerCase().includes(lowerQuery)
        )
    );
  },
}));
