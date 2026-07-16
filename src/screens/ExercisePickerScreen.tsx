import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { categoryColors, coachColors, fonts, borderRadius } from '../lib/theme';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SearchBar } from '../components/ui/SearchBar';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Button } from '../components/ui/Button';
import { useExerciseStore } from '../stores/exerciseStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { usePlatformStore } from '../stores/platformStore';
import { CoverageBanner } from '../components/coach/CoverageBanner';
import { Exercise, ExerciseCategory, ExerciseInsert, ExerciseTrackingType, MuscleGroup } from '../types/database';
import { getLibraryCategoryLabel } from '../utils/helpers';
import {
  fetchLibraryExercises,
  filterLibraryExercises,
  importLibraryExerciseToPt,
  LIBRARY_CATEGORIES,
  type LibraryExercise,
} from '../services/exerciseLibrary';
import type { LibraryCategory } from '../utils/helpers';

type Props = StackScreenProps<RootStackParamList, 'ExercisePicker'>;

const categories: ExerciseCategory[] = [
  'strength',
  'power',
  'conditioning',
  'mobility',
  'injury_prevention',
];

const categoryLabels: Record<ExerciseCategory, string> = {
  strength: 'Styrka',
  power: 'Power',
  conditioning: 'Kondition',
  mobility: 'Mobilitet',
  injury_prevention: 'Skadeprevention',
};

