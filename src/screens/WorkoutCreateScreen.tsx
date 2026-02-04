import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { Exercise, ExerciseCategory, ExerciseInsert, MuscleGroup } from '../types/database';
import { getCategoryLabel, getTodayString } from '../utils/helpers';

type Props = StackScreenProps<RootStackParamList, 'WorkoutCreate'>;

interface SelectedExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: number[]; // Array of reps for each set, e.g. [10, 8, 12]
}

// Exercise Item Component (simplified without reanimated)
interface ExerciseItemProps {
  item: SelectedExercise;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateSets: (sets: number) => void;
  onUpdateRep: (setIndex: number, reps: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({
  item,
  index,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateSets,
  onUpdateRep,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <View style={styles.exerciseRow}>
      {/* Exercise Header - Always visible */}
      <View style={styles.exerciseHeader}>
        {/* Move buttons */}
        <View style={styles.moveButtons}>
          <TouchableOpacity
            style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
            onPress={onMoveUp}
            disabled={!canMoveUp}
          >
            <Text style={[styles.moveButtonText, !canMoveUp && styles.moveButtonTextDisabled]}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
            onPress={onMoveDown}
            disabled={!canMoveDown}
          >
            <Text style={[styles.moveButtonText, !canMoveDown && styles.moveButtonTextDisabled]}>↓</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.exerciseHeaderContent}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
        >
          <Text style={styles.exerciseNumber}>{index + 1}</Text>
          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
          <Text style={styles.collapseIcon}>
            {isCollapsed ? '▼' : '▲'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>X</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Details - Collapsible */}
      {!isCollapsed && (
        <View style={styles.exerciseDetailsContainer}>
          {/* Sets count stepper */}
          <View style={styles.setsCountRow}>
            <Text style={styles.setsLabel}>Antal sets:</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => {
                  const newSets = Math.max(1, item.targetSets - 1);
                  onUpdateSets(newSets);
                }}
                disabled={item.targetSets <= 1}
              >
                <Text style={[styles.stepperText, item.targetSets <= 1 && styles.stepperTextDisabled]}>-</Text>
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{item.targetSets}</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => {
                  const newSets = Math.min(20, item.targetSets + 1);
                  onUpdateSets(newSets);
                }}
                disabled={item.targetSets >= 20}
              >
                <Text style={[styles.stepperText, item.targetSets >= 20 && styles.stepperTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Individual sets with reps */}
          <View style={styles.setsContainer}>
            {Array.from({ length: item.targetSets }, (_, setIdx) => (
              <View key={setIdx} style={styles.setRow}>
                <Text style={styles.setLabel}>Set {setIdx + 1}:</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => {
                      const currentReps = item.targetReps[setIdx] || 0;
                      const newReps = Math.max(0, currentReps - 1);
                      onUpdateRep(setIdx, newReps);
                    }}
                    disabled={(item.targetReps[setIdx] || 0) <= 0}
                  >
                    <Text style={[styles.stepperText, (item.targetReps[setIdx] || 0) <= 0 && styles.stepperTextDisabled]}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.stepperValue}>
                    <Text style={styles.stepperValueText}>{item.targetReps[setIdx] || 0}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => {
                      const currentReps = item.targetReps[setIdx] || 0;
                      const newReps = Math.min(999, currentReps + 1);
                      onUpdateRep(setIdx, newReps);
                    }}
                    disabled={(item.targetReps[setIdx] || 0) >= 999}
                  >
                    <Text style={[styles.stepperText, (item.targetReps[setIdx] || 0) >= 999 && styles.stepperTextDisabled]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.repLabel}>reps</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
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

const CATEGORIES: { key: ExerciseCategory; label: string }[] = [
  { key: 'strength', label: 'Styrka' },
  { key: 'power', label: 'Power' },
  { key: 'conditioning', label: 'Kondition' },
  { key: 'mobility', label: 'Mobilitet' },
  { key: 'injury_prevention', label: 'Skadeprevention' },
];

const categoryColors: Record<string, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#F7E928',
};

export function WorkoutCreateScreen({ route, navigation }: Props) {
  const { clientId, templateWorkoutId } = route.params;
  const { createWorkout, addExerciseToWorkout, copyWorkout } = useWorkoutStore();
  const { exercises, fetchExercises, addExercise } = useExerciseStore();
  const { user } = useAuthStore();
  const { clients } = useClientStore();

  const client = clients.find((c) => c.id === clientId);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());
  // Create exercise modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');
  const [newMuscleGroups, setNewMuscleGroups] = useState<MuscleGroup[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);

  React.useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if we have a search query with no results
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasNoResults = filteredExercises.length === 0;
  const showCreateButton = hasSearchQuery && hasNoResults;

  const handleAddExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { exercise, targetSets: 3, targetReps: [10, 10, 10] }, // Default: 3 sets of 10 reps each
    ]);
    setShowExercisePicker(false);
    setSearchQuery('');
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
    setIsCreatingExercise(false);
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

    setIsCreatingExercise(true);
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
      
      // Automatically add the new exercise to selected exercises
      setSelectedExercises((prev) => [
        ...prev,
        { exercise: newExercise, targetSets: 3, targetReps: [10, 10, 10] },
      ]);
      
