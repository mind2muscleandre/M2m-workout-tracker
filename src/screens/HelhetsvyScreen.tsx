import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Sparkline } from '../components/ui/Sparkline';
import { NeedsYouQueue } from '../components/coach/NeedsYouQueue';
import { ActivityFeed } from '../components/coach/ActivityFeed';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePlatformStore } from '../stores/platformStore';
import {
  buildActivityFeed,
  buildKpiDeltas,
  buildNeedsYouQueue,
  computeAdherenceSparkline,
  computeAdherenceWeekDelta,
  computeAvgReadiness,
  computeTodaySessionStats,
  countScreeningsForWeek,
  sparklineFromGoalPct,
} from '../lib/dashboardInsights';
import { clientToAthleteCard, deriveAthleteStatus, deriveGoalPct } from '../lib/athleteStatus';
import { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius, AthleteStatus } from '../lib/theme';

type Nav = StackNavigationProp<RootStackParamList>;
type Segment = 'helhet' | 'triage';

const KPI_DEFS = [
  { key: 'readiness', label: 'Snittberedskap', color: '#4ADE80' },
  { key: 'risk', label: 'I riskzon', color: '#F87171' },
  { key: 'adherence', label: 'Följsamhet', color: '#FB923C' },
  { key: 'today', label: 'Pass idag', color: coachColors.fg },
  { key: 'screenings', label: 'Screenings v.', color: coachColors.fg },
] as const;

type PulseBucket = 'formtopp' | 'redo' | 'bevaka' | 'vila' | 'risk';

const PULSE_BUCKET_DEFS: { key: PulseBucket; label: string; color: string }[] = [
  { key: 'formtopp', label: 'Formtopp', color: '#4ADE80' },
  { key: 'redo', label: 'Redo', color: '#60A5FA' },
  { key: 'bevaka', label: 'Bevaka', color: '#FB923C' },
  { key: 'vila', label: 'Vila', color: 'rgba(255,255,255,0.35)' },
  { key: 'risk', label: 'Risk', color: '#F87171' },
];

function pulseBucketFor(status: AthleteStatus, goalPct: number | null): PulseBucket {
  if (status === 'alert' || status === 'inactive') return 'risk';
  if (status === 'recovery') return 'vila';
  if (status === 'rest') return 'bevaka';
  return goalPct != null && goalPct >= 75 ? 'formtopp' : 'redo';
}

function formatHelhetsvyDate(d: Date): string {
  const weekday = d.toLocaleDateString('sv-SE', { weekday: 'long' }).toUpperCase();
  const month = d.toLocaleDateString('sv-SE', { month: 'long' }).toUpperCase();
  const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  return `${weekday} ${d.getDate()} ${month} · ${time}`;
}

