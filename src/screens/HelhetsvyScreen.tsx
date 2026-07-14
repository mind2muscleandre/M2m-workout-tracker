import React, { useEffect, useMemo } from 'react';
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
  sparklineFromGoalPct,
} from '../lib/dashboardInsights';
import { clientToAthleteCard, deriveAthleteStatus, deriveGoalPct } from '../lib/athleteStatus';
import { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Nav = StackNavigationProp<RootStackParamList>;

const KPI_DEFS = [
  { key: 'readiness', label: 'Snittberedskap', color: '#4ADE80' },
  { key: 'risk', label: 'I riskzon', color: '#F87171' },
  { key: 'adherence', label: 'Följsamhet', color: '#FB923C' },
  { key: 'today', label: 'Pass idag', color: coachColors.fg },
  { key: 'screenings', label: 'Screenings v.', color: coachColors.fg },
] as const;

export function HelhetsvyScreen() {
  const navigation = useNavigation<Nav>();
  const { clients, fetchClients } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();

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

  const deltas = buildKpiDeltas(active.length, alertCount);
  const needsYou = buildNeedsYouQueue(active, workouts, getTimerSessions, getAggregate);
  const feed = buildActivityFeed(active, workouts);

  const avgGoal = useMemo(() => {
    const pcts = active
      .map((c) => deriveGoalPct(getAggregate(c.id)))
      .filter((p): p is number => p != null);
    return pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
  }, [active, getAggregate]);

  const todaySessions = workouts.filter(
    (w) => w.status === 'planned' || w.status === 'in_progress'
  ).length;

  const roster = active.slice(0, 12).map((c) => {
    const card = clientToAthleteCard(c, workouts, {
      timerSessions: getTimerSessions(c.client_user_id),
      aggregate: getAggregate(c.id),
    });
    return {
      ...card,
      spark: sparklineFromGoalPct(card.goalPct),
      score: card.goalPct ?? 0,
      risk: card.status === 'alert',
    };
  });

  const kpiValues: Record<string, { value: string; delta?: string; tone?: 'up' | 'down' | 'flat' }> = {
    readiness: { value: String(Math.min(99, avgGoal + 6)), delta: '▲ +3 mot förra v.', tone: 'up' },
    risk: { value: String(alertCount), delta: alertCount ? '▲ +1 idag' : undefined, tone: 'down' },
    adherence: { value: `${avgGoal}%`, delta: '▲ +4%', tone: 'up' },
    today: { value: String(todaySessions), delta: '2 KLARA · 1 KVAR', tone: 'flat' },
    screenings: { value: '7', delta: deltas.screenings?.label, tone: 'up' },
  };

  return (
    <ScreenContainer
      title="Helhetsvy"
      subtitle="Squad command center"
      scroll
      headerRight={
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      }
    >
      <View style={styles.seg}>
        <TouchableOpacity style={[styles.segBtn, styles.segOn]}>
          <Text style={[styles.segText, styles.segTextOn]}>Helhet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segBtn} onPress={() => navigation.navigate('AthleteRadar')}>
          <Text style={styles.segText}>Radar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.segBtn} onPress={() => navigation.navigate('ScreeningHub')}>
          <Text style={styles.segText}>Triage</Text>
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
            <Text style={styles.pulseStable}>STABIL ▲</Text>
          </View>
          <Text style={styles.pulseScore}>{avgGoal}</Text>
          <Text style={styles.pulseHint}>Snitt målstatus · {active.length} atleter</Text>
        </GlassCard>

        <GlassCard padding={16} style={styles.trend}>
          <View style={styles.pulseTop}>
            <SectionLabel>Följsamhet 7d</SectionLabel>
            <Text style={styles.trendNow}>+4%</Text>
          </View>
          <Sparkline values={[58, 61, 60, 64, 63, 66, avgGoal || 68]} height={48} />
        </GlassCard>
      </View>

      <NeedsYouQueue
        items={needsYou}
        onPressItem={(id) => navigation.navigate('AthleteDetail', { clientId: id })}
      />
      <ActivityFeed items={feed} />

      <SectionLabel>Stall · sparklines</SectionLabel>
      <View style={styles.roster}>
        {roster.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.rc, r.risk && styles.rcRisk]}
            onPress={() => navigation.navigate('AthleteDetail', { clientId: r.id })}
          >
            <View style={styles.rcTop}>
              <Text style={styles.rcName} numberOfLines={1}>{r.name.split(' ')[0]}</Text>
              <Text style={styles.rcScore}>{r.score}</Text>
            </View>
            <Sparkline values={r.spark} height={16} highlightLast={false} />
          </TouchableOpacity>
        ))}
      </View>
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
  trendNow: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: '#4ADE80',
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
});
