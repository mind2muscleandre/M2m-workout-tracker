import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FilterTabs } from '../components/ui/FilterTabs';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusPill } from '../components/ui/StatusPill';
import { Button } from '../components/ui/Button';
import { BarChart } from '../components/ui/BarChart';
import { DonutChart } from '../components/ui/DonutChart';
import { clientToAthleteCard, deriveAthleteStatus, getClientInitials, getClientAvatarColor } from '../lib/athleteStatus';
import { usePlatformStore } from '../stores/platformStore';
import { coachColors, fonts, borderRadius, spacing } from '../lib/theme';
import {
  activeClients as filterActiveClients,
  buildReportCsv,
  downloadOrShareExport,
  workoutsForClientInPeriod,
  type ReportExportPayload,
} from '../lib/exportReports';

type Nav = StackNavigationProp<RootStackParamList>;

const PERIODS = [
  { id: 'week', label: 'Vecka' },
  { id: 'month', label: 'Månad' },
  { id: 'season', label: 'Säsong' },
];

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const TREND_BUCKETS = 5;

function TrendBar({ pattern }: { pattern?: boolean[] | null }) {
  if (!pattern || pattern.length === 0) {
    return <Text style={styles.trendEmpty}>—</Text>;
  }
  return (
    <View style={styles.trendBar}>
      {pattern.map((hi, i) => (
        <View
          key={i}
          style={[
            styles.trendTick,
            { height: hi ? 14 : 6, backgroundColor: hi ? coachColors.coach : coachColors.glassBgHi },
          ]}
        />
      ))}
    </View>
  );
}

function toEnergySystem(value?: string | null): 'aero' | 'glyco' | 'atp' | null {
  const tag = (value ?? '').toLowerCase();
  if (!tag) return null;
  if (tag.includes('sprint') || tag.includes('atp')) return 'atp';
  if (tag.includes('glyco') || tag.includes('intervall') || tag.includes('styrk') || tag.includes('gym')) return 'glyco';
  if (tag.includes('aero') || tag.includes('endurance') || tag.includes('distans') || tag.includes('z2')) return 'aero';
  return null;
}

