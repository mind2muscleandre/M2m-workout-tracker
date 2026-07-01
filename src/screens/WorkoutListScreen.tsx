import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useWorkoutStore } from '../stores/workoutStore';
import { useClientStore } from '../stores/clientStore';
import { Workout } from '../types/database';
import { formatDate } from '../utils/helpers';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { FilterTabs } from '../components/ui/FilterTabs';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const filterTabs = [
  { id: 'all', label: 'Alla' },
  { id: 'draft', label: 'Utkast' },
  { id: 'planned', label: 'Planerade' },
  { id: 'in_progress', label: 'Pågående' },
  { id: 'completed', label: 'Avslutade' },
];

const statusColors: Record<string, string> = {
  draft: coachColors.muted,
  planned: '#5AC8FA',
  in_progress: coachColors.orange,
  completed: coachColors.coach,
};

const statusLabels: Record<string, string> = {
  draft: 'Utkast',
  planned: 'Planerat',
  in_progress: 'Pågående',
  completed: 'Avslutat',
};

export function WorkoutListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { clients, fetchClients } = useClientStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClients().catch(() => {});
    fetchAllWorkouts().catch(() => {});
  }, [fetchClients, fetchAllWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllWorkouts();
    setRefreshing(false);
  }, [fetchAllWorkouts]);

  const getClientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.name ?? 'Okänd atlet';

  const filteredWorkouts = workouts
    .filter((w) => (activeFilter === 'all' ? true : w.status === activeFilter))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderWorkoutCard = ({ item }: { item: Workout }) => (
    <TouchableOpacity onPress={() => navigation.navigate('WorkoutActive', { workoutId: item.id })}>
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.clientName}>{getClientName(item.client_id)}</Text>
          <View style={[styles.statusBadge, { borderColor: statusColors[item.status] }]}>
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.workoutTitle}>{item.title || 'Namnlöst pass'}</Text>
        <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
        {item.notes ? (
          <Text style={styles.workoutNotes} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </GlassCard>
    </TouchableOpacity>
  );

  const firstClient = clients.find((c) => c.is_active);

  return (
    <ScreenContainer
      title="Program"
      subtitle="Pass och mallar"
      headerRight={
        firstClient ? (
          <Button
            label="Nytt program"
            variant="primary"
            size="sm"
            onPress={() => navigation.navigate('WorkoutCreate', { clientId: firstClient.id })}
          />
        ) : undefined
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      scroll={false}
    >
      <FilterTabs tabs={filterTabs} activeId={activeFilter} onChange={setActiveFilter} />
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Inga program</Text>
            <Text style={styles.emptyMessage}>Skapa ett pass via en atletprofil</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24 },
  card: { marginBottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  clientName: { fontFamily: fonts.mono, fontSize: 9, color: coachColors.coach, textTransform: 'uppercase' },
  statusBadge: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: fonts.mono, fontSize: 8, textTransform: 'uppercase' },
  workoutTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: coachColors.fg },
  workoutDate: { fontSize: 13, color: coachColors.muted, marginTop: 4 },
  workoutNotes: { fontSize: 12, color: coachColors.muted, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: coachColors.muted },
  emptyMessage: { fontSize: 14, color: coachColors.muted, marginTop: 8, textAlign: 'center' },
});
