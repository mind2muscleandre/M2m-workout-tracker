import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SessionSummaryView } from '../components/coach/SessionSummaryView';
import { ExerciseSwapSheet } from '../components/coach/CoachModals';
import {
  SessionProgressBar,
  CurrentExerciseCard,
  NextExercisePreview,
} from '../components/coach/LiveSessionChrome';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { WorkoutExercise, WorkoutSet, Exercise } from '../types/database';
import { formatTime, formatDate } from '../utils/helpers';
import RestTimer from '../components/RestTimer';
import LoadingScreen from '../components/LoadingScreen';
import WheelPicker from '../components/WheelPicker';

// Generate weight values: 0 to 300 kg in 2.5 kg increments
const WEIGHT_VALUES = Array.from({ length: 121 }, (_, i) => i * 2.5);

// Generate reps values: 0 to 100
const REPS_VALUES = Array.from({ length: 101 }, (_, i) => i);

// Generate RPE values: 1 to 10 (with 0.5 increments)
const RPE_VALUES = Array.from({ length: 19 }, (_, i) => (i + 2) * 0.5);

// Generate time values: 0 to 3600 seconds (1 hour) in 5 second increments
const TIME_VALUES = Array.from({ length: 721 }, (_, i) => i * 5);

type Props = StackScreenProps<RootStackParamList, 'WorkoutActive'>;

