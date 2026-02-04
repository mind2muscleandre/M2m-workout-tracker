import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useExerciseStore } from '../stores/exerciseStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useAuthStore } from '../stores/authStore';
import { Exercise, ExerciseCategory, ExerciseInsert, MuscleGroup } from '../types/database';
import { getCategoryLabel } from '../utils/helpers';

type Props = StackScreenProps<RootStackParamList, 'ExercisePicker'>;

const categories: (ExerciseCategory | 'all')[] = [
  'all',
  'strength',
  'power',
  'conditioning',
  'mobility',
  'injury_prevention',
];

const categoryLabels: Record<string, string> = {
  all: 'Alla',
  strength: 'Styrka',
  power: 'Power',
  conditioning: 'Kondition',
  mobility: 'Mobilitet',
  injury_prevention: 'Skadeprevention',
};

const categoryColors: Record<string, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#F7E928',
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
  const { exercises, fetchExercises, addExercise } = useExerciseStore();
  const { addExerciseToWorkout, activeWorkout } = useWorkoutStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  
  // Create exercise modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');
  const [newMuscleGroups, setNewMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises = exercises.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort: favorites first, then alphabetical
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    return a.name.localeCompare(b.name);
  });

  // Check if we have a search query with no results
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasNoResults = sortedExercises.length === 0;
  const showCreateButton = hasSearchQuery && hasNoResults;

  // #region agent log - Debug button visibility
  React.useEffect(() => {
    const logData = {
      location: 'ExercisePickerScreen.tsx:105',
      message: 'Button visibility calculation',
      data: {
        searchQuery,
        searchQueryTrimmed: searchQuery.trim(),
        searchQueryLength: searchQuery.trim().length,
        hasSearchQuery,
        exercisesLength: exercises.length,
        filteredExercisesLength: filteredExercises.length,
        sortedExercisesLength: sortedExercises.length,
        hasNoResults,
        showCreateButton,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    };
    console.log('[DEBUG] Button visibility:', logData);
    fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    }).catch((err) => console.error('[DEBUG] Fetch failed:', err));
  }, [searchQuery, hasSearchQuery, hasNoResults, showCreateButton, exercises.length, filteredExercises.length, sortedExercises.length]);
  // #endregion

  const handleSelectExercise = async (exercise: Exercise) => {
    const currentCount = activeWorkout?.workout_exercises.length || 0;
    try {
      await addExerciseToWorkout(workoutId, exercise.id, currentCount, 3, '10');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to add exercise:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Sök övning..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={(text) => {
            // #region agent log - Debug search query update
            fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'ExercisePickerScreen.tsx:186',
                message: 'Search query onChangeText',
                data: {
                  newText: text,
                  newTextLength: text.length,
                  newTextTrimmed: text.trim(),
                  newTextTrimmedLength: text.trim().length,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'D',
              }),
            }).catch(() => {});
            // #endregion
            setSearchQuery(text);
          }}
          autoFocus
        />
      </View>

      {/* Category filters */}
      <View style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipActive,
              selectedCategory === cat && cat !== 'all' && { borderColor: categoryColors[cat] },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
                selectedCategory === cat && cat !== 'all' && { color: categoryColors[cat] },
              ]}
            >
              {categoryLabels[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exercise list */}
      <FlatList
        data={sortedExercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.exerciseItem}
            onPress={() => handleSelectExercise(item)}
          >
            <View style={styles.exerciseRow}>
              {item.is_favorite && <Text style={styles.favoriteIcon}>*</Text>}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <View style={styles.exerciseMeta}>
                  <View style={[styles.catBadge, { backgroundColor: (categoryColors[item.category] || colors.primary) + '20' }]}>
                    <Text style={[styles.catBadgeText, { color: categoryColors[item.category] || colors.primary }]}>
                      {getCategoryLabel(item.category)}
                    </Text>
                  </View>
                  {item.muscle_group.length > 0 && (
                    <Text style={styles.muscleText}>
                      {item.muscle_group.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.addIcon}>+</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={[
          styles.list,
          hasNoResults && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {(() => {
              // #region agent log - Debug ListEmptyComponent render
              const logData = {
                location: 'ExercisePickerScreen.tsx:307',
                message: 'ListEmptyComponent rendering',
                data: {
                  showCreateButton,
                  searchQuery,
                  exercisesLength: exercises.length,
                  sortedExercisesLength: sortedExercises.length,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'B',
              };
              console.log('[DEBUG] ListEmptyComponent render:', logData);
              fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData),
              }).catch((err) => console.error('[DEBUG] Fetch failed:', err));
              // #endregion
              return null;
            })()}
            <Text style={styles.emptyTitle}>Inga övningar hittades</Text>
            <Text style={styles.emptyMessage}>
              {showCreateButton
                ? `Skapa övningen "${searchQuery}" direkt här`
                : exercises.length === 0
                ? 'Skapa övningar i övningsbiblioteket först'
                : 'Inga övningar matchar din sökning'}
            </Text>
            {(() => {
              // #region agent log - Debug button render condition
              const logData = {
                location: 'ExercisePickerScreen.tsx:339',
                message: 'Button render condition check',
                data: {
                  showCreateButton,
                  willRenderButton: !!showCreateButton,
                  searchQuery,
                  hasSearchQuery,
                  hasNoResults,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'C',
              };
              console.log('[DEBUG] Button render check:', logData);
              fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData),
              }).catch((err) => console.error('[DEBUG] Fetch failed:', err));
              // #endregion
              return showCreateButton ? (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createButtonText}>
                    Skapa "{searchQuery}"
                  </Text>
                </TouchableOpacity>
              ) : null;
            })()}
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
              <Text style={styles.modalTitle}>Ny övning</Text>
              <TouchableOpacity
                onPress={handleCreateAndAddExercise}
                disabled={isCreating}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
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
                  placeholderTextColor={colors.textSecondary}
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
                  {categories.filter(cat => cat !== 'all').map((cat) => {
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
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoryChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  categoryChipTextActive: { color: colors.primary },
  list: { padding: 16, paddingTop: 0 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  exerciseItem: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center' },
  favoriteIcon: { color: colors.warning, fontSize: 18, fontWeight: '700', marginRight: 8 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.text },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  muscleText: { fontSize: 12, color: colors.textSecondary },
  addIcon: { fontSize: 24, color: colors.primary, fontWeight: '500' },
  emptyState: { 
    alignItems: 'center', 
    paddingTop: 60,
    paddingBottom: 60,
    minHeight: 200,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, marginBottom: 8 },
  createButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderBottomColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalSaveText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  formHint: {
    fontWeight: '400',
    color: colors.primary,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  muscleGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleGroupChipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  muscleGroupChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  muscleGroupChipTextSelected: {
    color: colors.primary,
  },
  modalSpacer: {
    height: 40,
  },
});
