import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useExerciseStore } from '../stores/exerciseStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { Exercise, ExerciseCategory } from '../types/database';
import { getCategoryLabel } from '../utils/helpers';

type Props = NativeStackScreenProps<RootStackParamList, 'ExercisePicker'>;

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
  injury_prevention: '#AF52DE',
};

export function ExercisePickerScreen({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const { exercises, fetchExercises } = useExerciseStore();
  const { addExerciseToWorkout, activeWorkout } = useWorkoutStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');

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

  const handleSelectExercise = async (exercise: Exercise) => {
    const currentCount = activeWorkout?.workout_exercises.length || 0;
    try {
      await addExerciseToWorkout(workoutId, exercise.id, currentCount, 3, '10');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to add exercise:', error);
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
          onChangeText={setSearchQuery}
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Inga övningar</Text>
            <Text style={styles.emptyMessage}>
              Skapa övningar i övningsbiblioteket först
            </Text>
          </View>
        }
      />
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
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  emptyMessage: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});
