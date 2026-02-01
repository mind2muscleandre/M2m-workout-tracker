// ============================================
// PT Workout Tracker - Workout Store
// ============================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  Workout,
  WorkoutInsert,
  WorkoutWithExercises,
  WorkoutSetInsert,
  WorkoutSet,
} from '../types/database';

// ============================================
// Types
// ============================================

interface WorkoutState {
  workouts: Workout[];
  activeWorkout: WorkoutWithExercises | null;
  isLoading: boolean;
}

interface WorkoutActions {
  fetchWorkouts: (clientId: string) => Promise<void>;
  createWorkout: (data: WorkoutInsert) => Promise<string>;
  fetchWorkoutDetail: (workoutId: string) => Promise<void>;
  startWorkout: (workoutId: string) => Promise<void>;
  completeWorkout: (workoutId: string) => Promise<void>;
  addExerciseToWorkout: (
    workoutId: string,
    exerciseId: string,
    orderIndex: number,
    targetSets: number | null,
    targetReps: string | null
  ) => Promise<void>;
  removeExerciseFromWorkout: (workoutExerciseId: string) => Promise<void>;
  reorderExercises: (
    workoutId: string,
    exerciseIds: string[]
  ) => Promise<void>;
  logSet: (data: WorkoutSetInsert) => Promise<WorkoutSet>;
  updateSet: (
    setId: string,
    data: Partial<Omit<WorkoutSet, 'id'>>
  ) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  copyWorkout: (
    workoutId: string,
    newClientId: string,
    newDate: string
  ) => Promise<string>;
  setActiveWorkout: (workout: WorkoutWithExercises | null) => void;
}

type WorkoutStore = WorkoutState & WorkoutActions;

// ============================================
// Helper: Get current user ID
// ============================================

const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('User not authenticated');
  }

  return user.id;
};

