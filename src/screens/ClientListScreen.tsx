// ============================================
// PT Workout Tracker - Client List Screen
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { Client } from '../types/database';
import type { AthleteProfile } from '../types/athlete';
import { STANDARD_SPORTS } from '../constants/sports';
import { AssignAthleteModal } from '../components/AssignAthleteModal';

// ============================================
// Navigation Props
// ============================================

import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AthleteCard } from '../components/ui/AthleteCard';
import { FilterTabs } from '../components/ui/FilterTabs';
import { SearchBar } from '../components/ui/SearchBar';
import { Button, IconButton } from '../components/ui/Button';
import { IconPlus, IconSearch } from '../components/ui/icons';
import { clientToAthleteCard } from '../lib/athleteStatus';
import { usePlatformStore } from '../stores/platformStore';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';
import { useWorkoutStore } from '../stores/workoutStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Athletes'>,
  StackScreenProps<RootStackParamList>
>;

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  isArchived: boolean;
}

function EmptyState({ isArchived }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {isArchived ? '\u{1F4E6}' : '\u{1F465}'}
      </Text>
      <Text style={styles.emptyTitle}>
        {isArchived ? 'Inga arkiverade klienter' : 'Inga klienter ännu'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isArchived
          ? 'Arkiverade klienter visas här'
          : 'Tryck på + för att lägga till din första klient'}
      </Text>
    </View>
  );
}

// ============================================
// Client Card Component
// ============================================

interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

function ClientCard({
  client,
  onPress,
  workouts,
}: ClientCardProps & { workouts: ReturnType<typeof useWorkoutStore.getState>['workouts'] }) {
  const { getTimerSessions, getAggregate } = usePlatformStore();
  return (
    <AthleteCard
      athlete={clientToAthleteCard(client, workouts, {
        timerSessions: getTimerSessions(client.client_user_id),
        aggregate: getAggregate(client.id),
      })}
      onPress={onPress}
    />
  );
}

// ============================================
// Add Client Modal Component
// ============================================

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    phone: string;
    notes: string;
    sport: string;
    age: string;
    weight: string;
  }) => void;
  isSaving: boolean;
}

