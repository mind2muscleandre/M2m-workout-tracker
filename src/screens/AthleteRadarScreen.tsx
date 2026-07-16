import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Sparkline } from '../components/ui/Sparkline';
import { FilterTabs, FilterTab } from '../components/ui/FilterTabs';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePlatformStore } from '../stores/platformStore';
import { deriveAthleteStatus, deriveGoalPct, getClientInitials } from '../lib/athleteStatus';
import { sparklineFromGoalPct } from '../lib/dashboardInsights';
import { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Nav = StackNavigationProp<RootStackParamList>;
type StatusFilter = 'all' | 'training' | 'alert' | 'rest';
type ViewMode = 'radar' | 'lista';

const STATUS_COLORS: Record<string, string> = {
  training: '#4ADE80',
  alert: '#F87171',
  recovery: '#60A5FA',
  rest: 'rgba(255,255,255,0.35)',
  inactive: '#F87171',
};

const STATUS_FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'Alla' },
  { id: 'alert', label: 'Risk', dotColor: STATUS_COLORS.alert },
  { id: 'training', label: 'Tränar', dotColor: STATUS_COLORS.training },
  { id: 'rest', label: 'Vila', dotColor: STATUS_COLORS.rest },
];

export function AthleteRadarScreen() {
  const navigation = useNavigation<Nav>();
  const { clients, fetchClients } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

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

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') return active;
    return active.filter(
      (c) =>
        deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id)) === statusFilter
    );
  }, [active, statusFilter, workouts, getTimerSessions]);

  const bubbles = filteredClients.slice(0, 12).map((c, i, arr) => {
    const status = deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id));
    const goal = deriveGoalPct(getAggregate(c.id)) ?? 50;
    const angle = (i / Math.max(1, arr.length)) * Math.PI * 2;
    const radius = 0.28 + (1 - goal / 100) * 0.12;
    return {
      id: c.id,
      name: c.name,
      initials: getClientInitials(c.name),
      status,
      goal,
      left: 50 + Math.cos(angle) * radius * 100,
      top: 50 + Math.sin(angle) * radius * 80,
      size: 36 + Math.round(goal / 8),
      spark: sparklineFromGoalPct(goal),
    };
  });

  const movers = [...bubbles]
    .sort((a, b) => b.goal - a.goal)
    .slice(0, 4);

  const listRows = [...bubbles].sort((a, b) => b.goal - a.goal);

  return (
    <ScreenContainer
      title="Atletradar"
      subtitle={`LIVE ÖVERSIKT · ${active.length} ATLETER`}
      scroll
      headerRight={
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      }
    >
      <View style={styles.seg}>
        <TouchableOpacity style={styles.segBtn} onPress={() => navigation.navigate('Helhetsvy')}>
          <Text style={styles.segText}>Helhet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segBtn, styles.segOn]}>
          <Text style={[styles.segText, styles.segTextOn]}>Radar</Text>
        </TouchableOpacity>
      </View>

      <FilterTabs tabs={STATUS_FILTER_TABS} activeId={statusFilter} onChange={(id) => setStatusFilter(id as StatusFilter)} />

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'radar' && styles.viewToggleBtnOn]}
          onPress={() => setViewMode('radar')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'radar' && styles.viewToggleTextOn]}>
            Radar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'lista' && styles.viewToggleBtnOn]}
          onPress={() => setViewMode('lista')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'lista' && styles.viewToggleTextOn]}>
            Lista
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'radar' ? (
        <GlassCard padding={0} style={styles.radarCard}>
          <View style={styles.radar}>
            <View style={styles.axisH} />
            <View style={styles.axisV} />
            <Text style={[styles.quad, styles.quadTL]}>LÅG RISK</Text>
            <Text style={[styles.quad, styles.quadBR]}>HÖG RISK</Text>
            <Text style={[styles.axisSide, styles.axisLeft]}>◀ FORM SJUNKER</Text>
            <Text style={[styles.axisSide, styles.axisRight]}>FORM STIGER ▶</Text>
            {bubbles.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.bubble,
                  {
                    left: `${b.left}%`,
                    top: `${b.top}%`,
                    width: b.size,
                    height: b.size,
                    backgroundColor: STATUS_COLORS[b.status] ?? coachColors.accent,
                  },
                ]}
                onPress={() => navigation.navigate('AthleteDetail', { clientId: b.id })}
              >
                <Text style={styles.bubbleText}>{b.initials}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.legend}>
            <Text style={styles.legendItem}>● Tränar</Text>
            <Text style={styles.legendItem}>● Varning</Text>
            <Text style={styles.legendItem}>Storlek = mål%</Text>
          </View>
        </GlassCard>
      ) : (
        <GlassCard padding={6} style={styles.listCard}>
          {listRows.length === 0 ? (
            <Text style={styles.listEmpty}>Inga atleter matchar filtret</Text>
          ) : (
            listRows.map((b, idx) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.listRow, idx < listRows.length - 1 && styles.listRowBorder]}
                onPress={() => navigation.navigate('AthleteDetail', { clientId: b.id })}
              >
                <View style={[styles.listDot, { backgroundColor: STATUS_COLORS[b.status] }]} />
                <Text style={styles.listName} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.listScore, { color: STATUS_COLORS[b.status] }]}>
                  {b.goal}%
                </Text>
              </TouchableOpacity>
            ))
          )}
        </GlassCard>
      )}

      <GlassCard padding={14} style={styles.movers}>
        <View style={styles.moversHead}>
          <Text style={styles.moversTitle}>Störst rörelse</Text>
          <Text style={styles.moversOpen}>7 DAGAR</Text>
        </View>
        {movers.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.mv}
            onPress={() => navigation.navigate('AthleteDetail', { clientId: m.id })}
          >
            <View style={[styles.mvTag, { backgroundColor: `${STATUS_COLORS[m.status]}22` }]}>
              <Text style={[styles.mvTagText, { color: STATUS_COLORS[m.status] }]}>
                {m.goal}%
              </Text>
            </View>
            <Text style={styles.mvName}>{m.name}</Text>
            <Sparkline values={m.spark} height={18} />
          </TouchableOpacity>
        ))}
      </GlassCard>
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  viewToggleBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full },
  viewToggleBtnOn: { backgroundColor: coachColors.coach },
  viewToggleText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  viewToggleTextOn: { color: '#0d1210', fontWeight: '600' },
  radarCard: { marginBottom: 14, overflow: 'hidden' },
  radar: {
    height: 320,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  axisH: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  axisV: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quad: {
    position: 'absolute',
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
  },
  quadTL: { left: 12, top: 12 },
  quadBR: { right: 12, bottom: 12 },
  axisSide: {
    position: 'absolute',
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 1,
    color: coachColors.muted,
    textTransform: 'uppercase',
    top: '50%',
    marginTop: -6,
  },
  axisLeft: { left: 8 },
  axisRight: { right: 8, textAlign: 'right' },
  listCard: { marginBottom: 14, overflow: 'hidden' },
  listEmpty: {
    color: coachColors.muted,
    fontSize: 13,
    fontFamily: fonts.body,
    padding: 24,
    textAlign: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  listDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  listName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  listScore: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -18,
    marginTop: -18,
  },
  bubbleText: {
    fontFamily: fonts.display,
    fontSize: 10,
    fontWeight: '600',
    color: '#15181c',
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  legendItem: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    letterSpacing: 0.4,
  },
  movers: { borderColor: 'rgba(247,233,40,0.25)', marginBottom: 24 },
  moversHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moversTitle: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    color: coachColors.accent,
    textTransform: 'uppercase',
  },
  moversOpen: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
  },
  mv: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mvTag: {
    width: 34,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvTagText: {
    fontFamily: fonts.mono,
    fontSize: 7,
    fontWeight: '500',
  },
  mvName: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: coachColors.fg,
  },
});
