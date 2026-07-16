// ============================================
// PT Workout Tracker - Exercise Library Screen
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useExerciseStore } from '../stores/exerciseStore';
import { useAuthStore } from '../stores/authStore';
import type {
  Exercise,
  ExerciseCategory,
  ExerciseInsert,
  ExerciseTrackingType,
  MuscleGroup,
} from '../types/database';
import type { MainTabParamList } from '../navigation/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import { SlideOver } from '../components/ui/SlideOver';
import { ModalShell } from '../components/ui/ModalShell';
import {
  fetchLibraryExercises,
  filterLibraryExercises,
  LIBRARY_CATEGORIES,
  type LibraryExercise,
} from '../services/exerciseLibrary';
import type { LibraryCategory as LibraryCategoryType } from '../utils/helpers';
import { coachColors, categoryColors, fonts, borderRadius } from '../lib/theme';

// ============================================
// Constants
// ============================================

const CATEGORIES: { key: ExerciseCategory; label: string }[] = [
  { key: 'strength', label: 'Styrka' },
  { key: 'power', label: 'Power' },
  { key: 'conditioning', label: 'Kondition' },
  { key: 'mobility', label: 'Mobilitet' },
  { key: 'injury_prevention', label: 'Skadeprevention' },
];

const MUSCLE_GROUPS: { key: MuscleGroup; label: string }[] = [
  { key: 'chest', label: 'Brost' },
  { key: 'back', label: 'Rygg' },
  { key: 'shoulders', label: 'Axlar' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'legs', label: 'Ben' },
  { key: 'glutes', label: 'Rumpa' },
  { key: 'core', label: 'Core' },
  { key: 'calves', label: 'Vader' },
  { key: 'forearms', label: 'Underarmar' },
  { key: 'full_body', label: 'Helkropp' },
];

// ============================================
// Component
// ============================================

type Props = BottomTabScreenProps<MainTabParamList, 'Exercises'>;

