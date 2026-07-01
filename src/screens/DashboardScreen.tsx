import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { StatsStrip } from '../components/ui/StatsStrip';
import { FilterTabs } from '../components/ui/FilterTabs';
import { AthleteCard } from '../components/ui/AthleteCard';
import { SearchBar } from '../components/ui/SearchBar';
import { Button, IconButton } from '../components/ui/Button';
import { AssignAthleteModal } from '../components/AssignAthleteModal';
import { AddAthleteMenuModal } from '../components/AddAthleteMenuModal';
import {
  DetailPanel,
  PanelSection,
  PanelRow,
  PanelTabNav,
  SlideOver,
  ChatThread,
  MacroBar,
  StatusPill,
} from '../components/ui';
import { IconPlus, IconBell, IconSearch } from '../components/ui/icons';
import { clientToAthleteCard, deriveAthleteStatus, deriveGoalPct } from '../lib/athleteStatus';
import { weekScheduleForProgram } from '../services/platformAdapt';
import { InlineEditButton } from '../components/athleteDetail/AthleteDetailUi';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import type { Client } from '../types/database';
import type { AthleteAggregateView } from '../types/platform';
import { usePlatformStore } from '../stores/platformStore';
import { useLayout } from '../lib/useLayout';
import { useMessageStore } from '../stores/messageStore';
import { useAuthStore } from '../stores/authStore';
import type { AthleteProfile } from '../types/athlete';

type Nav = StackNavigationProp<RootStackParamList>;
type PanelTab = 'goals' | 'program' | 'nutrition' | 'chat';