export function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { clients, fetchClients } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate, timerSessionsByUser } =
    usePlatformStore();
  const [period, setPeriod] = useState('week');
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchClients(), fetchAllWorkouts()]);
    await loadForClients(
      useClientStore.getState().clients,
      useWorkoutStore.getState().workouts
    ).catch(() => {});
    setRefreshing(false);
  }, [fetchClients, fetchAllWorkouts, loadForClients]);

  const activeClients = filterActiveClients(clients);

  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === 'week') d.setDate(d.getDate() - 7);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else d.setMonth(d.getMonth() - 6);
    return d;
  }, [period]);

  const periodWorkouts = useMemo(
    () =>
      workouts.filter((w) => {
        const date = new Date(w.date);
        return date >= periodStart && w.status === 'completed';
      }),
    [workouts, periodStart]
  );

  const timerInPeriod = useMemo(() => {
    return Object.values(timerSessionsByUser)
      .flat()
      .filter((s) => {
        if (!s.completed_at) return false;
        return new Date(s.completed_at) >= periodStart;
      });
  }, [timerSessionsByUser, periodStart]);

  const sessionsThisWeek = periodWorkouts.length + timerInPeriod.length;
  const alerts = activeClients.filter(
    (c) => deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id)) === 'alert'
  ).length;
  const avgGoal = useMemo(() => {
    const pcts = activeClients
      .map((c) =>
        clientToAthleteCard(c, workouts, {
          timerSessions: getTimerSessions(c.client_user_id),
          aggregate: getAggregate(c.id),
        }).goalPct
      )
      .filter((p): p is number => p != null);
    if (!pcts.length) return 0;
    return Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length);
  }, [activeClients, workouts, getTimerSessions, getAggregate]);

  const attendancePct = activeClients.length
    ? Math.round((periodWorkouts.length / Math.max(activeClients.length, 1)) * 100)
    : 0;

  const sessionsByDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    periodWorkouts.forEach((w) => {
      const day = new Date(w.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      counts[idx]++;
    });
    return counts;
  }, [periodWorkouts]);

  const barChartData = DAY_LABELS.map((label, i) => ({
    label,
    value: sessionsByDay[i],
  }));

  const energySegments = useMemo(() => {
    const counts = { aero: 0, glyco: 0, atp: 0 };
    periodWorkouts.forEach((w) => {
      const system = toEnergySystem(w.title);
      if (system) counts[system] += 1;
    });
    timerInPeriod.forEach((s) => {
      const system = toEnergySystem(s.program_type ?? s.workout_type);
      if (system) counts[system] += 1;
    });
    const total = counts.aero + counts.glyco + counts.atp;
    if (!total) return [];
    return [
      { label: 'Aerob', value: Math.round((counts.aero / total) * 100), color: coachColors.coach },
      { label: 'Glykolytisk', value: Math.round((counts.glyco / total) * 100), color: coachColors.orange },
      { label: 'ATP-PC', value: Math.round((counts.atp / total) * 100), color: coachColors.accent },
    ].filter((s) => s.value > 0);
  }, [periodWorkouts, timerInPeriod]);

  const trendPatternForClient = useCallback(
    (clientId: string, clientUserId: string): boolean[] | null => {
      const now = Date.now();
      const bucketSizeMs = 7 * 24 * 60 * 60 * 1000;
      const counts = Array.from({ length: TREND_BUCKETS }, () => 0);
      const workoutDates = workouts
        .filter((w) => w.client_id === clientId && w.status === 'completed')
        .map((w) => new Date(w.date).getTime());
      const timerDates = (getTimerSessions(clientUserId) ?? [])
        .filter((s) => !!s.completed_at)
        .map((s) => new Date(s.completed_at as string).getTime());

      [...workoutDates, ...timerDates].forEach((ts) => {
        if (Number.isNaN(ts)) return;
        const age = now - ts;
        if (age < 0 || age > TREND_BUCKETS * bucketSizeMs) return;
        const idx = TREND_BUCKETS - 1 - Math.floor(age / bucketSizeMs);
        if (idx >= 0 && idx < TREND_BUCKETS) counts[idx] += 1;
      });

      if (counts.every((c) => c === 0)) return null;
      return counts.map((c) => c > 0);
    },
    [workouts, getTimerSessions]
  );

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      try {
        const payload: ReportExportPayload = {
          period,
          generatedAt: new Date().toISOString(),
          summary: {
            sessions: sessionsThisWeek,
            activeAthletes: activeClients.length,
            alerts,
            avgGoalPct: avgGoal,
          },
          athletes: activeClients.map((c) => {
            const card = clientToAthleteCard(c, workouts, {
              timerSessions: getTimerSessions(c.client_user_id),
              aggregate: getAggregate(c.id),
            });
            return {
              clientName: c.name,
              clientId: c.id,
              completedWorkouts: workoutsForClientInPeriod(workouts, c.id, periodStart),
              goalPct: card.goalPct ?? null,
              status: card.status,
            };
          }),
        };

        if (format === 'json') {
          const json = JSON.stringify(payload, null, 2);
          await downloadOrShareExport(
            `m2m-coach-rapport-${period}.json`,
            json,
            'application/json'
          );
        } else {
          const csv = buildReportCsv(payload);
          await downloadOrShareExport(
            `m2m-coach-rapport-${period}.csv`,
            csv,
            'text/csv'
          );
        }
      } catch {
        Alert.alert('Export misslyckades', 'Kunde inte exportera rapporten.');
      }
    },
    [
      period,
      sessionsThisWeek,
      activeClients,
      alerts,
      avgGoal,
      workouts,
      getTimerSessions,
      getAggregate,
      periodStart,
    ]
  );

  const handleExportMenu = useCallback(() => {
    Alert.alert('Exportera rapport', 'Välj format', [
      { text: 'CSV', onPress: () => void handleExport('csv') },
      { text: 'JSON', onPress: () => void handleExport('json') },
      { text: 'Avbryt', style: 'cancel' },
    ]);
  }, [handleExport]);

  const ranking = useMemo(
    () =>
      activeClients
        .map((c) => ({
          client: c,
          card: clientToAthleteCard(c, workouts, {
            timerSessions: getTimerSessions(c.client_user_id),
            aggregate: getAggregate(c.id),
          }),
          sessions: workoutsForClientInPeriod(workouts, c.id, periodStart),
          trend: c.client_user_id ? trendPatternForClient(c.id, c.client_user_id) : null,
        }))
        .sort((a, b) => (b.card.goalPct ?? 0) - (a.card.goalPct ?? 0))
        .slice(0, 10),
    [activeClients, workouts, getTimerSessions, getAggregate, periodStart, trendPatternForClient]
  );

  const periodLabel =
    period === 'week' ? 'denna vecka' : period === 'month' ? 'denna månad' : 'säsongen';

  return (
    <ScreenContainer
      title="Rapporter"
      headerRight={
        <View style={styles.headerActions}>
          <View style={styles.headerTabs}>
            <FilterTabs tabs={PERIODS} activeId={period} onChange={setPeriod} />
          </View>
          <Button label="Exportera" size="sm" onPress={handleExportMenu} />
        </View>
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiCardCoach]}>
          <Text style={[styles.kpiVal, { color: coachColors.coach }]}>{sessionsThisWeek}</Text>
          <Text style={styles.kpiLabel}>Sessioner {periodLabel}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>
            {avgGoal}
            <Text style={styles.kpiSuffix}>%</Text>
          </Text>
          <Text style={styles.kpiLabel}>Genomsnittlig målstatus</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiVal}>
            {attendancePct}
            <Text style={styles.kpiSuffix}>%</Text>
          </Text>
          <Text style={styles.kpiLabel}>Närvaro (truppen)</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiVal, { color: coachColors.orange }]}>{alerts}</Text>
          <Text style={styles.kpiLabel}>Aktiva varningar</Text>
        </View>
      </View>

      <View style={styles.chartsRow}>
        <View style={styles.chartCol}>
          <BarChart title={`Sessioner per dag — ${periodLabel}`} data={barChartData} />
        </View>
        <View style={styles.chartCol}>
          {energySegments.length > 0 ? (
            <DonutChart title="Energisystem — fördelning" segments={energySegments} />
          ) : (
            <GlassCard style={styles.emptyChartCard}>
              <Text style={styles.trendEmptyText}>Ingen energisystemsdata i vald period</Text>
            </GlassCard>
          )}
        </View>
      </View>

      <GlassCard padding={0} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Atlet-ranking — målframsteg</Text>
        </View>
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.thNum]}>#</Text>
          <Text style={[styles.th, styles.thAthlete]}>Atlet</Text>
          <Text style={[styles.th, styles.thGoal]}>Mål</Text>
          <Text style={[styles.th, styles.thPct]}>Framsteg</Text>
          <Text style={[styles.th, styles.thTrend]}>Trend</Text>
          <Text style={[styles.th, styles.thStatus]}>Status</Text>
          <Text style={[styles.th, styles.thSessions]}>Sessioner</Text>
        </View>
        {ranking.map((row, i) => {
          const goalPct = row.card.goalPct ?? 0;
          const pctColor = goalPct < 50 ? coachColors.orange : coachColors.coach;

          return (
            <TouchableOpacity
              key={row.client.id}
              style={styles.rankRow}
              onPress={() => navigation.navigate('AthleteDetail', { clientId: row.client.id })}
            >
              <Text style={[styles.td, styles.tdNum]}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={[styles.tdCell, styles.tdAthlete]}>
                <View
                  style={[
                    styles.athAvatar,
                    { backgroundColor: `${getClientAvatarColor(row.client.id)}66` },
                  ]}
                >
                  <Text style={styles.athAvatarText}>
                    {getClientInitials(row.client.name)}
                  </Text>
                </View>
                <Text style={styles.rankName} numberOfLines={1}>
                  {row.client.name}
                </Text>
              </View>
              <Text style={[styles.td, styles.tdGoal]} numberOfLines={1}>
                {row.card.goal}
              </Text>
              <Text style={[styles.td, styles.tdPct, { color: pctColor }]}>
                {goalPct}%
              </Text>
              <View style={[styles.tdCell, styles.tdTrend]}>
                <TrendBar pattern={row.trend} />
              </View>
              <View style={[styles.tdCell, styles.tdStatus]}>
                <StatusPill status={row.card.status} />
              </View>
              <Text style={[styles.td, styles.tdSessions]}>{row.sessions}</Text>
            </TouchableOpacity>
          );
        })}
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTabs: {
    marginBottom: -16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    padding: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  kpiCardCoach: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.18)',
  },
  kpiVal: {
    fontFamily: fonts.display,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 36,
    color: coachColors.fg,
  },
  kpiSuffix: {
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: '400',
    color: coachColors.muted,
  },
  kpiLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.72,
    color: coachColors.muted,
    marginTop: 4,
  },
  chartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  chartCol: {
    flex: 1,
    minWidth: 280,
  },
  tableCard: {
    marginBottom: 24,
    overflow: 'hidden',
  },
  tableHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  tableTitle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: coachColors.muted,
    marginBottom: 0,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  th: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.72,
    color: coachColors.muted,
  },
  thNum: { width: 28 },
  thAthlete: { flex: 2, minWidth: 100 },
  thGoal: { flex: 1.5, minWidth: 72 },
  thPct: { width: 56 },
  thTrend: { width: 44 },
  thStatus: { width: 72 },
  thSessions: { width: 52, textAlign: 'right' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  td: {
    fontSize: 13,
    color: coachColors.fg,
    fontFamily: fonts.body,
  },
  tdCell: {},
  tdNum: {
    width: 28,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: coachColors.muted,
  },
  tdAthlete: {
    flex: 2,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  athAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athAvatarText: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  rankName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.fg,
  },
  tdGoal: {
    flex: 1.5,
    minWidth: 72,
    fontSize: 11,
    color: coachColors.muted,
  },
  tdPct: {
    width: 56,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
  },
  tdTrend: { width: 44 },
  tdStatus: { width: 72 },
  tdSessions: {
    width: 52,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: coachColors.muted,
    textAlign: 'right',
  },
  emptyChartCard: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
  },
  trendEmpty: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    width: 18,
    textAlign: 'center',
  },
  trendEmptyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.muted,
  },
  trendTick: {
    width: 5,
    borderRadius: 1,
  },
});
