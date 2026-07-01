// ============================================
// PT Workout Tracker - Progression Screen
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useClientStore } from '../stores/clientStore';
import ProgressChart from '../components/ProgressChart';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import {
  calculateEstimated1RM,
  calculateVolume,
  formatDate,
  formatDateShort,
} from '../utils/helpers';
import type {
  WorkoutWithExercises,
  WorkoutSet,
  PersonalRecord,
} from '../types/database';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';
import {
  fetchPhysicalTestsForUser,
  formatPhysicalTestValue,
  physicalTestLabel,
} from '../services/platformProgression';
import type { PhysicalTestResultRow } from '../types/platform';

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
  const { workouts, fetchWorkouts, isFetchingWorkouts: workoutsLoading } =
    useWorkoutStore();
  const { exercises, fetchExercises, isFetching: exercisesLoading } =
    useExerciseStore();
  const { clients } = useClientStore();

  // ---- State ----
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    initialExerciseId ?? null
  );
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allWorkoutDetails, setAllWorkoutDetails] = useState<WorkoutWithExercises[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTestResultRow[]>([]);
  const [physicalTestsLoading, setPhysicalTestsLoading] = useState(false);
  const [rangeFilter, setRangeFilter] = useState('12v');

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

  useEffect(() => {
    const userId = client?.client_user_id;
    if (!userId) {
      setPhysicalTests([]);
      return;
    }
    setPhysicalTestsLoading(true);
    fetchPhysicalTestsForUser(userId)
      .then(setPhysicalTests)
      .catch(() => setPhysicalTests([]))
      .finally(() => setPhysicalTestsLoading(false));
  }, [client?.client_user_id]);

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

  const rangeDays: Record<string, number> = {
    '4v': 28,
    '12v': 84,
    '6m': 180,
    '1y': 365,
  };

  const filteredSetHistory = useMemo(() => {
    const days = rangeDays[rangeFilter] ?? 84;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return setHistory.filter((s) => s.date >= cutoffStr);
  }, [setHistory, rangeFilter]);

  // ---- Chart data: best set per session (max weight) ----
  const chartData = useMemo(() => {
    const byDate: Record<string, number> = {};

    filteredSetHistory.forEach((entry) => {
      if (!byDate[entry.date] || entry.weight > byDate[entry.date]) {
        byDate[entry.date] = entry.weight;
      }
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [filteredSetHistory]);

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

  const prBest = useMemo(() => {
    if (filteredSetHistory.length === 0) return null;
    return filteredSetHistory.reduce((best, s) =>
      s.weight > best.weight ? s : best
    );
  }, [filteredSetHistory]);

  const prLatest = useMemo(() => {
    if (filteredSetHistory.length === 0) return null;
    return filteredSetHistory[filteredSetHistory.length - 1];
  }, [filteredSetHistory]);

  const prDelta = useMemo(() => {
    if (filteredSetHistory.length < 2) return null;
    const first = filteredSetHistory[0].weight;
    const last = filteredSetHistory[filteredSetHistory.length - 1].weight;
    return last - first;
  }, [filteredSetHistory]);

  const historyRows = useMemo(() => {
    const byDate: Record<string, number> = {};
    filteredSetHistory.forEach((entry) => {
      if (!byDate[entry.date] || entry.weight > byDate[entry.date]) {
        byDate[entry.date] = entry.weight;
      }
    });
    const dates = Object.keys(byDate).sort().reverse();
    return dates.map((date, i) => {
      const weight = byDate[date];
      const older = dates[i + 1] ? byDate[dates[i + 1]] : null;
      const diff = older != null ? weight - older : null;
      const isPR = prBest?.date === date && prBest.weight === weight;
      return { date, weight, diff, isPR };
    });
  }, [filteredSetHistory, prBest]);

  const rangeLabel =
    rangeFilter === '4v'
      ? '4 veckor'
      : rangeFilter === '12v'
        ? '12 veckor'
        : rangeFilter === '6m'
          ? '6 månader'
          : '1 år';

  const isLoading = workoutsLoading || exercisesLoading || isLoadingDetails;

  return (
    <ScreenContainer
      title="Progression"
      subtitle={client?.name}
      scroll
    >
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.progSelect}
          onPress={() => setShowExercisePicker(!showExercisePicker)}
        >
          <Text style={styles.progSelectText} numberOfLines={1}>
            {selectedExercise?.name ?? 'Välj övning…'}
          </Text>
          <Text style={styles.progSelectArrow}>{showExercisePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <View style={styles.rangeChips}>
          {[
            { id: '4v', label: '4V' },
            { id: '12v', label: '12V' },
            { id: '6m', label: '6M' },
            { id: '1y', label: '1Å' },
          ].map((chip) => {
            const active = rangeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setRangeFilter(chip.id)}
                style={[styles.rangeChip, active && styles.rangeChipActive]}
              >
                <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showExercisePicker && (
        <GlassCard style={styles.dropdown}>
          {exercisesWithHistory.length === 0 ? (
            <Text style={styles.dropdownEmpty}>Inga övningar med data hittades</Text>
          ) : (
            exercisesWithHistory.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.dropdownRow,
                  exercise.id === selectedExerciseId && styles.dropdownRowSelected,
                ]}
                onPress={() => {
                  setSelectedExerciseId(exercise.id);
                  setShowExercisePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownRowText,
                    exercise.id === selectedExerciseId && styles.dropdownRowTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {exercise.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>
      )}

      <SectionLabel>Fystester (Goalsetter)</SectionLabel>
      {physicalTestsLoading ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginVertical: 12 }} />
      ) : physicalTests.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {client?.client_user_id
              ? 'Inga fystester registrerade ännu'
              : 'Koppla atletkonto för att visa fystester'}
          </Text>
        </GlassCard>
      ) : (
        physicalTests.map((test) => (
          <GlassCard key={test.id} style={styles.physicalRow}>
            <View>
              <Text style={styles.physicalType}>{physicalTestLabel(test.test_type)}</Text>
              <Text style={styles.physicalDate}>
                {formatDateShort(test.performed_at)}
              </Text>
            </View>
            <Text style={styles.physicalValue}>
              {formatPhysicalTestValue(test.result)}
            </Text>
          </GlassCard>
        ))
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={coachColors.coach} />
          <Text style={styles.loadingText}>Laddar data…</Text>
        </View>
      )}

      {selectedExercise && !isLoading && (
        <>
          <View style={styles.prStrip}>
            <View style={[styles.prCard, styles.prCardHighlight]}>
              <Text style={styles.prVal}>
                {prBest ? prBest.weight : '—'}
                <Text style={styles.prUnit}> kg</Text>
              </Text>
              <Text style={styles.prLbl}>Personbästa</Text>
              {prBest ? <Text style={styles.prDate}>{formatDateShort(prBest.date)}</Text> : null}
            </View>
            <View style={styles.prCard}>
              <Text style={[styles.prVal, styles.prValAccent]}>
                {prLatest ? prLatest.weight : '—'}
                <Text style={styles.prUnit}> kg</Text>
              </Text>
              <Text style={styles.prLbl}>Senaste</Text>
              {prLatest ? <Text style={styles.prDate}>{formatDateShort(prLatest.date)}</Text> : null}
            </View>
            <View style={styles.prCard}>
              <Text style={styles.prVal}>
                {prDelta != null ? `${prDelta > 0 ? '+' : ''}${prDelta.toFixed(0)}` : '—'}
                <Text style={styles.prUnit}> kg</Text>
              </Text>
              <Text style={styles.prLbl}>+{rangeLabel}</Text>
              <Text style={styles.prDate}>från start</Text>
            </View>
          </View>

          <GlassCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {selectedExercise.name} — {client?.name ?? 'Atlet'}
            </Text>
            <Text style={styles.chartSub}>{rangeLabel} · Vikt i kg</Text>
            <ProgressChart
              data={chartData}
              unit="kg"
              color={coachColors.coach}
            />
          </GlassCard>

          <SectionLabel>Historik</SectionLabel>
          <GlassCard padding={0} style={styles.historyCard}>
            <View style={styles.htHeader}>
              <Text style={styles.htHeaderCell}>Datum</Text>
              <Text style={styles.htHeaderCell}>Vikt</Text>
              <Text style={styles.htHeaderCell}>Förändring</Text>
              <Text style={styles.htHeaderCell} />
            </View>
            {historyRows.length === 0 ? (
              <Text style={styles.emptyText}>Inga sets registrerade ännu</Text>
            ) : (
              historyRows.map((row) => (
                <View
                  key={row.date}
                  style={[styles.htRow, row.isPR && styles.htRowPr]}
                >
                  <Text style={styles.htDate}>{formatDateShort(row.date)}</Text>
                  <Text style={styles.htVal}>
                    {row.weight}
                    <Text style={styles.htUnit}> kg</Text>
                  </Text>
                  <Text
                    style={[
                      styles.htDiff,
                      row.diff == null
                        ? styles.diffSame
                        : row.diff > 0
                          ? styles.diffUp
                          : row.diff < 0
                            ? styles.diffDown
                            : styles.diffSame,
                    ]}
                  >
                    {row.diff == null
                      ? '—'
                      : row.diff > 0
                        ? `↑ +${row.diff.toFixed(1)}`
                        : row.diff < 0
                          ? `↓ ${row.diff.toFixed(1)}`
                          : '—'}
                  </Text>
                  <Text style={styles.htBadge}>
                    {row.isPR ? '⭐ PR' : ''}
                  </Text>
                </View>
              ))
            )}
          </GlassCard>

          <SectionLabel>PR-lista</SectionLabel>
          {personalRecords.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Inga personliga rekord ännu</Text>
            </GlassCard>
          ) : (
            personalRecords.map((pr) => (
              <TouchableOpacity
                key={pr.exercise_id}
                onPress={() => setSelectedExerciseId(pr.exercise_id)}
              >
                <GlassCard
                  variant={pr.exercise_id === selectedExerciseId ? 'coach' : 'default'}
                  style={styles.prListRow}
                >
                  <View>
                    <Text style={styles.prExerciseName}>{pr.exercise_name}</Text>
                    <Text style={styles.prListDate}>{formatDateShort(pr.date)}</Text>
                  </View>
                  <View style={styles.prRight}>
                    <Text style={styles.prValue}>
                      {pr.weight_kg} × {pr.reps}
                    </Text>
                    <Text style={styles.prE1RM}>
                      ~{pr.estimated_1rm.toFixed(1)} kg 1RM
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {!selectedExercise && !isLoading && (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataTitle}>Välj en övning</Text>
          <Text style={styles.noDataSubtitle}>
            Välj en övning ovan för att se progression och statistik.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  progSelect: {
    flex: 1,
    minWidth: 160,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
  },
  progSelectText: {
    flex: 1,
    fontSize: 12,
    color: coachColors.fg,
    fontFamily: fonts.body,
  },
  progSelectArrow: { fontSize: 10, color: coachColors.muted, marginLeft: 8 },
  rangeChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rangeChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipActive: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  rangeChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  rangeChipTextActive: { color: coachColors.coach },
  dropdown: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  dropdownRowSelected: { backgroundColor: coachColors.coachDim },
  dropdownRowText: { fontSize: 14, color: coachColors.fg },
  dropdownRowTextSelected: { color: coachColors.coach, fontWeight: '600' },
  dropdownEmpty: {
    padding: 16,
    textAlign: 'center',
    color: coachColors.muted,
    fontSize: 13,
  },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: coachColors.muted, marginTop: 12 },
  prStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  prCard: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    ...shadows.glass,
  },
  prCardHighlight: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.18)',
    ...shadows.glassCoach,
  },
  prVal: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    color: coachColors.coach,
  },
  prValAccent: { color: coachColors.accent },
  prUnit: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
  },
  prLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  prDate: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  chartCard: {
    padding: 20,
    marginBottom: 12,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.xl,
    ...shadows.glass,
  },
  chartTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 2,
  },
  chartSub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginBottom: 12,
  },
  historyCard: { marginBottom: 16, overflow: 'hidden' },
  htHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  htHeaderCell: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  htRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  htRowPr: { backgroundColor: coachColors.glassBgCoach },
  htDate: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
  },
  htVal: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: coachColors.fg,
  },
  htUnit: { fontSize: 10, color: coachColors.muted, fontFamily: fonts.mono },
  htDiff: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  diffUp: { color: coachColors.coach },
  diffDown: { color: coachColors.danger },
  diffSame: { color: coachColors.muted },
  htBadge: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 7,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.accent,
    textAlign: 'right',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  prListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prExerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
  },
  prListDate: { fontSize: 12, color: coachColors.muted, marginTop: 2 },
  prRight: { alignItems: 'flex-end' },
  prValue: {
    fontSize: 14,
    fontWeight: '700',
    color: coachColors.coach,
  },
  prE1RM: { fontSize: 11, color: coachColors.muted, marginTop: 2 },
  emptyCard: { padding: 20, marginBottom: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, color: coachColors.muted, fontFamily: fonts.body },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: coachColors.fg,
    marginBottom: 8,
  },
  noDataSubtitle: {
    fontSize: 14,
    color: coachColors.muted,
    textAlign: 'center',
  },
  physicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    padding: 14,
  },
  physicalType: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: coachColors.fg,
  },
  physicalDate: { fontSize: 11, color: coachColors.muted, marginTop: 2 },
  physicalValue: {
    fontSize: 18,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: coachColors.coach,
  },
});
