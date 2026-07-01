import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useWorkoutStore } from '../stores/workoutStore';
import { useClientStore } from '../stores/clientStore';
import { usePlatformStore } from '../stores/platformStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FilterTabs } from '../components/ui/FilterTabs';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { EnergySystemPill } from '../components/ui/StatusPill';
import { formatDate, getTodayString } from '../utils/helpers';
import { formatSessionDateLabel } from '../services/platformTimer';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';
import type { Workout } from '../types/database';
import type { WorkoutSessionRow } from '../types/platform';

type Nav = StackNavigationProp<RootStackParamList>;

const FILTERS = [
  { id: 'all', label: 'Alla', dotColor: coachColors.muted },
  { id: 'active', label: 'Aktiva nu', dotColor: coachColors.coach },
  { id: 'planned', label: 'Planerade', dotColor: coachColors.accent },
  { id: 'completed', label: 'Avslutade', dotColor: coachColors.muted },
  { id: 'timer', label: 'Timer', dotColor: coachColors.accent },
];

type SessionListItem =
  | { kind: 'coach'; id: string; workout: Workout }
  | { kind: 'timer'; id: string; session: WorkoutSessionRow; clientName: string };

type ListRow =
  | { kind: 'header'; id: string; label: string; liveCount?: number }
  | SessionListItem;

function dayHeaderLabel(date: string, group: 'planned' | 'completed'): string {
  const today = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (date === today) {
    return group === 'planned' ? 'Idag — planerade' : 'Idag — slutförda';
  }
  if (date === yesterdayStr) {
    return group === 'completed' ? 'Igår — slutförda' : `Igår — ${group === 'planned' ? 'planerade' : 'slutförda'}`;
  }
  return `${formatDate(date)} — ${group === 'planned' ? 'planerade' : 'slutförda'}`;
}

function mapCoachStatus(
  status: Workout['status']
): 'live' | 'planned' | 'completed' {
  if (status === 'in_progress') return 'live';
  if (status === 'completed') return 'completed';
  return 'planned';
}

