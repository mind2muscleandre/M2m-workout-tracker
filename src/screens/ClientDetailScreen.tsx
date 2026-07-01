// ============================================
// PT Workout Tracker - Client Detail Screen
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { Client, Workout } from '../types/database';
import { formatDate } from '../utils/helpers';
import { STANDARD_SPORTS } from '../constants/sports';
import { listMovementAssessmentsForClient } from '../services/clientAssessments';
import { listImageScreeningsForClient } from '../services/clientScreenings';
import type { MovementAssessmentSummary, ScreeningSummary } from '../types/athlete';
import { parseMaAssessmentId, isActionProgramWorkout } from '../lib/programMarkers';
import { bandDisplaySv } from '../lib/movementAssessment/exportPayload';
import type { ScoreBand } from '../types/movementAssessment';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';
import { FilterTabs } from '../components/ui/FilterTabs';
import { GlassCard } from '../components/ui/GlassCard';
import { getClientInitials, getClientAvatarColor } from '../lib/athleteStatus';

// ============================================
// Navigation Props
// ============================================

type Props = StackScreenProps<RootStackParamList, 'ClientDetail'>;

type ClientDetailSection = 'overview' | 'results' | 'workouts';

// ============================================
// Status Badge Helper
// ============================================

function getStatusConfig(status: string): { label: string; color: string } {
  switch (status) {
    case 'completed':
      return { label: 'Klar', color: colors.success };
    case 'in_progress':
      return { label: 'Pågår', color: colors.warning };
    case 'draft':
      return { label: 'Utkast', color: colors.warning };
    case 'planned':
    default:
      return { label: 'Planerad', color: colors.primaryLight };
  }
}

// ============================================
// Section Header Component
// ============================================

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ============================================
// InfoPill Component
// ============================================

function InfoPill({ label }: { label: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillText}>{label}</Text>
    </View>
  );
}

// ============================================
// ScoreBar Component
// ============================================

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value != null ? Math.min(100, Math.max(0, Math.round(Number(value)))) : null;
  const barColor =
    pct == null ? coachColors.muted
    : pct >= 75 ? coachColors.coach
    : pct >= 60 ? coachColors.accent
    : coachColors.orange;

  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarTrack}>
        {pct != null ? (
          <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        ) : null}
      </View>
      <Text style={[styles.scoreBarValue, { color: barColor }]}>
        {pct != null ? `${pct}` : '—'}
      </Text>
    </View>
  );
}

// ============================================
// Band color helpers
// ============================================

function getBandBgColor(band: ScoreBand | null): string {
  switch (band) {
    case 'excellent': return 'rgba(0,212,170,0.15)';
    case 'good':      return 'rgba(0,212,170,0.10)';
    case 'fair':      return 'rgba(247,233,40,0.12)';
    case 'poor':      return 'rgba(255,95,31,0.12)';
    case 'critical':  return 'rgba(255,60,60,0.12)';
    default:          return 'rgba(255,255,255,0.06)';
  }
}

function getBandTextColor(band: ScoreBand | null): string {
  switch (band) {
    case 'excellent':
    case 'good':     return coachColors.coach;
    case 'fair':     return coachColors.accent;
    case 'poor':
    case 'critical': return coachColors.orange;
    default:         return coachColors.muted;
  }
}

// ============================================
// Workout Card Component
// ============================================

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onDelete?: () => void;
  subtitle?: string;
}

