import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useAuthStore } from '../stores/authStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { CoachPickerModal } from '../components/CoachPickerModal';
import { fetchTrainers, isAdminRole } from '../services/platformUsers';
import type { TrainerProfile } from '../services/platformUsers';
import type { AthleteProfile } from '../types/athlete';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StatusPill, EnergySystemPill } from '../components/ui/StatusPill';
import {
  AthleteTabNav,
  AthleteHero,
  AppSectionHeader,
  PrimaryGoalCard,
  ProgramWeekGrid,
  buildWeekDaysFromSchedule,
  SessionListRow,
  RoutineList,
  PerformScoreRing,
  PerformRadarCard,
  PerformProgressCard,
  OhsSquatCard,
  RiskAreaList,
  deriveRiskAreas,
  RecCard,
  usePerformScore,
  WhoopHeroSection,
  TodayStatsGrid,
  VitalTrendsCard,
  ConnectedAppsCard,
  deriveTodayStats,
} from '../components/athleteDetail/AthleteDetailUi';
import {
  fetchAthleteAggregate,
  fetchAthleteAggregateByUserId,
} from '../services/athleteAggregator';
import { weekScheduleForProgram, todayAdaptSession } from '../services/platformAdapt';
import { formatSessionDateLabel, sessionLoadLabel } from '../services/platformTimer';
import {
  nutritionGoalSummary,
  createGsGoal,
  createGsTask,
  completeGsTask,
} from '../services/platformGoalsetter';
import {
  deriveAthleteStatus,
  deriveGoalPct,
  getClientAvatarColor,
  getClientInitials,
} from '../lib/athleteStatus';
import { programExerciseCount } from '../services/platformPerform';
import type { Client } from '../types/database';
import type { AthleteAggregateView, PerformView } from '../types/platform';
import { coachColors, fonts, borderRadius, statusLabels, statusColors } from '../lib/theme';
import { ExpandableSessionRow, type SetRowData } from '../components/coach/ExpandableSessionRow';
import { BookSessionSheet } from '../components/coach/CoachModals';
import { bandDisplaySv } from '../lib/movementAssessment/exportPayload';
import type { ScoreBand } from '../types/movementAssessment';
import { supabase } from '../lib/supabase';
import { fetchUserProfile, fetchUserProfileByEmail } from '../services/platformAthlete';
import type { PlatformUserProfile } from '../types/platform';
import { formatDate } from '../utils/helpers';
import { inviteAthlete } from '../services/inviteAthlete';
import { fetchCorrectiveMobilityExercises } from '../services/exerciseBankService';
import { buildProgramSuggestion } from '../lib/movementAssessment/programSuggestion';
import type { MovementAssessmentRow } from '../types/platform';

type Props = StackScreenProps<RootStackParamList, 'AthleteDetail'>;
type TabId = 'overview' | 'sessions' | 'program' | 'perform' | 'goalsetter';

const TABS = [
  { id: 'overview', label: 'Översikt' },
  { id: 'sessions', label: 'Sessioner' },
  { id: 'program', label: 'Adapt Program' },
  { id: 'perform', label: 'Perform' },
  { id: 'goalsetter', label: 'Goalsetter' },
];

type ScreeningArea = { testområde: string | null; score: number | null };

function screeningScores(areas: ScreeningArea[]): number[] {
  return areas
    .map((a) => a.score)
    .filter((score): score is number => score != null && Number.isFinite(score));
}

function performDeltaLabel(sessions?: { analysedAt: string | null; areas: ScreeningArea[] }[]): string | undefined {
  if (!sessions || sessions.length < 2) return undefined;
  const latestScores = screeningScores(sessions[0].areas);
  const previousScores = screeningScores(sessions[1].areas);
  if (!latestScores.length || !previousScores.length) return undefined;
  const latestAvg = latestScores.reduce((a, b) => a + b, 0) / latestScores.length;
  const prevAvg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
  const diff = Math.round((latestAvg - prevAvg) * 10) / 10;
  const sign = diff > 0 ? '+' : '';
  const when = sessions[0].analysedAt
    ? new Date(sessions[0].analysedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    : 'senaste';
  return `${sign}${diff.toFixed(1)} · ${when}`;
}

function deriveOhsCellsFromAreas(areas: ScreeningArea[]) {
  return areas
    .filter((a) => a.score != null)
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    .slice(0, 4)
    .map((a) => {
      const val = Math.max(0, Math.min(100, Math.round(Number(a.score))));
      const color = val >= 75 ? coachColors.coach : val >= 55 ? coachColors.accent : coachColors.orange;
      return {
        label: a.testområde ?? 'Område',
        val,
        color,
      };
    });
}

function buildAreaRecommendations(areas: ScreeningArea[]) {
  return areas
    .filter((a) => a.score != null)
    .sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))
    .slice(0, 3)
    .map((a, idx) => {
      const score = Math.round(Number(a.score));
      const priority: 'high' | 'med' | 'low' = score < 55 ? 'high' : score < 70 ? 'med' : 'low';
      return {
        icon: priority === 'high' ? '⚠️' : priority === 'med' ? '🛠️' : '✅',
        title: `${a.testområde ?? 'Område'} (${score}/100)`,
        priority,
        text: `Prioritera ${String(a.testområde ?? 'området').toLowerCase()} utifrån senaste rörelsebedömning.`,
      };
    });
}

function hasPerformOverviewData(
  perform: PerformView | null | undefined,
  performScore: number | null
): boolean {
  if (!perform) return false;
  return (
    performScore != null ||
    perform.mobilityPrograms.length > 0 ||
    perform.movementAssessments.length > 0 ||
    perform.screeningSessions.some((session) =>
      session.areas.some((area) => area.score != null)
    )
  );
}

function buildRoutineItems(aggregate: AthleteAggregateView | null) {
  const gs = aggregate?.goalsetter;
  return [
    ...(gs?.tasks ?? []).map((t) => ({
      id: t.id,
      label: t.title,
      time: t.due_date ?? '—',
      done: t.is_completed,
      onToggle: undefined as (() => void) | undefined,
    })),
    ...(gs?.routines ?? []).map((r) => ({
      id: r.id,
      label: r.session_name ?? 'Rutin',
      time: '—',
      done: r.is_completed,
      onToggle: undefined as (() => void) | undefined,
    })),
  ];
}

function buildRecentSessions(aggregate: AthleteAggregateView | null) {
  const rows: {
    key: string;
    workoutId?: string;
    date: string;
    name: string;
    sys: string;
    load: string;
    loadColor?: string;
  }[] = [];
  for (const s of aggregate?.timerSessions ?? []) {
    rows.push({
      key: `timer-${s.id}`,
      date: formatSessionDateLabel(s.completed_at),
      name: s.workout_type ?? s.program_type ?? 'Timer',
      sys: `${s.program_type ?? '—'} · ${s.duration_seconds ? Math.round(s.duration_seconds / 60) : '?'} min`,
      load: sessionLoadLabel(s),
    });
  }
  for (const w of aggregate?.coachWorkouts?.slice(0, 5) ?? []) {
    rows.push({
      key: `coach-${w.id}`,
      workoutId: w.id,
      date: formatSessionDateLabel(w.completed_at ?? w.date),
      name: w.title ?? 'Coach-pass',
      sys: w.status,
      load: String((w as { intensity?: number }).intensity ?? '—'),
      loadColor: coachColors.mutedHi,
    });
  }
  return rows;
}

function deriveRecoveryScore(aggregate: AthleteAggregateView | null): number | null {
  const sessions = aggregate?.timerSessions ?? [];
  if (sessions.length === 0) return null;
  const twoDaysAgo = Date.now() - 2 * 86400000;
  const recent = sessions.filter((s) => s.completed_at && new Date(s.completed_at).getTime() > twoDaysAgo);
  if (recent.length === 0) return 85;
  const totalStrain = recent.reduce((acc, s) => {
    const durMin = (s.duration_seconds ?? 0) / 60;
    return acc + (durMin * (s.intensity ?? 5)) / 60;
  }, 0);
  return Math.round(Math.max(10, Math.min(100, 100 - totalStrain * 8)));
}

function deriveStrainScore(aggregate: AthleteAggregateView | null): number | null {
  const sessions = aggregate?.timerSessions ?? [];
  if (sessions.length === 0) return null;
  const latest = sessions[0];
  if (!latest) return null;
  const durMin = (latest.duration_seconds ?? 0) / 60;
  const intensity = latest.intensity ?? 5;
  return Math.round(Math.min(100, (durMin * intensity) / 60 * 10));
}

