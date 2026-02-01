import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useWorkoutStore } from '../stores/workoutStore';
import { useClientStore } from '../stores/clientStore';
import { Workout } from '../types/database';
import { formatDate } from '../utils/helpers';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusColors: Record<string, string> = {
  planned: '#5AC8FA',
  in_progress: '#FF9500',
  completed: '#34C759',
};

const statusLabels: Record<string, string> = {
  planned: 'Planerat',
  in_progress: 'Pågående',
  completed: 'Avslutat',
};

const filterOptions = ['Alla', 'Planerade', 'Pågående', 'Avslutade'] as const;
const filterMap: Record<string, string | null> = {
  Alla: null,
  Planerade: 'planned',
  Pågående: 'in_progress',
  Avslutade: 'completed',
};

export function WorkoutListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { workouts, fetchWorkouts, isLoading } = useWorkoutStore();
  const { clients, selectedClient } = useClientStore();
  const [activeFilter, setActiveFilter] = useState<string>('Alla');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedClient) {
      fetchWorkouts(selectedClient.id);
    }
  }, [selectedClient, fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedClient) {
      await fetchWorkouts(selectedClient.id);
    }
    setRefreshing(false);
  }, [selectedClient, fetchWorkouts]);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Okänd klient';
  };

  const filteredWorkouts = workouts
    .filter((w) => {
      const statusFilter = filterMap[activeFilter];
      if (statusFilter) return w.status === statusFilter;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderWorkoutCard = ({ item }: { item: Workout }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => navigation.navigate('WorkoutActive', { workoutId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{getClientName(item.client_id)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.workoutTitle}>{item.title || 'Namnlöst pass'}</Text>
      <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
      {item.notes && (
        <Text style={styles.workoutNotes} numberOfLines={1}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pass</Text>
        {selectedClient && (
          <Text style={styles.subtitle}>{selectedClient.name}</Text>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkoutCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Inga pass</Text>
            <Text style={styles.emptyMessage}>
              {selectedClient
                ? 'Skapa ett pass via klientens profil'
                : 'Välj en klient för att se pass'}
            </Text>
          </View>
        }
      />

      {selectedClient && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('WorkoutCreate', { clientId: selectedClient.id })}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  filterChipActive: {
    backgroundColor: '#6C5CE720',
    borderColor: '#6C5CE7',
  },
  filterText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#6C5CE7',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  workoutCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 13,
    color: '#A29BFE',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  workoutNotes: {
    fontSize: 13,
    color: '#636366',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#636366',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
});
