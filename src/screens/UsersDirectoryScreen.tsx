import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { SearchBar } from '../components/ui/SearchBar';
import { FilterTabs } from '../components/ui/FilterTabs';
import { AthleteCard } from '../components/ui/AthleteCard';
import { StatsStrip } from '../components/ui/StatsStrip';
import { Button } from '../components/ui/Button';
import { AssignAthleteModal } from '../components/AssignAthleteModal';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { usePlatformStore } from '../stores/platformStore';
import {
  fetchAllPlatformUsers,
  fetchPtClientDirectory,
  isAdminRole,
} from '../services/platformUsers';
import type { DirectoryUser } from '../types/platform';
import { coachColors, fonts } from '../lib/theme';
import {
  getClientInitials,
  getClientAvatarColor,
  deriveAthleteStatus,
  formatLastSession,
} from '../lib/athleteStatus';
import type { AthleteCardData } from '../components/ui/AthleteCard';
import type { AthleteProfile } from '../types/athlete';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Athletes'>,
  StackScreenProps<RootStackParamList>
>;

type ViewMode = 'clients' | 'all';

const APP_FILTERS = [
  { id: 'all', label: 'Alla' },
  { id: 'perform', label: 'Perform', dotColor: coachColors.coach },
  { id: 'tracker', label: 'Tracker', dotColor: coachColors.accent },
  { id: 'macro', label: 'Macro', dotColor: coachColors.orange },
  { id: 'goalsetter', label: 'Goalsetter', dotColor: '#A78BFA' },
];

function directoryUserToCard(
  item: DirectoryUser,
  clients: ReturnType<typeof useClientStore.getState>['clients'],
  workouts: ReturnType<typeof useWorkoutStore.getState>['workouts'],
  getTimerSessions: ReturnType<typeof usePlatformStore.getState>['getTimerSessions']
): AthleteCardData {
  const client = item.clientId ? clients.find((c) => c.id === item.clientId) : null;
  const status = client
    ? deriveAthleteStatus(client, workouts, getTimerSessions(item.userId))
    : 'inactive';

  return {
    id: item.userId,
    initials: getClientInitials(item.name),
    name: item.name,
    sport: item.sport,
    goal: undefined,
    goalPct: undefined,
    status,
    lastSession: client
      ? formatLastSession(workouts, client.id, getTimerSessions(item.userId))
      : item.lastActivityAt
        ? new Date(item.lastActivityAt).toLocaleDateString('sv-SE')
        : undefined,
    color: getClientAvatarColor(item.clientId ?? item.userId),
  };
}