function deriveNutritionScore(aggregate: AthleteAggregateView | null): number | null {
  const goal = aggregate?.macro?.nutritionGoal;
  if (!goal || !goal.calories) return null;
  const meals = aggregate?.macro?.recentMeals ?? [];
  if (meals.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.logged_at && m.logged_at.slice(0, 10) === today);
  if (todayMeals.length === 0) return null;
  const consumed = todayMeals.reduce((a, m) => a + (m.calories ?? 0), 0);
  return Math.round(Math.min(100, (consumed / goal.calories) * 100));
}

function deriveSleepScore(aggregate: AthleteAggregateView | null): number | null {
  const sleepHabit = aggregate?.goalsetter.habits.find((h) => /sömn|sleep/i.test(h.name));
  if (!sleepHabit) return null;
  const streak = sleepHabit.streak_current;
  if (streak === 0) return 30;
  return Math.min(100, 50 + streak * 10);
}

// ── InfoPill ──────────────────────────────────────────────────────────────
function InfoPill({ label }: { label: string }) {
  return (
    <View style={infoStyles.pill}>
      <Text style={infoStyles.pillText}>{label}</Text>
    </View>
  );
}

// ── ScoreBar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? Math.min(100, Math.max(0, Math.round(Number(value)))) : null;
  const barColor =
    pct == null ? coachColors.muted
    : pct >= 75  ? coachColors.coach
    : pct >= 60  ? coachColors.accent
    : coachColors.orange;
  return (
    <View style={infoStyles.scoreRow}>
      <Text style={infoStyles.scoreLabel}>{label}</Text>
      <View style={infoStyles.scoreTrack}>
        {pct != null ? (
          <View style={[infoStyles.scoreFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        ) : null}
      </View>
      <Text style={[infoStyles.scoreValue, { color: barColor }]}>
        {pct != null ? `${pct}` : '—'}
      </Text>
    </View>
  );
}

function getBandBg(band: string | null): string {
  switch (band) {
    case 'excellent': return 'rgba(0,212,170,0.15)';
    case 'good':      return 'rgba(0,212,170,0.10)';
    case 'fair':      return 'rgba(247,233,40,0.12)';
    case 'poor':      return 'rgba(255,95,31,0.12)';
    case 'critical':  return 'rgba(255,60,60,0.12)';
    default:          return 'rgba(255,255,255,0.06)';
  }
}

function getBandColor(band: string | null): string {
  switch (band) {
    case 'excellent':
    case 'good':     return coachColors.coach;
    case 'fair':     return coachColors.accent;
    case 'poor':
    case 'critical': return coachColors.orange;
    default:         return coachColors.muted;
  }
}

const infoStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.mutedHi,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  scoreLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.mutedHi,
    width: 80,
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  scoreValue: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export function AthleteDetailScreen({ route, navigation }: Props) {
  const { clientId, userId: routeUserId } = route.params;
  const { clients, fetchClientById, assignAthlete, isClientAssignedToCurrentUser } =
    useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabId>('overview');
  const [aggregate, setAggregate] = useState<AthleteAggregateView | null>(null);
  const [resolvedClient, setResolvedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [coachPickerVisible, setCoachPickerVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<PlatformUserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState(false);
  const [bookSessionVisible, setBookSessionVisible] = useState(false);

  const client = resolvedClient ?? clients.find((c) => c.id === clientId) ?? null;
  const isAssignedToMe = isClientAssignedToCurrentUser(client, authUser?.id);
  const isAdmin = isAdminRole(authUser?.role);
  const athleteUserId = aggregate?.userId ?? client?.client_user_id ?? routeUserId ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchAllWorkouts().catch(() => {});
      const coachWorkouts = useWorkoutStore.getState().workouts;

      let c = clients.find((x) => x.id === clientId);
      if (!c) c = (await fetchClientById(clientId)) ?? undefined;

      if (c) {
        setResolvedClient(c);
        const agg = await fetchAthleteAggregate(c, coachWorkouts);
        setAggregate(agg);
        return;
      }

      const uid = routeUserId ?? clientId;
      const agg = await fetchAthleteAggregateByUserId(uid, clientId, coachWorkouts);
      setAggregate(agg);
      setResolvedClient({
        id: clientId,
        assigned_pt_id: '',
        client_user_id: uid,
        name: agg.profile?.name ?? 'Atlet',
        email: agg.profile?.email ?? null,
        phone: null,
        notes: null,
        sport: agg.profile?.sport ?? null,
        age: agg.profile?.age ?? null,
        weight_kg: null,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, routeUserId, clients, fetchClientById, fetchAllWorkouts]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const status = useMemo(() => {
    if (!client) return 'inactive' as const;
    return deriveAthleteStatus(client, workouts, aggregate?.timerSessions ?? []);
  }, [client, workouts, aggregate]);

  const displayName = client?.name ?? aggregate?.profile?.name ?? 'Atlet';
  const goalPct = deriveGoalPct(aggregate);

  const buildAthleteProfile = useCallback((): AthleteProfile | null => {
    if (!athleteUserId) return null;
    return {
      user_id: athleteUserId,
      name: displayName,
      email: client?.email ?? aggregate?.profile?.email ?? '',
      team: aggregate?.profile?.team ?? null,
    };
  }, [athleteUserId, displayName, client?.email, aggregate?.profile?.email, aggregate?.profile?.team]);

  const handleAssignToCoach = useCallback(
    async (coachId?: string) => {
      const athlete = buildAthleteProfile();
      if (!athlete) {
        Alert.alert('Kan inte tilldela', 'Atleten saknar kopplat användarkonto.');
        return;
      }
      setIsAssigning(true);
      try {
        const assigned = await assignAthlete(athlete, coachId);
        setResolvedClient(assigned);
        setCoachPickerVisible(false);
        await load();
        Alert.alert(
          'Tilldelad',
          coachId && coachId !== authUser?.id
            ? `${displayName} tilldelades vald tränare.`
            : `${displayName} finns nu på din dashboard.`
        );
      } catch {
        Alert.alert('Kunde inte tilldela', 'Något gick fel. Försök igen.');
      } finally {
        setIsAssigning(false);
      }
    },
    [assignAthlete, authUser?.id, buildAthleteProfile, displayName, load]
  );

  const loadTrainers = useCallback((q: string) => fetchTrainers(q), []);

  const handleCoachPick = useCallback(
    (trainer: TrainerProfile) => {
      handleAssignToCoach(trainer.user_id).catch(() => {});
    },
    [handleAssignToCoach]
  );

  const [autoGenerating, setAutoGenerating] = useState(false);

  const showAlert = useCallback((title: string, message?: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    } else {
      Alert.alert(title, message);
    }
  }, []);

  const handleOpenInfo = useCallback(async () => {
    setInfoModalVisible(true);
    if (userProfile) return;
    setIsLoadingProfile(true);
    try {
      const uid = client?.client_user_id ?? aggregate?.userId ?? null;
      let profile: PlatformUserProfile | null = null;
      if (uid) profile = await fetchUserProfile(uid);
      if (!profile && client?.email) profile = await fetchUserProfileByEmail(client.email);
      setUserProfile(profile);
    } catch (e) {
      console.error('fetchUserProfile:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [client, aggregate, userProfile]);

  const handleInvite = useCallback(async () => {
    if (!client) return;
    const email = (client.email?.trim() || inviteEmail.trim());
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteEmailError(true);
      return;
    }
    setInviteEmailError(false);
    setIsInviting(true);
    try {
      const result = await inviteAthlete({
        client_id: client.id,
        email,
        name: client.name,
        sport: client.sport,
        age: client.age,
      });

      // Refresh client from DB so client_user_id + email are up to date
      const refreshedClient = await fetchClientById(client.id);
      if (refreshedClient) {
        setResolvedClient(refreshedClient);
        // Reload full aggregate with the new user link
        const agg = await fetchAthleteAggregate(refreshedClient, workouts).catch(() => null);
        if (agg) setAggregate(agg);
      }

      // Refresh profile in modal
      setIsLoadingProfile(true);
      const profile = await fetchUserProfile(result.user_id).catch(() => null);
      setUserProfile(profile);
      setIsLoadingProfile(false);

      showAlert(
        result.already_linked ? 'Redan kopplad' : result.invited ? 'Inbjudan skickad!' : 'Konto kopplat',
        result.already_linked
          ? 'Atleten är redan kopplad till ett konto.'
          : result.invited
          ? `En inbjudan har skickats till ${email}. Atleten aktiverar sitt konto via länken i mailet.`
          : `Atleten hittades via e-post och är nu kopplad.`
      );
    } catch (err) {
      showAlert('Fel', err instanceof Error ? err.message : 'Kunde inte skapa konto');
    } finally {
      setIsInviting(false);
    }
  }, [client, inviteEmail, showAlert, fetchClientById, workouts]);

  const handleAutoGenerate = useCallback(
    async (assessment: MovementAssessmentRow) => {
      setAutoGenerating(true);
      try {
        const ptId = authUser?.id;
        const targetClientId = client?.id ?? clientId;
        if (!ptId) {
          showAlert('Inte inloggad', 'Du måste vara inloggad för att skapa ett program.');
          return;
        }

        // 1. Fetch one corrective exercise per mobility area
        const suggestions = await fetchCorrectiveMobilityExercises();

        if (suggestions.length === 0) {
          showAlert('Inga korrektiva övningar', 'Inga övningar hittades i corrective_exercises-tabellen. Kontrollera att tabellen är ifylld.');
          return;
        }

        const marker = `[MA:${assessment.id}]`;
        const today = new Date().toISOString().slice(0, 10);

        // 2. Check if a draft already exists for this assessment
        const { data: existingDraft } = await supabase
          .from('workouts')
          .select('id')
          .eq('client_id', targetClientId)
          .eq('status', 'draft')
          .ilike('notes', `%${marker}%`)
          .limit(1)
          .maybeSingle();

        let workoutId: string;

        if (existingDraft?.id) {
          workoutId = existingDraft.id;
          await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);
        } else {
          // 3. Create new draft workout
          const { data: newWorkout, error: wErr } = await supabase
            .from('workouts')
            .insert({
              client_id: targetClientId,
              created_by_pt_id: ptId,
              date: today,
              title: `Åtgärdsprogram ${today}`,
              notes: marker,
              status: 'draft',
              is_template: false,
              total_duration_seconds: null,
              template_name: null,
              completed_at: null,
            })
            .select('id')
            .single();
          if (wErr || !newWorkout?.id) throw wErr ?? new Error('Kunde inte skapa utkast.');
          workoutId = newWorkout.id;
        }

        // 4. Ensure pt_exercises exist then link to workout
        const exerciseRows: {
          workout_id: string;
          exercise_id: string;
          order_index: number;
          target_sets: number;
          target_reps: string;
          notes: null;
          is_superset_with_next: boolean;
        }[] = [];

        for (const sug of suggestions) {
          const { data: existing } = await supabase
            .from('pt_exercises')
            .select('id')
            .eq('id', sug.id)
            .maybeSingle();

          if (!existing) {
            await supabase.from('pt_exercises').insert({
              id: sug.id,
              name: sug.name,
              category: 'mobility',
              tracking_type: 'other',
              muscle_group: sug.tags.slice(0, 3).map((t) => t.toLowerCase().replace(/\s+/g, '_')),
              equipment: null,
              description: sug.description,
              video_url: sug.videoUrl,
              is_favorite: false,
              created_by_pt_id: ptId,
            });
          }

          exerciseRows.push({
            workout_id: workoutId,
            exercise_id: sug.id,
            order_index: exerciseRows.length,
            target_sets: 3,
            target_reps: '10',
            notes: null,
            is_superset_with_next: false,
          });
        }

        if (exerciseRows.length > 0) {
          const { error: linkErr } = await supabase.from('workout_exercises').insert(exerciseRows);
          if (linkErr) throw linkErr;
        }

        // 5. Navigate to builder — it will load the draft automatically
        navigation.navigate('MovementAssessmentProgramBuilder', {
          clientId: targetClientId,
          assessmentId: assessment.id,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showAlert('Kunde inte autogenerera', msg || 'Försök igen.');
      } finally {
        setAutoGenerating(false);
      }
    },
    [authUser?.id, client?.id, clientId, navigation, showAlert]
  );

  if (loading && !aggregate) {
    return (
      <ScreenContainer title="Atletprofil" scroll>
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (!client && !aggregate) {
    return (
      <ScreenContainer title="Atletprofil" scroll>
        <Text style={styles.muted}>Atleten hittades inte</Text>
        <Button label="Tillbaka" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const avatarColor = getClientAvatarColor(client?.id ?? clientId);
  const weekSchedule = aggregate?.adapt ? weekScheduleForProgram(aggregate.adapt) : [];
  const todaySession = aggregate?.adapt ? todayAdaptSession(aggregate.adapt) : null;
  const userId = aggregate?.userId ?? client?.client_user_id;
  const todayDow = new Date().getDay();

  const heroEnergySystem = aggregate?.adapt?.program.program_type
    ? /atp|sprint/i.test(aggregate.adapt.program.program_type)
      ? 'ATP-PC'
      : /glyco|styrk/i.test(aggregate.adapt.program.program_type)
        ? 'Glykolytisk'
        : 'Aerob'
    : undefined;

  const heroSummary = (() => {
    const recovery = deriveRecoveryScore(aggregate);
    if (recovery == null) return undefined;
    const state = recovery >= 67 ? 'optimalt' : recovery >= 34 ? 'måttligt' : 'lågt';
    return `är i ett ${state} återhämtningstillstånd idag`;
  })();

  return (
    <>
    <ScreenContainer
      title="Atletprofil"
      scroll
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>← Tillbaka</Text>
        </TouchableOpacity>
      }
    >
      <WhoopHeroSection
        name={displayName}
        sport={[client?.sport, aggregate?.profile?.team].filter(Boolean).join(' · ') || undefined}
        avatarInitials={getClientInitials(displayName)}
        statusLabel={statusLabels[status]}
        statusColor={statusColors[status].text}
        energySystemLabel={heroEnergySystem}
        agePill={client?.age ? `${client.age} år` : undefined}
        weightPill={client?.weight_kg ? `${client.weight_kg} kg` : undefined}
        email={client?.email ?? aggregate?.profile?.email ?? undefined}
        summary={heroSummary}
        recoveryScore={deriveRecoveryScore(aggregate)}
        strainScore={deriveStrainScore(aggregate)}
        nutritionScore={deriveNutritionScore(aggregate)}
        sleepScore={deriveSleepScore(aggregate)}
        sessions={aggregate?.timerSessions ?? []}
        apps={aggregate?.apps ?? { perform: false, tracker: false, macro: false, goalsetter: false }}
        backButton={
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.back}>← Tillbaka</Text>
          </TouchableOpacity>
        }
        onInfo={handleOpenInfo}
        onMessage={isAssignedToMe && client?.client_user_id ? () => navigation.navigate('MainTabs', { screen: 'Messages' }) : undefined}
        onSession={isAssignedToMe && client ? () => navigation.navigate('SessionTimer', { clientId: client.id }) : undefined}
      />

      {!isAssignedToMe && athleteUserId ? (
        <GlassCard variant="coach" style={styles.assignCard}>
          <Text style={styles.assignTitle}>
            {isAdmin ? 'Atleten är inte tilldelad dig' : 'Du är inte tränare för denna atlet'}
          </Text>
          <Text style={styles.assignBody}>
            Tilldela dig själv för att se pass, program och chatt på dashboarden.
            {isAdmin ? ' Som admin kan du även tilldela en annan tränare.' : ''}
          </Text>
          <View style={styles.assignActions}>
            <Button
              label="Tilldela mig som tränare"
              variant="primary"
              size="sm"
              onPress={() => handleAssignToCoach()}
              disabled={isAssigning}
            />
            {isAdmin ? (
              <Button
                label="Tilldela annan tränare"
                variant="secondary"
                size="sm"
                onPress={() => setCoachPickerVisible(true)}
                disabled={isAssigning}
              />
            ) : null}
          </View>
        </GlassCard>
      ) : null}

      {aggregate?.loadWarnings?.length ? (
        <GlassCard style={[styles.card, styles.warningCard]}>
          <SectionLabel>Datakoppling / läsrätt</SectionLabel>
          {aggregate.loadWarnings.slice(0, 4).map((msg) => (
            <Text key={msg} style={styles.warningText}>
              {msg}
            </Text>
          ))}
          {aggregate.loadWarnings.length > 4 ? (
            <Text style={styles.warningText}>
              … samt {aggregate.loadWarnings.length - 4} ytterligare varningar.
            </Text>
          ) : null}
          {aggregate.linkedUserId && aggregate.userId && aggregate.linkedUserId !== aggregate.userId ? (
            <Text style={styles.warningHint}>
              Visar data via fallback user_id ({aggregate.userId.slice(0, 8)}…).
            </Text>
          ) : null}
        </GlassCard>
      ) : null}

      <AthleteTabNav tabs={TABS} activeId={tab} onChange={(id) => setTab(id as TabId)} />

      {loading && !aggregate ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginVertical: 24 }} />
      ) : null}

      {tab === 'overview' && (
        <OverviewTab
          aggregate={aggregate}
          client={client}
          goalPct={goalPct}
          weekSchedule={weekSchedule}
          todaySession={todaySession}
          todayDow={todayDow}
          onOpenSessions={() => setTab('sessions')}
          onOpenProgram={() => setTab('program')}
          onOpenGoalsetter={() => setTab('goalsetter')}
          onScreening={() => navigation.navigate('ScreeningHub')}
          onMovement={() => navigation.navigate('MovementAssessmentClientPick')}
          onEditProgram={() =>
            aggregate?.adapt &&
            navigation.navigate('ProgramBuilder', {
              programId: aggregate.adapt.program.id,
              clientId: client?.id,
            })
          }
          onEditPerformProgram={(params) =>
            navigation.navigate('PerformProgramEditor', {
              ...params,
              userId: userId ?? undefined,
              clientId: client?.id ?? clientId,
            })
          }
          onStartSession={() =>
            client && navigation.navigate('SessionTimer', { clientId: client.id })
          }
          onBookSession={() => setBookSessionVisible(true)}
          onOpenAssessmentProgram={(assessmentId) =>
            navigation.navigate('MovementAssessmentProgramBuilder', {
              clientId: client?.id ?? clientId,
              assessmentId,
            })
          }
          onAutoGenerate={(assessment) => { void handleAutoGenerate(assessment); }}
          autoGenerating={autoGenerating}
        />
      )}
      {tab === 'sessions' && (
        <SessionsTab aggregate={aggregate} client={client} />
      )}
      {tab === 'perform' && (
        <PerformTab
          aggregate={aggregate}
          userId={userId ?? undefined}
          clientId={client?.id ?? clientId}
          onScreening={() => navigation.navigate('ScreeningHub')}
          onMovement={() => navigation.navigate('MovementAssessmentClientPick')}
          onEditProgram={(params) =>
            navigation.navigate('PerformProgramEditor', {
              ...params,
              userId: userId ?? undefined,
              clientId: client?.id ?? clientId,
            })
          }
        />
      )}
      {tab === 'program' && (
        <ProgramTab
          aggregate={aggregate}
          weekSchedule={weekSchedule}
          todaySession={todaySession}
          todayDow={todayDow}
          onEditAdapt={() =>
            aggregate?.adapt &&
            navigation.navigate('ProgramBuilder', {
              programId: aggregate.adapt.program.id,
              clientId: client?.id,
            })
          }
          onStartSession={() =>
            client && navigation.navigate('SessionTimer', { clientId: client.id })
          }
        />
      )}
      {tab === 'goalsetter' && (
        <GoalsetterTab aggregate={aggregate} userId={userId} onSaved={load} />
      )}
    </ScreenContainer>
    <CoachPickerModal
      visible={coachPickerVisible}
      onClose={() => setCoachPickerVisible(false)}
      onSelect={handleCoachPick}
      isSelecting={isAssigning}
      fetchTrainers={loadTrainers}
    />

    <BookSessionSheet
      visible={bookSessionVisible}
      onClose={() => setBookSessionVisible(false)}
      athleteName={displayName}
      onBook={(date, time) => {
        setBookSessionVisible(false);
        navigation.navigate('CreateSession', {
          clientId: client?.id,
        });
        Alert.alert('Bokad', `Session bokad ${date} kl ${time}`);
      }}
    />

    {/* ---- User Profile Info Modal ---- */}
    <Modal
      visible={infoModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setInfoModalVisible(false)}
    >
      <SafeAreaView style={athleteInfoStyles.container}>
        <View style={athleteInfoStyles.header}>
          <TouchableOpacity onPress={() => setInfoModalVisible(false)} hitSlop={12}>
            <Text style={athleteInfoStyles.closeBtn}>Stäng</Text>
          </TouchableOpacity>
          <Text style={athleteInfoStyles.title}>Användarinfo</Text>
          <View style={{ width: 48 }} />
        </View>

        {isLoadingProfile ? (
          <View style={athleteInfoStyles.center}>
            <ActivityIndicator color="#00D4AA" size="large" />
          </View>
        ) : !userProfile ? (
          <View style={athleteInfoStyles.center}>
            <Text style={athleteInfoStyles.emptyIcon}>{'👤'}</Text>
            <Text style={athleteInfoStyles.emptyText}>
              Atleten saknar ett M2M-konto.{'\n'}Skapa ett konto så kan atleten logga in i appen.
            </Text>
            <View style={athleteInfoStyles.inviteForm}>
              {!client?.email && (
                <>
                  <TextInput
                    style={[
                      athleteInfoStyles.emailInput,
                      inviteEmailError && athleteInfoStyles.emailInputError,
                    ]}
                    value={inviteEmail}
                    onChangeText={(t) => { setInviteEmail(t); setInviteEmailError(false); }}
                    placeholder="E-postadress till atleten"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isInviting}
                  />
                  {inviteEmailError && (
                    <Text style={athleteInfoStyles.emailErrorTxt}>Ange en giltig e-postadress</Text>
                  )}
                </>
              )}
              <TouchableOpacity
                style={[athleteInfoStyles.inviteBtn, isInviting && { opacity: 0.6 }]}
                onPress={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={athleteInfoStyles.inviteBtnTxt}>✉ Skapa konto & skicka inbjudan via e-post</Text>
                )}
              </TouchableOpacity>
              <Text style={athleteInfoStyles.inviteHint}>
                Atleten får ett mail via Resend med en länk för att aktivera sitt konto.
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={athleteInfoStyles.scroll}>
            <AthleteInfoSection title="Grundinfo">
              <AthleteInfoRow label="Namn" value={userProfile.name} />
              <AthleteInfoRow label="E-post" value={userProfile.email} />
              <AthleteInfoRow label="Idrott" value={userProfile.sport} />
              <AthleteInfoRow label="Lag" value={userProfile.team} />
              <AthleteInfoRow label="Position" value={userProfile.position} />
              <AthleteInfoRow label="Ålder" value={userProfile.age != null ? `${userProfile.age} år` : null} />
            </AthleteInfoSection>

            <AthleteInfoSection title="Aktivitet">
              <AthleteInfoRow label="Poäng" value={userProfile.points != null ? String(userProfile.points) : null} />
              <AthleteInfoRow label="Nuvarande streak" value={userProfile.current_streak != null ? `${userProfile.current_streak} dagar` : null} />
              <AthleteInfoRow label="Senaste träning" value={userProfile.last_workout_at ? formatDate(userProfile.last_workout_at) : null} />
            </AthleteInfoSection>

            {(userProfile.goal_weight != null || userProfile.activity_level != null || userProfile.goal_type != null || userProfile.macro_mode != null || userProfile.current_tdee_estimate != null) && (
              <AthleteInfoSection title="Mål & Hälsa">
                <AthleteInfoRow label="Målvikt" value={userProfile.goal_weight != null ? `${userProfile.goal_weight} kg` : null} />
                <AthleteInfoRow label="Aktivitetsnivå" value={userProfile.activity_level} />
                <AthleteInfoRow label="Måltyp" value={userProfile.goal_type} />
                <AthleteInfoRow label="Makroläge" value={userProfile.macro_mode} />
                <AthleteInfoRow label="TDEE-uppskattning" value={userProfile.current_tdee_estimate != null ? `${userProfile.current_tdee_estimate} kcal` : null} />
              </AthleteInfoSection>
            )}

            <AthleteInfoSection title="Systeminfo">
              <AthleteInfoRow label="User ID" value={userProfile.user_id} mono />
            </AthleteInfoSection>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
    </>
  );
}

function AthleteInfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={athleteInfoStyles.section}>
      <Text style={athleteInfoStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function AthleteInfoRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <View style={athleteInfoStyles.row}>
      <Text style={athleteInfoStyles.rowLabel}>{label}</Text>
      <Text style={[athleteInfoStyles.rowValue, mono && athleteInfoStyles.rowValueMono]} numberOfLines={1} selectable>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const athleteInfoStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1E24' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeBtn: { fontSize: 15, color: '#00D4AA' },
  title: { fontSize: 16, fontWeight: '600', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  inviteForm: {
    marginTop: 20, width: '100%', maxWidth: 320, gap: 12, alignItems: 'center',
  },
  emailInput: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#fff',
  },
  emailInputError: {
    borderColor: '#ff4d4d',
    backgroundColor: 'rgba(255,77,77,0.08)',
  },
  emailErrorTxt: {
    fontSize: 12, color: '#ff4d4d', alignSelf: 'flex-start',
  },
  inviteHint: {
    fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 16,
  },
  inviteBtn: {
    width: '100%', paddingVertical: 13,
    borderRadius: 10, backgroundColor: '#00D4AA', alignItems: 'center',
  },
  inviteBtnTxt: { fontSize: 15, fontWeight: '600', color: '#000' },
  scroll: { padding: 20, gap: 24 },
  section: { gap: 0 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rowLabel: { width: 140, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  rowValue: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.88)' },
  rowValueMono: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
});

function OverviewTab({
  aggregate,
  client,
  goalPct,
  weekSchedule,
  todaySession,
  todayDow,
  onOpenSessions,
  onOpenProgram,
  onOpenGoalsetter,
  onScreening,
  onMovement,
  onEditProgram,
  onEditPerformProgram,
  onStartSession,
  onBookSession,
  onOpenAssessmentProgram,
  onAutoGenerate,
  autoGenerating,
}: {
  aggregate: AthleteAggregateView | null;
  client: Client | null;
  goalPct: number | null;
  weekSchedule: ReturnType<typeof weekScheduleForProgram>;
  todaySession: ReturnType<typeof todayAdaptSession>;
  todayDow: number;
  onOpenSessions: () => void;
  onOpenProgram: () => void;
  onOpenGoalsetter: () => void;
  onScreening: () => void;
  onMovement: () => void;
  onEditProgram: () => void;
  onEditPerformProgram: (params: {
    programId: string;
    programType: 'mobility' | 'ohs';
    screeningId?: string;
  }) => void;
  onStartSession: () => void;
  onBookSession?: () => void;
  onOpenAssessmentProgram: (assessmentId: string) => void;
  onAutoGenerate: (assessment: MovementAssessmentRow) => void;
  autoGenerating: boolean;
}) {
  const primaryGoal = aggregate?.goalsetter.goals[0];
  const perform = aggregate?.perform;
  const latestScreening = perform?.screeningSessions[0];
  const areas = latestScreening?.areas ?? [];
  const performScoreData = usePerformScore(areas);
  const performScore = performScoreData?.score ?? null;
  const progression = performScoreData?.progression ?? [];
  const radarScores = screeningScores(areas);
  const performDelta = performDeltaLabel(perform?.screeningSessions);
  const riskAreas = deriveRiskAreas(areas);
  const factors = (primaryGoal?.factors ?? []).slice(0, 4);
  const ohsCells = deriveOhsCellsFromAreas(areas);
  const areaRecommendations = buildAreaRecommendations(areas).filter((rec) => rec.priority !== 'low');
  const weekDays = buildWeekDaysFromSchedule(weekSchedule, todayDow, [1, 2, 3, 4, 5, 6, 0]);
  const routines = buildRoutineItems(aggregate);
  const doneRoutines = routines.filter((r) => r.done).length;
  const recentSessions = buildRecentSessions(aggregate).slice(0, 3);
  const screeningDate = latestScreening?.analysedAt
    ? new Date(latestScreening.analysedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const showPerformSection = hasPerformOverviewData(perform, performScore);
  const mobilityPrograms = perform?.mobilityPrograms ?? [];
  const showAreaRecommendations = areaRecommendations.length > 0 && mobilityPrograms.length === 0;

  const latestMovement = aggregate?.perform?.movementAssessments[0] ?? null;

  const todayStats = deriveTodayStats(
    aggregate?.timerSessions ?? [],
    aggregate?.goalsetter ?? { nutritionGoal: null, routines: [], physicalTests: [], hasSportGoals: false, goals: [], habits: [], tasks: [], activityStreak: null }
  );

  return (
    <View style={styles.tabPanel}>
      {/* Today stats */}
      <TodayStatsGrid stats={todayStats} />

      {/* Vitals + Connected apps row */}
      <View style={styles.vitalsRow}>
        <View style={styles.vitalsCell}>
          <VitalTrendsCard screeningSessions={aggregate?.perform?.screeningSessions ?? []} />
        </View>
        {aggregate?.apps ? (
          <View style={styles.vitalsCell}>
            <ConnectedAppsCard apps={aggregate.apps} />
          </View>
        ) : null}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={onStartSession} activeOpacity={0.8}>
          <Text style={styles.quickActionIcon}>▶</Text>
          <Text style={styles.quickActionLabel}>Starta session</Text>
        </TouchableOpacity>
        {onBookSession ? (
          <TouchableOpacity style={styles.quickActionBtn} onPress={onBookSession} activeOpacity={0.8}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionLabel}>Boka session</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.quickActionBtn} onPress={onMovement} activeOpacity={0.8}>
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionLabel}>Rörelsebedömning</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionBtn, styles.quickActionBtnSec]} onPress={onOpenProgram} activeOpacity={0.7}>
          <Text style={styles.quickActionIcon}>📅</Text>
          <Text style={[styles.quickActionLabel, styles.quickActionLabelSec]}>Adapt Program</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionBtn, styles.quickActionBtnSec]} onPress={onOpenSessions} activeOpacity={0.7}>
          <Text style={styles.quickActionIcon}>📊</Text>
          <Text style={[styles.quickActionLabel, styles.quickActionLabelSec]}>Sessioner</Text>
        </TouchableOpacity>
      </View>

      <PrimaryGoalCard
        title={primaryGoal?.title ?? aggregate?.adapt?.program.name ?? 'Inget mål'}
        subtitle={
          primaryGoal?.deadline
            ? `Deadline: ${primaryGoal.deadline}`
            : nutritionGoalSummary(aggregate?.goalsetter.nutritionGoal ?? null)
        }
        pct={goalPct ?? 0}
        startLabel={aggregate?.lastActivityAt ? `Senast aktiv: ${new Date(aggregate.lastActivityAt).toLocaleDateString('sv-SE')}` : undefined}
        deadlineLabel={primaryGoal?.deadline ? `Mål: ${primaryGoal.deadline}` : undefined}
      />

      <View>
        <SectionLabel>Nyckelfaktorer</SectionLabel>
        {factors.length ? (
          <GlassCard style={styles.cardTight}>
            {factors.map((name) => (
              <Text key={name} style={styles.cardSub}>• {name}</Text>
            ))}
          </GlassCard>
        ) : (
          <Text style={styles.muted}>Inga faktorer i databasen</Text>
        )}
      </View>

      {showPerformSection ? (
      <View style={styles.appSection}>
        <AppSectionHeader
          barColor={coachColors.accent}
          title="M2M Perform"
          titleColor={coachColors.accent}
          subtitle={`Senaste screening · ${screeningDate}`}
          linkLabel="Se mer"
          onLinkPress={onScreening}
        />
        {performScore != null ? (
          <>
            <View style={styles.pfGrid}>
              <PerformScoreRing score={performScore} delta={performDelta} />
              <PerformRadarCard scores={radarScores} />
            </View>
            {progression.length > 0 ? <PerformProgressCard points={progression} /> : null}
            {ohsCells.length > 0 ? (
              <OhsSquatCard score={performScore} delta={performDelta} cells={ohsCells} />
            ) : null}
            {riskAreas.length > 0 ? (
              <GlassCard style={styles.cardTight}>
                <SectionLabel>Riskområden</SectionLabel>
                <RiskAreaList areas={riskAreas} />
              </GlassCard>
            ) : null}
            {showAreaRecommendations ? (
              <GlassCard style={styles.cardTight}>
                <View style={styles.recHdrRow}>
                  <SectionLabel>Prioriterade områden · Rörelsebedömning</SectionLabel>
                  <TouchableOpacity onPress={onMovement}>
                    <Text style={styles.linkSmall}>Se bedömning ›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recList}>
                  {areaRecommendations.map((rec) => (
                    <RecCard
                      key={rec.title}
                      icon={rec.icon}
                      title={rec.title}
                      priority={rec.priority}
                      text={rec.text}
                    />
                  ))}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : null}
        {mobilityPrograms.length > 0 ? (
          <GlassCard style={styles.cardTight}>
            <View style={styles.recHdrRow}>
              <View>
                <SectionLabel>Åtgärdsprogram · Mobilitet</SectionLabel>
                <Text style={styles.cardSub}>
                  Förskrivet {screeningDate} · Baserat på rörelsebedömning
                </Text>
              </View>
              <TouchableOpacity onPress={onMovement}>
                <Text style={styles.linkSmall}>Bedömning ›</Text>
              </TouchableOpacity>
            </View>
            {mobilityPrograms.slice(0, 2).map((p) => (
              <View key={p.id} style={styles.pfExRow}>
                <View style={[styles.pfExIcon, styles.pfExIconOrange]}>
                  <Text style={styles.pfExIconTxt}>↗</Text>
                </View>
                <View style={styles.pfExBody}>
                  <Text style={styles.pfExName}>Mobilitetsprogram</Text>
                  <Text style={styles.pfExDesc}>
                    {performProgramExerciseCount(p)} övningar · screening
                  </Text>
                </View>
                <Button
                  label="Redigera"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    onEditPerformProgram({
                      programId: p.id,
                      programType: 'mobility',
                      screeningId: p.screening_id ? String(p.screening_id) : undefined,
                    })
                  }
                />
              </View>
            ))}
          </GlassCard>
        ) : null}
      </View>
      ) : (
        <Text style={styles.muted}>Ingen Perform-data i databasen</Text>
      )}

      {/* Movement assessment ScoreBar card */}
      {latestMovement ? (
        <View style={styles.appSection}>
          <AppSectionHeader
            barColor={coachColors.coach}
            title="Rörelsebedömning"
            titleColor={coachColors.coach}
            subtitle={latestMovement.assessment_date || latestMovement.created_at.slice(0, 10)}
            linkLabel="Öppna"
            onLinkPress={onMovement}
          />
          <GlassCard style={styles.cardTight}>
            <View style={styles.maCardHeader}>
              {latestMovement.resultat_band ? (
                <View style={[styles.maBandChip, { backgroundColor: getBandBg(latestMovement.resultat_band) }]}>
                  <Text style={[styles.maBandText, { color: getBandColor(latestMovement.resultat_band) }]}>
                    {bandDisplaySv(latestMovement.resultat_band as ScoreBand)}
                  </Text>
                </View>
              ) : null}
              {latestMovement.resultat_totalt != null ? (
                <Text style={styles.maTotalScore}>
                  {Math.round(latestMovement.resultat_totalt)}/100
                </Text>
              ) : null}
            </View>
            <ScoreBar label="Hållning" value={latestMovement.resultat_hallning} />
            <ScoreBar label="Rörlighet" value={latestMovement.resultat_rorlighet} />
            <ScoreBar label="Kärna" value={latestMovement.resultat_karna} />
            <ScoreBar label="Stabilitet" value={latestMovement.resultat_stabilitet} />
            <View style={styles.maActions}>
              <TouchableOpacity
                style={styles.maActionBtn}
                onPress={() => onOpenAssessmentProgram(latestMovement.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.maActionBtnText}>Se / Redigera program →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.maActionBtn, styles.maActionBtnPrimary, autoGenerating && { opacity: 0.6 }]}
                onPress={() => !autoGenerating && onAutoGenerate(latestMovement)}
                activeOpacity={0.8}
                disabled={autoGenerating}
              >
                {autoGenerating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.maActionBtnText, styles.maActionBtnTextPrimary]}>
                    ✦ Autogenerera mall
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      ) : null}

      {aggregate?.adapt ? (
        <View style={styles.appSection}>
          <AppSectionHeader
            barColor={coachColors.coach}
            title="Adapt Program"
            titleColor={coachColors.coach}
            subtitle={`${aggregate.adapt.program.name} · Vecka ${aggregate.adapt.currentWeek} av ${aggregate.adapt.program.duration_weeks ?? aggregate.adapt.program.weeks ?? '?'}`}
            linkLabel="Redigera"
            onLinkPress={onEditProgram}
          />
          <GlassCard style={styles.programCard}>
            <Text style={styles.phaseLabel}>
              Vecka {aggregate.adapt.currentWeek} av {aggregate.adapt.program.duration_weeks ?? aggregate.adapt.program.weeks ?? '?'}
            </Text>
            <ProgramWeekGrid days={weekDays} />
          </GlassCard>
          {todaySession ? (
            <GlassCard style={styles.cardTight}>
              <View style={styles.todaySessionRow}>
                <View style={styles.todaySessionBody}>
                  <Text style={styles.todayLabel}>
                    Idag · {todaySession.session_name ?? todaySession.day_of_week}
                  </Text>
                  <Text style={styles.todayTitle}>{todaySession.session_name}</Text>
                  <Text style={styles.todaySub}>
                    {todaySession.warmup_notes ?? 'Uppvärmning'} · {todaySession.estimated_duration_minutes ?? 90} min
                  </Text>
                </View>
                <Button label="Starta" size="sm" variant="primary" onPress={onStartSession} />
              </View>
            </GlassCard>
          ) : null}
        </View>
      ) : null}

      <View style={styles.appSection}>
        <AppSectionHeader
          barColor={coachColors.coach}
          title="Goalsetter"
          titleColor={coachColors.coach}
          subtitle={
            routines.length > 0
              ? `Dagliga rutiner · ${doneRoutines} av ${routines.length} klara`
              : 'Dagliga rutiner · —'
          }
          linkLabel="Se alla"
          onLinkPress={onOpenGoalsetter}
        />
        <RoutineList items={routines.slice(0, 4)} />
        {aggregate?.goalsetter.activityStreak ? (
          <GlassCard variant="accent" style={styles.cardTight}>
            <SectionLabel>Season Mode — Aktiv</SectionLabel>
            <Text style={styles.seasonTitle}>
              Streak: {aggregate.goalsetter.activityStreak.current_streak} dagar
            </Text>
            <Text style={styles.seasonSub}>
              Längsta: {aggregate.goalsetter.activityStreak.longest_streak} · SM-säsong
            </Text>
          </GlassCard>
        ) : null}
      </View>

      <View style={styles.appSection}>
        <AppSectionHeader
          barColor={coachColors.coach}
          title="Senaste sessioner"
          titleColor={coachColors.mutedHi}
          linkLabel="Se alla"
          onLinkPress={onOpenSessions}
        />
        <View style={styles.sessionList}>
          {recentSessions.length === 0 ? (
            <Text style={styles.muted}>Inga sessioner</Text>
          ) : (
            recentSessions.map((s) => (
              <SessionListRow
                key={s.key}
                date={s.date}
                name={s.name}
                sys={s.sys}
                load={s.load}
                loadColor={s.loadColor}
              />
            ))
          )}
        </View>
      </View>
    </View>
  );
}

function SessionsTab({
  aggregate,
  client,
}: {
  aggregate: AthleteAggregateView | null;
  client: Client | null;
}) {
  const rows = buildRecentSessions(aggregate);
  const performRows = aggregate?.perform?.workoutHistory ?? [];
  const trackerRows = aggregate?.tracker?.sessions ?? [];

  return (
    <View style={styles.tabPanel}>
      <SectionLabel>Senaste sessioner</SectionLabel>
      <View style={styles.sessionList}>
        {rows.length === 0 && performRows.length === 0 && trackerRows.length === 0 ? (
          <Text style={styles.muted}>Inga sessioner</Text>
        ) : null}
        {rows.slice(0, 3).map((s, idx) =>
          s.workoutId ? (
            <CoachWorkoutSessionRow
              key={s.key}
              workoutId={s.workoutId}
              defaultExpanded={idx === 0}
              session={{
                id: s.key,
                badge: 'PT',
                title: s.name,
                meta: `${s.date} · ${s.sys}`,
                screeningNote: client?.notes ?? undefined,
              }}
            />
          ) : (
            <ExpandableSessionRow
              key={s.key}
              defaultExpanded={idx === 0}
              session={{
                id: s.key,
                badge: 'TR',
                title: s.name,
                meta: `${s.date} · ${s.sys}`,
              }}
            />
          )
        )}
        {performRows.slice(0, 2).map((s) => (
          <ExpandableSessionRow
            key={s.id}
            session={{
              id: s.id,
              badge: 'PF',
              title: s.workout_type ?? 'Perform',
              meta: `${formatSessionDateLabel(s.completed_at)} · ${s.exercises_completed ?? 0}/${s.total_exercises ?? '?'} övningar`,
            }}
          />
        ))}
        {trackerRows.slice(0, 2).map((s) => (
          <ExpandableSessionRow
            key={s.id}
            session={{
              id: s.id,
              badge: 'TR',
              title: s.goal_key,
              meta: `${new Date(s.ended_at).toLocaleDateString('sv-SE')} · ${s.sets.length} set`,
              sets: s.sets.map((set, setIdx) => ({
                label: `SET ${setIdx + 1}`,
                weight: set.weight != null ? `${set.weight} kg` : '—',
                reps: set.reps != null ? `${set.reps} reps` : '—',
                rpe: undefined,
                state: 'done' as const,
              })),
            }}
          />
        ))}
      </View>
    </View>
  );
}

function CoachWorkoutSessionRow({
  workoutId,
  session,
  defaultExpanded,
}: {
  workoutId: string;
  session: {
    id: string;
    badge: string;
    title: string;
    meta: string;
    screeningNote?: string;
  };
  defaultExpanded?: boolean;
}) {
  const [sets, setSets] = useState<SetRowData[] | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: workoutExercises, error: weError } = await supabase
          .from('workout_exercises')
          .select('id')
          .eq('workout_id', workoutId)
          .order('order_index', { ascending: true });
        if (weError || !workoutExercises?.length) {
          if (!cancelled) setSets(undefined);
          return;
        }
        const weIds = workoutExercises.map((we) => we.id);
        const { data: setsData, error: setsError } = await supabase
          .from('sets')
          .select('*')
          .in('workout_exercise_id', weIds)
          .order('set_number', { ascending: true });
        if (setsError || !setsData?.length) {
          if (!cancelled) setSets(undefined);
          return;
        }
        const firstIncomplete = setsData.findIndex((s) => !s.completed_at);
        const mapped: SetRowData[] = setsData.map((set, idx) => {
          const state: SetRowData['state'] =
            set.completed_at
              ? 'done'
              : idx === firstIncomplete
                ? 'current'
                : 'todo';
          return {
            label: `SET ${set.set_number}`,
            weight: set.weight_kg != null ? `${set.weight_kg} kg` : '—',
            reps: set.reps != null ? `${set.reps} reps` : '—',
            rpe: set.rpe != null ? `RPE ${set.rpe}` : undefined,
            pb: !!set.is_pr,
            state,
          };
        });
        if (!cancelled) setSets(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  return (
    <ExpandableSessionRow
      defaultExpanded={defaultExpanded}
      session={{
        ...session,
        sets: loading ? undefined : sets,
      }}
    />
  );
}

function ProgramTab({
  aggregate,
  weekSchedule,
  todaySession,
  todayDow,
  onEditAdapt,
  onStartSession,
}: {
  aggregate: AthleteAggregateView | null;
  weekSchedule: ReturnType<typeof weekScheduleForProgram>;
  todaySession: ReturnType<typeof todayAdaptSession>;
  todayDow: number;
  onEditAdapt: () => void;
  onStartSession: () => void;
}) {
  const weekDays = buildWeekDaysFromSchedule(weekSchedule, todayDow, [1, 2, 3, 4, 5, 6, 0]);

  return (
    <View style={styles.tabPanel}>
      {aggregate?.adapt ? (
        <>
          <SectionLabel>{`Aktiv plan — ${aggregate.adapt.program.name}`}</SectionLabel>
          <GlassCard style={styles.programCard}>
            <View style={styles.programHeader}>
              <View>
                <Text style={styles.cardTitle}>{aggregate.adapt.program.name}</Text>
                <Text style={styles.cardSub}>
                  Fas: Toppning · Vecka {aggregate.adapt.currentWeek} av{' '}
                  {aggregate.adapt.program.duration_weeks ?? aggregate.adapt.program.weeks ?? '?'}
                </Text>
              </View>
              <Button label="Redigera" size="sm" variant="primary" onPress={onEditAdapt} />
            </View>
            <ProgramWeekGrid days={weekDays} />
          </GlassCard>
          {todaySession ? (
            <GlassCard style={styles.cardTight}>
              <SectionLabel>Dagens session — Idag</SectionLabel>
              <Text style={styles.cardTitle}>{todaySession.session_name}</Text>
              <Text style={styles.cardSub}>
                {todaySession.warmup_notes ?? 'Uppvärmning'} → Intervaller → Nedvarvning ·{' '}
                {todaySession.estimated_duration_minutes ?? 90} min
              </Text>
              <Button
                label="Starta session nu"
                variant="primary"
                onPress={onStartSession}
                style={{ marginTop: 14 }}
              />
            </GlassCard>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>Inget Adapt-program</Text>
      )}
    </View>
  );
}

function performProgramExerciseCount(p: {
  program_full?: unknown;
  program_short?: unknown;
}): number {
  return programExerciseCount(p.program_full ?? p.program_short ?? {});
}

function PerformTab({
  aggregate,
  userId: _userId,
  clientId: _clientId,
  onScreening,
  onMovement,
  onEditProgram,
}: {
  aggregate: AthleteAggregateView | null;
  userId?: string;
  clientId?: string;
  onScreening: () => void;
  onMovement: () => void;
  onEditProgram: (params: {
    programId: string;
    programType: 'mobility' | 'ohs';
    screeningId?: string;
  }) => void;
}) {
  const perform = aggregate?.perform;
  const latest = perform?.screeningSessions[0];
  const areas = latest?.areas ?? [];
  const performScoreData = usePerformScore(areas);
  const performScore = performScoreData?.score ?? null;
  const progression = performScoreData?.progression ?? [];
  const radarScores = screeningScores(areas);
  const performDelta = performDeltaLabel(perform?.screeningSessions);
  const riskAreas = deriveRiskAreas(areas);
  const ohsCells = deriveOhsCellsFromAreas(areas);

  if (!perform) {
    return (
      <View style={styles.tabPanel}>
        <Text style={styles.muted}>Ingen Perform-data tillgänglig.</Text>
        <Button label="Öppna Screening" variant="secondary" onPress={onScreening} />
      </View>
    );
  }

  return (
    <View style={styles.tabPanel}>
      {perform.loadErrors?.length ? (
        <GlassCard style={[styles.cardTight, styles.errorCard]}>
          <SectionLabel>Kunde inte ladda screeningdata</SectionLabel>
          {perform.loadErrors.map((msg) => (
            <Text key={msg} style={styles.errorText}>
              {msg}
            </Text>
          ))}
        </GlassCard>
      ) : null}

      <View style={styles.performActions}>
        <Button label="Ny screening" size="sm" variant="secondary" onPress={onScreening} />
        <Button label="Rörelsebedömning" size="sm" variant="secondary" onPress={onMovement} />
      </View>

      {performScore != null ? (
        <>
          <View style={styles.pfGrid}>
            <PerformScoreRing score={performScore} delta={performDelta} />
            <PerformRadarCard scores={radarScores} />
          </View>
          {progression.length > 0 ? <PerformProgressCard points={progression} /> : null}
          {ohsCells.length > 0 ? (
            <OhsSquatCard score={performScore} delta={performDelta} fullBreakdown cells={ohsCells} />
          ) : null}
          {riskAreas.length > 0 ? (
            <GlassCard style={styles.cardTight}>
              <SectionLabel>Riskområden</SectionLabel>
              <RiskAreaList areas={riskAreas} />
            </GlassCard>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>
          {perform?.movementAssessments.length
            ? 'Ingen poängdata i screening_results — visar bedömningsdata och program nedan.'
            : 'Ingen screeningdata'}
        </Text>
      )}

      <GlassCard style={styles.cardTight}>
        <View style={styles.recHdrRow}>
          <View>
            <SectionLabel>Övningsprogram · Screening</SectionLabel>
            <Text style={styles.cardSub}>
              Förskrivet {latest?.analysedAt ? new Date(latest.analysedAt).toLocaleDateString('sv-SE') : '—'} · Baserat på rörelsebedömning
            </Text>
          </View>
          <TouchableOpacity onPress={onMovement}>
            <Text style={styles.linkSmall}>Bedömning ›</Text>
          </TouchableOpacity>
        </View>
        {perform.mobilityPrograms.slice(0, 2).map((p) => (
          <View key={p.id} style={styles.pfExRow}>
            <View style={[styles.pfExIcon, styles.pfExIconOrange]}>
              <Text style={styles.pfExIconTxt}>↗</Text>
            </View>
            <View style={styles.pfExBody}>
              <Text style={styles.pfExName}>Mobilitetsprogram</Text>
              <Text style={styles.pfExDesc}>
                {performProgramExerciseCount(p)} övningar · screening
              </Text>
            </View>
            <Button
              label="Redigera"
              size="sm"
              variant="secondary"
              onPress={() =>
                onEditProgram({
                  programId: p.id,
                  programType: 'mobility',
                  screeningId: p.screening_id ? String(p.screening_id) : undefined,
                })
              }
            />
          </View>
        ))}
        {perform.ohsPrograms.slice(0, 1).map((p) => (
          <View key={p.id} style={styles.pfExRow}>
            <View style={[styles.pfExIcon, styles.pfExIconAccent]}>
              <Text style={styles.pfExIconTxt}>◎</Text>
            </View>
            <View style={styles.pfExBody}>
              <Text style={styles.pfExName}>OH-squat-program</Text>
              <Text style={styles.pfExDesc}>
                {performProgramExerciseCount(p)} övningar
              </Text>
            </View>
            <Button
              label="Redigera"
              size="sm"
              variant="secondary"
              onPress={() =>
                onEditProgram({
                  programId: p.id,
                  programType: 'ohs',
                  screeningId: p.screening_id ? String(p.screening_id) : undefined,
                })
              }
            />
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

function GoalsetterTab({
  aggregate,
  userId,
  onSaved,
}: {
  aggregate: AthleteAggregateView | null;
  userId: string | null | undefined;
  onSaved: () => void;
}) {
  const gs = aggregate?.goalsetter;
  const [newGoal, setNewGoal] = useState('');
  const [newTask, setNewTask] = useState('');

  const addGoal = async () => {
    if (!userId || !newGoal.trim()) return;
    try {
      await createGsGoal(userId, newGoal.trim());
      setNewGoal('');
      onSaved();
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const addTask = async () => {
    const goalId = gs?.goals[0]?.id;
    if (!userId || !goalId || !newTask.trim()) {
      Alert.alert('Saknas', 'Skapa ett mål först.');
      return;
    }
    try {
      await createGsTask(userId, goalId, newTask.trim());
      setNewTask('');
      onSaved();
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const routines = [
    ...(gs?.tasks ?? []).map((t) => ({
      id: t.id,
      label: t.title,
      time: t.due_date ?? '—',
      done: t.is_completed,
      onToggle: () => !t.is_completed && completeGsTask(t.id).then(onSaved),
    })),
    ...(gs?.routines ?? []).map((r) => ({
      id: r.id,
      label: r.session_name ?? 'Rutin',
      time: '—',
      done: r.is_completed,
      onToggle: undefined,
    })),
  ];

  return (
    <View style={styles.tabPanel}>
      <SectionLabel>Dagliga rutiner</SectionLabel>
      {routines.length === 0 ? (
        <Text style={styles.muted}>Inga rutiner ännu</Text>
      ) : (
        <RoutineList items={routines} />
      )}

      {gs?.activityStreak ? (
        <GlassCard variant="accent" style={styles.cardTight}>
          <SectionLabel>Season Mode — Aktiv</SectionLabel>
          <Text style={styles.seasonTitle}>
            Streak: {gs.activityStreak.current_streak} dagar
          </Text>
          <Text style={styles.seasonSub}>
            Längsta: {gs.activityStreak.longest_streak} · SM-säsong
          </Text>
        </GlassCard>
      ) : null}

      <SectionLabel>Mål</SectionLabel>
      {gs?.goals.length === 0 ? (
        <Text style={styles.muted}>Inga mål ännu</Text>
      ) : (
        gs?.goals.map((g) => (
          <GlassCard key={g.id} style={styles.cardTight}>
            <Text style={styles.cardTitle}>{g.title}</Text>
            {g.deadline ? (
              <Text style={styles.cardSub}>Deadline: {g.deadline}</Text>
            ) : null}
            {g.factors?.length > 0 ? (
              <Text style={styles.cardSub}>Faktorer: {g.factors.join(', ')}</Text>
            ) : null}
          </GlassCard>
        ))
      )}

      {gs?.habits.length ? (
        <>
          <SectionLabel>Habits</SectionLabel>
          {gs.habits.map((h) => (
            <View key={h.id} style={styles.habitRow}>
              <Text style={styles.pfExName}>{h.name}</Text>
              <Text style={styles.pfExDesc}>
                🔥 {h.streak_current} · {h.frequency}
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {userId ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nytt mål"
            placeholderTextColor={coachColors.muted}
            value={newGoal}
            onChangeText={setNewGoal}
          />
          <Button label="Lägg till mål" size="sm" onPress={addGoal} />
        </>
      ) : null}
      {userId && gs?.goals[0] ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Ny task kopplad till mål"
            placeholderTextColor={coachColors.muted}
            value={newTask}
            onChangeText={setNewTask}
          />
          <Button label="Lägg till task" size="sm" onPress={addTask} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  assignCard: {
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  assignTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: coachColors.fg,
  },
  assignBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.muted,
    lineHeight: 19,
  },
  assignActions: {
    gap: 8,
    marginTop: 4,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
  },
  heroBody: { flex: 1, minWidth: 140 },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  heroSportChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  heroSport: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.coach,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },

  // Quick actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: '45%' as any,
    backgroundColor: coachColors.coach,
    borderRadius: borderRadius.lg,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
  },
  quickActionBtnSec: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  quickActionIcon: { fontSize: 16 },
  quickActionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: '#000',
    textAlign: 'center',
  },
  quickActionLabelSec: {
    color: coachColors.fg,
  },

  // Movement assessment card
  maCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  maBandChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  maBandText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  maTotalScore: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    color: coachColors.mutedHi,
  },
  maActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  maActionBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
  },
  maActionBtnPrimary: {
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  maActionBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.coach,
    textAlign: 'center',
  },
  maActionBtnTextPrimary: {
    color: '#000',
  },
  tabPanel: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 100,
    paddingHorizontal: 0,
  },
  vitalsRow: { flexDirection: 'row', gap: 8 },
  vitalsCell: { flex: 1 },
  appSection: { gap: 8 },
  pfGrid: { flexDirection: 'row', gap: 8 },
  sessionList: { gap: 7 },
  recList: { gap: 8 },
  recHdrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  linkSmall: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.muted,
  },
  cardTight: { padding: 14 },
  programCard: { padding: 16 },
  phaseLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginBottom: 8,
  },
  todaySessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  todaySessionBody: { flex: 1 },
  todayLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
    marginBottom: 4,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
    marginBottom: 3,
    fontFamily: fonts.bodySemiBold,
  },
  todaySub: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.body },
  seasonTitle: { fontSize: 13, fontWeight: '500', color: coachColors.fg, marginBottom: 3, fontFamily: fonts.bodyMedium },
  seasonSub: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.body },
  card: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  cardSub: { fontSize: 12, color: coachColors.muted, marginTop: 4, fontFamily: fonts.body },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pfExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginBottom: 6,
  },
  pfExIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pfExIconOrange: {
    backgroundColor: coachColors.orangeDim,
    borderColor: 'rgba(255,95,31,0.22)',
  },
  pfExIconAccent: {
    backgroundColor: coachColors.accentDim,
    borderColor: 'rgba(247,233,40,0.20)',
  },
  pfExIconTxt: { fontSize: 14, color: coachColors.orange },
  pfExBody: { flex: 1, minWidth: 0 },
  pfExName: { fontSize: 12, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  pfExDesc: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    marginTop: 2,
  },
  habitRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: coachColors.border,
    borderRadius: borderRadius.md,
    padding: 10,
    color: coachColors.fg,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
    backgroundColor: coachColors.glassBg,
  },
  muted: { color: coachColors.muted, fontSize: 13, fontFamily: fonts.body, paddingVertical: 8 },
  performActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    gap: 12,
  },
  resultRowMain: { flex: 1 },
  programRow: { marginTop: 8, gap: 8 },
  resultAction: {
    fontSize: 12,
    fontWeight: '600',
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
  },
  errorCard: { borderColor: 'rgba(255,100,100,0.35)' },
  errorText: { fontSize: 12, color: '#ff8a8a', marginTop: 4, fontFamily: fonts.mono },
  warningCard: { borderColor: 'rgba(255,198,92,0.35)' },
  warningText: { fontSize: 12, color: '#ffca86', marginTop: 4, fontFamily: fonts.body },
  warningHint: { fontSize: 11, color: '#ffd8a6', marginTop: 8, fontFamily: fonts.mono },
});