export function HelhetsvyScreen() {
  const navigation = useNavigation<Nav>();
  const { clients, fetchClients } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();
  const [segment, setSegment] = useState<Segment>('helhet');

  useEffect(() => {
    (async () => {
      await fetchClients().catch(() => {});
      await fetchAllWorkouts().catch(() => {});
      await loadForClients(
        useClientStore.getState().clients,
        useWorkoutStore.getState().workouts
      ).catch(() => {});
    })();
  }, [fetchClients, fetchAllWorkouts, loadForClients]);

  const active = useMemo(() => clients.filter((c) => c.is_active), [clients]);
  const alertCount = useMemo(
    () =>
      active.filter(
        (c) => deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id)) === 'alert'
      ).length,
    [active, workouts, getTimerSessions]
  );

  const deltas = buildKpiDeltas(
    active.length,
    alertCount,
    (() => {
      const thisWeek = countScreeningsForWeek(active, getAggregate, 0);
      const lastWeek = countScreeningsForWeek(active, getAggregate, -1);
      if (thisWeek === 0 && lastWeek === 0) return null;
      return thisWeek - lastWeek;
    })()
  );
  const needsYou = buildNeedsYouQueue(active, workouts, getTimerSessions, getAggregate);
  const feed = buildActivityFeed(active, workouts);

  const pulseDist = useMemo(() => {
    const counts: Record<PulseBucket, number> = {
      formtopp: 0,
      redo: 0,
      bevaka: 0,
      vila: 0,
      risk: 0,
    };
    for (const c of active) {
      const status = deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id));
      const goalPct = deriveGoalPct(getAggregate(c.id));
      counts[pulseBucketFor(status, goalPct)] += 1;
    }
    return counts;
  }, [active, workouts, getTimerSessions, getAggregate]);

  const avgGoal = useMemo(() => {
    const pcts = active
      .map((c) => deriveGoalPct(getAggregate(c.id)))
      .filter((p): p is number => p != null);
    return pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  }, [active, getAggregate]);

  const avgReadiness = useMemo(
    () => computeAvgReadiness(active, getAggregate),
    [active, getAggregate]
  );

  const adherenceSparkline = useMemo(
    () => computeAdherenceSparkline(active, workouts),
    [active, workouts]
  );

  const adherenceDelta = useMemo(
    () => computeAdherenceWeekDelta(active, workouts),
    [active, workouts]
  );

  const screeningsThisWeek = useMemo(
    () => countScreeningsForWeek(active, getAggregate, 0),
    [active, getAggregate]
  );

  const clientIdSet = useMemo(() => new Set(active.map((c) => c.id)), [active]);
  const todayStats = useMemo(
    () => computeTodaySessionStats(workouts, clientIdSet),
    [workouts, clientIdSet]
  );

  const todaySessions = workouts.filter(
    (w) => w.status === 'planned' || w.status === 'in_progress'
  ).length;

  const rosterAll = active.map((c) => {
    const agg = getAggregate(c.id);
    const card = clientToAthleteCard(c, workouts, {
      timerSessions: getTimerSessions(c.client_user_id),
      aggregate: agg,
    });
    const spark = sparklineFromGoalPct(card.goalPct, agg?.tracker?.trends);
    return {
      ...card,
      sport: c.sport,
      spark,
      score: card.goalPct ?? 0,
      risk: card.status === 'alert',
    };
  });
  const roster = segment === 'triage' ? rosterAll.filter((r) => r.risk) : rosterAll.slice(0, 12);
  const subtitle = `SQUAD COMMAND CENTER · ${active.length} ATLETER · ${formatHelhetsvyDate(new Date())}`;

  const kpiValues: Record<string, { value: string; delta?: string; tone?: 'up' | 'down' | 'flat' }> = {
    readiness: {
      value: avgReadiness != null ? String(avgReadiness) : '—',
      delta: undefined,
      tone: 'flat',
    },
    risk: {
      value: String(alertCount),
      delta: alertCount > 0 ? `▲ +${alertCount} idag` : undefined,
      tone: 'down',
    },
    adherence: {
      value: avgGoal > 0 ? `${avgGoal}%` : '—',
      delta:
        adherenceDelta != null && adherenceDelta !== 0
          ? `${adherenceDelta > 0 ? '▲' : '▼'} ${Math.abs(adherenceDelta)} pass v.`
          : undefined,
      tone: adherenceDelta != null && adherenceDelta > 0 ? 'up' : 'flat',
    },
    today: {
      value: String(todayStats.total > 0 ? todayStats.total : todaySessions),
      delta:
        todayStats.total > 0
          ? `${todayStats.completed} KLARA · ${todayStats.remaining} KVAR`
          : todaySessions > 0
            ? `${todaySessions} PLANERADE`
            : undefined,
      tone: 'flat',
    },
    screenings: {
      value: String(screeningsThisWeek),
      delta: deltas.screenings?.label,
      tone: deltas.screenings?.tone,
    },
  };

  return (
    <ScreenContainer
      title="Helhetsvy"
      subtitle={subtitle}
      scroll
      headerRight={
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>DIREKT</Text>
        </View>
      }
    >
      <View style={styles.seg}>
        <TouchableOpacity
          style={[styles.segBtn, segment === 'helhet' && styles.segOn]}
          onPress={() => setSegment('helhet')}
        >
          <Text style={[styles.segText, segment === 'helhet' && styles.segTextOn]}>Helhet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segBtn} onPress={() => navigation.navigate('AthleteRadar')}>
          <Text style={styles.segText}>Radar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, segment === 'triage' && styles.segOn]}
          onPress={() => setSegment('triage')}
        >
          <Text style={[styles.segText, segment === 'triage' && styles.segTextOn]}>Triage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.kpiRow}>
        {KPI_DEFS.map((k) => {
          const v = kpiValues[k.key];
          return (
            <GlassCard key={k.key} padding={13} style={styles.kpi}>
              <Text style={styles.kpiK}>{k.label}</Text>
              <Text style={[styles.kpiV, { color: k.color }]}>{v.value}</Text>
              {v.delta ? (
                <Text
                  style={[
                    styles.kpiD,
                    v.tone === 'up' && { color: '#4ADE80' },
                    v.tone === 'down' && { color: '#F87171' },
                  ]}
                >
                  {v.delta}
                </Text>
              ) : null}
            </GlassCard>
          );
        })}
      </View>

      <View style={styles.grid}>
        <GlassCard padding={16} style={styles.pulse}>
          <View style={styles.pulseTop}>
            <SectionLabel>Stallets puls</SectionLabel>
            <Text style={styles.pulseStable}>
              {avgReadiness != null && avgReadiness >= 70 ? 'STABIL ▲' : avgReadiness != null ? 'UPPFÖLJ' : '—'}
            </Text>
          </View>
          <Text style={styles.pulseScore}>{avgReadiness ?? avgGoal ?? '—'}</Text>
          <Text style={styles.pulseHint}>
            {avgReadiness != null ? 'Snitt återhämtning' : 'Snitt målstatus'} · {active.length} atleter
          </Text>

          <View style={styles.distBar}>
            {active.length === 0 ? (
              <View style={[StyleSheet.absoluteFill, styles.distBarEmpty]} />
            ) : (
              PULSE_BUCKET_DEFS.filter((b) => pulseDist[b.key] > 0).map((b) => (
                <View
                  key={b.key}
                  style={[styles.distSeg, { flex: pulseDist[b.key], backgroundColor: b.color }]}
                />
              ))
            )}
          </View>
          <View style={styles.distLeg}>
            {PULSE_BUCKET_DEFS.map((b) => (
              <View key={b.key} style={styles.distLegItem}>
                <View style={[styles.distDot, { backgroundColor: b.color }]} />
                <Text style={styles.distLegText}>{b.label}</Text>
                <Text style={styles.distLegCount}>{pulseDist[b.key]}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard padding={16} style={styles.trend}>
          <View style={styles.pulseTop}>
            <SectionLabel>Följsamhet 7d</SectionLabel>
            <Text style={styles.trendNow}>
              {adherenceDelta != null && adherenceDelta !== 0
                ? `${adherenceDelta > 0 ? '+' : ''}${adherenceDelta} pass`
                : '—'}
            </Text>
          </View>
          {adherenceSparkline.length > 0 ? (
            <Sparkline values={adherenceSparkline} height={48} />
          ) : (
            <Text style={styles.pulseHint}>Ingen historik ännu</Text>
          )}
        </GlassCard>
      </View>

      <NeedsYouQueue
        items={needsYou}
        onPressItem={(id) => navigation.navigate('AthleteDetail', { clientId: id })}
        title="▲ Behöver dig nu"
        emphasized
      />
      <ActivityFeed items={feed} />

      <SectionLabel>{segment === 'triage' ? 'Åtgärd nu' : 'Hela stallet'}</SectionLabel>
      {segment === 'triage' && roster.length === 0 ? (
        <Text style={styles.rosterEmpty}>Inga atleter kräver åtgärd just nu</Text>
      ) : (
        <View style={styles.roster}>
          {roster.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.rc, r.risk && styles.rcRisk]}
              onPress={() => navigation.navigate('AthleteDetail', { clientId: r.id })}
            >
              <View style={styles.rcTop}>
                <Text style={styles.rcName} numberOfLines={1}>{r.name.split(' ')[0]}</Text>
                <Text style={styles.rcScore}>{r.score > 0 ? r.score : '—'}</Text>
              </View>
              <Text style={styles.rcSport} numberOfLines={1}>{r.sport ? r.sport.toUpperCase() : '—'}</Text>
              {r.spark.length > 0 ? (
                <Sparkline values={r.spark} height={16} highlightLast={false} />
              ) : null}
              <View style={styles.rcMets}>
                <View style={styles.rcMet}>
                  <Text style={styles.rcMetLabel}>ACWR</Text>
                  <Text style={styles.rcMetValue}>—</Text>
                </View>
                <View style={styles.rcMet}>
                  <Text style={styles.rcMetLabel}>FÖLJ</Text>
                  <Text style={styles.rcMetValue}>{r.score > 0 ? `${r.score}%` : '—'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: '#4ADE80',
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full },
  segOn: { backgroundColor: coachColors.accent },
  segText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  segTextOn: { color: '#17191c', fontWeight: '500' },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  kpi: { minWidth: 120, flex: 1 },
  kpiK: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 1,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  kpiV: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 7,
  },
  kpiD: {
    fontFamily: fonts.mono,
    fontSize: 8,
    marginTop: 6,
    color: coachColors.muted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  pulse: { flex: 1, minWidth: 200 },
  trend: { flex: 1, minWidth: 200 },
  pulseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  pulseStable: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: '#4ADE80',
    letterSpacing: 0.8,
  },
  pulseScore: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '700',
    color: coachColors.fg,
  },
  pulseHint: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  distBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  distSeg: { height: '100%' },
  distBarEmpty: { backgroundColor: 'rgba(255,255,255,0.06)' },
  distLeg: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 11,
  },
  distLegItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distDot: { width: 7, height: 7, borderRadius: 4 },
  distLegText: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.4,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  distLegCount: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '700',
    color: coachColors.fg,
  },
  trendNow: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: '#4ADE80',
  },
  rosterEmpty: {
    color: coachColors.muted,
    fontSize: 13,
    fontFamily: fonts.body,
    marginBottom: 24,
  },
  roster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  rc: {
    width: '31%',
    minWidth: 110,
    padding: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rcRisk: { borderColor: 'rgba(248,113,113,0.3)' },
  rcTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rcName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: coachColors.fg,
    flex: 1,
  },
  rcScore: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: coachColors.fg,
  },
  rcSport: {
    fontFamily: fonts.mono,
    fontSize: 6.5,
    letterSpacing: 0.4,
    color: coachColors.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rcMets: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  rcMet: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rcMetLabel: {
    fontFamily: fonts.mono,
    fontSize: 6,
    letterSpacing: 0.3,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  rcMetValue: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.fg,
    marginTop: 1,
  },
});
