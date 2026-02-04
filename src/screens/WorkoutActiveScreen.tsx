import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useWorkoutStore } from '../stores/workoutStore';
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
    isLoading,
  } = useWorkoutStore();

  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchWorkoutDetail(workoutId);
  }, [workoutId, fetchWorkoutDetail]);

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
            navigation.goBack();
          } catch {
            Alert.alert('Fel', 'Kunde inte avsluta passet');
          }
        },
      },
    ]);
  };

  const handleAddSet = async (workoutExerciseId: string, existingSetsCount: number) => {
    try {
      await logSet({
        workout_exercise_id: workoutExerciseId,
        set_number: existingSetsCount + 1,
        weight_kg: null,
        reps: null,
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

  if (isLoading && !activeWorkout) {
    return <LoadingScreen />;
  }

  if (!activeWorkout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Passet hittades inte</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = activeWorkout.status === 'in_progress';
  const isCompleted = activeWorkout.status === 'completed';
  const isPlanned = activeWorkout.status === 'planned';

  return (
    <SafeAreaView 
      style={[
        styles.container,
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Back button for completed/planned workouts */}
        {(isCompleted || isPlanned) && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>{activeWorkout.title || 'Namnlöst pass'}</Text>
          <Text style={styles.date}>{formatDate(activeWorkout.date)}</Text>
        </View>
        {isActive && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Tid</Text>
            <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
          </View>
        )}
      </View>

      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: isCompleted ? colors.success + '20' : isActive ? colors.warning + '20' : colors.info + '20' }]}>
        <Text style={[styles.statusText, { color: isCompleted ? colors.success : isActive ? colors.warning : colors.info }]}>
          {isCompleted ? 'Avslutat' : isActive ? 'Pågående' : 'Planerat'}
        </Text>
      </View>

      {/* Exercises */}
      <ScrollView 
        style={styles.exerciseList} 
        contentContainerStyle={styles.exerciseListContent}
        nestedScrollEnabled={true}
        scrollEnabled={true}
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
            onAddSet={() => handleAddSet(we.id, we.sets.length)}
            onUpdateSet={handleUpdateSet}
            onDeleteSet={handleDeleteSet}
            onRestTimeLogged={handleRestTimeLogged}
          />
        ))}

        {activeWorkout.workout_exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Inga övningar i detta pass</Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.footer}>
        {activeWorkout.status === 'planned' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
            <Text style={styles.startButtonText}>Starta pass</Text>
          </TouchableOpacity>
        )}
        {isActive && (
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteWorkout}>
            <Text style={styles.completeButtonText}>Avsluta pass</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
}: ExerciseSectionProps) {
  const exercise = workoutExercise.exercise;

  return (
    <View style={styles.exerciseSection}>
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
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Vikt (kg)</Text>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
            <Text style={[styles.setHeaderText, { width: 50 }]}>RPE</Text>
            <Text style={[styles.setHeaderText, { width: 60 }]}>Vila</Text>
            {isActive && <Text style={[styles.setHeaderText, { width: 40 }]} />}
          </View>

          {/* Sets */}
          {workoutExercise.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
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
        </View>
      )}

      {workoutExercise.is_superset_with_next && (
        <View style={styles.supersetIndicator}>
          <Text style={styles.supersetText}>SUPERSET</Text>
        </View>
      )}
    </View>
  );
}

// ============================================
// Set Row Component
// ============================================

interface SetRowProps {
  set: WorkoutSet;
  isActive: boolean;
  isCompleted: boolean;
  onUpdateSet: (setId: string, field: string, value: number | string | null) => void;
  onDeleteSet: (setId: string) => void;
  onRestTimeLogged: (setId: string, seconds: number) => void;
}

function SetRow({ set, isActive, isCompleted, onUpdateSet, onDeleteSet, onRestTimeLogged }: SetRowProps) {
  const [showTimer, setShowTimer] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showRepsPicker, setShowRepsPicker] = useState(false);
  const [showRpePicker, setShowRpePicker] = useState(false);

  const handleWeightSelect = (value: number) => {
    onUpdateSet(set.id, 'weight_kg', value === 0 ? null : value);
  };

  const handleRepsSelect = (value: number) => {
    onUpdateSet(set.id, 'reps', value === 0 ? null : value);
  };

  const handleRpeSelect = (value: number) => {
    onUpdateSet(set.id, 'rpe', value);
  };

  const formatWeight = (weight: number | null) => {
    if (weight == null) return '-';
    return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  };

  return (
    <>
      <View style={[styles.setRow, set.is_pr && styles.setRowPR]}>
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={styles.setNumber}>{set.set_number}</Text>
          {set.is_pr && <Text style={styles.prBadge}>PR</Text>}
        </View>

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
          <Text style={[styles.setValue, { fontSize: 13, color: colors.primary }]}>
            {set.rest_time_seconds ? formatTime(set.rest_time_seconds) : isActive ? 'Start' : '-'}
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        {isActive && (
          <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => onDeleteSet(set.id)}>
            <Text style={{ color: colors.danger, fontSize: 16 }}>X</Text>
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
    </>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' && { 
      height: '100vh', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  date: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  timerContainer: { alignItems: 'flex-end' },
  timerLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase' },
  timerValue: { fontSize: 28, fontWeight: '700', color: colors.warning, fontVariant: ['tabular-nums'] },
  statusBar: {
    marginHorizontal: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  exerciseList: { 
    flex: 1,
    ...(Platform.OS === 'web' && { 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch',
      minHeight: 0,
      height: '100%',
    }),
  },
  exerciseListContent: { 
    padding: 16, 
    paddingBottom: 100,
    ...(Platform.OS === 'web' && { 
      minHeight: '100%',
      flexGrow: 1,
    }),
  },
  exerciseSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
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
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  exerciseHeaderInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.text },
  exerciseTarget: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  expandIcon: { color: colors.textSecondary, fontSize: 12, marginLeft: 8 },
  setsContainer: { paddingHorizontal: 14, paddingBottom: 14 },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  setHeaderText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  setRowPR: { backgroundColor: colors.warning + '10' },
  setNumber: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  prBadge: { fontSize: 9, fontWeight: '700', color: colors.warning, marginTop: 2 },
  setInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setInputText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  setValue: { fontSize: 15, fontWeight: '500', color: colors.text, textAlign: 'center' },
  addSetButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
  },
  addSetText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  supersetIndicator: {
    backgroundColor: colors.warning + '20',
    paddingVertical: 4,
    alignItems: 'center',
  },
  supersetText: { fontSize: 10, fontWeight: '700', color: colors.warning, letterSpacing: 1 },
  timerInline: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: colors.card,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  startButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  completeButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completeButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
