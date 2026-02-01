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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { Exercise } from '../types/database';
import { getCategoryLabel, getTodayString } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutCreate'>;

interface SelectedExercise {
  exercise: Exercise;
  targetSets: string;
  targetReps: string;
}

export function WorkoutCreateScreen({ route, navigation }: Props) {
  const { clientId, templateWorkoutId } = route.params;
  const { createWorkout, addExerciseToWorkout, copyWorkout } = useWorkoutStore();
  const { exercises, fetchExercises } = useExerciseStore();
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

  React.useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { exercise, targetSets: '3', targetReps: '10' },
    ]);
    setShowExercisePicker(false);
    setSearchQuery('');
  };

  const removeExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExerciseSets = (index: number, sets: string) => {
    setSelectedExercises((prev) =>
      prev.map((item, i) => (i === index ? { ...item, targetSets: sets } : item))
    );
  };

  const updateExerciseReps = (index: number, reps: string) => {
    setSelectedExercises((prev) =>
      prev.map((item, i) => (i === index ? { ...item, targetReps: reps } : item))
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
    if (!user) return;

    if (selectedExercises.length === 0) {
      Alert.alert('Inga övningar', 'Lägg till minst en övning');
      return;
    }

    setIsCreating(true);
    try {
      const workoutId = await createWorkout({
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

      // Add exercises to workout
      for (let i = 0; i < selectedExercises.length; i++) {
        const se = selectedExercises[i];
        await addExerciseToWorkout(
          workoutId,
          se.exercise.id,
          i,
          parseInt(se.targetSets) || null,
          se.targetReps || null
        );
      }

      navigation.replace('WorkoutActive', { workoutId });
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte skapa passet');
    } finally {
      setIsCreating(false);
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
            <TouchableOpacity style={styles.exercisePickerItem} onPress={() => addExercise(item)}>
              <Text style={styles.exercisePickerName}>{item.name}</Text>
              <Text style={styles.exercisePickerCategory}>{getCategoryLabel(item.category)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyText}>Inga övningar hittades</Text>
              <Text style={styles.emptySubtext}>Skapa övningar i övningsbiblioteket</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
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
              selectedExercises.map((item, index) => (
                <View key={`${item.exercise.id}-${index}`} style={styles.exerciseRow}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                      <View style={styles.setsRepsRow}>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Sets"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={item.targetSets}
                          onChangeText={(v) => updateExerciseSets(index, v)}
                        />
                        <Text style={styles.setsRepsX}>x</Text>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Reps"
                          placeholderTextColor={colors.textSecondary}
                          value={item.targetReps}
                          onChangeText={(v) => updateExerciseReps(index, v)}
                        />
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeExercise(index)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))
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
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  exerciseInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  exerciseNumber: { fontSize: 15, fontWeight: '700', color: colors.primary, width: 24 },
  exerciseDetails: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
  setsRepsRow: { flexDirection: 'row', alignItems: 'center' },
  smallInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  setsRepsX: { color: colors.textSecondary, fontSize: 14, marginHorizontal: 8 },
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
  emptyPicker: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  emptySubtext: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
