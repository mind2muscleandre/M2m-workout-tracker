import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useWorkoutStore } from '../stores/workoutStore';
import { useClientStore } from '../stores/clientStore';
import { usePlatformStore } from '../stores/platformStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { SectionLabel } from '../components/ui/SectionLabel';
import { formatTime } from '../utils/helpers';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'SessionTimer'>;

const REST_PRESETS = [
  { id: '30', label: '30s', seconds: 30 },
  { id: '90', label: '90s', seconds: 90 },
  { id: '120', label: '2 min', seconds: 120 },
  { id: '180', label: '3 min', seconds: 180 },
  { id: '300', label: '5 min', seconds: 300 },
];

const RING_RADIUS = 104;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function SessionTimerScreen({ route, navigation }: Props) {
  const { clientId, workoutId: initialWorkoutId } = route.params;
  const { clients } = useClientStore();
  const { loadForClients } = usePlatformStore();
  const {
    activeWorkout,
    fetchWorkoutDetail,
    startWorkout,
    completeWorkout,
    createWorkout,
    updateWorkoutNotes,
    isFetchingWorkoutDetail,
  } = useWorkoutStore();

  const [workoutId, setWorkoutId] = useState<string | null>(initialWorkoutId ?? null);
  const [elapsed, setElapsed] = useState(0);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [restRemaining, setRestRemaining] = useState(90);
  const [restRunning, setRestRunning] = useState(false);
  const [restPresetId, setRestPresetId] = useState('90');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const client = clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (client) {
      loadForClients([client], useWorkoutStore.getState().workouts).catch(() => {});
    }
  }, [client, loadForClients]);

  useEffect(() => {
    if (workoutId) {
      fetchWorkoutDetail(workoutId).catch(() => {});
    }
  }, [workoutId, fetchWorkoutDetail]);

  useEffect(() => {
    if (activeWorkout?.notes != null) {
      setNoteDraft(activeWorkout.notes);
    }
  }, [activeWorkout?.id, activeWorkout?.notes]);

  useEffect(() => {
    if (activeWorkout?.status === 'in_progress') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout?.status]);

  useEffect(() => {
    if (!restRunning) return;
    restRef.current = setInterval(() => {
      setRestRemaining((s) => {
        if (s <= 1) {
          setRestRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [restRunning]);

  const exercises = activeWorkout?.workout_exercises ?? [];
  const totalSets = exercises.reduce((n, ex) => n + (ex.sets?.length ?? 0), 0) || 8;
  const completedSets = exercises.reduce(
    (n, ex) => n + (ex.sets?.filter((s) => s.completed_at)?.length ?? 0),
    0
  );

  const currentExerciseIndex = useMemo(() => {
    if (exercises.length === 0) return 0;
    const idx = exercises.findIndex(
      (ex) => (ex.sets?.filter((s) => s.completed_at)?.length ?? 0) < (ex.sets?.length ?? 1)
    );
    return idx >= 0 ? idx + 1 : exercises.length;
  }, [exercises]);

  const restRemainingCount = Math.max(0, totalSets - currentSetIndex - 1);

  const ringOffset = RING_CIRCUMFERENCE * (1 - restRemaining / restDuration);

  const ensureWorkout = async (): Promise<string> => {
    if (workoutId) return workoutId;
    const { supabase } = await import('../lib/supabase');
    const { data: session } = await supabase.auth.getSession();
    const ptId = session.session?.user?.id;
    if (!ptId) throw new Error('Ej inloggad');

    const id = await createWorkout({
      client_id: clientId,
      created_by_pt_id: ptId,
      date: new Date().toISOString().slice(0, 10),
      title: 'Coach-session',
      notes: null,
      status: 'planned',
      is_template: false,
      template_name: null,
      total_duration_seconds: null,
      completed_at: null,
    });
    setWorkoutId(id);
    return id;
  };

  const handleStart = async () => {
    try {
      const id = await ensureWorkout();
      await startWorkout(id);
      setElapsed(0);
    } catch {
      Alert.alert('Fel', 'Kunde inte starta sessionen');
    }
  };

  const handleComplete = () => {
    if (!workoutId) return;
    Alert.alert('Avsluta session', 'Markera passet som klart?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Avsluta',
        onPress: async () => {
          try {
            await completeWorkout(workoutId);
            navigation.goBack();
          } catch {
            Alert.alert('Fel', 'Kunde inte avsluta passet');
          }
        },
      },
    ]);
  };

  const saveNote = useCallback(async () => {
    if (!workoutId) return;
    setSavingNote(true);
    try {
      await updateWorkoutNotes(workoutId, noteDraft.trim() || null);
    } catch {
      Alert.alert('Fel', 'Kunde inte spara anteckning');
    } finally {
      setSavingNote(false);
    }
  }, [workoutId, noteDraft, updateWorkoutNotes]);

  const setRestTime = (seconds: number, presetId: string) => {
    setRestRunning(false);
    setRestDuration(seconds);
    setRestRemaining(seconds);
    setRestPresetId(presetId);
  };

  const toggleRestTimer = () => {
    if (restRemaining === 0) setRestRemaining(restDuration);
    setRestRunning((r) => !r);
  };

  const nextSet = () => {
    setRestRunning(false);
    setCurrentSetIndex((i) => Math.min(i + 1, totalSets - 1));
    setRestRemaining(restDuration);
  };

  const prevSet = () => {
    setRestRunning(false);
    setCurrentSetIndex((i) => Math.max(i - 1, 0));
    setRestRemaining(restDuration);
  };

  const sessionTitle = activeWorkout?.title ?? 'Coach-session';
  const phaseLabel =
    exercises.length > 0
      ? `Set ${currentSetIndex + 1} av ${totalSets} · ${exercises[currentExerciseIndex - 1]?.exercise?.name ?? 'Övning'}`
      : `Set ${currentSetIndex + 1} av ${totalSets}`;

  return (
    <ScreenContainer
      title="Session Timer"
      subtitle={`${client?.name ?? 'Atlet'} · ${sessionTitle}`}
      scroll
      headerRight={
        <TouchableOpacity style={styles.endBtn} onPress={handleComplete} disabled={!workoutId}>
          <Text style={styles.endBtnText}>Avsluta</Text>
        </TouchableOpacity>
      }
    >
      {isFetchingWorkoutDetail && !activeWorkout ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.sessStrip}>
            {[
              { value: formatTime(elapsed), label: 'Förfluten tid' },
              { value: `${completedSets}/${totalSets}`, label: 'Set' },
              { value: String(currentExerciseIndex || '—'), label: 'Nuv. övning' },
              { value: String(restRemainingCount), label: 'Vilor kvar' },
            ].map((item, i, arr) => (
              <View key={item.label} style={[styles.ssCell, i < arr.length - 1 && styles.ssCellBorder]}>
                <Text style={styles.ssVal}>{item.value}</Text>
                <Text style={styles.ssLbl}>{item.label}</Text>
              </View>
            ))}
          </View>

          <GlassCard style={styles.timerCard}>
            <View style={styles.ringWrap}>
              <Svg width={260} height={260} viewBox="0 0 240 240">
                <Circle
                  cx={120}
                  cy={120}
                  r={RING_RADIUS}
                  stroke={coachColors.border}
                  strokeWidth={8}
                  fill="none"
                />
                <Circle
                  cx={120}
                  cy={120}
                  r={RING_RADIUS}
                  stroke={restRunning ? coachColors.accent : coachColors.coach}
                  strokeWidth={8}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${RING_CIRCUMFERENCE}`}
                  strokeDashoffset={ringOffset}
                  rotation={-90}
                  origin="120, 120"
                />
              </Svg>
              <View style={styles.timerDisplay}>
                <Text style={styles.timerTime}>{formatTime(restRemaining)}</Text>
                <Text style={styles.timerModeLabel}>VILOTIMER</Text>
                <Text style={styles.timerPhase}>{phaseLabel}</Text>
              </View>
            </View>

            <View style={styles.timerControls}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={prevSet}>
                <Text style={styles.ctrlIcon}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnPrimary, restRunning && styles.ctrlBtnRunning]}
                onPress={toggleRestTimer}
              >
                <Text style={styles.ctrlPlayIcon}>{restRunning ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={nextSet}>
                <Text style={styles.ctrlIcon}>⏭</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setDots}>
              {Array.from({ length: totalSets }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.setDot,
                    i < currentSetIndex && styles.setDotDone,
                    i === currentSetIndex && styles.setDotCurrent,
                  ]}
                />
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.presetsCard}>
            <Text style={styles.sectionLabel}>Vilotid snabbval</Text>
            <View style={styles.restPresets}>
              {REST_PRESETS.map((preset) => {
                const active = restPresetId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => setRestTime(preset.seconds, preset.id)}
                    style={[styles.restChip, active && styles.restChipActive]}
                  >
                    <Text style={[styles.restChipText, active && styles.restChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          <Text style={styles.sectionLabel}>Övningsordning</Text>
          <GlassCard style={styles.queueCard}>
            {exercises.length === 0 ? (
              <Text style={styles.queueEmpty}>Inga övningar tillagda ännu.</Text>
            ) : (
              exercises.map((ex, idx) => {
                const doneCount = ex.sets?.filter((s) => s.completed_at)?.length ?? 0;
                const total = ex.sets?.length ?? 0;
                const isActive = idx === currentExerciseIndex - 1;
                const isDone = total > 0 && doneCount >= total;
                return (
                  <View
                    key={ex.id}
                    style={[
                      styles.eqItem,
                      isActive && styles.eqItemActive,
                      isDone && styles.eqItemDone,
                    ]}
                  >
                    <Text style={[styles.eqNum, isActive && styles.eqNumActive]}>
                      {idx + 1}
                    </Text>
                    <Text style={styles.eqName} numberOfLines={1}>
                      {ex.exercise?.name ?? 'Övning'}
                    </Text>
                    <Text style={[styles.eqDetail, isActive && styles.eqDetailActive]}>
                      {total > 0 ? `${doneCount}/${total} set` : '—'}
                    </Text>
                    <View style={[styles.eqCheck, isDone && styles.eqCheckDone]}>
                      <Text style={styles.eqCheckIcon}>{isDone ? '✓' : '+'}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </GlassCard>

          <SectionLabel>Coach-anteckning</SectionLabel>
          <GlassCard style={styles.noteCard}>
            <TextInput
              style={styles.noteInput}
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Notera teknik, prestanda, känsla…"
              placeholderTextColor={coachColors.muted}
              multiline
              onBlur={saveNote}
            />
          </GlassCard>

          <View style={styles.actions}>
            {activeWorkout?.status !== 'in_progress' ? (
              <Button label="Starta timer" variant="primary" onPress={handleStart} />
            ) : (
              <>
                <Button
                  label="Logga set"
                  onPress={() =>
                    workoutId &&
                    navigation.navigate('WorkoutActive', { workoutId })
                  }
                />
                <Button label="Avsluta session" variant="primary" onPress={handleComplete} />
              </>
            )}
            <Button
              label="Lägg till övningar"
              onPress={async () => {
                const id = await ensureWorkout();
                navigation.navigate('WorkoutCreate', { clientId, templateWorkoutId: id });
              }}
            />
          </View>

          <GlassCard variant="coach" style={styles.syncCard}>
            <Text style={styles.syncCheck}>✓</Text>
            <View style={styles.syncBody}>
              <Text style={styles.syncTitle}>Goalsetter synkroniserar</Text>
              <Text style={styles.syncSub}>
                Session räknas mot atletens mål i Goalsetter
              </Text>
            </View>
          </GlassCard>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  endBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,69,69,0.30)',
    backgroundColor: 'rgba(255,69,69,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: coachColors.orange,
    fontFamily: fonts.bodySemiBold,
  },
  sessStrip: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    overflow: 'hidden',
    marginBottom: 16,
    ...shadows.glass,
  },
  ssCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  ssCellBorder: {
    borderRightWidth: 1,
    borderRightColor: coachColors.border,
  },
  ssVal: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
    color: coachColors.coach,
  },
  ssLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 3,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: coachColors.muted,
    marginBottom: 12,
  },
  timerCard: { padding: 20, marginBottom: 16, alignItems: 'center' },
  ringWrap: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timerDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerTime: {
    fontFamily: fonts.display,
    fontSize: 52,
    fontWeight: '700',
    color: coachColors.fg,
    letterSpacing: 1,
  },
  timerModeLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: coachColors.muted,
    marginTop: 4,
  },
  timerPhase: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: coachColors.coach,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 200,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnPrimary: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  ctrlBtnRunning: {
    backgroundColor: coachColors.danger,
    borderColor: coachColors.danger,
  },
  ctrlIcon: { fontSize: 18, color: coachColors.mutedHi },
  ctrlPlayIcon: { fontSize: 24, color: '#000', fontWeight: '700' },
  setDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
  },
  setDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: coachColors.border,
    backgroundColor: 'transparent',
  },
  setDotDone: {
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  setDotCurrent: {
    borderColor: coachColors.coach,
    shadowColor: coachColors.coach,
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  presetsCard: { padding: 14, marginBottom: 16 },
  restPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  restChip: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restChipActive: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  restChipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  restChipTextActive: { color: coachColors.coach },
  queueCard: { padding: 12, marginBottom: 16, gap: 6 },
  queueEmpty: { fontSize: 13, color: coachColors.muted, fontFamily: fonts.body },
  eqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  eqItemActive: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.28)',
  },
  eqItemDone: { opacity: 0.45 },
  eqNum: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
    width: 18,
  },
  eqNumActive: { color: coachColors.coach },
  eqName: { flex: 1, fontSize: 13, fontWeight: '500', color: coachColors.fg },
  eqDetail: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
  },
  eqDetailActive: { color: coachColors.coach },
  eqCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqCheckDone: {
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  eqCheckIcon: { fontSize: 10, color: coachColors.coach, fontWeight: '700' },
  noteCard: { padding: 14, marginBottom: 16 },
  noteInput: {
    minHeight: 80,
    fontSize: 13,
    color: coachColors.fg,
    fontFamily: fonts.body,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  actions: { gap: 10, marginBottom: 16 },
  syncCard: {
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncCheck: {
    fontSize: 18,
    color: coachColors.coach,
    fontWeight: '700',
  },
  syncBody: { flex: 1 },
  syncTitle: { fontSize: 12, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  syncSub: { fontSize: 10, color: coachColors.muted, marginTop: 2, fontFamily: fonts.body },
});
