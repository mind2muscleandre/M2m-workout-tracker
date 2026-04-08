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
import { STANDARD_SPORTS } from '../constants/sports';

// ============================================
// Navigation Props
// ============================================

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Clients'>,
  StackScreenProps<RootStackParamList>
>;

// ============================================
// Design System Colors
// ============================================

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#F7E928',
  primaryLight: '#FBF47A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  success: '#34C759',
  danger: '#FF3B30',
  inputBg: '#1C1C1E',
};

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

function ClientCard({ client, onPress }: ClientCardProps) {
  const initials = client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Klient: ${client.name}`}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.clientInfo}>
        <Text style={styles.clientName} numberOfLines={1}>
          {client.name}
        </Text>
        <Text style={styles.clientContact} numberOfLines={1}>
          {client.email || client.phone || 'Ingen kontaktinfo'}
        </Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          client.is_active ? styles.statusActive : styles.statusArchived,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            client.is_active
              ? styles.statusTextActive
              : styles.statusTextArchived,
          ]}
        >
          {client.is_active ? 'Aktiv' : 'Arkiverad'}
        </Text>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>{'\u203A'}</Text>
    </TouchableOpacity>
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
  isLoading: boolean;
}

function AddClientModal({
  visible,
  onClose,
  onSave,
  isLoading,
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
                (!name.trim() || isLoading) && styles.modalSaveDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? (
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
                editable={!isLoading}
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
                editable={!isLoading}
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
                editable={!isLoading}
              />
            </View>

            {/* Sport Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Idrott</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.fieldInputTouchable]}
                onPress={() => setSportPickerVisible(true)}
                disabled={isLoading}
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
                editable={!isLoading}
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
                editable={!isLoading}
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
                editable={!isLoading}
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
    isLoading,
    fetchClients,
    addClient,
    searchClients,
  } = useClientStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ----------------------------------------
  // Fetch clients on mount
  // ----------------------------------------

  useEffect(() => {
    fetchClients().catch(() => {
      // Error already logged in store
    });
  }, [fetchClients]);

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
      await fetchClients();
    } catch {
      // Error already logged in store
    } finally {
      setRefreshing(false);
    }
  }, [fetchClients]);

  // ----------------------------------------
  // Navigate to client detail
  // ----------------------------------------

  const handleClientPress = useCallback(
    (clientId: string) => {
      navigation.navigate('ClientDetail', { clientId });
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
      }
    },
    [addClient, user]
  );

  // ----------------------------------------
  // Render client card
  // ----------------------------------------

  const renderClientCard = useCallback(
    ({ item }: { item: Client }) => (
      <ClientCard
        client={item}
        onPress={() => handleClientPress(item.id)}
      />
    ),
    [handleClientPress]
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
    <SafeAreaView style={styles.container}>
      {/* ---- Header ---- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mina Klienter</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBatchButton}
            onPress={() => navigation.navigate('BatchScreeningUpload')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Öppna batch screening"
            accessibilityRole="button"
          >
            <Text style={styles.headerBatchText}>Screening</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={() => setModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Lägg till klient"
            accessibilityRole="button"
          >
            <Text style={styles.headerAddIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---- Search Bar ---- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Sök klient..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Rensa sökning"
            >
              <Text style={styles.clearIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ---- Tab Toggle: Aktiva / Arkiverade ---- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, !showArchived && styles.tabActive]}
          onPress={() => setShowArchived(false)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: !showArchived }}
        >
          <Text
            style={[styles.tabText, !showArchived && styles.tabTextActive]}
          >
            Aktiva
          </Text>
          <View
            style={[
              styles.tabBadge,
              !showArchived && styles.tabBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                !showArchived && styles.tabBadgeTextActive,
              ]}
            >
              {activeCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, showArchived && styles.tabActive]}
          onPress={() => setShowArchived(true)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: showArchived }}
        >
          <Text
            style={[styles.tabText, showArchived && styles.tabTextActive]}
          >
            Arkiverade
          </Text>
          <View
            style={[
              styles.tabBadge,
              showArchived && styles.tabBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                showArchived && styles.tabBadgeTextActive,
              ]}
            >
              {archivedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ---- Client List ---- */}
      {isLoading && clients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Laddar klienter...</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* ---- FAB (Floating Action Button) ---- */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel="Lägg till ny klient"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ---- Add Client Modal ---- */}
      <AddClientModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddClient}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // ---- Container ----
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBatchButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  headerBatchText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddIcon: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.text,
    marginTop: -2,
  },

  // ---- Search ----
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
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
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingLeft: 8,
  },

  // ---- Tab Toggle ----
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.text,
  },

  // ---- Client List ----
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },

  // ---- Client Card ----
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  clientInfo: {
    flex: 1,
    marginRight: 12,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  clientContact: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusArchived: {
    backgroundColor: colors.textSecondary + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextArchived: {
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
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

  // ---- FAB ----
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '400',
    color: colors.text,
    marginTop: -2,
  },

  // ---- Modal ----
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderButton: {
    minWidth: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 17,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalForm: {
    padding: 16,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  fieldInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
});
