import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Sparkline } from '../components/ui/Sparkline';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePlatformStore } from '../stores/platformStore';
import { deriveAthleteStatus, deriveGoalPct, getClientInitials } from '../lib/athleteStatus';
import { sparklineFromGoalPct } from '../lib/dashboardInsights';
import { RootStackParamList } from '../navigation/types';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  training: '#4ADE80',
  alert: '#F87171',
  recovery: '#60A5FA',
  rest: 'rgba(255,255,255,0.35)',
  inactive: '#F87171',
};

export function AthleteRadarScreen() {
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

  const bubbles = active.slice(0, 10).map((c, i) => {
    const status = deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id));
    const goal = deriveGoalPct(getAggregate(c.id)) ?? 50;
    const angle = (i / Math.max(1, active.length)) * Math.PI * 2;
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

  return (
    <ScreenContainer title="Atletradar" subtitle="Beredskap × risk" scroll>
      <View style={styles.seg}>
        <TouchableOpacity style={styles.segBtn} onPress={() => navigation.navigate('Helhetsvy')}>
          <Text style={styles.segText}>Helhet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segBtn, styles.segOn]}>
          <Text style={[styles.segText, styles.segTextOn]}>Radar</Text>
        </TouchableOpacity>
      </View>

      <GlassCard padding={0} style={styles.radarCard}>
        <View style={styles.radar}>
          <View style={styles.axisH} />
          <View style={styles.axisV} />
          <Text style={[styles.quad, styles.quadTL]}>LÅG RISK</Text>
          <Text style={[styles.quad, styles.quadBR]}>HÖG RISK</Text>
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

      <GlassCard padding={14} style={styles.movers}>
        <View style={styles.moversHead}>
          <Text style={styles.moversTitle}>Rör sig mest</Text>
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