// ============================================
// Store
// ============================================

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  // State
  workouts: [],
  activeWorkout: null,
  isLoading: false,

  // Actions
  fetchWorkouts: async (clientId: string) => {
    try {
      set({ isLoading: true });

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      set({ workouts: data ?? [] });
    } catch (error) {
      console.error('Fetch workouts error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createWorkout: async (data: WorkoutInsert) => {
    try {
      set({ isLoading: true });

      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        workouts: [newWorkout, ...state.workouts],
      }));

      return newWorkout.id;
    } catch (error) {
      console.error('Create workout error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWorkoutDetail: async (workoutId: string) => {
    try {
      set({ isLoading: true });

      // Fetch the workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) {
        throw workoutError;
      }

      // Fetch workout exercises with joined exercise data
      const { data: workoutExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(
          `
          *,
          exercise:exercises(*)
        `
        )
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (exercisesError) {
        throw exercisesError;
      }

      // Fetch all sets for the workout exercises
      const workoutExerciseIds = (workoutExercises ?? []).map((we) => we.id);

      let sets: WorkoutSet[] = [];
      if (workoutExerciseIds.length > 0) {
        const { data: setsData, error: setsError } = await supabase
          .from('sets')
          .select('*')
          .in('workout_exercise_id', workoutExerciseIds)
          .order('set_number', { ascending: true });

        if (setsError) {
          throw setsError;
        }

        sets = setsData ?? [];
      }

      // Assemble the full workout detail
      const workoutWithExercises: WorkoutWithExercises = {
        ...workout,
        workout_exercises: (workoutExercises ?? []).map((we) => ({
          ...we,
          exercise: we.exercise,
          sets: sets.filter((s) => s.workout_exercise_id === we.id),
        })),
      };

      set({ activeWorkout: workoutWithExercises });
    } catch (error) {
      console.error('Fetch workout detail error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  startWorkout: async (workoutId: string) => {
    try {
      const { data: updatedWorkout, error } = await supabase
        .from('workouts')
        .update({ status: 'in_progress' as const })
        .eq('id', workoutId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        workouts: state.workouts.map((w) =>
          w.id === workoutId ? updatedWorkout : w
        ),
        activeWorkout: state.activeWorkout?.id === workoutId
          ? { ...state.activeWorkout, ...updatedWorkout }
          : state.activeWorkout,
      }));
    } catch (error) {
      console.error('Start workout error:', (error as Error).message);
      throw error;
    }
  },

  completeWorkout: async (workoutId: string) => {
    try {
      const completedAt = new Date().toISOString();

      const { data: updatedWorkout, error } = await supabase
        .from('workouts')
        .update({
          status: 'completed' as const,
          completed_at: completedAt,
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set((state) => ({
        workouts: state.workouts.map((w) =>
          w.id === workoutId ? updatedWorkout : w
        ),
        activeWorkout: state.activeWorkout?.id === workoutId
          ? { ...state.activeWorkout, ...updatedWorkout }
          : state.activeWorkout,
      }));
    } catch (error) {
      console.error('Complete workout error:', (error as Error).message);
      throw error;
    }
  },

  addExerciseToWorkout: async (
    workoutId: string,
    exerciseId: string,
    orderIndex: number,
    targetSets: number | null,
    targetReps: string | null
  ) => {
    try {
      const { data: newWorkoutExercise, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workoutId,
          exercise_id: exerciseId,
          order_index: orderIndex,
          target_sets: targetSets,
          target_reps: targetReps,
          notes: null,
          is_superset_with_next: false,
        })
        .select(
          `
          *,
          exercise:exercises(*)
        `
        )
        .single();

      if (error) {
        throw error;
      }

      // Update active workout if viewing this workout
      const { activeWorkout } = get();
      if (activeWorkout?.id === workoutId) {
        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: [
              ...activeWorkout.workout_exercises,
              {
                ...newWorkoutExercise,
                exercise: newWorkoutExercise.exercise,
                sets: [],
              },
            ],
          },
        });
      }
    } catch (error) {
      console.error(
        'Add exercise to workout error:',
        (error as Error).message
      );
      throw error;
    }
  },

  removeExerciseFromWorkout: async (workoutExerciseId: string) => {
    try {
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', workoutExerciseId);

      if (error) {
        throw error;
      }

      // Update active workout
      const { activeWorkout } = get();
      if (activeWorkout) {
        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: activeWorkout.workout_exercises.filter(
              (we) => we.id !== workoutExerciseId
            ),
          },
        });
      }
    } catch (error) {
      console.error(
        'Remove exercise from workout error:',
        (error as Error).message
      );
      throw error;
    }
  },

  reorderExercises: async (workoutId: string, exerciseIds: string[]) => {
    try {
      // Update each workout exercise with its new order index
      const updates = exerciseIds.map((id, index) =>
        supabase
          .from('workout_exercises')
          .update({ order_index: index })
          .eq('id', id)
      );

      const results = await Promise.all(updates);

      // Check for errors in any of the updates
      const failedUpdate = results.find((r) => r.error);
      if (failedUpdate?.error) {
        throw failedUpdate.error;
      }

      // Update active workout ordering locally
      const { activeWorkout } = get();
      if (activeWorkout?.id === workoutId) {
        const reorderedExercises = exerciseIds
          .map((id, index) => {
            const we = activeWorkout.workout_exercises.find(
              (e) => e.id === id
            );
            return we ? { ...we, order_index: index } : null;
          })
          .filter(
            (we): we is NonNullable<typeof we> => we !== null
          );

        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: reorderedExercises,
          },
        });
      }
    } catch (error) {
      console.error('Reorder exercises error:', (error as Error).message);
      throw error;
    }
  },

  logSet: async (data: WorkoutSetInsert) => {
    try {
      const { data: newSet, error } = await supabase
        .from('sets')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update active workout with the new set
      const { activeWorkout } = get();
      if (activeWorkout) {
        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: activeWorkout.workout_exercises.map((we) =>
              we.id === data.workout_exercise_id
                ? { ...we, sets: [...we.sets, newSet] }
                : we
            ),
          },
        });
      }

      return newSet;
    } catch (error) {
      console.error('Log set error:', (error as Error).message);
      throw error;
    }
  },

  updateSet: async (
    setId: string,
    data: Partial<Omit<WorkoutSet, 'id'>>
  ) => {
    try {
      const { data: updatedSet, error } = await supabase
        .from('sets')
        .update(data)
        .eq('id', setId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update active workout with the updated set
      const { activeWorkout } = get();
      if (activeWorkout) {
        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: activeWorkout.workout_exercises.map((we) => ({
              ...we,
              sets: we.sets.map((s) =>
                s.id === setId ? updatedSet : s
              ),
            })),
          },
        });
      }
    } catch (error) {
      console.error('Update set error:', (error as Error).message);
      throw error;
    }
  },

  deleteSet: async (setId: string) => {
    try {
      const { error } = await supabase
        .from('sets')
        .delete()
        .eq('id', setId);

      if (error) {
        throw error;
      }

      // Remove the set from active workout
      const { activeWorkout } = get();
      if (activeWorkout) {
        set({
          activeWorkout: {
            ...activeWorkout,
            workout_exercises: activeWorkout.workout_exercises.map((we) => ({
              ...we,
              sets: we.sets.filter((s) => s.id !== setId),
            })),
          },
        });
      }
    } catch (error) {
      console.error('Delete set error:', (error as Error).message);
      throw error;
    }
  },

  copyWorkout: async (
    workoutId: string,
    newClientId: string,
    newDate: string
  ) => {
    try {
      set({ isLoading: true });

      const userId = await getCurrentUserId();

      // Fetch the source workout with exercises and sets
      const { data: sourceWorkout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) {
        throw workoutError;
      }

      // Create the new workout
      const { data: newWorkout, error: newWorkoutError } = await supabase
        .from('workouts')
        .insert({
          client_id: newClientId,
          created_by_pt_id: userId,
          date: newDate,
          title: sourceWorkout.title,
          notes: sourceWorkout.notes,
          total_duration_seconds: null,
          is_template: false,
          template_name: null,
          status: 'planned' as const,
          completed_at: null,
        })
        .select()
        .single();

      if (newWorkoutError) {
        throw newWorkoutError;
      }

      // Fetch source workout exercises
      const { data: sourceExercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (exercisesError) {
        throw exercisesError;
      }

      if (sourceExercises && sourceExercises.length > 0) {
        // Copy workout exercises
        const newExercises = sourceExercises.map((se) => ({
          workout_id: newWorkout.id,
          exercise_id: se.exercise_id,
          order_index: se.order_index,
          target_sets: se.target_sets,
          target_reps: se.target_reps,
          notes: se.notes,
          is_superset_with_next: se.is_superset_with_next,
        }));

        const { data: insertedExercises, error: insertExError } =
          await supabase
            .from('workout_exercises')
            .insert(newExercises)
            .select();

        if (insertExError) {
          throw insertExError;
        }

        // Fetch the last sets (weights) from the source exercises to carry over
        if (insertedExercises) {
          const sourceExerciseIds = sourceExercises.map((se) => se.id);

          const { data: sourceSets, error: setsError } = await supabase
            .from('sets')
            .select('*')
            .in('workout_exercise_id', sourceExerciseIds)
            .order('set_number', { ascending: true });

          if (setsError) {
            throw setsError;
          }

          if (sourceSets && sourceSets.length > 0) {
            // Map source exercise IDs to new exercise IDs by order_index
            const exerciseIdMap = new Map<string, string>();
            sourceExercises.forEach((se, index) => {
              if (insertedExercises[index]) {
                exerciseIdMap.set(se.id, insertedExercises[index].id);
              }
            });

            // Copy sets with the last recorded weights
            const newSets = sourceSets
              .filter((s) => exerciseIdMap.has(s.workout_exercise_id))
              .map((s) => ({
                workout_exercise_id: exerciseIdMap.get(
                  s.workout_exercise_id
                )!,
                set_number: s.set_number,
                weight_kg: s.weight_kg,
                reps: s.reps,
                rest_time_seconds: s.rest_time_seconds,
                rpe: null as number | null,
                rir: null as number | null,
                notes: null as string | null,
                completed_at: new Date().toISOString(),
              }));

            if (newSets.length > 0) {
              const { error: insertSetsError } = await supabase
                .from('sets')
                .insert(newSets);

              if (insertSetsError) {
                throw insertSetsError;
              }
            }
          }
        }
      }

      // Add the new workout to the list if we are viewing the same client
      set((state) => ({
        workouts:
          state.workouts.length > 0 &&
          state.workouts[0]?.client_id === newClientId
            ? [newWorkout, ...state.workouts]
            : state.workouts,
      }));

      return newWorkout.id;
    } catch (error) {
      console.error('Copy workout error:', (error as Error).message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveWorkout: (workout: WorkoutWithExercises | null) => {
    set({ activeWorkout: workout });
  },
}));
