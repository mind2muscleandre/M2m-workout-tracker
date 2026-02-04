// ============================================
// PT Workout Tracker - Progression Screen
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useClientStore } from '../stores/clientStore';
import ProgressChart from '../components/ProgressChart';
import {
  calculateEstimated1RM,
  calculateVolume,
  formatDate,
  formatDateShort,
} from '../utils/helpers';
import type {
  Exercise,
  WorkoutWithExercises,
  WorkoutSet,
  PersonalRecord,
} from '../types/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';

// ============================================
// Types
// ============================================

type Props = StackScreenProps<RootStackParamList, 'Progression'>;

interface SetHistoryEntry {
  date: string;
  workoutId: string;
  weight: number;
  reps: number;
  rpe: number | null;
  isPR: boolean;
  volume: number;
  estimated1RM: number;
}

interface GroupedSets {
  date: string;
  sets: SetHistoryEntry[];
}

// ============================================
// Component
// ============================================

export const ProgressionScreen: React.FC<Props> = ({ route }) => {
  const { clientId, exerciseId: initialExerciseId } = route.params;

  // ---- Stores ----
  const { workouts, fetchWorkouts, isLoading: workoutsLoading } = useWorkoutStore();
  const { exercises, fetchExercises, isLoading: exercisesLoading } = useExerciseStore();
  const { clients } = useClientStore();

  // ---- State ----
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    initialExerciseId ?? null
  );
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allWorkoutDetails, setAllWorkoutDetails] = useState<WorkoutWithExercises[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // ---- Client info ----
  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  );

  // ---- Fetch data ----
  useEffect(() => {
    fetchExercises().catch(() => {});
    fetchWorkouts(clientId).catch(() => {});
  }, [fetchExercises, fetchWorkouts, clientId]);

  // ---- Fetch all workout details to get sets ----
  useEffect(() => {
    const loadAllWorkoutDetails = async () => {
      if (workouts.length === 0) return;

      setIsLoadingDetails(true);
      try {
        // We will simulate fetching by using the workoutStore fetchWorkoutDetail
        // But since that sets activeWorkout, we fetch individually via supabase
        // For now, we use the workouts array and fetch sets data
        const { supabase } = await import('../lib/supabase');

        const completedWorkouts = workouts.filter(
          (w) => w.status === 'completed' || w.status === 'in_progress'
        );

        if (completedWorkouts.length === 0) {
          setAllWorkoutDetails([]);
          return;
        }

        const workoutIds = completedWorkouts.map((w) => w.id);

        // Fetch all workout_exercises with exercise data
        const { data: workoutExercises, error: weError } = await supabase
          .from('workout_exercises')
          .select('*, exercise:exercises(*)')
          .in('workout_id', workoutIds);

        if (weError) throw weError;

        // Fetch all sets
        const workoutExerciseIds = (workoutExercises ?? []).map((we: any) => we.id);

        let allSets: WorkoutSet[] = [];
        if (workoutExerciseIds.length > 0) {
          const { data: setsData, error: setsError } = await supabase
            .from('sets')
            .select('*')
            .in('workout_exercise_id', workoutExerciseIds)
            .order('set_number', { ascending: true });

          if (setsError) throw setsError;
          allSets = setsData ?? [];
        }

        // Assemble workout details
        const details: WorkoutWithExercises[] = completedWorkouts.map((w) => {
          const wExercises = (workoutExercises ?? [])
            .filter((we: any) => we.workout_id === w.id)
            .map((we: any) => ({
              ...we,
              exercise: we.exercise,
              sets: allSets.filter((s) => s.workout_exercise_id === we.id),
            }));

          return {
            ...w,
            workout_exercises: wExercises,
          };
        });

        setAllWorkoutDetails(details);
      } catch (error) {
        console.error('Error loading workout details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadAllWorkoutDetails();
  }, [workouts]);

  // ---- Exercises client has done ----
  const exercisesWithHistory = useMemo(() => {
    const exerciseIds = new Set<string>();
    allWorkoutDetails.forEach((w) => {
      w.workout_exercises.forEach((we) => {
        if (we.sets.length > 0) {
          exerciseIds.add(we.exercise_id);
        }
      });
    });

    return exercises.filter((e) => exerciseIds.has(e.id));
  }, [allWorkoutDetails, exercises]);

  // ---- Auto-select first exercise if none selected ----
  useEffect(() => {
    if (!selectedExerciseId && exercisesWithHistory.length > 0) {
      setSelectedExerciseId(exercisesWithHistory[0].id);
    }
  }, [selectedExerciseId, exercisesWithHistory]);

  // ---- Selected exercise ----
  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExerciseId),
    [exercises, selectedExerciseId]
  );

  // ---- All sets for selected exercise, sorted by date ----
  const setHistory = useMemo((): SetHistoryEntry[] => {
    if (!selectedExerciseId) return [];

    const entries: SetHistoryEntry[] = [];

    allWorkoutDetails.forEach((w) => {
      w.workout_exercises.forEach((we) => {
        if (we.exercise_id === selectedExerciseId) {
          we.sets.forEach((s) => {
            if (s.weight_kg != null && s.reps != null && s.weight_kg > 0 && s.reps > 0) {
              entries.push({
                date: w.date,
                workoutId: w.id,
                weight: s.weight_kg,
                reps: s.reps,
                rpe: s.rpe,
                isPR: s.is_pr,
                volume: calculateVolume(s.weight_kg, s.reps),
                estimated1RM: calculateEstimated1RM(s.weight_kg, s.reps),
              });
            }
          });
        }
      });
    });

    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }, [allWorkoutDetails, selectedExerciseId]);

  // ---- Grouped sets by date ----
  const groupedSets = useMemo((): GroupedSets[] => {
    const groups: Record<string, SetHistoryEntry[]> = {};

    setHistory.forEach((entry) => {
      if (!groups[entry.date]) {
        groups[entry.date] = [];
      }
      groups[entry.date].push(entry);
    });

    return Object.entries(groups)
      .map(([date, sets]) => ({ date, sets }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [setHistory]);

  // ---- Chart data: best set per session (max weight) ----
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};

    setHistory.forEach((entry) => {
      if (!byDate[entry.date] || entry.weight > byDate[entry.date]) {
        byDate[entry.date] = entry.weight;
      }
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [setHistory]);

  // ---- Stats ----
  const stats = useMemo(() => {
    if (setHistory.length === 0) {
      return {
        estimated1RM: 0,
        bestSetVolume: 0,
        bestSetWeight: 0,
        bestSetReps: 0,
        weekVolume: 0,
        monthVolume: 0,
        trend: 'flat' as const,
      };
    }

    // Estimated 1RM (highest across all sets)
    const maxE1RM = Math.max(...setHistory.map((s) => s.estimated1RM));

    // Best set by volume
    const bestSet = setHistory.reduce((best, s) =>
      s.volume > best.volume ? s : best
    );

    // Volume calculations
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const weekVolume = setHistory
      .filter((s) => s.date >= oneWeekAgo)
      .reduce((sum, s) => sum + s.volume, 0);

    const monthVolume = setHistory
      .filter((s) => s.date >= oneMonthAgo)
      .reduce((sum, s) => sum + s.volume, 0);

    // Trend: compare last 3 sessions average weight with previous 3
    const uniqueDates = [...new Set(setHistory.map((s) => s.date))].sort();
    let trend: 'up' | 'down' | 'flat' = 'flat';

    if (uniqueDates.length >= 4) {
      const recentDates = uniqueDates.slice(-3);
      const olderDates = uniqueDates.slice(-6, -3);

      const recentAvg =
        setHistory
          .filter((s) => recentDates.includes(s.date))
          .reduce((sum, s) => sum + s.weight, 0) /
        setHistory.filter((s) => recentDates.includes(s.date)).length;

      const olderAvg =
        setHistory
          .filter((s) => olderDates.includes(s.date))
          .reduce((sum, s) => sum + s.weight, 0) /
        (setHistory.filter((s) => olderDates.includes(s.date)).length || 1);

      if (recentAvg > olderAvg * 1.02) {
        trend = 'up';
      } else if (recentAvg < olderAvg * 0.98) {
        trend = 'down';
      }
    }

    return {
      estimated1RM: maxE1RM,
      bestSetVolume: bestSet.volume,
      bestSetWeight: bestSet.weight,
      bestSetReps: bestSet.reps,
      weekVolume,
      monthVolume,
      trend,
    };
  }, [setHistory]);

  // ---- PRs for all exercises ----
  const personalRecords = useMemo((): PersonalRecord[] => {
    const prMap: Record<string, PersonalRecord> = {};

    allWorkoutDetails.forEach((w) => {
      w.workout_exercises.forEach((we) => {
        we.sets.forEach((s) => {
          if (s.weight_kg != null && s.reps != null && s.weight_kg > 0 && s.reps > 0) {
            const volume = calculateVolume(s.weight_kg, s.reps);
            const exerciseName = we.exercise?.name ?? 'Unknown';

            if (!prMap[we.exercise_id] || volume > prMap[we.exercise_id].volume) {
              prMap[we.exercise_id] = {
                exercise_id: we.exercise_id,
                exercise_name: exerciseName,
                weight_kg: s.weight_kg,
                reps: s.reps,
                volume,
                date: w.date,
                estimated_1rm: calculateEstimated1RM(s.weight_kg, s.reps),
              };
            }
          }
        });
      });
    });

    return Object.values(prMap).sort((a, b) =>
      a.exercise_name.localeCompare(b.exercise_name)
    );
  }, [allWorkoutDetails]);

  // ---- Trend indicator ----
  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return '\u2191';
      case 'down':
        return '\u2193';
      default:
        return '\u2192';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up':
        return '#34C759';
      case 'down':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  // ---- Loading state ----
  const isLoading = workoutsLoading || exercisesLoading || isLoadingDetails;

  // ============================================
  // Render
  // ============================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header ---- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progression</Text>
          {client && (
            <Text style={styles.headerSubtitle}>{client.name}</Text>
          )}
        </View>

        {/* ---- Exercise Selector ---- */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Ovning</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowExercisePicker(!showExercisePicker)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectorButtonText,
                !selectedExercise && styles.selectorPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedExercise?.name ?? 'Valj ovning...'}
            </Text>
            <Text style={styles.selectorArrow}>
              {showExercisePicker ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>

          {/* Dropdown */}
          {showExercisePicker && (
            <View style={styles.dropdownContainer}>
              {exercisesWithHistory.length === 0 ? (
                <View style={styles.dropdownEmptyRow}>
                  <Text style={styles.dropdownEmptyText}>
                    Inga ovningar med data hittades
                  </Text>
                </View>
              ) : (
                exercisesWithHistory.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[
                      styles.dropdownRow,
                      exercise.id === selectedExerciseId &&
                        styles.dropdownRowSelected,
                    ]}
                    onPress={() => {
                      setSelectedExerciseId(exercise.id);
                      setShowExercisePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownRowText,
                        exercise.id === selectedExerciseId &&
                          styles.dropdownRowTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {exercise.name}
                    </Text>
                    {exercise.id === selectedExerciseId && (
                      <Text style={styles.dropdownCheck}>{'\u2713'}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* ---- Loading Indicator ---- */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F7E928" />
            <Text style={styles.loadingText}>Laddar data...</Text>
          </View>
        )}

        {/* ---- Content (only show if exercise selected) ---- */}
        {selectedExercise && !isLoading && (
          <>
            {/* ---- Chart ---- */}
            <View style={styles.section}>
              <ProgressChart
                data={chartData}
                title="Viktprogression"
                unit="kg"
                color="#F7E928"
              />
            </View>

            {/* ---- Stats Cards ---- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistik</Text>
              <View style={styles.statsGrid}>
                {/* Estimated 1RM */}
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Uppskattad 1RM</Text>
                  <Text style={styles.statValue}>
                    {stats.estimated1RM > 0
                      ? `${stats.estimated1RM.toFixed(1)} kg`
                      : '-'}
                  </Text>
                </View>

                {/* Best Set */}
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Basta set</Text>
                  <Text style={styles.statValue}>
                    {stats.bestSetVolume > 0
                      ? `${stats.bestSetWeight} \u00D7 ${stats.bestSetReps}`
                      : '-'}
                  </Text>
                  {stats.bestSetVolume > 0 && (
                    <Text style={styles.statSubValue}>
                      {stats.bestSetVolume} kg vol
                    </Text>
                  )}
                </View>

                {/* Week Volume */}
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Volym (vecka)</Text>
                  <Text style={styles.statValue}>
                    {stats.weekVolume > 0
                      ? `${stats.weekVolume.toLocaleString()} kg`
                      : '-'}
                  </Text>
                </View>

                {/* Month Volume */}
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Volym (manad)</Text>
                  <Text style={styles.statValue}>
                    {stats.monthVolume > 0
                      ? `${stats.monthVolume.toLocaleString()} kg`
                      : '-'}
                  </Text>
                </View>
              </View>

              {/* Trend Indicator */}
              <View style={styles.trendContainer}>
                <Text style={styles.trendLabel}>Trend:</Text>
                <View
                  style={[
                    styles.trendBadge,
                    { backgroundColor: getTrendColor(stats.trend) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.trendIcon,
                      { color: getTrendColor(stats.trend) },
                    ]}
                  >
                    {getTrendIcon(stats.trend)}
                  </Text>
                  <Text
                    style={[
                      styles.trendText,
                      { color: getTrendColor(stats.trend) },
                    ]}
                  >
                    {stats.trend === 'up'
                      ? 'Okande'
                      : stats.trend === 'down'
                      ? 'Minskande'
                      : 'Stabil'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ---- All Sets Section ---- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Alla sets</Text>

              {groupedSets.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>
                    Inga sets registrerade annu
                  </Text>
                </View>
              ) : (
                groupedSets.map((group) => (
                  <View key={group.date} style={styles.setGroup}>
                    <Text style={styles.setGroupDate}>
                      {formatDate(group.date)}
                    </Text>
                    {group.sets.map((set, idx) => (
                      <View key={`${group.date}-${idx}`} style={styles.setRow}>
                        <View style={styles.setRowLeft}>
                          <Text style={styles.setWeight}>
                            {set.weight} kg
                          </Text>
                          <Text style={styles.setMultiplier}>{'\u00D7'}</Text>
                          <Text style={styles.setReps}>
                            {set.reps} reps
                          </Text>
                          {set.rpe != null && set.rpe > 0 && (
                            <Text style={styles.setRpe}>
                              RPE {set.rpe}
                            </Text>
                          )}
                        </View>
                        {set.isPR && (
                          <View style={styles.prBadge}>
                            <Text style={styles.prBadgeText}>PR</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>

            {/* ---- PR List Section ---- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PR-lista</Text>

              {personalRecords.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>
                    Inga personliga rekord annu
                  </Text>
                </View>
              ) : (
                personalRecords.map((pr) => (
                  <TouchableOpacity
                    key={pr.exercise_id}
                    style={[
                      styles.prRow,
                      pr.exercise_id === selectedExerciseId &&
                        styles.prRowHighlighted,
                    ]}
                    onPress={() => {
                      setSelectedExerciseId(pr.exercise_id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.prRowLeft}>
                      <Text style={styles.prExerciseName} numberOfLines={1}>
                        {pr.exercise_name}
                      </Text>
                      <Text style={styles.prDate}>
                        {formatDateShort(pr.date)}
                      </Text>
                    </View>
                    <View style={styles.prRowRight}>
                      <Text style={styles.prValue}>
                        {pr.weight_kg} {'\u00D7'} {pr.reps}
                      </Text>
                      <Text style={styles.prE1RM}>
                        ~{pr.estimated_1rm.toFixed(1)} kg 1RM
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Bottom spacer */}
            <View style={styles.bottomSpacer} />
          </>
        )}

        {/* ---- No exercise selected ---- */}
        {!selectedExercise && !isLoading && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataIcon}>{'\uD83D\uDCC8'}</Text>
            <Text style={styles.noDataTitle}>Valj en ovning</Text>
            <Text style={styles.noDataSubtitle}>
              Valj en ovning ovan for att se progression och statistik.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ---- Header ----
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FBF47A',
    marginTop: 4,
  },

  // ---- Exercise Selector ----
  selectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  selectorPlaceholder: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  selectorArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // ---- Dropdown ----
  dropdownContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  dropdownRowSelected: {
    backgroundColor: '#F7E928' + '15',
  },
  dropdownRowText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  dropdownRowTextSelected: {
    color: '#FBF47A',
    fontWeight: '600',
  },
  dropdownCheck: {
    fontSize: 16,
    color: '#F7E928',
    fontWeight: '700',
    marginLeft: 8,
  },
  dropdownEmptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },

  // ---- Loading ----
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },

  // ---- Sections ----
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },

  // ---- Stats Grid ----
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    width: '48%',
    flexGrow: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statSubValue: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // ---- Trend ----
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  trendIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ---- Set Groups ----
  setGroup: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  setGroupDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBF47A',
    marginBottom: 10,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  setRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  setMultiplier: {
    fontSize: 14,
    color: '#8E8E93',
  },
  setReps: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  setRpe: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF9500',
    marginLeft: 4,
  },
  prBadge: {
    backgroundColor: '#FF9500' + '25',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  prBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9500',
  },

  // ---- PR List ----
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  prRowHighlighted: {
    borderColor: '#F7E928',
    backgroundColor: '#F7E928' + '10',
  },
  prRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  prExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  prRowRight: {
    alignItems: 'flex-end',
  },
  prValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FBF47A',
  },
  prE1RM: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },

  // ---- Empty States ----
  emptySection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noDataSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // ---- Bottom Spacer ----
  bottomSpacer: {
    height: 40,
  },
});