export function SessionsScreen() {
  const navigation = useNavigation<Nav>();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { clients, fetchClients } = useClientStore();
  const { loadForClients, timerSessionsByUser } = usePlatformStore();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    await fetchAllWorkouts();
    await loadForClients(
      useClientStore.getState().clients,
      useWorkoutStore.getState().workouts
    ).catch(() => {});
    setRefreshing(false);
  }, [fetchAllWorkouts, loadForClients]);

  const getClientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.name ?? 'Okänd atlet';

  const getUserClientName = (userId: string) =>
    clients.find((c) => c.client_user_id === userId)?.name ?? 'Atlet';

  const items = useMemo(() => {
    const coachItems: SessionListItem[] = workouts
      .filter((w) => {
        if (filter === 'active') return w.status === 'in_progress' || w.status === 'planned';
        if (filter === 'planned') return w.status === 'planned';
        if (filter === 'completed') return w.status === 'completed';
        if (filter === 'timer') return false;
        return true;
      })
      .map((w) => ({ kind: 'coach' as const, id: `coach-${w.id}`, workout: w }));

    const timerItems: SessionListItem[] =
      filter === 'planned' || filter === 'active'
        ? []
        : Object.entries(timerSessionsByUser).flatMap(([userId, sessions]) =>
            sessions.map((s) => ({
              kind: 'timer' as const,
              id: `timer-${s.id}`,
              session: s,
              clientName: getUserClientName(userId),
            }))
          );

    if (filter === 'timer') return timerItems;
    if (filter === 'all') return [...coachItems, ...timerItems];
    return coachItems;
  }, [workouts, filter, timerSessionsByUser, clients]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      if (item.kind === 'timer') {
        const title = item.session.workout_type ?? item.session.program_type ?? 'Session';
        return (
          item.clientName.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q)
        );
      }
      const title = item.workout.title || 'Namnlöst pass';
      return (
        getClientName(item.workout.client_id).toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, clients]);

  const groupedRows = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];
    const live = filteredItems.filter(
      (i) => i.kind === 'coach' && i.workout.status === 'in_progress'
    );
    const planned = filteredItems.filter(
      (i) =>
        (i.kind === 'coach' && i.workout.status === 'planned') ||
        (i.kind === 'timer' && !i.session.completed_at)
    );
    const completed = filteredItems.filter(
      (i) =>
        (i.kind === 'coach' && i.workout.status === 'completed') ||
        (i.kind === 'timer' && !!i.session.completed_at)
    );

    if (filter === 'timer') {
      if (planned.length + completed.length === 0) return rows;
      rows.push({ kind: 'header', id: 'hdr-timer', label: 'Timer-historik' });
      [...planned, ...completed].forEach((item) => rows.push(item));
      return rows;
    }

    if (live.length > 0) {
      rows.push({
        kind: 'header',
        id: 'hdr-live',
        label: 'Pågår just nu',
        liveCount: live.length,
      });
      live.forEach((item) => rows.push(item));
    }

    const plannedByDate: Record<string, SessionListItem[]> = {};
    planned.forEach((item) => {
      const date =
        item.kind === 'coach'
          ? item.workout.date
          : item.session.completed_at?.slice(0, 10) ?? getTodayString();
      if (!plannedByDate[date]) plannedByDate[date] = [];
      plannedByDate[date].push(item);
    });
    Object.keys(plannedByDate)
      .sort()
      .forEach((date) => {
        rows.push({
          kind: 'header',
          id: `hdr-planned-${date}`,
          label: dayHeaderLabel(date, 'planned'),
        });
        plannedByDate[date].forEach((item) => rows.push(item));
      });

    const completedByDate: Record<string, SessionListItem[]> = {};
    completed.forEach((item) => {
      const date =
        item.kind === 'coach'
          ? item.workout.date
          : item.session.completed_at?.slice(0, 10) ?? getTodayString();
      if (!completedByDate[date]) completedByDate[date] = [];
      completedByDate[date].push(item);
    });
    Object.keys(completedByDate)
      .sort()
      .reverse()
      .forEach((date) => {
        rows.push({
          kind: 'header',
          id: `hdr-completed-${date}`,
          label: dayHeaderLabel(date, 'completed'),
        });
        completedByDate[date].forEach((item) => rows.push(item));
      });

    if (filter === 'active' && live.length === 0 && planned.length > 0) {
      // planned already added above
    }

    return rows;
  }, [filteredItems, filter]);

  const renderItem = (item: SessionListItem) => {
    if (item.kind === 'timer') {
      const title =
        item.session.workout_type ?? item.session.program_type ?? 'Session';
      const status = item.session.completed_at ? 'completed' : 'planned';
      return (
        <SessionListCard
          key={item.id}
          title={title}
          athlete={item.clientName}
          status={status}
          dateLabel={formatSessionDateLabel(item.session.completed_at)}
          onPress={() => {}}
        />
      );
    }

    const w = item.workout;
    const status = mapCoachStatus(w.status);
    return (
      <SessionListCard
        key={item.id}
        title={w.title || 'Namnlöst pass'}
        athlete={getClientName(w.client_id)}
        status={status}
        dateLabel={formatDate(w.date)}
        onPress={() =>
          navigation.navigate('SessionTimer', {
            clientId: w.client_id,
            workoutId: w.id,
          })
        }
        onPrimaryAction={() =>
          navigation.navigate('SessionTimer', {
            clientId: w.client_id,
            workoutId: w.id,
          })
        }
      />
    );
  };

  return (
    <ScreenContainer
      title="Sessioner"
      search={
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök atlet eller session…"
        />
      }
      headerRight={
        <Button
          label="Ny session"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('CreateSession', undefined)}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.filterRow}>
        <FilterTabs tabs={FILTERS} activeId={filter} onChange={setFilter} />
      </View>

      {groupedRows.length === 0 ? (
        <Text style={styles.empty}>Inga sessioner</Text>
      ) : (
        <View style={styles.list}>
          {groupedRows.map((row) => {
            if (row.kind === 'header') {
              return (
                <View key={row.id} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{row.label}</Text>
                    {row.liveCount != null && row.liveCount > 0 ? (
                      <View style={styles.liveIndicator}>
                        <LiveDot />
                        <Text style={styles.liveIndicatorText}>
                          {row.liveCount} aktiva
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.dayHeaderLine} />
                  </View>
                </View>
              );
            }
            return renderItem(row);
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

type CardStatus = 'live' | 'planned' | 'completed';

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return <Animated.View style={[styles.liveDot, { opacity: pulse }]} />;
}

function SessionListCard({
  title,
  athlete,
  status,
  dateLabel,
  system,
  meta,
  onPress,
  onPrimaryAction,
}: {
  title: string;
  athlete: string;
  status: CardStatus;
  dateLabel?: string;
  system?: 'atp' | 'glyco' | 'aero';
  meta?: string[];
  onPress?: () => void;
  onPrimaryAction?: () => void;
}) {
  const barColor =
    status === 'live'
      ? coachColors.coach
      : status === 'planned'
        ? coachColors.accent
        : coachColors.borderHi;

  const statusLabel =
    status === 'live' ? null : status === 'planned' ? 'Planerad' : 'Avslutad';

  const statusPillStyle =
    status === 'completed' ? styles.pillTraining : styles.pillRecovery;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={!onPress}
      style={[
        styles.sessionCard,
        status === 'live' && styles.sessionCardActive,
      ]}
    >
      <View style={[styles.scStatusBar, { backgroundColor: barColor }]} />
      <View style={styles.scBody}>
        <Text style={styles.scTitle}>{title}</Text>
        <Text style={styles.scAthlete}>{athlete}</Text>
        <View style={styles.scMetaRow}>
          {meta?.map((m) => (
            <Text key={m} style={styles.scMetaItem}>
              {m}
            </Text>
          ))}
          {system ? <EnergySystemPill system={system} /> : null}
        </View>
      </View>
      <View style={styles.scRight}>
        {status === 'live' ? (
          <View style={styles.liveIndicator}>
            <LiveDot />
            <Text style={styles.liveIndicatorText}>Live</Text>
          </View>
        ) : dateLabel ? (
          <Text style={styles.scDate}>{dateLabel}</Text>
        ) : null}
        {statusLabel ? (
          <View style={[styles.statusPill, statusPillStyle]}>
            <Text
              style={[
                styles.statusPillText,
                status === 'completed' && styles.statusPillTextTraining,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}
        <View style={styles.scActions}>
          {status === 'live' || status === 'planned' ? (
            <TouchableOpacity
              style={[styles.scActionBtn, styles.scActionBtnPrimary]}
              onPress={() => onPrimaryAction?.()}
            >
              <Text style={styles.scActionBtnPrimaryText}>
                {status === 'live' ? 'Öppna' : 'Starta'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.scActionBtn} onPress={onPress}>
              <Text style={styles.scActionBtnText}>Logg</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  filterRow: { marginBottom: 20 },
  list: { gap: 0, paddingBottom: 24 },
  dayGroup: { marginBottom: 20 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dayHeaderText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  dayHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: coachColors.border,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.coachDim,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.22)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: coachColors.coach,
  },
  liveIndicatorText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
  },
  sessionCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginBottom: 8,
    ...shadows.glass,
  },
  sessionCardActive: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.22)',
    ...shadows.glassCoach,
  },
  scStatusBar: {
    width: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
  scBody: { flex: 1, minWidth: 0 },
  scTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 4,
  },
  scAthlete: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
    marginBottom: 7,
  },
  scMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scMetaItem: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  scRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  scDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  scActions: { flexDirection: 'row', gap: 6 },
  scActionBtn: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBgHi,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scActionBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: coachColors.mutedHi,
    fontFamily: fonts.bodyMedium,
  },
  scActionBtnPrimary: {
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  scActionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
    fontFamily: fonts.bodySemiBold,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillRecovery: {
    backgroundColor: coachColors.accentDim,
    borderColor: 'rgba(247,233,40,0.20)',
  },
  pillTraining: {
    backgroundColor: coachColors.coachDim,
    borderColor: 'rgba(0,212,170,0.22)',
  },
  statusPillText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.accent,
  },
  statusPillTextTraining: {
    color: coachColors.coach,
  },
  empty: {
    textAlign: 'center',
    color: coachColors.muted,
    padding: 32,
    fontFamily: fonts.body,
  },
});