export function UsersDirectoryScreen({ navigation }: Props) {
  const authLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);
  const { clients, fetchClients, assignAthlete, fetchAssignableAthletes } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { getTimerSessions } = usePlatformStore();

  const [viewMode, setViewMode] = useState<ViewMode>(
    isAdminRole(user?.role) ? 'all' : 'clients'
  );
  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState('all');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [isAssigningAthlete, setIsAssigningAthlete] = useState(false);

  const load = useCallback(async () => {
    if (authLoading) return;
    try {
      setLoadError(null);
      setLoading(true);
      const mode = isAdmin ? viewMode : 'clients';
      let rows: DirectoryUser[] =
        mode === 'all'
          ? await fetchAllPlatformUsers(search, 500, 0)
          : await fetchPtClientDirectory(clients);

      if (search.trim() && mode === 'clients') {
        const q = search.trim().toLowerCase();
        rows = rows.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            (u.email?.toLowerCase().includes(q) ?? false)
        );
      }

      setUsers(rows);
    } catch (err) {
      setUsers([]);
      setLoadError(
        err instanceof Error ? err.message : 'Kunde inte hämta användarlistan'
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, clients, isAdmin, search, viewMode]);

  useEffect(() => {
    if (isAdmin) {
      setViewMode('all');
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchClients().catch(() => {});
    fetchAllWorkouts().catch(() => {});
  }, [fetchClients, fetchAllWorkouts]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const filtered = useMemo(() => {
    if (appFilter === 'all') return users;
    return users.filter((u) => u.apps[appFilter as keyof typeof u.apps]);
  }, [users, appFilter]);

  const stats = useMemo(() => {
    const withPerform = users.filter((u) => u.apps.perform).length;
    const withTracker = users.filter((u) => u.apps.tracker).length;
    const withMacro = users.filter((u) => u.apps.macro).length;
    return {
      total: users.length,
      perform: withPerform,
      tracker: withTracker,
      macro: withMacro,
    };
  }, [users]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients().catch(() => {});
    await fetchAllWorkouts().catch(() => {});
    await load();
    setRefreshing(false);
  };

  const openUser = (item: DirectoryUser) => {
    if (item.clientId) {
      navigation.navigate('AthleteDetail', { clientId: item.clientId });
    } else {
      navigation.navigate('AthleteDetail', {
        clientId: item.userId,
        userId: item.userId,
      });
    }
  };

  const handleAssignAthlete = useCallback(
    async (athlete: AthleteProfile) => {
      if (!user) {
        Alert.alert('Fel', 'Du måste vara inloggad.');
        return;
      }
      setIsAssigningAthlete(true);
      try {
        await assignAthlete(athlete);
        setAssignModalVisible(false);
        await fetchClients().catch(() => {});
        await load();
        Alert.alert('Tilldelad', `${athlete.name} finns nu på din dashboard.`);
      } catch {
        Alert.alert('Kunde inte tilldela', 'Något gick fel. Försök igen.');
      } finally {
        setIsAssigningAthlete(false);
      }
    },
    [assignAthlete, fetchClients, load, user]
  );

  const loadAssignableAthletes = useCallback(
    (q: string) => fetchAssignableAthletes(q),
    [fetchAssignableAthletes]
  );

  const viewTabs = isAdmin
    ? [
        { id: 'clients', label: 'Mina atleter' },
        { id: 'all', label: 'Alla användare' },
      ]
    : [];

  return (
    <ScreenContainer
      title={isAdmin && viewMode === 'all' ? 'Alla användare' : 'Atleter'}
      subtitle="M2M-ekosystem · app-kopplingar"
      search={<SearchBar value={search} onChangeText={setSearch} placeholder="Sök atlet…" />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={
        <>
          <Button label="Tilldela" size="sm" onPress={() => setAssignModalVisible(true)} />
          <Button
            label="Hantera"
            size="sm"
            onPress={() => navigation.navigate('ClientManage')}
          />
        </>
      }
    >
      {isAdmin && viewTabs.length > 0 ? (
        <FilterTabs
          tabs={viewTabs}
          activeId={viewMode}
          onChange={(id) => setViewMode(id as ViewMode)}
        />
      ) : (
        <Text style={styles.hint}>
          Visar dina tilldelade atleter ({users.length} st).
        </Text>
      )}

      <StatsStrip
        items={[
          { value: stats.total, label: 'Totalt', color: 'coach' },
          { value: stats.perform, label: 'Perform', color: 'coach' },
          { value: stats.tracker, label: 'Tracker', color: 'accent' },
          { value: stats.macro, label: 'Macro', color: 'orange' },
        ]}
      />

      <FilterTabs
        tabs={APP_FILTERS.map((f) => ({
          id: f.id,
          label: f.label,
          dotColor: f.dotColor,
          count: f.id === 'all' ? stats.total : undefined,
        }))}
        activeId={appFilter}
        onChange={setAppFilter}
      />

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Kunde inte ladda användare</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button label="Försök igen" size="sm" onPress={() => load()} />
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 32 }} />
      ) : loadError ? null : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Inga atleter matchar filtret</Text>
          }
          renderItem={({ item }) => (
            <AthleteCard
              athlete={directoryUserToCard(item, clients, workouts, getTimerSessions)}
              onPress={() => openUser(item)}
            />
          )}
        />
      )}
      <AssignAthleteModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        onAssign={handleAssignAthlete}
        isAssigning={isAssigningAthlete}
        fetchAthletes={loadAssignableAthletes}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: coachColors.muted,
    fontFamily: fonts.body,
    marginBottom: 8,
  },
  list: { gap: 10, paddingBottom: 24, marginTop: 12 },
  errorBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    gap: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.danger,
    fontFamily: fonts.body,
  },
  errorText: {
    fontSize: 13,
    color: coachColors.muted,
    fontFamily: fonts.body,
  },
  empty: {
    color: coachColors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: fonts.body,
  },
});