const MUSCLE_GROUPS: { key: MuscleGroup; label: string }[] = [
  { key: 'chest', label: 'Bröst' },
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

export function ExercisePickerScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const { addExercise } = useExerciseStore();
  const { addExerciseToWorkout, activeWorkout } = useWorkoutStore();
  const { user } = useAuthStore();
  const { clients } = useClientStore();
  const { getAggregate } = usePlatformStore();
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory | 'alla'>('alla');
  
  // Create exercise modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');
  const [newTrackingType, setNewTrackingType] = useState<ExerciseTrackingType>('weight');
  const [newMuscleGroups, setNewMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchLibraryExercises()
      .then(setLibraryExercises)
      .catch(() => setLibraryExercises([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredExercises = useMemo(
    () =>
      filterLibraryExercises(libraryExercises, {
        category: selectedCategory,
        search: searchQuery,
      }),
    [libraryExercises, searchQuery, selectedCategory]
  );

  const sortedExercises = useMemo(
    () =>
      [...filteredExercises].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name, 'sv');
      }),
    [filteredExercises]
  );

  const screeningContext = useMemo(() => {
    const clientId = activeWorkout?.client_id;
    if (!clientId) return null;
    const aggregate = getAggregate(clientId);
    const latest = aggregate?.perform?.screeningSessions?.[0];
    if (!latest?.areas?.length) return null;
    const weakest = [...latest.areas]
      .filter((a) => a.score != null)
      .sort((a, b) => Number(a.score) - Number(b.score))[0];
    if (!weakest?.testområde) return null;
    return {
      area: weakest.testområde,
      score: Math.round(Number(weakest.score)),
      clientName: clients.find((c) => c.id === clientId)?.name?.split(' ')[0] ?? 'Atleten',
    };
  }, [activeWorkout?.client_id, getAggregate, clients]);

  const screeningSuggestions = useMemo(() => {
    if (!screeningContext) return [];
    const area = screeningContext.area.toLowerCase();
    return sortedExercises
      .filter((ex) => {
        const cat = ex.category ?? '';
        const name = ex.name.toLowerCase();
        const muscles = (ex.muscleLabel ?? '').toLowerCase();
        return (
          cat === 'rorlighet' ||
          cat === 'koordination' ||
          name.includes(area.split(' ')[0]) ||
          muscles.includes(area.split(' ')[0])
        );
      })
      .slice(0, 5);
  }, [screeningContext, sortedExercises]);

  // Check if we have a search query with no results
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasNoResults = sortedExercises.length === 0;
  const showCreateButton = hasSearchQuery && hasNoResults;

  const handleSelectExercise = async (item: LibraryExercise) => {
    if (!user) return;
    const currentCount = activeWorkout?.workout_exercises.length || 0;
    try {
      const exercise =
        item.source === 'pt_exercises' && item.raw
          ? (item.raw as Exercise)
          : await importLibraryExerciseToPt(item, user.id);
      await addExerciseToWorkout(workoutId, exercise.id, currentCount, 3, '10');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to add exercise:', error);
      Alert.alert('Fel', 'Kunde inte lägga till övningen.');
    }
  };

  const toggleMuscleGroup = (mg: MuscleGroup) => {
    setNewMuscleGroups((prev) =>
      prev.includes(mg) ? prev.filter((g) => g !== mg) : [...prev, mg]
    );
  };

  const resetCreateModal = () => {
    setNewName('');
    setNewCategory('strength');
    setNewTrackingType('weight');
    setNewMuscleGroups([]);
    setNewEquipment('');
    setNewDescription('');
    setIsCreating(false);
  };

  const handleOpenCreateModal = () => {
    setNewName(searchQuery.trim());
    setShowCreateModal(true);
  };

  const handleCreateAndAddExercise = async () => {
    if (!newName.trim()) {
      Alert.alert('Namn krävs', 'Ange ett namn för övningen.');
      return;
    }

    if (newMuscleGroups.length === 0) {
      Alert.alert('Muskelgrupp krävs', 'Välj minst en muskelgrupp.');
      return;
    }

    if (!user) {
      Alert.alert('Fel', 'Du måste vara inloggad för att skapa övningar.');
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

      const newExercise = await addExercise(exerciseData);
      
      // Automatically add the new exercise to the workout
      const currentCount = activeWorkout?.workout_exercises.length || 0;
      await addExerciseToWorkout(workoutId, newExercise.id, currentCount, 3, '10');
      
      setShowCreateModal(false);
      resetCreateModal();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte skapa övningen. Försök igen.');
    } finally {
      setIsCreating(false);
    }
  };

  const filterTabs = LIBRARY_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
  }));

  return (
    <ScreenContainer
      title="Välj övning"
      scroll={false}
      headerLeft={
        <Text style={styles.back} onPress={() => navigation.goBack()}>
          ← Tillbaka
        </Text>
      }
    >
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Sök övning..."
      />

      {screeningContext ? (
        <>
          <CoverageBanner
            tone="unmatched"
            message={`**${screeningContext.clientName}** behöver täckning för **${screeningContext.area}** (${screeningContext.score}/100) enligt senaste screening.`}
          />
          {screeningSuggestions.length > 0 ? (
            <View style={styles.screeningSection}>
              <SectionLabel>Screening-förslag</SectionLabel>
              {screeningSuggestions.map((item) => (
                <TouchableOpacity key={`screen-${item.source}:${item.id}`} onPress={() => handleSelectExercise(item)}>
                  <GlassCard style={styles.exerciseItem}>
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{item.name}</Text>
                        <Text style={styles.screeningMatchTag}>Screening-prioriterad</Text>
                      </View>
                      <Text style={styles.addIcon}>+</Text>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryChips}
      >
        {filterTabs.map((tab) => {
          const active = tab.id === selectedCategory;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setSelectedCategory(tab.id as LibraryCategory | 'alla')}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={sortedExercises}
        keyExtractor={(item) => `${item.source}:${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectExercise(item)}>
            <GlassCard style={styles.exerciseItem}>
              <View style={styles.exerciseRow}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.exerciseThumb} />
                ) : null}
                {item.isFavorite ? <Text style={styles.favoriteIcon}>★</Text> : null}
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View style={[styles.catBadge, { backgroundColor: coachColors.coachDim }]}>
                      <Text style={[styles.catBadgeText, { color: coachColors.coach }]}>
                        {getLibraryCategoryLabel(item.category)}
                      </Text>
                    </View>
                    {item.muscleLabel ? (
                      <Text style={styles.muscleText}>{item.muscleLabel}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.addIcon}>+</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
        contentContainerStyle={[styles.list, hasNoResults && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <SectionLabel>Inga övningar</SectionLabel>
            <Text style={styles.emptyMessage}>
              {isLoading
                ? 'Laddar övningsbibliotek...'
                : showCreateButton
                  ? `Skapa övningen "${searchQuery}" direkt här`
                  : libraryExercises.length === 0
                    ? 'Inga övningar i databasen'
                    : 'Inga övningar matchar din sökning'}
            </Text>
            {showCreateButton ? (
              <Button
                label={`Skapa "${searchQuery}"`}
                variant="primary"
                onPress={handleOpenCreateModal}
              />
            ) : null}
          </View>
        }
      />

      {/* Create Exercise Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetCreateModal();
        }}
      >
        <View style={styles.modalContainer}>
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
              <Text style={styles.modalTitle}>Ny övning</Text>
              <TouchableOpacity
                onPress={handleCreateAndAddExercise}
                disabled={isCreating}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={coachColors.coach} />
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
                  placeholder="T.ex. Benpress"
                  placeholderTextColor={coachColors.muted}
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
                  {categories.map((cat) => {
                    const isSelected = newCategory === cat;
                    const catColor = categoryColors[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          isSelected && {
                            backgroundColor: catColor + '25',
                            borderColor: catColor,
                          },
                        ]}
                        onPress={() => setNewCategory(cat as ExerciseCategory)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            isSelected && { color: catColor },
                          ]}
                        >
                          {categoryLabels[cat]}
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
              <View style={styles.formGroup}>
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

              {/* Spacer for keyboard */}
              <View style={styles.modalSpacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  list: { gap: 8, paddingBottom: 24, marginTop: 12 },
  screeningSection: { gap: 8, marginTop: 8, marginBottom: 4 },
  screeningMatchTag: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.accent,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  categoryChips: { flexDirection: 'row', gap: 7, marginTop: 12, marginBottom: 4, paddingRight: 8 },
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
  chipActive: { backgroundColor: coachColors.coachDim, borderColor: coachColors.coachHi },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  chipTextActive: { color: coachColors.coach },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  exerciseItem: { padding: 14 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: coachColors.surfaceSolid,
  },
  favoriteIcon: { color: coachColors.accent, fontSize: 16, marginRight: 8 },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 10, fontWeight: '600', fontFamily: fonts.mono },
  muscleText: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.mono },
  addIcon: { fontSize: 22, color: coachColors.coach, fontWeight: '500' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    gap: 12,
  },
  emptyMessage: {
    fontSize: 13,
    color: coachColors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
    fontFamily: fonts.body,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: coachColors.screenBg,
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
    borderBottomColor: coachColors.border,
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
  modalSaveText: {
    fontSize: 15,
    color: coachColors.coach,
    fontFamily: fonts.bodySemiBold,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: fonts.mono,
    textTransform: 'uppercase',
    color: coachColors.muted,
    marginBottom: 8,
  },
  formHint: {
    color: coachColors.coach,
  },
  formInput: {
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    padding: 14,
    fontSize: 15,
    color: coachColors.fg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    fontFamily: fonts.body,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  categoryButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: coachColors.mutedHi,
  },
  muscleGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  muscleGroupChipSelected: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coach,
  },
  muscleGroupChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: coachColors.mutedHi,
  },
  muscleGroupChipTextSelected: {
    color: coachColors.coach,
  },
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
    borderColor: coachColors.coach,
  },
  trackingTypeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: coachColors.mutedHi,
  },
  trackingTypeButtonTextSelected: {
    color: coachColors.coach,
    fontWeight: '600',
  },
  modalSpacer: {
    height: 40,
  },
});