function AddClientModal({
  visible,
  onClose,
  onSave,
  isSaving,
}: AddClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sport, setSport] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [sportPickerVisible, setSportPickerVisible] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setSport('');
    setAge('');
    setWeight('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Namn krävs', 'Ange klientens namn för att fortsätta.');
      return;
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      sport: sport.trim(),
      age: age.trim(),
      weight: weight.trim(),
    });
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalCancelText}>Avbryt</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ny Klient</Text>
            <TouchableOpacity
              style={[
                styles.modalHeaderButton,
                styles.modalSaveButton,
                (!name.trim() || isSaving) && styles.modalSaveDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text style={styles.modalSaveText}>Spara</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Form */}
          <View style={styles.modalForm}>
            {/* Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Namn <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Förnamn Efternamn"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
                editable={!isSaving}
              />
            </View>

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-post</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="klient@exempel.se"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSaving}
              />
            </View>

            {/* Phone Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Telefon</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="070-123 45 67"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            {/* Sport Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Idrott</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.fieldInputTouchable]}
                onPress={() => setSportPickerVisible(true)}
                disabled={isSaving}
              >
                <Text
                  style={[
                    styles.fieldInputText,
                    !sport && styles.fieldInputPlaceholder,
                  ]}
                >
                  {sport || 'Välj idrott...'}
                </Text>
                <Text style={styles.fieldInputArrow}>{'\u203A'}</Text>
              </TouchableOpacity>
            </View>

            {/* Age Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ålder</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Ålder"
                placeholderTextColor={colors.textSecondary}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                editable={!isSaving}
              />
            </View>

            {/* Weight Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Vikt (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Vikt i kg"
                placeholderTextColor={colors.textSecondary}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                editable={!isSaving}
              />
            </View>

            {/* Notes Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Anteckningar</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea]}
                placeholder="Mål, skador, övrigt..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Sport Picker Modal */}
      <Modal
        visible={sportPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSportPickerVisible(false)}
      >
        <View style={styles.pickerModalContainer}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Välj idrott</Text>
              <TouchableOpacity
                onPress={() => setSportPickerVisible(false)}
                style={styles.pickerModalCloseButton}
              >
                <Text style={styles.pickerModalCloseText}>Stäng</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={STANDARD_SPORTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSport(item);
                    setSportPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                  {sport === item && (
                    <Text style={styles.pickerItemCheck}>{'\u2713'}</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.pickerItemSeparator} />
              )}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ============================================
// Client List Screen Component
// ============================================

export function ClientListScreen({ navigation }: Props) {
  const {
    clients,
    isFetching,
    fetchClients,
    addClient,
    assignAthlete,
    fetchAssignableAthletes,
    searchClients,
  } = useClientStore();
  const { workouts, fetchAllWorkouts } = useWorkoutStore();
  const { loadForClients, getTimerSessions, getAggregate } = usePlatformStore();
  const { user, isAuthenticated } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isAssigningAthlete, setIsAssigningAthlete] = useState(false);

  // ----------------------------------------
  // Fetch clients — wait for auth to be confirmed
  // (Safari/iPad reads AsyncStorage slower than Chrome, causing a race
  //  where fetchClients fires before the user is in the auth store)
  // ----------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      await fetchClients().catch((e) => console.error('fetchClients:', e));
      await fetchAllWorkouts().catch((e) => console.error('fetchAllWorkouts:', e));
      await loadForClients(
        useClientStore.getState().clients,
        useWorkoutStore.getState().workouts
      ).catch((e) => console.error('loadForClients:', e));
    })();
  }, [isAuthenticated, fetchClients, fetchAllWorkouts, loadForClients]);

  // ----------------------------------------
  // Filtered & searched clients
  // ----------------------------------------

  const filteredClients = useMemo(() => {
    const searched = searchQuery ? searchClients(searchQuery) : clients;
    return searched.filter((c) =>
      showArchived ? !c.is_active : c.is_active
    );
  }, [clients, searchQuery, showArchived, searchClients]);

  // ----------------------------------------
  // Pull to refresh
  // ----------------------------------------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchClients(), fetchAllWorkouts()]);
      await loadForClients(
        useClientStore.getState().clients,
        useWorkoutStore.getState().workouts
      ).catch(() => {});
    } catch {
      // Error already logged in store
    } finally {
      setRefreshing(false);
    }
  }, [fetchClients, fetchAllWorkouts, loadForClients]);

  // ----------------------------------------
  // Navigate to client detail
  // ----------------------------------------

  const handleClientPress = useCallback(
    (clientId: string) => {
      navigation.navigate('AthleteDetail', { clientId });
    },
    [navigation]
  );

  // ----------------------------------------
  // Add new client
  // ----------------------------------------

  const handleAddClient = useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      notes: string;
      sport: string;
      age: string;
      weight: string;
    }) => {
      if (!user) {
        Alert.alert('Fel', 'Du måste vara inloggad för att lägga till klienter.');
        return;
      }

      setIsSavingClient(true);
      try {
        await addClient({
          assigned_pt_id: user.id,
          client_user_id: null,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          sport: data.sport || null,
          age: data.age ? parseInt(data.age, 10) : null,
          weight_kg: data.weight ? parseFloat(data.weight) : null,
          is_active: true,
        });
        setModalVisible(false);
      } catch {
        Alert.alert(
          'Kunde inte spara',
          'Något gick fel. Försök igen.'
        );
      } finally {
        setIsSavingClient(false);
      }
    },
    [addClient, user]
  );

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
        Alert.alert('Tilldelad', `${athlete.name} finns nu på din dashboard.`);
      } catch {
        Alert.alert('Kunde inte tilldela', 'Något gick fel. Försök igen.');
      } finally {
        setIsAssigningAthlete(false);
      }
    },
    [assignAthlete, user]
  );

  const loadAssignableAthletes = useCallback(
    (q: string) => fetchAssignableAthletes(q),
    [fetchAssignableAthletes]
  );

  // ----------------------------------------
  // Render client card
  // ----------------------------------------

  const renderClientCard = useCallback(
    ({ item }: { item: Client }) => (
      <ClientCard
        client={item}
        workouts={workouts}
        onPress={() => handleClientPress(item.id)}
      />
    ),
    [handleClientPress, workouts]
  );

  const keyExtractor = useCallback((item: Client) => item.id, []);

  // ----------------------------------------
  // Active / Archived counts
  // ----------------------------------------

  const activeCount = useMemo(
    () => clients.filter((c) => c.is_active).length,
    [clients]
  );
  const archivedCount = useMemo(
    () => clients.filter((c) => !c.is_active).length,
    [clients]
  );

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <ScreenContainer
      title="Atleter"
      search={<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Sök atlet…" />}
      headerRight={
        <>
          <Button label="Screening" size="sm" onPress={() => navigation.navigate('ScreeningHub')} />
          <Button label="Tilldela" size="sm" onPress={() => setAssignModalVisible(true)} />
          <Button label="Lägg till" variant="primary" size="sm" icon={<IconPlus />} onPress={() => setModalVisible(true)} />
        </>
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
      scroll={false}
    >
      <FilterTabs
        tabs={[
          { id: 'active', label: 'Aktiva', count: activeCount },
          { id: 'archived', label: 'Arkiverade', count: archivedCount },
        ]}
        activeId={showArchived ? 'archived' : 'active'}
        onChange={(id) => setShowArchived(id === 'archived')}
      />
      {isFetching && clients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Laddar atleter...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            filteredClients.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState isArchived={showArchived} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      <AddClientModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddClient}
        isSaving={isSavingClient}
      />
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

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: 0, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },
  chevron: { fontSize: 24, color: colors.textSecondary, fontWeight: '300' },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },

  // ---- Empty State ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ---- Loading ----
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: coachColors.screenBg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  modalHeaderButton: {
    minWidth: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: coachColors.muted,
    fontFamily: fonts.bodyMedium,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: coachColors.fg,
    fontFamily: fonts.display,
  },
  modalSaveButton: {
    backgroundColor: coachColors.coach,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
  },
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    fontFamily: fonts.bodySemiBold,
  },
  modalForm: {
    padding: 16,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    color: coachColors.muted,
    letterSpacing: 0.5,
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  fieldInput: {
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: coachColors.fg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    fontFamily: fonts.body,
  },
  fieldInputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  fieldInputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  fieldInputPlaceholder: {
    color: colors.textSecondary,
  },
  fieldInputArrow: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  pickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pickerModalCloseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickerModalCloseText: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pickerItemText: {
    fontSize: 17,
    color: colors.text,
  },
  pickerItemCheck: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  pickerItemSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },

  assignListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  assignRowText: {
    flex: 1,
    marginRight: 8,
  },
  assignName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  assignMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assignTeam: {
    fontSize: 13,
    color: colors.primaryLight,
    marginTop: 2,
  },
  assignOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