const PANEL_TABS = [
  { id: 'goals', label: 'Mål' },
  { id: 'program', label: 'Program' },
  { id: 'nutrition', label: 'Kost' },
  { id: 'chat', label: 'Chatt' },
];

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { showDetailPanel } = useLayout();
  const { clients, fetchClients, assignAthlete, fetchAssignableAthletes } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('goals');
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [isAssigningAthlete, setIsAssigningAthlete] = useState(false);

  useEffect(() => {
    (async () => {
      await fetchClients().catch(() => {});
      await fetchAllWorkouts().catch(() => {});
      const c = useClientStore.getState().clients;
      const w = useWorkoutStore.getState().workouts;
      await loadForClients(c, w).catch(() => {});
    })();
  }, [fetchClients, fetchAllWorkouts, loadForClients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchClients(), fetchAllWorkouts()]);
    const c = useClientStore.getState().clients;
    const w = useWorkoutStore.getState().workouts;
    await loadForClients(c, w).catch(() => {});
    setRefreshing(false);
  }, [fetchClients, fetchAllWorkouts, loadForClients]);

  const activeClients = useMemo(() => clients.filter((c) => c.is_active), [clients]);

  const stats = useMemo(() => {
    const statuses = activeClients.map((c) =>
      deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id))
    );
    return {
      training: statuses.filter((s) => s === 'training').length,
      recovery: statuses.filter((s) => s === 'recovery').length,
      alert: statuses.filter((s) => s === 'alert').length,
      total: activeClients.length,
    };
  }, [activeClients, workouts, getTimerSessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeClients
      .filter((c) => {
        if (
          filter !== 'all' &&
          deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id)) !== filter
        )
          return false;
        if (q && !c.name.toLowerCase().includes(q) && !(c.sport ?? '').toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => {
        const sa = deriveAthleteStatus(a, workouts, getTimerSessions(a.client_user_id));
        const sb = deriveAthleteStatus(b, workouts, getTimerSessions(b.client_user_id));
        if (sa === 'alert' && sb !== 'alert') return -1;
        if (sb === 'alert' && sa !== 'alert') return 1;
        const ga = deriveGoalPct(getAggregate(a.id)) ?? 0;
        const gb = deriveGoalPct(getAggregate(b.id)) ?? 0;
        return gb - ga;
      });
  }, [activeClients, filter, search, workouts, getTimerSessions, getAggregate]);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId((prev) => {
      const next = prev === id ? null : id;
      if (next) setPanelTab('goals');
      return next;
    });
  };

  const handleAssignAthlete = useCallback(
    async (athlete: AthleteProfile) => {
      if (!user) {
        Alert.alert('Fel', 'Du måste vara inloggad.');
        return;
      }
      setIsAssigningAthlete(true);
      try {
        const created = await assignAthlete(athlete);
        setAssignModalVisible(false);
        setSelectedId(created.id);
        setPanelTab('goals');
        await fetchClients().catch(() => {});
        await loadForClients(
          useClientStore.getState().clients,
          useWorkoutStore.getState().workouts
        ).catch(() => {});
        Alert.alert('Tilldelad', `${athlete.name} finns nu på din dashboard.`);
      } catch {
        Alert.alert('Kunde inte tilldela', 'Något gick fel. Försök igen.');
      } finally {
        setIsAssigningAthlete(false);
      }
    },
    [assignAthlete, fetchClients, loadForClients, user]
  );

  const loadAssignableAthletes = useCallback(
    (q: string) => fetchAssignableAthletes(q),
    [fetchAssignableAthletes]
  );

  const filterTabs = [
    { id: 'all', label: 'Alla', count: stats.total },
    { id: 'training', label: 'Tränar', dotColor: coachColors.coach },
    { id: 'recovery', label: 'Återhämtning', dotColor: coachColors.accent },
    { id: 'alert', label: 'Varning', dotColor: coachColors.orange },
    { id: 'rest', label: 'Vila', dotColor: coachColors.muted },
    { id: 'inactive', label: 'Inaktiv' },
  ];

  const athletePanelContent = selectedClient ? (
    <AthletePanelContent
      client={selectedClient}
      workouts={workouts}
      navigation={navigation}
      tab={panelTab}
    />
  ) : null;

  const detailPanel = (
    <DetailPanel
      title={selectedClient ? selectedClient.name.split(' ')[0] : 'Dagöversikt'}
      onClose={() => setSelectedId(null)}
      tabs={
        selectedClient ? (
          <PanelTabNav tabs={PANEL_TABS} activeId={panelTab} onChange={(id) => setPanelTab(id as PanelTab)} />
        ) : undefined
      }
    >
      {selectedClient ? (
        athletePanelContent
      ) : (
        <OverviewPanel stats={stats} workouts={workouts} clients={activeClients} />
      )}
    </DetailPanel>
  );

  const slideFooter = selectedClient ? (
    <>
      <Button
        label="Starta session"
        variant="primary"
        onPress={() => navigation.navigate('SessionTimer', { clientId: selectedClient.id })}
      />
      <Button
        label="Fullständig profil"
        onPress={() => navigation.navigate('AthleteDetail', { clientId: selectedClient.id })}
      />
    </>
  ) : null;

  return (
    <>
      <ScreenContainer
        title="Dashboard"
        search={
          searchOpen || !showDetailPanel ? (
            <SearchBar value={search} onChangeText={setSearch} placeholder="Sök atlet…" />
          ) : undefined
        }
        headerRight={
          <>
            <IconButton onPress={() => setSearchOpen((v) => !v)}>
              <IconSearch />
            </IconButton>
            <IconButton>
              <IconBell />
            </IconButton>
            <Button
              label="Lägg till atlet"
              variant="primary"
              size="sm"
              icon={<IconPlus />}
              onPress={() => setAddMenuVisible(true)}
            />
          </>
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        detailPanel={detailPanel}
      >
        <StatsStrip
          items={[
            { value: stats.training, label: 'Tränar idag', color: 'coach' },
            { value: stats.recovery, label: 'Återhämtning', color: 'accent' },
            { value: stats.alert, label: 'Varningar', color: 'orange' },
            { value: stats.total, label: 'Totalt', color: 'muted' },
          ]}
        />
        <FilterTabs tabs={filterTabs} activeId={filter} onChange={setFilter} />
        <View style={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>Inga atleter matchar filtret</Text>
          ) : (
            filtered.map((item) => (
              <AthleteCard
                key={item.id}
                athlete={clientToAthleteCard(item, workouts, {
                  selected: selectedId === item.id,
                  timerSessions: getTimerSessions(item.client_user_id),
                  aggregate: getAggregate(item.id),
                })}
                onPress={() => handleSelect(item.id)}
              />
            ))
          )}
        </View>
      </ScreenContainer>

      {!showDetailPanel && selectedClient ? (
        <SlideOver
          visible={!!selectedClient}
          title={selectedClient.name.split(' ')[0]}
          onClose={() => setSelectedId(null)}
          tabs={
            <PanelTabNav tabs={PANEL_TABS} activeId={panelTab} onChange={(id) => setPanelTab(id as PanelTab)} />
          }
          footer={slideFooter}
        >
          <AthletePanelContent
            client={selectedClient}
            workouts={workouts}
            navigation={navigation}
            tab={panelTab}
          />
        </SlideOver>
      ) : null}

      <AddAthleteMenuModal
        visible={addMenuVisible}
        onClose={() => setAddMenuVisible(false)}
        onAssignExisting={() => setAssignModalVisible(true)}
        onCreateManual={() => navigation.navigate('ClientManage')}
      />
      <AssignAthleteModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        onAssign={handleAssignAthlete}
        isAssigning={isAssigningAthlete}
        fetchAthletes={loadAssignableAthletes}
        title="Lägg till atlet"
      />
    </>
  );
}