function WorkoutCard({ workout, onPress, onDelete, subtitle }: WorkoutCardProps) {
  const status = getStatusConfig(workout.status);

  const handleDelete = (e: any) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Pass: ${workout.title || 'Unnamed'}`}
    >
      <View style={styles.workoutCardHeader}>
        <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
        <View style={styles.workoutCardHeaderRight}>
          <View
            style={[styles.workoutStatusBadge, { backgroundColor: status.color + '20' }]}
          >
            <Text style={[styles.workoutStatusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              style={styles.workoutDeleteButton}
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.workoutDeleteIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.workoutTitle} numberOfLines={1}>
        {workout.title || 'Namnlöst pass'}
      </Text>

      {subtitle ? (
        <Text style={styles.workoutProgramTag} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}

      {workout.notes && !isActionProgramWorkout(workout.notes) && (
        <Text style={styles.workoutNotes} numberOfLines={2}>
          {workout.notes}
        </Text>
      )}

      <View style={styles.workoutCardFooter}>
        <Text style={styles.workoutMeta}>
          {workout.total_duration_seconds
            ? `${Math.round(workout.total_duration_seconds / 60)} min`
            : 'Ingen tid'}
        </Text>
        <Text style={styles.workoutChevron}>{'\u203A'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// Copy Workout Modal Component
// ============================================

interface CopyWorkoutModalProps {
  visible: boolean;
  workouts: Workout[];
  onClose: () => void;
  onSelect: (workoutId: string) => void;
  isLoading: boolean;
}

function CopyWorkoutModal({
  visible,
  workouts,
  onClose,
  onSelect,
  isLoading,
}: CopyWorkoutModalProps) {
  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <TouchableOpacity
      style={styles.copyWorkoutItem}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.copyWorkoutInfo}>
        <Text style={styles.copyWorkoutDate}>{formatDate(item.date)}</Text>
        <Text style={styles.copyWorkoutTitle} numberOfLines={1}>
          {item.title || 'Namnlöst pass'}
        </Text>
      </View>
      <Text style={styles.copyWorkoutChevron}>{'\u203A'}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalHeaderButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.modalCancelText}>Stäng</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Kopiera Pass</Text>
          <View style={styles.modalHeaderButton} />
        </View>

        {isLoading ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Text style={styles.modalEmptyIcon}>{'\u{1F4CB}'}</Text>
            <Text style={styles.modalEmptyText}>
              Inga tidigare pass att kopiera
            </Text>
          </View>
        ) : (
          <FlatList
            data={workouts}
            renderItem={renderWorkoutItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.copyWorkoutList}
            ItemSeparatorComponent={() => (
              <View style={styles.copyWorkoutSeparator} />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ============================================
// Client Detail Screen Component
// ============================================

export default function ClientDetailScreen({ route, navigation }: Props) {
  const { clientId } = route.params;

  const {
    clients,
    updateClient,
    toggleClientActive,
    fetchClients,
    fetchClientById,
  } = useClientStore();
  const {
    workouts,
    fetchWorkouts,
    copyWorkout,
    deleteWorkout,
    isFetchingWorkouts: workoutLoading,
    isCopyingWorkout: copyWorkoutLoading,
  } = useWorkoutStore();

  // ----------------------------------------
  // Local state
  // ----------------------------------------

  const [client, setClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSport, setEditSport] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [sportPickerVisible, setSportPickerVisible] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientLookupResolved, setClientLookupResolved] = useState(() =>
    useClientStore.getState().clients.some((c) => c.id === clientId)
  );
  const [assessments, setAssessments] = useState<MovementAssessmentSummary[]>([]);
  const [screenings, setScreenings] = useState<ScreeningSummary[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ClientDetailSection>('overview');

  // ----------------------------------------
  // Load client and workouts on mount
  // ----------------------------------------

  useEffect(() => {
    setClientLookupResolved(
      useClientStore.getState().clients.some((c) => c.id === clientId)
    );
  }, [clientId]);

  useEffect(() => {
    const foundClient = clients.find((c) => c.id === clientId) ?? null;
    setClient(foundClient);

    if (foundClient) {
      setEditName(foundClient.name);
      setEditEmail(foundClient.email ?? '');
      setEditPhone(foundClient.phone ?? '');
      setEditNotes(foundClient.notes ?? '');
      setEditSport(foundClient.sport ?? '');
      setEditAge(foundClient.age?.toString() ?? '');
      setEditWeight(foundClient.weight_kg?.toString() ?? '');
      setClientLookupResolved(true);
    }
  }, [clients, clientId]);

  useEffect(() => {
    if (useClientStore.getState().clients.some((c) => c.id === clientId)) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const one = await fetchClientById(clientId);
        if (cancelled) return;
        if (!one) {
          await fetchClients();
        }
      } catch {
        // logged in store / supabase
      } finally {
        if (!cancelled) {
          setClientLookupResolved(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, fetchClientById, fetchClients]);

  useEffect(() => {
    fetchWorkouts(clientId).catch(() => {
      // Error already logged in store
    });
  }, [clientId, fetchWorkouts]);

  useEffect(() => {
    let cancelled = false;
    setResultsLoading(true);
    Promise.all([
      listMovementAssessmentsForClient(clientId),
      listImageScreeningsForClient(clientId),
    ])
      .then(([ma, sc]) => {
        if (!cancelled) {
          setAssessments(ma);
          setScreenings(sc);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssessments([]);
          setScreenings([]);
        }
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ----------------------------------------
  // Derived data
  // ----------------------------------------

  const programWorkouts = useMemo(
    () =>
      workouts.filter(
        (w) => w.status === 'draft' || isActionProgramWorkout(w.notes)
      ),
    [workouts]
  );

  const regularWorkouts = useMemo(
    () =>
      workouts.filter(
        (w) => w.status !== 'draft' && !isActionProgramWorkout(w.notes)
      ),
    [workouts]
  );

  const recentWorkouts = regularWorkouts.slice(0, 10);
  const recentPrograms = programWorkouts.slice(0, 5);
  const completedWorkouts = workouts.filter((w) => w.status === 'completed');
  const totalWorkouts = completedWorkouts.length;

  const lastWorkoutDate =
    regularWorkouts.length > 0
      ? formatDate(regularWorkouts[0].date)
      : 'Inget ännu';

  const sectionTabs = useMemo(
    () => [
      { id: 'overview', label: 'Översikt' },
      {
        id: 'results',
        label: 'Resultat',
        count: assessments.length + screenings.length > 0 ? assessments.length + screenings.length : undefined,
      },
      {
        id: 'workouts',
        label: 'Pass',
        count: recentWorkouts.length > 0 ? recentWorkouts.length : undefined,
      },
    ],
    [assessments.length, screenings.length, recentWorkouts.length]
  );

  // ----------------------------------------
  // Navigation Header
  // ----------------------------------------

  useEffect(() => {
    navigation.setOptions({
      headerTitle: client?.name ?? 'Klient',
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.text,
      headerShadowVisible: false,
    });
  }, [navigation, client?.name]);

  // ----------------------------------------
  // Edit handlers
  // ----------------------------------------

  const handleStartEdit = useCallback(() => {
    if (client) {
      setEditName(client.name);
      setEditEmail(client.email ?? '');
      setEditPhone(client.phone ?? '');
      setEditNotes(client.notes ?? '');
      setEditSport(client.sport ?? '');
      setEditAge(client.age?.toString() ?? '');
      setEditWeight(client.weight_kg?.toString() ?? '');
      setIsEditing(true);
    }
  }, [client]);

  const handleCancelEdit = useCallback(() => {
    if (client) {
      setEditName(client.name);
      setEditEmail(client.email ?? '');
      setEditPhone(client.phone ?? '');
      setEditNotes(client.notes ?? '');
      setEditSport(client.sport ?? '');
      setEditAge(client.age?.toString() ?? '');
      setEditWeight(client.weight_kg?.toString() ?? '');
    }
    setIsEditing(false);
  }, [client]);

  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim()) {
      Alert.alert('Namn krävs', 'Klientens namn kan inte vara tomt.');
      return;
    }

    setIsSaving(true);
    try {
      await updateClient(clientId, {
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        notes: editNotes.trim() || null,
        sport: editSport.trim() || null,
        age: editAge.trim() ? parseInt(editAge.trim(), 10) : null,
        weight_kg: editWeight.trim() ? parseFloat(editWeight.trim()) : null,
      });
      setIsEditing(false);
    } catch {
      Alert.alert('Fel', 'Kunde inte spara ändringarna. Försök igen.');
    } finally {
      setIsSaving(false);
    }
  }, [clientId, editName, editEmail, editPhone, editNotes, editSport, editAge, editWeight, updateClient]);

  // ----------------------------------------
  // Archive / Activate toggle
  // ----------------------------------------

  const handleToggleActive = useCallback(() => {
    if (!client) return;

    const action = client.is_active ? 'arkivera' : 'aktivera';
    const title = client.is_active ? 'Arkivera klient' : 'Aktivera klient';
    const message = `Är du säker att du vill ${action} ${client.name}?`;

    Alert.alert(title, message, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: client.is_active ? 'Arkivera' : 'Aktivera',
        style: client.is_active ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await toggleClientActive(clientId);
          } catch {
            Alert.alert('Fel', 'Kunde inte ändra status. Försök igen.');
          }
        },
      },
    ]);
  }, [client, clientId, toggleClientActive]);

  // ----------------------------------------
  // Workout actions
  // ----------------------------------------

  const handleCreateWorkout = useCallback(() => {
    navigation.navigate('WorkoutCreate', { clientId });
  }, [navigation, clientId]);

  const handleCopyWorkout = useCallback(
    async (workoutId: string) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const newWorkoutId = await copyWorkout(workoutId, clientId, today);
        setCopyModalVisible(false);
        navigation.navigate('WorkoutActive', { workoutId: newWorkoutId });
      } catch {
        Alert.alert('Fel', 'Kunde inte kopiera passet. Försök igen.');
      }
    },
    [clientId, copyWorkout, navigation]
  );

  const handleWorkoutPress = useCallback(
    (workout: Workout) => {
      const maId = parseMaAssessmentId(workout.notes);
      if (workout.status === 'draft' && maId) {
        navigation.navigate('MovementAssessmentProgramBuilder', {
          clientId,
          assessmentId: maId,
        });
        return;
      }
      if (maId && workout.status === 'planned') {
        navigation.navigate('WorkoutCreate', {
          clientId,
          templateWorkoutId: workout.id,
        });
        return;
      }
      if (workout.status === 'planned' || workout.status === 'draft') {
        navigation.navigate('WorkoutCreate', {
          clientId,
          templateWorkoutId: workout.id,
        });
        return;
      }
      navigation.navigate('WorkoutActive', { workoutId: workout.id });
    },
    [navigation, clientId]
  );

  const handleAssessmentPress = useCallback(
    (row: MovementAssessmentSummary) => {
      navigation.navigate('MovementAssessmentResult', {
        clientId,
        assessment: row,
      });
    },
    [navigation, clientId]
  );

  const handleOpenProgramForAssessment = useCallback(
    (assessmentId: string) => {
      navigation.navigate('MovementAssessmentProgramBuilder', {
        clientId,
        assessmentId,
      });
    },
    [navigation, clientId]
  );

  const handleScreeningPress = useCallback((row: ScreeningSummary) => {
    if (row.video_url) {
      Linking.openURL(row.video_url).catch(() => {
        Alert.alert('Kunde inte öppna', 'Länken till screeningen gick inte att öppna.');
      });
    }
  }, []);

  const handleDeleteWorkout = useCallback(
    (workout: Workout) => {
      Alert.alert(
        'Ta bort pass',
        `Är du säker att du vill ta bort "${workout.title || 'Namnlöst pass'}"? Detta går inte att ångra.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Ta bort',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteWorkout(workout.id);
              } catch (error) {
                Alert.alert('Fel', 'Kunde inte ta bort passet. Försök igen.');
              }
            },
          },
        ]
      );
    },
    [deleteWorkout]
  );

  const handleProgressionPress = useCallback(() => {
    navigation.navigate('Progression', { clientId });
  }, [navigation, clientId]);

  const handleMovementAssessmentPress = useCallback(() => {
    navigation.navigate('MovementAssessment', { clientId });
  }, [navigation, clientId]);

  // ----------------------------------------
  // Loading state
  // ----------------------------------------

  if (!client) {
    if (!clientLookupResolved) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Laddar klient...</Text>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Klienten hittades inte</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backIcon}>Tillbaka</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <SafeAreaView 
      style={[
        styles.container,
        Platform.OS === 'web' && { height: '100%', overflow: 'hidden' }
      ]}
    >
      {/* Header with Back Button */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        {/* ============================================ */}
        {/* Client Info Section                          */}
        {/* ============================================ */}
        <View style={styles.infoCard}>
          {!isEditing && (
            <View style={styles.heroTopRow}>
              {/* Avatar */}
              <View style={[styles.heroAvatar, { backgroundColor: getClientAvatarColor(client.name) }]}>
                <Text style={styles.heroAvatarText}>{getClientInitials(client.name)}</Text>
              </View>

              {/* Name + chips */}
              <View style={styles.heroNameBlock}>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>{client.name}</Text>
                  {client.sport ? (
                    <View style={styles.heroSportChip}>
                      <Text style={styles.heroSportText}>{client.sport}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.heroPillsRow}>
                  {client.age ? <InfoPill label={`${client.age} år`} /> : null}
                  {client.weight_kg ? <InfoPill label={`${client.weight_kg} kg`} /> : null}
                  <View style={[
                    styles.statusPillInline,
                    { backgroundColor: client.is_active ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.06)' },
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: client.is_active ? coachColors.coach : coachColors.muted }]} />
                    <Text style={[styles.statusPillText, { color: client.is_active ? coachColors.coach : coachColors.muted }]}>
                      {client.is_active ? 'Aktiv' : 'Arkiverad'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Edit button */}
              <TouchableOpacity style={styles.heroEditBtn} onPress={handleStartEdit}>
                <Text style={styles.heroEditBtnText}>Redigera</Text>
              </TouchableOpacity>
            </View>
          )}

          {client.email && !isEditing && (
            <Text style={styles.heroEmail} numberOfLines={1}>{client.email}</Text>
          )}

          {/* Edit / Save buttons (editing mode header) */}
          {isEditing && (
            <View style={styles.infoCardHeader}>
              <View style={styles.infoHeaderLeft}>
                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{getClientInitials(client.name)}</Text>
                </View>
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={handleCancelEdit}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.editCancelText}>Avbryt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveButton, isSaving && styles.editSaveDisabled]}
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Text style={styles.editSaveText}>Spara</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Editable Fields */}
          {isEditing ? (
            <View style={styles.editForm}>
              {/* Name */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Namn</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Namn"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  editable={!isSaving}
                />
              </View>

              {/* Email */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>E-post</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="E-post"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSaving}
                />
              </View>

              {/* Phone */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Telefon</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Telefon"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />
              </View>

              {/* Sport */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Idrott</Text>
                <TouchableOpacity
                  style={[styles.editFieldInput, styles.editFieldInputTouchable]}
                  onPress={() => setSportPickerVisible(true)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.editFieldInputText,
                      !editSport && styles.editFieldInputPlaceholder,
                    ]}
                  >
                    {editSport || 'Välj idrott...'}
                  </Text>
                  <Text style={styles.editFieldInputArrow}>{'\u203A'}</Text>
                </TouchableOpacity>
              </View>

              {/* Age */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Ålder</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editAge}
                  onChangeText={setEditAge}
                  placeholder="Ålder"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  editable={!isSaving}
                />
              </View>

              {/* Weight */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Vikt (kg)</Text>
                <TextInput
                  style={styles.editFieldInput}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  placeholder="Vikt i kg"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  editable={!isSaving}
                />
              </View>

              {/* Notes */}
              <View style={styles.editFieldGroup}>
                <Text style={styles.editFieldLabel}>Anteckningar</Text>
                <TextInput
                  style={[styles.editFieldInput, styles.editFieldTextArea]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Anteckningar..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>
            </View>
          ) : (
            <View style={styles.infoFields}>
              {/* Phone */}
              {client.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>{'\u260E'}</Text>
                  <Text style={styles.infoValue}>{client.phone}</Text>
                </View>
              )}

              {/* Notes */}
              {client.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Anteckningar</Text>
                  <Text style={styles.notesText}>{client.notes}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <FilterTabs
          tabs={sectionTabs}
          activeId={activeSection}
          onChange={(id) => setActiveSection(id as ClientDetailSection)}
        />

        {/* ============================================ */}
        {/* Overview Tab                                 */}
        {/* ============================================ */}
        {activeSection === 'overview' && (
          <>
            {/* Quick actions grid */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={handleCreateWorkout} activeOpacity={0.8}>
                <Text style={styles.quickActionIcon}>+</Text>
                <Text style={styles.quickActionLabel}>Skapa pass</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={handleMovementAssessmentPress} activeOpacity={0.8}>
                <Text style={styles.quickActionIcon}>{'📋'}</Text>
                <Text style={styles.quickActionLabel}>Rörelsebedömning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionBtn, styles.quickActionBtnSecondary]} onPress={() => setCopyModalVisible(true)} activeOpacity={0.7}>
                <Text style={styles.quickActionIcon}>{'📋'}</Text>
                <Text style={styles.quickActionLabel}>Kopiera pass</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionBtn, styles.quickActionBtnSecondary]} onPress={handleProgressionPress} activeOpacity={0.7}>
                <Text style={styles.quickActionIcon}>{'📈'}</Text>
                <Text style={styles.quickActionLabel}>Progression</Text>
              </TouchableOpacity>
            </View>

            {/* Latest assessment */}
            {assessments.length > 0 ? (() => {
              const latest = assessments[0];
              const bandLabel = latest.resultat_band ? bandDisplaySv(latest.resultat_band as ScoreBand) : null;
              const dateLabel = latest.assessment_date || latest.created_at.slice(0, 10);
              return (
                <GlassCard padding={16} style={styles.assessmentCard}>
                  <View style={styles.assessmentCardHeader}>
                    <Text style={styles.assessmentCardTitle}>Senaste bedömning</Text>
                    <View style={styles.assessmentCardMeta}>
                      {bandLabel ? (
                        <View style={[styles.bandChip, { backgroundColor: getBandBgColor(latest.resultat_band as ScoreBand) }]}>
                          <Text style={[styles.bandChipText, { color: getBandTextColor(latest.resultat_band as ScoreBand) }]}>
                            {bandLabel}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.assessmentDateText}>{dateLabel}</Text>
                    </View>
                  </View>
                  <ScoreBar label="Hållning" value={latest.resultat_hallning} />
                  <ScoreBar label="Rörlighet" value={latest.resultat_rorlighet} />
                  <ScoreBar label="Kärna" value={latest.resultat_karna} />
                  <ScoreBar label="Stabilitet" value={latest.resultat_stabilitet} />
                  <TouchableOpacity
                    style={styles.assessmentCardAction}
                    onPress={() => handleOpenProgramForAssessment(latest.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.assessmentCardActionText}>Öppna åtgärdsprogram →</Text>
                  </TouchableOpacity>
                </GlassCard>
              );
            })() : null}

            {/* Recent sessions */}
            {recentWorkouts.length > 0 ? (
              <>
                <Text style={styles.overviewSectionTitle}>Senaste pass</Text>
                {recentWorkouts.slice(0, 3).map((w) => {
                  const cfg = getStatusConfig(w.status);
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.sessionRow}
                      onPress={() => handleWorkoutPress(w)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.sessionRowLeft}>
                        <Text style={styles.sessionRowTitle} numberOfLines={1}>{w.title || 'Pass'}</Text>
                        <Text style={styles.sessionRowDate}>{formatDate(w.date)}</Text>
                      </View>
                      <View style={[styles.sessionStatusChip, { borderColor: cfg.color }]}>
                        <Text style={[styles.sessionStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptySessionsCard}>
                <Text style={styles.emptySessionsText}>Inga pass skapade ännu</Text>
              </View>
            )}
          </>
        )}

        {/* ============================================ */}
        {/* Results: assessments & screenings          */}
        {/* ============================================ */}
        {activeSection === 'results' && (
          <>
        <SectionHeader title="Resultat" />

        {resultsLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.sectionLoadingText}>Laddar resultat...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsSubheading}>Rörelsebedömningar</Text>
            {assessments.length === 0 ? (
              <Text style={styles.resultsEmpty}>Inga sparade bedömningar ännu.</Text>
            ) : (
              assessments.slice(0, 5).map((row) => (
                <View key={row.id} style={styles.resultRow}>
                  <TouchableOpacity
                    style={styles.resultRowMain}
                    onPress={() => handleAssessmentPress(row)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.resultRowTitle}>
                      {row.assessment_date || row.created_at.slice(0, 10)}
                    </Text>
                    <Text style={styles.resultRowMeta}>
                      Totalt:{' '}
                      {row.resultat_totalt != null
                        ? Math.round(Number(row.resultat_totalt) * 10) / 10
                        : '—'}
                      {row.resultat_band
                        ? ` · ${bandDisplaySv(row.resultat_band as ScoreBand)}`
                        : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpenProgramForAssessment(row.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.resultRowAction}>Program</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={[styles.resultsSubheading, styles.resultsSubheadingSpaced]}>
              Bild-screening
            </Text>
            {screenings.length === 0 ? (
              <Text style={styles.resultsEmpty}>Inga bild-screeningar ännu.</Text>
            ) : (
              screenings.slice(0, 5).map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={styles.resultRow}
                  onPress={() => handleScreeningPress(row)}
                  activeOpacity={0.75}
                  disabled={!row.video_url}
                >
                  <View style={styles.resultRowMain}>
                    <Text style={styles.resultRowTitle}>
                      {row.analysis_type || row.testomrade || 'Screening'}
                    </Text>
                    <Text style={styles.resultRowMeta}>
                      {row.uploaded_at.slice(0, 10)}
                      {row.queue_status ? ` · ${row.queue_status}` : ''}
                    </Text>
                  </View>
                  {row.video_url ? (
                    <Text style={styles.resultRowAction}>Öppna</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {recentPrograms.length > 0 && (
          <>
            <SectionHeader title="Åtgärdsprogram" />
            <View style={styles.workoutsList}>
              {recentPrograms.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => handleWorkoutPress(workout)}
                  onDelete={() => handleDeleteWorkout(workout)}
                  subtitle={
                    workout.status === 'draft'
                      ? 'Utkast · åtgärdsprogram'
                      : 'Planerat åtgärdsprogram'
                  }
                />
              ))}
            </View>
          </>
        )}
          </>
        )}

        {/* ============================================ */}
        {/* Recent Workouts                              */}
        {/* ============================================ */}
        {activeSection === 'workouts' && (
          <>
        <SectionHeader title="Senaste Pass" />

        {workoutLoading && workouts.length === 0 ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.sectionLoadingText}>Laddar pass...</Text>
          </View>
        ) : recentWorkouts.length === 0 ? (
          <View style={styles.emptyWorkouts}>
            <Text style={styles.emptyWorkoutsIcon}>{'\u{1F3CB}\uFE0F'}</Text>
            <Text style={styles.emptyWorkoutsTitle}>Inga pass ännu</Text>
            <Text style={styles.emptyWorkoutsSubtitle}>
              Skapa ett nytt pass för att komma igång
            </Text>
          </View>
        ) : (
          <View style={styles.workoutsList}>
            {recentWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() => handleWorkoutPress(workout)}
                onDelete={() => handleDeleteWorkout(workout)}
              />
            ))}
          </View>
        )}

        {/* ============================================ */}
        {/* PR List (Placeholder)                        */}
        {/* ============================================ */}
        <SectionHeader title="PR-lista" />
        <View style={styles.prPlaceholder}>
          <Text style={styles.prPlaceholderIcon}>{'\u{1F3C6}'}</Text>
          <Text style={styles.prPlaceholderTitle}>Coming soon</Text>
          <Text style={styles.prPlaceholderSubtitle}>
            Personliga rekord visas här när tillräckligt med data finns
          </Text>
        </View>
          </>
        )}

        {/* ============================================ */}
        {/* Archive / Activate Toggle                    */}
        {/* ============================================ */}
        <TouchableOpacity
          style={[
            styles.archiveButton,
            client.is_active
              ? styles.archiveButtonDanger
              : styles.archiveButtonSuccess,
          ]}
          onPress={handleToggleActive}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.archiveButtonText,
              client.is_active
                ? styles.archiveButtonTextDanger
                : styles.archiveButtonTextSuccess,
            ]}
          >
            {client.is_active
              ? 'Arkivera klient'
              : 'Aktivera klient'}
          </Text>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ---- Copy Workout Modal ---- */}
      <CopyWorkoutModal
        visible={copyModalVisible}
        workouts={workouts}
        onClose={() => setCopyModalVisible(false)}
        onSelect={handleCopyWorkout}
        isLoading={copyWorkoutLoading}
      />

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
                    setEditSport(item);
                    setSportPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
                  {editSport === item && (
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
    ...(Platform.OS === 'web' && { 
      height: '100%', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && { 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch',
      minHeight: 0,
      height: '100%',
    }),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    ...(Platform.OS === 'web' && { 
      minHeight: '100%',
      flexGrow: 1,
    }),
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

  // ---- Client Info Card ----
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLargeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  infoHeaderText: {
    flex: 1,
  },
  clientNameLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeIndicatorOn: {
    backgroundColor: colors.success + '18',
  },
  activeIndicatorOff: {
    backgroundColor: colors.textSecondary + '18',
  },
  activeIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  activeIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ---- Edit Button ----
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    minHeight: 44,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  editSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
    minHeight: 44,
    justifyContent: 'center',
  },
  editSaveDisabled: {
    opacity: 0.5,
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  // ---- Edit Form ----
  editForm: {
    gap: 16,
  },
  editFieldGroup: {
    gap: 6,
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  editFieldInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  editFieldTextArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  // ---- Info Fields (Read Mode) ----
  infoFields: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  notesContainer: {
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  noInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // ---- Section Header ----
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '600',
    color: coachColors.coach,
  },

  // ---- Stats ----
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ---- Action Buttons ----
  actionButtons: {
    marginBottom: 24,
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
    minHeight: 56,
  },
  primaryActionIcon: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.text,
  },
  primaryActionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    minHeight: 56,
  },
  secondaryActionIcon: {
    fontSize: 18,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: coachColors.coach,
    textAlign: 'center',
  },
  tertiaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    minHeight: 52,
  },

  // ---- Workouts List ----
  workoutsList: {
    gap: 10,
    marginBottom: 24,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workoutCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutDate: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  workoutStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  workoutDeleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutDeleteIcon: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '600',
  },
  workoutStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  workoutNotes: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  workoutCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  workoutMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  workoutChevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
  },

  // ---- Empty Workouts ----
  emptyWorkouts: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  emptyWorkoutsIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyWorkoutsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  emptyWorkoutsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ---- Section Loading ----
  sectionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
    marginBottom: 24,
  },
  sectionLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  resultsSubheading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  resultsSubheadingSpaced: {
    marginTop: 20,
  },
  resultsEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRowMain: {
    flex: 1,
    marginRight: 12,
  },
  resultRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resultRowMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  resultRowAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  workoutProgramTag: {
    fontSize: 13,
    color: colors.primaryLight,
    marginBottom: 4,
    fontWeight: '600',
  },

  // ---- PR Placeholder ----
  prPlaceholder: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  prPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  prPlaceholderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  prPlaceholderSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ---- Archive / Activate Button ----
  archiveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 56,
    marginBottom: 8,
  },
  archiveButtonDanger: {
    backgroundColor: colors.danger + '12',
    borderColor: colors.danger + '30',
  },
  archiveButtonSuccess: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '30',
  },
  archiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  archiveButtonTextDanger: {
    color: colors.danger,
  },
  archiveButtonTextSuccess: {
    color: colors.success,
  },

  // ---- Picker Styles ----
  editFieldInputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editFieldInputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  editFieldInputPlaceholder: {
    color: colors.textSecondary,
  },
  editFieldInputArrow: {
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

  // ---- Bottom Spacer ----
  bottomSpacer: {
    height: 48,
  },

  // ---- Copy Workout Modal ----
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
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalEmptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ---- Copy Workout List ----
  copyWorkoutList: {
    padding: 16,
  },
  copyWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  copyWorkoutInfo: {
    flex: 1,
    marginRight: 12,
  },
  copyWorkoutDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  copyWorkoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  copyWorkoutChevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  copyWorkoutSeparator: {
    height: 10,
  },

  // ---- Hero Card ----
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  heroNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  heroName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.fg,
  },
  heroSportChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  heroSportText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: coachColors.coach,
  },
  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  statusPillInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  heroEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  heroEditBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  heroEmail: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 2,
    marginBottom: 4,
  },

  // ---- InfoPill ----
  infoPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  infoPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.mutedHi,
  },

  // ---- ScoreBar ----
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  scoreBarLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.mutedHi,
    width: 80,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  scoreBarValue: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },

  // ---- Assessment Card ----
  assessmentCard: { marginBottom: 16 },
  assessmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  assessmentCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  assessmentCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bandChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bandChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  assessmentDateText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
  },
  assessmentCardAction: {
    marginTop: 10,
  },
  assessmentCardActionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.coach,
  },

  // ---- Sessions list ----
  overviewSectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: coachColors.muted,
    marginTop: 8,
    marginBottom: 10,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  sessionRowLeft: { flex: 1, minWidth: 0, marginRight: 10 },
  sessionRowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.fg,
    marginBottom: 2,
  },
  sessionRowDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
  },
  sessionStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  sessionStatusText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase' as const,
  },
  emptySessionsCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptySessionsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.muted,
  },

  // ---- Quick actions grid ----
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: '45%' as any,
    backgroundColor: coachColors.coach,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  quickActionBtnSecondary: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  quickActionIcon: { fontSize: 18 },
  quickActionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: coachColors.fg,
    textAlign: 'center',
  },
});