export const ExerciseLibraryScreen: React.FC<Props> = () => {
  // ---- Stores ----
  const {
    fetchExercises,
    addExercise,
    deleteExercise,
    toggleFavorite,
  } = useExerciseStore();
  const { user } = useAuthStore();

  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategoryType | 'alla'>('alla');
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerItem, setDrawerItem] = useState<LibraryExercise | null>(null);

  // ---- Create Modal State ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');
  const [newTrackingType, setNewTrackingType] = useState<ExerciseTrackingType>('weight');
  const [newMuscleGroups, setNewMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items] = await Promise.all([
        fetchLibraryExercises(),
        fetchExercises().catch(() => undefined),
      ]);
      setLibraryExercises(items);
    } catch {
      setLibraryExercises([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchExercises]);

  useEffect(() => {
    loadLibrary().catch(() => {});
  }, [loadLibrary]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadLibrary();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [loadLibrary]);

  const filteredExercises = useMemo(
    () =>
      filterLibraryExercises(libraryExercises, {
        category: selectedCategory,
        search: searchQuery,
      }),
    [libraryExercises, searchQuery, selectedCategory]
  );

  const favoriteExercises = useMemo(
    () => filteredExercises.filter((e) => e.isFavorite),
    [filteredExercises]
  );

  const nonFavoriteExercises = useMemo(
    () => filteredExercises.filter((e) => !e.isFavorite),
    [filteredExercises]
  );

  const handleDeleteExercise = useCallback(
    (exercise: Exercise) => {
      Alert.alert(
        'Radera övning',
        `Är du säker på att du vill radera "${exercise.name}"? Denna åtgärd kan inte ångras.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Radera',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteExercise(exercise.id);
                await loadLibrary();
              } catch {
                Alert.alert('Fel', 'Kunde inte radera övningen. Försök igen.');
              }
            },
          },
        ]
      );
    },
    [deleteExercise, loadLibrary]
  );

  const handleToggleFavorite = useCallback(
    async (item: LibraryExercise) => {
      if (item.source !== 'pt_exercises') return;
      try {
        await toggleFavorite(item.id);
        await loadLibrary();
      } catch {
        Alert.alert('Fel', 'Kunde inte uppdatera favorit.');
      }
    },
    [toggleFavorite, loadLibrary]
  );

  // ---- Toggle muscle group for create modal ----
  const toggleMuscleGroup = useCallback((mg: MuscleGroup) => {
    setNewMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((g) => g !== mg) : [...prev, mg]
    );
  }, []);

  // ---- Reset create modal ----
  const resetCreateModal = useCallback(() => {
    setNewName('');
    setNewCategory('strength');
    setNewTrackingType('weight');
    setNewMuscleGroups([]);
    setNewEquipment('');
    setNewDescription('');
    setIsCreating(false);
  }, []);

  // ---- Create exercise handler ----
  const handleCreateExercise = useCallback(async () => {
    if (!newName.trim()) {
      Alert.alert('Namn kravs', 'Ange ett namn for ovningen.');
      return;
    }

    if (newMuscleGroups.length === 0) {
      Alert.alert('Muskelgrupp kravs', 'Valj minst en muskelgrupp.');
      return;
    }

    if (!user) {
      Alert.alert('Fel', 'Du maste vara inloggad for att skapa ovningar.');
      return;
    }

    setIsCreating(true);
    try {
      const exerciseData: ExerciseInsert = {
        name: newName.trim(),
        category: newCategory,
        tracking_type: newTrackingType,
        muscle_group: newMuscleGroups,
        equipment: newEquipment.trim() || null,
        description: newDescription.trim() || null,
        video_url: null,
        is_favorite: false,
        created_by_pt_id: user.id,
      };

      await addExercise(exerciseData);
      setShowCreateModal(false);
      resetCreateModal();
      await loadLibrary();
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte skapa ovningen. Forsok igen.');
    } finally {
      setIsCreating(false);
    }
  }, [
    newName,
    newCategory,
    newTrackingType,
    newMuscleGroups,
    newEquipment,
    newDescription,
    user,
    addExercise,
    resetCreateModal,
    loadLibrary,
  ]);

  const categoryTabs = useMemo(
    () =>
      LIBRARY_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        count: cat.id === 'alla' ? libraryExercises.length : undefined,
      })),
    [libraryExercises.length]
  );

  const renderExerciseRow = useCallback(
    (item: LibraryExercise, selected?: boolean) => (
      <TouchableOpacity
        key={`${item.source}:${item.id}`}
        style={[styles.exRow, selected && styles.exRowSelected]}
        onPress={() => setDrawerItem(item)}
        activeOpacity={0.75}
      >
        <View style={styles.exIcon}>
          <Text style={styles.exIconText}>
            {item.source === 'exercise_bank' ? '🔄' : item.category === 'kondition' ? '🏃' : '🏋️'}
          </Text>
        </View>
        <View style={styles.exBody}>
          <Text style={styles.exName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.exTags}>
            {item.muscleLabel ? (
              <Text style={[styles.exTag, styles.exTagMuscle]}>{item.muscleLabel}</Text>
            ) : null}
            {item.energyLabel ? (
              <Text style={[styles.exTag, styles.exTagType]}>{item.energyLabel}</Text>
            ) : null}
            {item.trackingLabel ? (
              <Text style={styles.exTag}>{item.trackingLabel}</Text>
            ) : null}
          </View>
        </View>
        {item.source === 'pt_exercises' ? (
          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            hitSlop={8}
            style={styles.favBtn}
          >
            <Text style={styles.favIcon}>{item.isFavorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.exChevron}>›</Text>
      </TouchableOpacity>
    ),
    [handleToggleFavorite]
  );

  // ---- List header (favorites + section header) ----
  const renderListHeader = useCallback(() => {
    return (
      <View>
        {/* Favorites section */}
        {favoriteExercises.length > 0 && (
          <View style={styles.favoritesSection}>
            <TouchableOpacity
              style={styles.favoritesSectionHeader}
              onPress={() => setFavoritesCollapsed((prev) => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.favoritesSectionTitleRow}>
                <Text style={styles.favoritesStarIcon}>{'\u2605'}</Text>
                <Text style={styles.favoritesSectionTitle}>
                  Favoriter ({favoriteExercises.length})
                </Text>
              </View>
              <Text style={styles.collapseIcon}>
                {favoritesCollapsed ? '\u25B6' : '\u25BC'}
              </Text>
            </TouchableOpacity>

            {!favoritesCollapsed &&
              favoriteExercises.map((exercise) =>
                renderExerciseRow(
                  exercise,
                  drawerItem?.id === exercise.id && drawerItem?.source === exercise.source
                )
              )}
          </View>
        )}

        {/* Non-favorites section header */}
        {nonFavoriteExercises.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              Alla ovningar ({nonFavoriteExercises.length})
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    favoriteExercises,
    nonFavoriteExercises.length,
    favoritesCollapsed,
    renderExerciseRow,
    drawerItem?.id,
    drawerItem?.source,
  ]);

  const renderEmpty = useCallback(() => {
    if (isLoading && libraryExercises.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={coachColors.coach} size="large" />
          <Text style={styles.emptySubtitle}>Laddar övningar...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{'\uD83D\uDCDA'}</Text>
        <Text style={styles.emptyTitle}>Inga övningar</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery || selectedCategory !== 'alla'
            ? 'Inga övningar matchar din sökning.'
            : 'Inga övningar i databasen.'}
        </Text>
      </View>
    );
  }, [isLoading, libraryExercises.length, searchQuery, selectedCategory]);

  const drawerPtExercise =
    drawerItem?.source === 'pt_exercises' ? (drawerItem.raw as Exercise | undefined) : undefined;

  // ============================================
  // Render
  // ============================================

  return (
    <ScreenContainer
      title="Övningsbibliotek"
      search={
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Sök övning…"
        />
      }
      scroll={false}
      headerRight={
        <Button
          label="Ny övning"
          variant="primary"
          size="sm"
          onPress={() => setShowCreateModal(true)}
        />
      }
    >
      <View style={styles.libraryShell}>
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {categoryTabs.map((tab) => {
              const active = tab.id === selectedCategory;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setSelectedCategory(tab.id as LibraryCategoryType | 'alla')}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {tab.label}
                    {tab.count !== undefined ? ` ${tab.count}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          style={styles.exerciseList}
          data={nonFavoriteExercises}
          renderItem={({ item }) =>
            renderExerciseRow(
              item,
              drawerItem?.id === item.id && drawerItem?.source === item.source
            )
          }
          keyExtractor={(item) => `${item.source}:${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={coachColors.coach}
              colors={[coachColors.coach]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      <SlideOver
        visible={!!drawerItem}
        title={drawerItem?.name ?? 'Övning'}
        onClose={() => setDrawerItem(null)}
        footer={
          drawerPtExercise ? (
            <Button
              label="Radera övning"
              variant="secondary"
              onPress={() => {
                const ex = drawerPtExercise;
                setDrawerItem(null);
                if (ex) handleDeleteExercise(ex);
              }}
            />
          ) : undefined
        }
      >
        {drawerItem ? (
          <>
            {drawerItem.videoUrl ? (
              <View style={styles.drawerVideo}>
                <Text style={styles.drawerVideoIcon}>▶</Text>
                <Text style={styles.drawerVideoText}>Visa instruktionsvideo</Text>
              </View>
            ) : null}
            {drawerItem.isMine ? (
              <>
                <Text style={styles.drawerSectionLabel}>Källa</Text>
                <Text style={styles.drawerDesc}>Min övning</Text>
              </>
            ) : null}
            <Text style={styles.drawerSectionLabel}>Beskrivning</Text>
            <Text style={styles.drawerDesc}>
              {drawerItem.description ?? 'Ingen beskrivning tillgänglig.'}
            </Text>
            <Text style={styles.drawerSectionLabel}>Muskelgrupper / taggar</Text>
            <View style={styles.drawerTags}>
              {(drawerItem.tags.length > 0
                ? drawerItem.tags
                : drawerItem.muscleLabel
                  ? [drawerItem.muscleLabel]
                  : []
              ).map((tag) => (
                <Text key={tag} style={[styles.exTag, styles.exTagMuscle]}>
                  {tag}
                </Text>
              ))}
            </View>
            {drawerItem.area ? (
              <>
                <Text style={styles.drawerSectionLabel}>Område</Text>
                <Text style={styles.drawerDesc}>{drawerItem.area}</Text>
              </>
            ) : null}
            {drawerPtExercise?.equipment ? (
              <>
                <Text style={styles.drawerSectionLabel}>Utrustning</Text>
                <Text style={styles.drawerDesc}>{drawerPtExercise.equipment}</Text>
              </>
            ) : null}
          </>
        ) : null}
      </SlideOver>

      {/* ============================================ */}
      {/* Create Exercise Modal */}
      {/* ============================================ */}
      <ModalShell
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateModal();
        }}
        title="Ny övning"
        scrollable
        footer={
          <>
            <Button
              label={isCreating ? 'Sparar…' : 'Spara övning'}
              variant="primary"
              onPress={handleCreateExercise}
              disabled={isCreating}
              loading={isCreating}
            />
            <Button
              label="Avbryt"
              variant="secondary"
              onPress={() => {
                setShowCreateModal(false);
                resetCreateModal();
              }}
              disabled={isCreating}
            />
          </>
        }
      >
        {/* Name Input */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Namn *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="T.ex. Bänkpress"
            placeholderTextColor={coachColors.muted}
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="sentences"
          />
        </View>

        {/* Category Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Kategori *</Text>
          <View style={styles.categoryButtonRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = newCategory === cat.key;
              const catColor = categoryColors[cat.key];
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryButton,
                    isSelected && {
                      backgroundColor: catColor + '25',
                      borderColor: catColor,
                    },
                  ]}
                  onPress={() => setNewCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      isSelected && { color: catColor },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tracking Type Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Spårningstyp *</Text>
          <View style={styles.trackingTypeRow}>
            <TouchableOpacity
              style={[
                styles.trackingTypeButton,
                newTrackingType === 'weight' && styles.trackingTypeButtonSelected,
              ]}
              onPress={() => setNewTrackingType('weight')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.trackingTypeButtonText,
                  newTrackingType === 'weight' && styles.trackingTypeButtonTextSelected,
                ]}
              >
                Vikt (kg)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.trackingTypeButton,
                newTrackingType === 'time' && styles.trackingTypeButtonSelected,
              ]}
              onPress={() => setNewTrackingType('time')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.trackingTypeButtonText,
                  newTrackingType === 'time' && styles.trackingTypeButtonTextSelected,
                ]}
              >
                Tid (sek)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.trackingTypeButton,
                newTrackingType === 'other' && styles.trackingTypeButtonSelected,
              ]}
              onPress={() => setNewTrackingType('other')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.trackingTypeButtonText,
                  newTrackingType === 'other' && styles.trackingTypeButtonTextSelected,
                ]}
              >
                Annat
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Muscle Groups Multi-Select */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            Muskelgrupper *{' '}
            <Text style={styles.formHint}>
              ({newMuscleGroups.length} valda)
            </Text>
          </Text>
          <View style={styles.muscleGroupGrid}>
            {MUSCLE_GROUPS.map((mg) => {
              const isSelected = newMuscleGroups.includes(mg.key);
              return (
                <TouchableOpacity
                  key={mg.key}
                  style={[
                    styles.muscleGroupChip,
                    isSelected && styles.muscleGroupChipSelected,
                  ]}
                  onPress={() => toggleMuscleGroup(mg.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.muscleGroupChipText,
                      isSelected && styles.muscleGroupChipTextSelected,
                    ]}
                  >
                    {mg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Equipment Input */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Utrustning</Text>
          <TextInput
            style={styles.formInput}
            placeholder="T.ex. Skivstång, Hantlar"
            placeholderTextColor={coachColors.muted}
            value={newEquipment}
            onChangeText={setNewEquipment}
            autoCapitalize="sentences"
          />
        </View>

        {/* Description Input */}
        <View style={[styles.formGroup, styles.formGroupLast]}>
          <Text style={styles.formLabel}>Beskrivning</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="Beskriv övningen..."
            placeholderTextColor={coachColors.muted}
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ModalShell>
    </ScreenContainer>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  libraryShell: {
    flex: 1,
    minHeight: 0,
  },
  chipsWrap: {
    flexShrink: 0,
    zIndex: 2,
  },
  exerciseList: {
    flex: 1,
    minHeight: 0,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 16,
    paddingRight: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  chipTextActive: {
    color: coachColors.coach,
  },

  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginBottom: 2,
  },
  exRowSelected: {
    backgroundColor: coachColors.glassBgHi,
    borderColor: 'rgba(0,212,170,0.28)',
  },
  exIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBgHi,
    borderWidth: 1,
    borderColor: coachColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIconText: { fontSize: 18 },
  exBody: { flex: 1, minWidth: 0 },
  exName: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  exTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  exTag: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.border,
    color: coachColors.muted,
  },
  exTagMuscle: {
    backgroundColor: coachColors.coachDim,
    color: coachColors.coach,
    borderColor: 'rgba(0,212,170,0.20)',
  },
  exTagType: {
    backgroundColor: coachColors.accentDim,
    color: coachColors.accent,
    borderColor: 'rgba(247,233,40,0.18)',
  },
  exChevron: { fontSize: 16, color: coachColors.muted },
  favBtn: { padding: 4 },
  favIcon: { fontSize: 16, color: coachColors.accent },
  drawerSectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  drawerDesc: {
    fontSize: 13,
    color: coachColors.mutedHi,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  drawerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  drawerVideo: {
    height: 140,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  drawerVideoIcon: { fontSize: 32, color: coachColors.muted, opacity: 0.5 },
  drawerVideoText: { fontSize: 12, color: coachColors.muted, fontFamily: fonts.body },
  cueItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  cueNum: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: coachColors.coach,
    width: 18,
    marginTop: 1,
  },
  cueTxt: {
    flex: 1,
    fontSize: 12,
    color: coachColors.mutedHi,
    lineHeight: 17,
    fontFamily: fonts.body,
  },
  addToProgramBtn: {
    width: '100%',
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.coach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToProgramBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    fontFamily: fonts.bodyBold,
  },

  // ---- List ----
  listContent: {
    paddingBottom: 100,
  },
  platformCard: {
    marginBottom: 10,
  },
  platformName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: coachColors.fg,
    marginBottom: 4,
  },
  platformMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  platformDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.mutedHi,
    lineHeight: 18,
  },

  // ---- Favorites Section ----
  favoritesSection: {
    marginBottom: 16,
  },
  favoritesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  favoritesSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoritesStarIcon: {
    fontSize: 18,
    color: coachColors.accent,
  },
  favoritesSectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: coachColors.fg,
  },
  collapseIcon: {
    fontSize: 12,
    color: coachColors.muted,
  },
  favoriteCardWrapper: {
    marginBottom: 0,
  },

  // ---- Section Header ----
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionHeaderText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },

  // ---- Empty State ----
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: coachColors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ============================================
  // Create Modal
  // ============================================

  // ---- Form ----
  formGroup: {
    marginBottom: 20,
  },
  formGroupLast: {
    marginBottom: 4,
  },
  formLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginBottom: 8,
  },
  formHint: {
    fontFamily: fonts.mono,
    fontWeight: '400',
    color: coachColors.coach,
    textTransform: 'none',
  },
  formInput: {
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 14,
    fontFamily: fonts.body,
    color: coachColors.fg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  // ---- Category Buttons (modal) ----
  categoryButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  categoryButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
  },

  // ---- Muscle Group Chips (modal) ----
  muscleGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  muscleGroupChipSelected: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  muscleGroupChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  muscleGroupChipTextSelected: {
    color: coachColors.coach,
  },

  // ---- Tracking Type Buttons ----
  trackingTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
  },
  trackingTypeButtonSelected: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  trackingTypeButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  trackingTypeButtonTextSelected: {
    color: coachColors.coach,
    fontFamily: fonts.bodySemiBold,
  },
});