      setShowCreateModal(false);
      setShowExercisePicker(false);
      setSearchQuery('');
      resetCreateModal();
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte skapa övningen. Försök igen.');
    } finally {
      setIsCreatingExercise(false);
    }
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
    // Remove from collapsed set if it exists
    setCollapsedExercises((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Adjust indices for exercises after the removed one
      const adjustedSet = new Set<number>();
      newSet.forEach((idx) => {
        if (idx > index) {
          adjustedSet.add(idx - 1);
        } else {
          adjustedSet.add(idx);
        }
      });
      return adjustedSet;
    });
  };

  const toggleExerciseCollapse = (index: number) => {
    setCollapsedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const moveExerciseUp = (index: number) => {
    if (index === 0) return;
    setSelectedExercises((prev) => {
      const newExercises = [...prev];
      [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
      
      // Update collapsed state indices
      setCollapsedExercises((prevCollapsed) => {
        const newCollapsed = new Set<number>();
        prevCollapsed.forEach((idx) => {
          if (idx === index) {
            newCollapsed.add(index - 1);
          } else if (idx === index - 1) {
            newCollapsed.add(index);
          } else {
            newCollapsed.add(idx);
          }
        });
        return newCollapsed;
      });
      
      return newExercises;
    });
  };

  const moveExerciseDown = (index: number) => {
    if (index === selectedExercises.length - 1) return;
    setSelectedExercises((prev) => {
      const newExercises = [...prev];
      [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
      
      // Update collapsed state indices
      setCollapsedExercises((prevCollapsed) => {
        const newCollapsed = new Set<number>();
        prevCollapsed.forEach((idx) => {
          if (idx === index) {
            newCollapsed.add(index + 1);
          } else if (idx === index + 1) {
            newCollapsed.add(index);
          } else {
            newCollapsed.add(idx);
          }
        });
        return newCollapsed;
      });
      
      return newExercises;
    });
  };

  const updateExerciseSets = (index: number, sets: number) => {
    setSelectedExercises((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const currentSets = item.targetSets;
          const newSets = sets;
          let newReps = [...item.targetReps];
          
          // If increasing sets, add default reps (10) for new sets
          if (newSets > currentSets) {
            newReps = [...newReps, ...Array(newSets - currentSets).fill(10)];
          } 
          // If decreasing sets, remove the last ones
          else if (newSets < currentSets) {
            newReps = newReps.slice(0, newSets);
          }
          
          return { ...item, targetSets: newSets, targetReps: newReps };
        }
        return item;
      })
    );
  };

  const updateExerciseRep = (exerciseIndex: number, setIndex: number, reps: number) => {
    setSelectedExercises((prev) =>
      prev.map((item, i) => {
        if (i === exerciseIndex) {
          const newReps = [...item.targetReps];
          newReps[setIndex] = reps;
          return { ...item, targetReps: newReps };
        }
        return item;
      })
    );
  };

  const handleCopyFromTemplate = useCallback(async () => {
    if (!templateWorkoutId) return;
    try {
      setIsCreating(true);
      const newId = await copyWorkout(templateWorkoutId, clientId, date);
      navigation.replace('WorkoutActive', { workoutId: newId });
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte kopiera passet');
    } finally {
      setIsCreating(false);
    }
  }, [templateWorkoutId, clientId, date, copyWorkout, navigation]);

  React.useEffect(() => {
    if (templateWorkoutId) {
      handleCopyFromTemplate();
    }
  }, [templateWorkoutId, handleCopyFromTemplate]);

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Fel', 'Du måste vara inloggad');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Inga övningar', 'Lägg till minst en övning');
      return;
    }

    setIsCreating(true);
    let workoutId: string | null = null;
    
    try {
      console.log('Starting workout creation...');
      
      // Create workout
      workoutId = await createWorkout({
        client_id: clientId,
        created_by_pt_id: user.id,
        date,
        title: title || null,
        notes: notes || null,
        total_duration_seconds: null,
        is_template: false,
        template_name: null,
        status: 'planned',
        completed_at: null,
      });
      
      console.log('Workout created with ID:', workoutId);

      // Add exercises to workout - use allSettled to handle partial failures
      const exerciseResults = await Promise.allSettled(
        selectedExercises.map(async (se, i) => {
          const repsString = se.targetReps.length > 0 
            ? se.targetReps.join(',') 
            : null;
          console.log(`Adding exercise ${i + 1}/${selectedExercises.length}:`, se.exercise.name);
          return addExerciseToWorkout(
            workoutId!,
            se.exercise.id,
            i,
            se.targetSets || null,
            repsString
          );
        })
      );

      // Check for failures
      const failures = exerciseResults.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`${failures.length} exercises failed to add:`, failures);
        // Still navigate even if some exercises failed
      } else {
        console.log('All exercises added successfully');
      }

      // Navigate after all exercises are processed
      if (workoutId) {
        console.log('Navigating to WorkoutActive screen...');
        // Reset creating state first
        setIsCreating(false);
        // Small delay to ensure state is updated
        setTimeout(() => {
          try {
            navigation.replace('WorkoutActive', { workoutId });
          } catch (navError) {
            console.error('Navigation error:', navError);
            // Fallback to navigate if replace fails
            navigation.navigate('WorkoutActive', { workoutId });
          }
        }, 50);
      }
    } catch (error) {
      console.error('Create workout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      
      // Reset creating state
      setIsCreating(false);
      
      Alert.alert(
        'Fel', 
        `Kunde inte skapa passet: ${errorMessage}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // If workout was created but exercises failed, still navigate
              if (workoutId) {
                navigation.replace('WorkoutActive', { workoutId });
              }
            }
          }
        ]
      );
    }
  };

  // Exercise picker overlay
  if (showExercisePicker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
            <Text style={styles.cancelText}>Avbryt</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Välj övning</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Sök övning..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.exercisePickerItem} onPress={() => handleAddExercise(item)}>
              <Text style={styles.exercisePickerName}>{item.name}</Text>
              <Text style={styles.exercisePickerCategory}>{getCategoryLabel(item.category)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyText}>Inga övningar hittades</Text>
              <Text style={styles.emptySubtext}>
                {showCreateButton
                  ? `Skapa övningen "${searchQuery}" direkt här`
                  : exercises.length === 0
                  ? 'Skapa övningar i övningsbiblioteket först'
                  : 'Inga övningar matchar din sökning'}
              </Text>
              {showCreateButton && (
                <TouchableOpacity
                  style={styles.createExerciseButton}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createExerciseButtonText}>
                    Skapa "{searchQuery}"
                  </Text>
                </TouchableOpacity>
              )}
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
                  disabled={isCreatingExercise}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isCreatingExercise ? (
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

  return (
    <SafeAreaView 
      style={[
        styles.container,
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButton}>← Tillbaka</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'web' ? undefined : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS !== 'web'}
      >
        <ScrollView 
          style={styles.flex} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          nestedScrollEnabled={true}
          scrollEnabled={true}
        >
          {/* Client */}
          <View style={styles.section}>
            <Text style={styles.clientBadge}>{client?.name || 'Okänd klient'}</Text>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Passtitel</Text>
            <TextInput
              style={styles.input}
              placeholder='t.ex. "Benpass A"'
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Datum</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Anteckningar</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Anteckningar för passet..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Exercises */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>Övningar</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowExercisePicker(true)}
              >
                <Text style={styles.addButtonText}>+ Lägg till</Text>
              </TouchableOpacity>
            </View>

            {selectedExercises.length === 0 ? (
              <View style={styles.noExercises}>
                <Text style={styles.noExercisesText}>Inga övningar tillagda</Text>
              </View>
            ) : (
              selectedExercises.map((item, index) => {
                const isCollapsed = collapsedExercises.has(index);
                return (
                  <ExerciseItem
                    key={`${item.exercise.id}-${index}`}
                    item={item}
                    index={index}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => toggleExerciseCollapse(index)}
                    onRemove={() => removeExercise(index)}
                    onMoveUp={() => moveExerciseUp(index)}
                    onMoveDown={() => moveExerciseDown(index)}
                    onUpdateSets={(sets) => updateExerciseSets(index, sets)}
                    onUpdateRep={(setIdx, reps) => updateExerciseRep(index, setIdx, reps)}
                    canMoveUp={index > 0}
                    canMoveDown={index < selectedExercises.length - 1}
                  />
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Create Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Skapar...' : 'Skapa pass'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' && { 
      height: '100vh', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  flex: { 
    flex: 1,
    ...(Platform.OS === 'web' && { 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch',
      minHeight: 0,
      height: '100%',
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: { 
    padding: 16, 
    paddingBottom: 120, 
    flexGrow: 1,
    ...(Platform.OS === 'web' && { minHeight: '100%' }),
  },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clientBadge: {
    fontSize: 15,
    color: colors.primaryLight,
    fontWeight: '600',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  label: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  addButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  noExercises: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noExercisesText: { color: colors.textSecondary, fontSize: 15 },
  exerciseRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  moveButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  moveButtonTextDisabled: {
    color: colors.textSecondary,
  },
  exerciseNumber: { fontSize: 15, fontWeight: '700', color: colors.primary, width: 24 },
  exerciseName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.text,
    flex: 1,
  },
  collapseIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  exerciseDetailsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  setsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  setsLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  stepperText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  stepperTextDisabled: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  stepperValue: {
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  setsContainer: {
    gap: 10,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    width: 55,
  },
  repLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  removeBtn: { padding: 8 },
  removeBtnText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.5 },
  createButtonText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  // Exercise picker
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cancelText: { fontSize: 15, color: colors.primary },
  searchContainer: { padding: 16 },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exercisePickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exercisePickerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  exercisePickerCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  emptyPicker: { alignItems: 'center', paddingTop: 40, paddingBottom: 40, minHeight: 200 },
  emptyText: { fontSize: 16, color: colors.text, marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 },
  createExerciseButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  createExerciseButtonText: {
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
  categoryButtonSelected: {
    backgroundColor: colors.primary + '25',
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryButtonTextSelected: {
    color: colors.primary,
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