function OverviewPanel({
  stats,
  workouts,
  clients,
}: {
  stats: { training: number; recovery: number; alert: number; total: number };
  workouts: ReturnType<typeof useWorkoutStore.getState>['workouts'];
  clients: Client[];
}) {
  const { getTimerSessions, getAggregate } = usePlatformStore();
  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const planned = workouts.filter((w) => w.status === 'planned' || w.status === 'in_progress').length;
  const alerts = clients.filter(
    (c) => deriveAthleteStatus(c, workouts, getTimerSessions(c.client_user_id)) === 'alert'
  );
  const upcoming = workouts
    .filter((w) => w.status === 'planned' || w.status === 'in_progress')
    .slice(0, 4);
  const avgGoal =
    clients.length > 0
      ? Math.round(
          clients.reduce((sum, c) => sum + (deriveGoalPct(getAggregate(c.id)) ?? 0), 0) / clients.length
        )
      : 0;

  return (
    <>
      <PanelSection variant="coach">
        <Text style={styles.overviewTodayLabel}>Idag — {today}</Text>
        <PanelRow label="Sessioner planerade" value={planned} valueColor={coachColors.coach} />
        <PanelRow label="Återhämtning aktiv" value={stats.recovery} valueColor={coachColors.accent} />
        <PanelRow label="Varningar att åtgärda" value={stats.alert} valueColor={coachColors.orange} />
        <PanelRow label="Genomsnittlig målstatus" value={`${avgGoal}%`} valueColor={coachColors.coach} />
      </PanelSection>
      {upcoming.length > 0 ? (
        <PanelSection label="Kommande sessioner">
          {upcoming.map((w) => {
            const client = clients.find((c) => c.id === w.client_id);
            return (
              <View key={w.id} style={styles.upRow}>
                <Text style={styles.upTime}>
                  {w.date
                    ? new Date(w.date).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </Text>
                <View>
                  <Text style={styles.upName}>{client?.name ?? 'Atlet'}</Text>
                  <Text style={styles.upType}>{w.title ?? 'Pass'}</Text>
                </View>
              </View>
            );
          })}
        </PanelSection>
      ) : null}
      <PanelSection label="Varningar att åtgärda">
        {alerts.length === 0 ? (
          <Text style={styles.muted}>Inga varningar just nu</Text>
        ) : (
          alerts.slice(0, 5).map((c) => (
            <View key={c.id} style={styles.upRow}>
              <View style={styles.notifDot} />
              <View>
                <Text style={styles.upName}>{c.name}</Text>
                <Text style={styles.upType}>Kräver uppföljning</Text>
              </View>
            </View>
          ))
        )}
      </PanelSection>
    </>
  );
}

function AthletePanelContent({
  client,
  workouts,
  navigation,
  tab,
}: {
  client: Client;
  workouts: ReturnType<typeof useWorkoutStore.getState>['workouts'];
  navigation: Nav;
  tab: PanelTab;
}) {
  const { getTimerSessions, getAggregate } = usePlatformStore();
  const { openConversation, fetchMessages, sendMessage, messages, activeConversationId } =
    useMessageStore();
  const userId = useAuthStore((s) => s.user?.id);
  const aggregate = getAggregate(client.id);
  const card = clientToAthleteCard(client, workouts, {
    timerSessions: getTimerSessions(client.client_user_id),
    aggregate,
  });
  const status = deriveAthleteStatus(client, workouts, getTimerSessions(client.client_user_id));

  useEffect(() => {
    if (tab === 'chat') {
      openConversation(client.id)
        .then((c) => fetchMessages(c.id))
        .catch(() => {});
    }
  }, [tab, client.id, openConversation, fetchMessages]);

  const chatMessages = messages.map((m) => ({
    id: m.id,
    dir: (m.sender_id === userId ? 'out' : 'in') as 'in' | 'out',
    text: m.body,
    time: new Date(m.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <>
      <View style={styles.athHero}>
        <View
          style={[
            styles.athAvatar,
            {
              borderColor: card.color ?? coachColors.coach,
              backgroundColor: `${card.color ?? coachColors.coach}40`,
            },
          ]}
        >
          <Text style={styles.athInitials}>{card.initials}</Text>
        </View>
        <View style={styles.athInfo}>
          <Text style={styles.heroName}>{client.name}</Text>
          <Text style={styles.heroSport}>{client.sport ?? 'Ingen idrott'}</Text>
          <View style={styles.athMetaRow}>
            <StatusPill status={status} />
            {status === 'alert' ? (
              <Text style={styles.athAlert}>⚠ Kräver uppföljning</Text>
            ) : null}
          </View>
        </View>
      </View>

      {tab === 'goals' ? <GoalsTab aggregate={aggregate} fallbackGoal={card.goal} goalPct={card.goalPct} /> : null}
      {tab === 'program' ? (
        <ProgramTab
          aggregate={aggregate}
          onEdit={() => navigation.navigate('ProgramBuilder', { clientId: client.id })}
        />
      ) : null}
      {tab === 'nutrition' ? (
        <NutritionTab
          aggregate={aggregate}
          onEdit={() => navigation.navigate('ProgramBuilder', { clientId: client.id })}
        />
      ) : null}
      {tab === 'chat' ? (
        <ChatThread
          messages={chatMessages}
          placeholder={`Skriv till ${client.name.split(' ')[0]}…`}
          onSend={async (text) => {
            if (activeConversationId) await sendMessage(activeConversationId, text);
          }}
        />
      ) : null}
    </>
  );
}

function GoalsTab({
  aggregate,
  fallbackGoal,
  goalPct,
}: {
  aggregate?: AthleteAggregateView;
  fallbackGoal?: string;
  goalPct?: number;
}) {
  const goals = aggregate?.goalsetter?.goals ?? [];
  if (goals.length === 0 && fallbackGoal) {
    return (
      <PanelSection>
        <GoalRow
          name={fallbackGoal}
          pct={goalPct}
          tag="Primärt mål (Goalsetter)"
          checkin={undefined}
        />
      </PanelSection>
    );
  }
  return (
    <PanelSection>
      {goals.map((g) => (
        <GoalRow
          key={g.id}
          name={g.title}
          pct={g.status === 'completed' ? 100 : undefined}
          tag={g.status === 'active' ? 'Primärt mål (Goalsetter)' : 'Mål'}
          checkin={g.deadline ? `Deadline ${g.deadline}` : undefined}
        />
      ))}
    </PanelSection>
  );
}

function GoalRow({
  name,
  pct,
  tag,
  checkin,
}: {
  name: string;
  pct?: number;
  tag: string;
  checkin?: string;
}) {
  const hasPct = typeof pct === 'number';
  const normalizedPct = hasPct ? Math.max(0, Math.min(100, pct)) : 0;
  const color =
    !hasPct || normalizedPct < 50
      ? coachColors.orange
      : normalizedPct >= 75
        ? coachColors.coach
        : coachColors.accent;
  return (
    <View style={styles.goalItem}>
      <Text style={styles.goalTag}>{tag}</Text>
      <Text style={styles.goalName}>{name}</Text>
      <View style={styles.goalBarWrap}>
        <View style={[styles.goalBarFill, { width: `${normalizedPct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.goalMetaRow}>
        <Text style={[styles.goalPct, hasPct ? { color } : null]}>{hasPct ? `${normalizedPct}%` : '—'}</Text>
        <Text style={styles.goalCheckin}>Check-in: {checkin ?? '—'}</Text>
      </View>
    </View>
  );
}

const SYS_COLORS: Record<string, string> = {
  atp: coachColors.accent,
  glyco: coachColors.orange,
  aero: coachColors.coach,
  gym: 'rgba(167,139,250,0.85)',
  off: coachColors.muted,
};

const DAY_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

function ProgramTab({
  aggregate,
  onEdit,
}: {
  aggregate?: AthleteAggregateView;
  onEdit: () => void;
}) {
  const adapt = aggregate?.adapt;
  const program = adapt?.program ?? aggregate?.tracker?.program;
  const todayDow = new Date().getDay();

  if (!program) {
    return (
      <PanelSection>
        <Text style={styles.muted}>Inget aktivt program</Text>
        <InlineEditButton label="Redigera program i Adapt" onPress={onEdit} />
      </PanelSection>
    );
  }

  const weekDays = adapt
    ? weekScheduleForProgram(adapt).map((d) => {
        const sys = d.isRest ? 'off' : 'aero';
        const col = SYS_COLORS[sys] ?? coachColors.muted;
        return {
          key: `${d.day}`,
          label: DAY_SHORT[d.day] ?? d.label,
          today: d.day === todayDow,
          exercises: d.session
            ? [d.session.session_name]
            : ['Vila / Aktiv återhämtning'],
          col,
        };
      })
    : [];

  const totalWeeks = adapt?.program.duration_weeks ?? adapt?.program.weeks ?? 8;
  const currentWeek = adapt?.currentWeek ?? 1;

  return (
    <PanelSection>
      <View style={styles.progHeader}>
        <Text style={styles.progName}>{program.name ?? 'Program'}</Text>
        {adapt ? (
          <Text style={styles.progWeekBadge}>
            V{currentWeek} / {totalWeeks}
          </Text>
        ) : null}
      </View>
      {weekDays.length === 0 ? (
        <Text style={styles.muted}>Ingen veckoplan tillgänglig</Text>
      ) : (
        weekDays.map((d) => (
          <View key={d.key} style={styles.progDayRow}>
            <Text style={[styles.progDayLbl, d.today && styles.progDayLblToday]}>{d.label}</Text>
            <View style={styles.progExercises}>
              {d.exercises.map((ex) => (
                <View key={ex} style={styles.progExLine}>
                  <View style={[styles.progSysDot, { backgroundColor: d.col }]} />
                  <Text style={[styles.progEx, d.today && styles.progExToday]}>{ex}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
      <InlineEditButton label="Redigera program i Adapt" onPress={onEdit} />
    </PanelSection>
  );
}

function NutritionTab({
  aggregate,
  onEdit,
}: {
  aggregate?: AthleteAggregateView;
  onEdit: () => void;
}) {
  const macro = aggregate?.macro;
  const goal = macro?.nutritionGoal ?? aggregate?.goalsetter?.nutritionGoal;
  const todayMeals = macro?.recentMeals?.filter((m) => {
    if (!m.logged_at) return false;
    const d = new Date(m.logged_at).toDateString();
    return d === new Date().toDateString();
  }) ?? [];
  const sum = (fn: (m: (typeof todayMeals)[0]) => number | null) =>
    todayMeals.reduce((acc, m) => acc + (fn(m) ?? 0), 0);

  const hasTargets =
    typeof goal?.calories === 'number' &&
    typeof goal?.protein_g === 'number' &&
    typeof goal?.carbs_g === 'number' &&
    typeof goal?.fat_g === 'number';
  const items = hasTargets
    ? [
        { name: 'Kalorier', current: sum((m) => m.calories), target: Number(goal?.calories), variant: 'default' as const },
        { name: 'Protein', current: sum((m) => m.protein_g), target: Number(goal?.protein_g), variant: 'pro' as const },
        { name: 'Kolhydrater', current: sum((m) => m.carbs_g), target: Number(goal?.carbs_g), variant: 'carb' as const },
        { name: 'Fett', current: sum((m) => m.fat_g), target: Number(goal?.fat_g), variant: 'fat' as const },
      ]
    : [];

  return (
    <PanelSection>
      {hasTargets ? (
        <MacroBar label="Idag — Makronäringsämnen (Adapt)" items={items} />
      ) : (
        <Text style={styles.muted}>Inga makromål i databasen</Text>
      )}
      <InlineEditButton label="Justera makromål i Adapt" onPress={onEdit} />
    </PanelSection>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  empty: { textAlign: 'center', color: coachColors.muted, padding: 48, fontFamily: fonts.body, fontSize: 13 },
  muted: { color: coachColors.muted, fontSize: 13, fontFamily: fonts.body },
  overviewTodayLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.coach,
    marginBottom: 8,
  },
  upRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  upTime: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '500',
    color: coachColors.coach,
    width: 44,
  },
  upName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: coachColors.fg },
  upType: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    color: coachColors.muted,
    marginTop: 1,
  },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: coachColors.orange,
    shadowColor: coachColors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  athHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBgCoach,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.18)',
    marginBottom: 4,
  },
  athAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: coachColors.coachDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athInitials: {
    fontFamily: fonts.display,
    fontSize: 19,
    fontWeight: '700',
    color: '#000',
  },
  athInfo: { flex: 1, gap: 2, minWidth: 0 },
  athMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  athAlert: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.fg,
    textTransform: 'uppercase',
  },
  heroSport: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  goalItem: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  goalTag: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    textTransform: 'uppercase',
    color: coachColors.muted,
    marginBottom: 3,
  },
  goalName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: coachColors.fg,
    marginBottom: 5,
  },
  goalBarWrap: {
    height: 4,
    backgroundColor: coachColors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  goalBarFill: { height: '100%', borderRadius: 2 },
  goalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  goalPct: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  goalCheckin: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  progHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progName: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: coachColors.fg,
    letterSpacing: 0.3,
    flex: 1,
  },
  progWeekBadge: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.coach,
    backgroundColor: coachColors.coachDim,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.18)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progDayRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  progDayLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: coachColors.muted,
    width: 24,
    marginTop: 2,
  },
  progDayLblToday: { color: coachColors.coach, fontWeight: '700' },
  progExercises: { flex: 1, gap: 2 },
  progExLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  progSysDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  progEx: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    lineHeight: 14,
  },
  progExToday: { color: coachColors.fg },
});
