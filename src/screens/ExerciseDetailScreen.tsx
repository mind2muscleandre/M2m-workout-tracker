import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../lib/theme';
import { useExerciseStore } from '../stores/exerciseStore';
import { getCategoryLabel, getMuscleGroupLabel } from '../utils/helpers';

type Props = StackScreenProps<RootStackParamList, 'ExerciseDetail'>;

const categoryColors: Record<string, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#F7E928',
};

export function ExerciseDetailScreen({ route }: Props) {
  const { exerciseId } = route.params;
  const { exercises } = useExerciseStore();
  const exercise = exercises.find((e) => e.id === exerciseId);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Övningen hittades inte</Text>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = categoryColors[exercise.category] || colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Name */}
        <Text style={styles.name}>{exercise.name}</Text>

        {/* Category */}
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {getCategoryLabel(exercise.category)}
          </Text>
        </View>

        {/* Muscle Groups */}
        {exercise.muscle_group.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Muskelgrupper</Text>
            <View style={styles.tagRow}>
              {exercise.muscle_group.map((mg) => (
                <View key={mg} style={styles.tag}>
                  <Text style={styles.tagText}>{getMuscleGroupLabel(mg)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Equipment */}
        {exercise.equipment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Utrustning</Text>
            <Text style={styles.detailText}>{exercise.equipment}</Text>
          </View>
        )}

        {/* Description */}
        {exercise.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beskrivning</Text>
            <Text style={styles.detailText}>{exercise.description}</Text>
          </View>
        )}

        {/* Video */}
        {exercise.video_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video</Text>
            <Text style={[styles.detailText, { color: colors.primary }]}>
              {exercise.video_url}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 16 },
  content: { padding: 16 },
  name: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 12 },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  categoryText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.card,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: 14, color: colors.text },
  detailText: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