export function WorkoutActiveScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const {
    activeWorkout,
    fetchWorkoutDetail,
    startWorkout,
    completeWorkout,
    logSet,
    updateSet,
    deleteSet,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    isFetchingWorkoutDetail,
  } = useWorkoutStore();
  const { exercises, fetchExercises } = useExerciseStore();

  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryRpe, setSummaryRpe] = useState<number | null>(8);
  const [summaryNote, setSummaryNote] = useState('');
  const [swapVisible, setSwapVisible] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [keepSetsOnSwap, setKeepSetsOnSwap] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchWorkoutDetail(workoutId);
  }, [workoutId, fetchWorkoutDetail]);

  useEffect(() => {
    const { exercises: ex, lastFetchedAt, fetchExercises: fetch } =
      useExerciseStore.getState();
    if (ex.length > 0 || lastFetchedAt != null) {
      return;
    }
    fetch().catch(() => {});
  }, [fetchExercises]);

  // Workout duration timer
  useEffect(() => {
    if (activeWorkout?.status === 'in_progress' && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
    }
  }, [activeWorkout?.status, workoutStartTime]);

  useEffect(() => {
    if (workoutStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutStartTime]);

  const handleStartWorkout = async () => {
    try {
      await startWorkout(workoutId);
      setWorkoutStartTime(Date.now());
    } catch {
      Alert.alert('Fel', 'Kunde inte starta passet');
    }
  };

  const handleCompleteWorkout = () => {
    Alert.alert('Avsluta pass', 'Är du säker att du vill avsluta passet?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Avsluta',
        style: 'destructive',
        onPress: async () => {
          try {
            if (timerRef.current) clearInterval(timerRef.current);
            await completeWorkout(workoutId);
            setShowSummary(true);
          } catch {
            Alert.alert('Fel', 'Kunde inte avsluta passet');
          }
        },
      },
    ]);
  };

  const finishSummary = () => {
    setShowSummary(false);
    navigation.goBack();
  };

  const handleAddSet = async (workoutExerciseId: string, existingSetsCount: number, trackingType?: string) => {
    try {
      await logSet({
        workout_exercise_id: workoutExerciseId,
        set_number: existingSetsCount + 1,
        weight_kg: trackingType === 'weight' ? null : null,
        reps: trackingType === 'weight' ? null : null,
        duration_seconds: trackingType === 'time' ? null : null,
        rest_time_seconds: null,
        rpe: null,
        rir: null,
        notes: null,
        completed_at: new Date().toISOString(),
      });
    } catch {
      Alert.alert('Fel', 'Kunde inte lägga till set');
    }
  };

  const handleAddExercise = () => {
    navigation.navigate('ExercisePicker', { workoutId });
  };

  const openSwapForExercise = (workoutExerciseId: string) => {
    setSwapTargetId(workoutExerciseId);
    setSwapVisible(true);
  };

  const handleSwapSelect = (exerciseId: string) => {
    setSwapVisible(false);
    setSwapTargetId(null);
    navigation.navigate('ExercisePicker', { workoutId });
  };

  const swapSuggestions = useMemo(() => {
    return exercises.slice(0, 8).map((ex, i) => ({
      id: ex.id,
      name: ex.name,
      meta: ex.muscle_group ?? 'Övning',
      screeningMatch: i < 2,
    }));
  }, [exercises]);

  const handleRemoveExercise = (workoutExerciseId: string, exerciseName: string) => {
    Alert.alert('Ta bort övning', `Är du säker att du vill ta bort "${exerciseName}"?`, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeExerciseFromWorkout(workoutExerciseId);
            await fetchWorkoutDetail(workoutId);
          } catch {
            Alert.alert('Fel', 'Kunde inte ta bort övningen');
          }
        },
      },
    ]);
  };

  const handleUpdateSet = useCallback(
    async (setId: string, field: string, value: number | string | null) => {
      try {
        await updateSet(setId, { [field]: value });
      } catch {
        // Silent fail for auto-save
      }
    },
    [updateSet]
  );

  const handleDeleteSet = (setId: string) => {
    Alert.alert('Ta bort set', 'Är du säker?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Ta bort',
        style: 'destructive',
        onPress: () => deleteSet(setId),
      },
    ]);
  };

  const handleRestTimeLogged = useCallback(
    (setId: string, seconds: number) => {
      handleUpdateSet(setId, 'rest_time_seconds', seconds);
    },
    [handleUpdateSet]
  );

  if (
    isFetchingWorkoutDetail &&
    (!activeWorkout || activeWorkout.id !== workoutId)
  ) {
    return <LoadingScreen />;
  }

  if (!activeWorkout || activeWorkout.id !== workoutId) {
    return (
      <ScreenContainer title="Aktivt pass" scroll>
        <Text style={styles.errorText}>Passet hittades inte</Text>
      </ScreenContainer>
    );
  }

  const isActive = activeWorkout.status === 'in_progress';
  const isCompleted = activeWorkout.status === 'completed';
  const isPlanned = activeWorkout.status === 'planned';
  const isDraft = activeWorkout.status === 'draft';

  const statusLabel = isCompleted
    ? 'Avslutat'
    : isActive
      ? 'Pågående'
      : isDraft
        ? 'Utkast'
        : 'Planerat';

  const currentExerciseIndex = useMemo(() => {
    if (!isActive) return 0;
    const idx = activeWorkout.workout_exercises.findIndex((we) =>
      we.sets.some((s) => !s.completed_at)
    );
    return idx >= 0 ? idx : activeWorkout.workout_exercises.length - 1;
  }, [activeWorkout.workout_exercises, isActive]);

  const currentWe = activeWorkout.workout_exercises[currentExerciseIndex];
  const nextWe = activeWorkout.workout_exercises[currentExerciseIndex + 1];

  if (showSummary && activeWorkout) {
    const totalSets = activeWorkout.workout_exercises.reduce((s, we) => s + we.sets.length, 0);
    return (
      <ScreenContainer title="Sammanfattning" scroll>
        <SessionSummaryView
          athleteName="Atlet"
          sessionName={activeWorkout.title || 'PT-pass'}
          duration={formatTime(elapsedTime)}
          stats={[
            { label: 'Set', value: totalSets, accent: true },
            { label: 'Övningar', value: activeWorkout.workout_exercises.length },
            { label: 'Tid', value: formatTime(elapsedTime) },
          ]}
          exercises={activeWorkout.workout_exercises.map((we) => ({
            name: we.exercise?.name ?? 'Övning',
            sets: `${we.sets.filter((s) => s.completed_at).length}/${we.sets.length} set`,
          }))}
          note={summaryNote}
          onNoteChange={setSummaryNote}
          selectedRpe={summaryRpe}
          onRpeSelect={setSummaryRpe}
          onDone={finishSummary}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title={activeWorkout.title || 'Aktivt pass'}
      subtitle={formatDate(activeWorkout.date)}
      scroll={false}
      headerLeft={
        (isCompleted || isPlanned || isDraft) ? (
          <Text style={styles.backLink} onPress={() => navigation.goBack()}>
            ← Tillbaka
          </Text>
        ) : undefined
      }
      headerRight={
        isActive ? (
          <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
        ) : undefined
      }
    >
      <GlassCard variant="coach" style={styles.statusCard}>
        <SectionLabel>Status</SectionLabel>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </GlassCard>

      <ScrollView
        style={styles.exerciseList}
        contentContainerStyle={styles.exerciseListContent}
        nestedScrollEnabled
      >
        {activeWorkout.workout_exercises.map((we, weIndex) => (
          <ExerciseSection
            key={we.id}
            workoutExercise={we}
            index={weIndex}
            isExpanded={expandedExercise === we.id || expandedExercise === null}
            isActive={isActive}
            isCompleted={isCompleted}
            onToggle={() =>
              setExpandedExercise(expandedExercise === we.id ? null : we.id)
            }
            onAddSet={() => handleAddSet(we.id, we.sets.length, we.exercise?.tracking_type)}
            onUpdateSet={handleUpdateSet}
            onDeleteSet={handleDeleteSet}
            onRestTimeLogged={handleRestTimeLogged}
            onRemoveExercise={isActive ? () => handleRemoveExercise(we.id, we.exercise?.name || 'Övning') : undefined}
          />
        ))}

        {activeWorkout.workout_exercises.length === 0 && (
          <GlassCard style={styles.emptyState}>
            <Text style={styles.emptyText}>Inga övningar i detta pass</Text>
            {isActive ? (
              <Button label="Lägg till övning" variant="secondary" onPress={handleAddExercise} />
            ) : null}
          </GlassCard>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isActive ? (
          <>
            <Button label="Byt övning" variant="secondary" onPress={handleAddExercise} />
            <Button label="Lägg till övning" variant="secondary" onPress={handleAddExercise} />
          </>
        ) : null}
        {activeWorkout.status === 'planned' || activeWorkout.status === 'draft' ? (
          <Button
            label={activeWorkout.status === 'draft' ? 'Publicera och starta' : 'Starta pass'}
            variant="primary"
            onPress={handleStartWorkout}
          />
        ) : null}
        {isActive ? (
          <Button label="Avsluta pass" variant="danger" onPress={handleCompleteWorkout} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

// ============================================
// Exercise Section Component
// ============================================

interface ExerciseSectionProps {
  workoutExercise: WorkoutExercise & { exercise: Exercise; sets: WorkoutSet[] };
  index: number;
  isExpanded: boolean;
  isActive: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, field: string, value: number | string | null) => void;
  onDeleteSet: (setId: string) => void;
  onRestTimeLogged: (setId: string, seconds: number) => void;
  onRemoveExercise?: () => void;
}

function ExerciseSection({
  workoutExercise,
  index,
  isExpanded,
  isActive,
  isCompleted,
  onToggle,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onRestTimeLogged,
  onRemoveExercise,
}: ExerciseSectionProps) {
  const exercise = workoutExercise.exercise;
  const trackingType = exercise?.tracking_type || 'weight';

  return (
    <GlassCard style={styles.exerciseSection}>
      <TouchableOpacity style={styles.exerciseHeader} onPress={onToggle}>
        <View style={styles.exerciseNumberBadge}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseHeaderInfo}>
          <Text style={styles.exerciseName}>{exercise?.name || 'Okänd övning'}</Text>
          <Text style={styles.exerciseTarget}>
            {workoutExercise.target_sets && workoutExercise.target_reps
              ? `${workoutExercise.target_sets} x ${workoutExercise.target_reps}`
              : 'Inga mål satta'}
          </Text>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.setsContainer}>
          {/* Table Header */}
          <View style={styles.setTableHeader}>
            <Text style={[styles.setHeaderText, { width: 40 }]}>Set</Text>
            {trackingType === 'weight' ? (
              <>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Vikt (kg)</Text>
                <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
              </>
            ) : trackingType === 'time' ? (
              <Text style={[styles.setHeaderText, { flex: 2 }]}>Tid</Text>
            ) : (
              <Text style={[styles.setHeaderText, { flex: 2 }]}>-</Text>
            )}
            <Text style={[styles.setHeaderText, { width: 50 }]}>RPE</Text>
            <Text style={[styles.setHeaderText, { width: 60 }]}>Vila</Text>
            {isActive && <Text style={[styles.setHeaderText, { width: 40 }]} />}
          </View>

          {/* Sets */}
          {workoutExercise.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              exercise={exercise}
              isActive={isActive}
              isCompleted={isCompleted}
              onUpdateSet={onUpdateSet}
              onDeleteSet={onDeleteSet}
              onRestTimeLogged={onRestTimeLogged}
            />
          ))}

          {/* Add Set button */}
          {isActive && (
            <TouchableOpacity style={styles.addSetButton} onPress={onAddSet}>
              <Text style={styles.addSetText}>+ Lägg till set</Text>
            </TouchableOpacity>
          )}

          {/* Remove Exercise button */}
          {isActive && onRemoveExercise && (
            <TouchableOpacity style={styles.removeExerciseButton} onPress={onRemoveExercise}>
              <Text style={styles.removeExerciseText}>Ta bort övning</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {workoutExercise.is_superset_with_next && (
        <View style={styles.supersetIndicator}>
          <Text style={styles.supersetText}>SUPERSET</Text>
        </View>
      )}
    </GlassCard>
  );
}

// ============================================
// Set Row Component
// ============================================

interface SetRowProps {
  set: WorkoutSet;
  exercise?: Exercise;
  isActive: boolean;
  isCompleted: boolean;
  onUpdateSet: (setId: string, field: string, value: number | string | null) => void;
  onDeleteSet: (setId: string) => void;
  onRestTimeLogged: (setId: string, seconds: number) => void;
}

function SetRow({ set, exercise, isActive, isCompleted, onUpdateSet, onDeleteSet, onRestTimeLogged }: SetRowProps) {
  const [showTimer, setShowTimer] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showRpePicker, setShowRpePicker] = useState(false);
  
  const trackingType = exercise?.tracking_type || 'weight';

  const handleWeightSelect = (value: number) => {
    onUpdateSet(set.id, 'weight_kg', value === 0 ? null : value);
  };

  const handleRepsSelect = (value: number) => {
    onUpdateSet(set.id, 'reps', value === 0 ? null : value);
  };

  const handleRpeSelect = (value: number) => {
    onUpdateSet(set.id, 'rpe', value);
  };

  const handleTimeSelect = (value: number) => {
    onUpdateSet(set.id, 'duration_seconds', value === 0 ? null : value);
  };

  const formatWeight = (weight: number | null) => {
    if (weight == null) return '-';
    return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  };

  const formatTime = (seconds: number | null) => {
    if (seconds == null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <>
      <View style={[styles.setRow, set.is_pr && styles.setRowPR]}>
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={styles.setNumber}>{set.set_number}</Text>
          {set.is_pr && <Text style={styles.prBadge}>PR</Text>}
        </View>

        {trackingType === 'weight' ? (
          <>
            {/* Weight */}
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              {isActive ? (
                <TouchableOpacity
                  style={styles.setInput}
                  onPress={() => setShowWeightPicker(true)}
                >
                  <Text style={[styles.setInputText, !set.weight_kg && styles.placeholderText]}>
                    {formatWeight(set.weight_kg)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.setValue}>{formatWeight(set.weight_kg)}</Text>
              )}
            </View>

            {/* Reps */}
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              {isActive ? (
                <TouchableOpacity
                  style={styles.setInput}
                  onPress={() => setShowRepsPicker(true)}
                >
                  <Text style={[styles.setInputText, !set.reps && styles.placeholderText]}>
                    {set.reps ?? '-'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.setValue}>{set.reps ?? '-'}</Text>
              )}
            </View>
          </>
        ) : trackingType === 'time' ? (
          /* Duration */
          <View style={{ flex: 2, paddingHorizontal: 4 }}>
            {isActive ? (
              <TouchableOpacity
                style={styles.setInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.setInputText, !set.duration_seconds && styles.placeholderText]}>
                  {formatTime(set.duration_seconds)}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.setValue}>{formatTime(set.duration_seconds)}</Text>
            )}
          </View>
        ) : (
          /* Other */
          <View style={{ flex: 2, paddingHorizontal: 4 }}>
            <Text style={styles.setValue}>-</Text>
          </View>
        )}

        {/* RPE */}
        <View style={{ width: 50, paddingHorizontal: 2 }}>
          {isActive ? (
            <TouchableOpacity
              style={[styles.setInput, { paddingHorizontal: 4 }]}
              onPress={() => setShowRpePicker(true)}
            >
              <Text style={[styles.setInputText, { fontSize: 13 }, !set.rpe && styles.placeholderText]}>
                {set.rpe ?? '-'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.setValue, { fontSize: 13 }]}>{set.rpe ?? '-'}</Text>
          )}
        </View>

        {/* Rest Timer */}
        <TouchableOpacity
          style={{ width: 60, alignItems: 'center' }}
          onPress={() => isActive && setShowTimer(!showTimer)}
          disabled={!isActive}
        >
          <Text style={[styles.setValue, { fontSize: 13, color: coachColors.coach }]}>
            {set.rest_time_seconds ? formatTime(set.rest_time_seconds) : isActive ? 'Start' : '-'}
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        {isActive && (
          <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => onDeleteSet(set.id)}>
            <Text style={{ color: coachColors.danger, fontSize: 16 }}>X</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inline Rest Timer */}
      {showTimer && isActive && (
        <View style={styles.timerInline}>
          <RestTimer
            isCompact
            onTimeLogged={(seconds) => {
              onRestTimeLogged(set.id, seconds);
              setShowTimer(false);
            }}
          />
        </View>
      )}

      {/* Weight Picker */}
      <WheelPicker
        visible={showWeightPicker}
        onClose={() => setShowWeightPicker(false)}
        onSelect={handleWeightSelect}
        currentValue={set.weight_kg ?? 0}
        values={WEIGHT_VALUES}
        unit="kg"
        title="Välj vikt"
      />

      {/* Reps Picker */}
      <WheelPicker
        visible={showRepsPicker}
        onClose={() => setShowRepsPicker(false)}
        onSelect={handleRepsSelect}
        currentValue={set.reps ?? 0}
        values={REPS_VALUES}
        unit="reps"
        title="Välj repetitioner"
      />

      {/* RPE Picker */}
      <WheelPicker
        visible={showRpePicker}
        onClose={() => setShowRpePicker(false)}
        onSelect={handleRpeSelect}
        currentValue={set.rpe ?? 6}
        values={RPE_VALUES}
        unit=""
        title="Välj RPE"
      />

      {/* Time Picker */}
      <WheelPicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={handleTimeSelect}
        currentValue={set.duration_seconds ?? 0}
        values={TIME_VALUES}
        unit="sek"
        title="Välj tid"
      />
    </>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  backLink: { color: coachColors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  errorText: { color: coachColors.muted, fontSize: 16, fontFamily: fonts.body },
  timerValue: {
    fontSize: 22,
    fontWeight: '700',
    color: coachColors.coach,
    fontFamily: fonts.display,
    fontVariant: ['tabular-nums'],
  },
  statusCard: { padding: 14, marginBottom: 12 },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: coachColors.coach,
    fontFamily: fonts.bodySemiBold,
  },
  exerciseList: { flex: 1 },
  exerciseListContent: { gap: 10, paddingBottom: 100 },
  exerciseSection: {
    marginBottom: 0,
    overflow: 'hidden',
    padding: 0,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  exerciseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: coachColors.coachDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: { color: coachColors.coach, fontSize: 14, fontWeight: '700' },
  exerciseHeaderInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  exerciseTarget: { fontSize: 13, color: coachColors.muted, marginTop: 2, fontFamily: fonts.mono },
  expandIcon: { color: coachColors.muted, fontSize: 12, marginLeft: 8 },
  setsContainer: { paddingHorizontal: 14, paddingBottom: 14 },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    marginBottom: 4,
  },
  setHeaderText: {
    fontSize: 10,
    color: coachColors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: fonts.mono,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border + '40',
  },
  setRowPR: { backgroundColor: coachColors.orange + '10' },
  setNumber: { fontSize: 15, fontWeight: '600', color: coachColors.muted },
  prBadge: { fontSize: 9, fontWeight: '700', color: coachColors.orange, marginTop: 2 },
  setInput: {
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setInputText: {
    fontSize: 15,
    fontWeight: '600',
    color: coachColors.fg,
    textAlign: 'center',
  },
  placeholderText: {
    color: coachColors.muted,
  },
  setValue: { fontSize: 15, fontWeight: '500', color: coachColors.fg, textAlign: 'center' },
  addSetButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: coachColors.coachDim,
    alignItems: 'center',
  },
  addSetText: { color: coachColors.coach, fontSize: 14, fontWeight: '600' },
  supersetIndicator: {
    backgroundColor: coachColors.orange + '20',
    paddingVertical: 4,
    alignItems: 'center',
  },
  supersetText: {
    fontSize: 10,
    fontWeight: '700',
    color: coachColors.orange,
    letterSpacing: 1,
    fontFamily: fonts.mono,
  },
  timerInline: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: coachColors.glassBg,
  },
  footer: {
    paddingTop: 12,
    gap: 8,
  },
  emptyState: { alignItems: 'center', padding: 24, gap: 12 },
  emptyText: { color: coachColors.muted, fontSize: 15, fontFamily: fonts.body },
  removeExerciseButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.dangerDim,
    alignItems: 'center',
  },
  removeExerciseText: { color: coachColors.danger, fontSize: 14, fontWeight: '600' },
});
