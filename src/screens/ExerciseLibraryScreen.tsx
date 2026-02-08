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
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useExerciseStore } from '../stores/exerciseStore';
import { useAuthStore } from '../stores/authStore';
import ExerciseCard from '../components/ExerciseCard';
import type {
  Exercise,
  ExerciseCategory,
  ExerciseInsert,
  ExerciseTrackingType,
  MuscleGroup,
} from '../types/database';
import type { MainTabParamList } from '../navigation/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

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

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#F7E928',
};

// ============================================
// Component
// ============================================

type Props = BottomTabScreenProps<MainTabParamList, 'Exercises'>;

export const ExerciseLibraryScreen: React.FC<Props> = () => {
  // ---- Stores ----
  const {
    exercises,
    isLoading,
    fetchExercises,
    addExercise,
    deleteExercise,
    toggleFavorite,
  } = useExerciseStore();
  const { user } = useAuthStore();

  // ---- State ----
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ---- Create Modal State ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');
  const [newTrackingType, setNewTrackingType] = useState<ExerciseTrackingType>('weight');
  const [newMuscleGroups, setNewMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ---- Fetch on mount ----
  useEffect(() => {
    fetchExercises().catch(() => {});
  }, [fetchExercises]);

  // ---- Pull to refresh ----
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchExercises();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [fetchExercises]);

  // ---- Filtered exercises ----
  const filteredExercises = useMemo(() => {
    let result = exercises;

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.muscle_group.some((mg) => mg.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }

    return result;
  }, [exercises, searchQuery, selectedCategory]);

  // ---- Favorites ----
  const favoriteExercises = useMemo(
    () => filteredExercises.filter((e) => e.is_favorite),
    [filteredExercises]
  );

  const nonFavoriteExercises = useMemo(
    () => filteredExercises.filter((e) => !e.is_favorite),
    [filteredExercises]
  );

  // ---- Delete handler ----
  const handleDeleteExercise = useCallback(
    (exercise: Exercise) => {
      Alert.alert(
        'Radera ovning',
        `Ar du saker pa att du vill radera "${exercise.name}"? Denna atgard kan inte angras.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Radera',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteExercise(exercise.id);
              } catch (error) {
                Alert.alert('Fel', 'Kunde inte radera ovningen. Forsok igen.');
              }
            },
          },
        ]
      );
    },
    [deleteExercise]
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
  ]);

  // ---- Render exercise item ----
  const renderExerciseItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseCard
        exercise={item}
        onPress={() =>
          handleDeleteExercise(item)
        }
        onToggleFavorite={() => toggleFavorite(item.id)}
        showFavorite
      />
    ),
    [handleDeleteExercise, toggleFavorite]
  );

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

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
              favoriteExercises.map((exercise) => (
                <View key={exercise.id} style={styles.favoriteCardWrapper}>
                  <ExerciseCard
                    exercise={exercise}
                    onPress={() => handleDeleteExercise(exercise)}
                    onToggleFavorite={() => toggleFavorite(exercise.id)}
                    showFavorite
                  />
                </View>
              ))}
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
    handleDeleteExercise,
    toggleFavorite,
  ]);

  // ---- Empty component ----
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{'\uD83D\uDCDA'}</Text>
        <Text style={styles.emptyTitle}>Inga ovningar</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery || selectedCategory
            ? 'Inga ovningar matchar din sokning.'
            : 'Tryck pa "+" for att lagga till din forsta ovning.'}
        </Text>
      </View>
    );
  }, [isLoading, searchQuery, selectedCategory]);

  // ============================================
  // Render
  // ============================================

  return (
    <SafeAreaView style={styles.container}>
      {/* ---- Header ---- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ovningsbibliotek</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
          accessibilityLabel="Lagg till ovning"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ---- Search Bar ---- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Sok ovningar..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ---- Category Chips ---- */}
      <View style={styles.chipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              !selectedCategory && styles.chipSelected,
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                !selectedCategory && styles.chipTextSelected,
              ]}
            >
              Alla
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const catColor = CATEGORY_COLORS[cat.key];
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: catColor + '30', borderColor: catColor },
                ]}
                onPress={() =>
                  setSelectedCategory(isSelected ? null : cat.key)
                }
                activeOpacity={0.7}
              >
                <View
                  style={[styles.chipDot, { backgroundColor: catColor }]}
                />
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: catColor },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ---- Exercise List ---- */}
      <FlatList
        data={nonFavoriteExercises}
        renderItem={renderExerciseItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#F7E928"
            colors={['#F7E928']}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ============================================ */}
      {/* Create Exercise Modal */}
      {/* ============================================ */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetCreateModal();
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateModal();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Ny ovning</Text>
              <TouchableOpacity
                onPress={handleCreateExercise}
                disabled={isCreating}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#F7E928" />
                ) : (
                  <Text style={styles.modalSaveText}>Spara</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Namn *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="T.ex. Bankpress"
                  placeholderTextColor="#8E8E93"
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="sentences"
                  autoFocus
                />
              </View>

              {/* Category Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Kategori *</Text>
                <View style={styles.categoryButtonRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = newCategory === cat.key;
                    const catColor = CATEGORY_COLORS[cat.key];
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
                  placeholder="T.ex. Skivstang, Hantlar"
                  placeholderTextColor="#8E8E93"
                  value={newEquipment}
                  onChangeText={setNewEquipment}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Beskrivning</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Beskriv ovningen..."
                  placeholderTextColor="#8E8E93"
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Spacer for keyboard */}
              <View style={styles.modalSpacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7E928',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: -1,
  },

  // ---- Search ----
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearIcon: {
    fontSize: 14,
    color: '#8E8E93',
    padding: 4,
  },

  // ---- Category Chips ----
  chipContainer: {
    paddingBottom: 8,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  chipSelected: {
    backgroundColor: '#F7E928' + '25',
    borderColor: '#F7E928',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  chipTextSelected: {
    color: '#FBF47A',
  },

  // ---- List ----
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    color: '#FF9500',
  },
  favoritesSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  collapseIcon: {
    fontSize: 12,
    color: '#8E8E93',
  },
  favoriteCardWrapper: {
    marginBottom: 0,
  },

  // ---- Section Header ----
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ============================================
  // Create Modal
  // ============================================

  modalContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#F7E928',
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },

  // ---- Form ----
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 4,
  },
  formHint: {
    fontWeight: '400',
    color: '#FBF47A',
  },
  formInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
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
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
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
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  muscleGroupChipSelected: {
    backgroundColor: '#F7E928' + '20',
    borderColor: '#F7E928',
  },
  muscleGroupChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  muscleGroupChipTextSelected: {
    color: '#FBF47A',
  },

  // ---- Tracking Type Buttons ----
  trackingTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trackingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    alignItems: 'center',
  },
  trackingTypeButtonSelected: {
    backgroundColor: '#F7E928' + '25',
    borderColor: '#F7E928',
  },
  trackingTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  trackingTypeButtonTextSelected: {
    color: '#FBF47A',
    fontWeight: '600',
  },

  // ---- Modal Spacer ----
  modalSpacer: {
    height: 40,
  },
});
