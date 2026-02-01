import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Exercise, ExerciseCategory } from '../types/database';

// ============================================
// Category Badge Color Map
// ============================================
const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  strength: '#FF3B30',
  power: '#FF9500',
  conditioning: '#34C759',
  mobility: '#5AC8FA',
  injury_prevention: '#AF52DE',
};

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Strength',
  power: 'Power',
  conditioning: 'Conditioning',
  mobility: 'Mobility',
  injury_prevention: 'Injury Prevention',
};

// ============================================
// Props
// ============================================
interface ExerciseCardProps {
  exercise: Exercise;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  showFavorite?: boolean;
}

// ============================================
// Component
// ============================================
export default function ExerciseCard({
  exercise,
  onPress,
  onToggleFavorite,
  showFavorite = true,
}: ExerciseCardProps) {
  const categoryColor = CATEGORY_COLORS[exercise.category] ?? '#6C5CE7';
  const categoryLabel = CATEGORY_LABELS[exercise.category] ?? exercise.category;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Exercise: ${exercise.name}`}
    >
      {/* Header Row: Name + Favorite */}
      <View style={styles.headerRow}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.name}
        </Text>

        {showFavorite && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite?.();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={
              exercise.is_favorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
          >
            <Text style={styles.favoriteIcon}>
              {exercise.is_favorite ? '\u2605' : '\u2606'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Badge */}
      <View style={styles.badgeRow}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {categoryLabel}
          </Text>
        </View>

        {exercise.equipment && (
          <View style={styles.equipmentBadge}>
            <Text style={styles.equipmentText}>{exercise.equipment}</Text>
          </View>
        )}
      </View>

      {/* Muscle Group Tags */}
      {exercise.muscle_group && exercise.muscle_group.length > 0 && (
        <View style={styles.muscleRow}>
          {exercise.muscle_group.map((muscle) => (
            <View key={muscle} style={styles.muscleTag}>
              <Text style={styles.muscleText}>
                {muscle.replace('_', ' ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 12,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 22,
    color: '#FF9500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  equipmentBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  equipmentText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    backgroundColor: '#6C5CE7' + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  muscleText: {
    fontSize: 11,
    color: '#A29BFE',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
