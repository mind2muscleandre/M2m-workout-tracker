import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { categoryColors, coachColors, fonts, borderRadius } from '../lib/theme';
import { useExerciseStore } from '../stores/exerciseStore';
import { getCategoryLabel, getMuscleGroupLabel } from '../utils/helpers';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';

type Props = StackScreenProps<RootStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route, navigation }: Props) {
  const { exerciseId } = route.params;
  const { exercises } = useExerciseStore();
  const exercise = exercises.find((e) => e.id === exerciseId);

  if (!exercise) {
    return (
      <ScreenContainer title="Övning" scroll>
        <Text style={styles.errorText}>Övningen hittades inte</Text>
      </ScreenContainer>
    );
  }

  const catColor = categoryColors[exercise.category] || coachColors.coach;

  return (
    <ScreenContainer
      title="Övningsdetalj"
      scroll
      headerLeft={
        <Text style={styles.back} onPress={() => navigation.goBack()}>
          ← Tillbaka
        </Text>
      }
    >
      <GlassCard variant="coach" style={styles.heroCard}>
        <Text style={styles.name}>{exercise.name}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {getCategoryLabel(exercise.category)}
          </Text>
        </View>
      </GlassCard>

      {exercise.muscle_group.length > 0 ? (
        <GlassCard style={styles.section}>
          <SectionLabel>Muskelgrupper</SectionLabel>
          <View style={styles.tagRow}>
            {exercise.muscle_group.map((mg) => (
              <View key={mg} style={styles.tag}>
                <Text style={styles.tagText}>{getMuscleGroupLabel(mg)}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {exercise.equipment ? (
        <GlassCard style={styles.section}>
          <SectionLabel>Utrustning</SectionLabel>
          <Text style={styles.detailText}>{exercise.equipment}</Text>
        </GlassCard>
      ) : null}

      {exercise.description ? (
        <GlassCard style={styles.section}>
          <SectionLabel>Beskrivning</SectionLabel>
          <Text style={styles.detailText}>{exercise.description}</Text>
        </GlassCard>
      ) : null}

      {exercise.video_url ? (
        <GlassCard style={styles.section}>
          <SectionLabel>Video</SectionLabel>
          <Text style={[styles.detailText, { color: coachColors.coach }]}>
            {exercise.video_url}
          </Text>
        </GlassCard>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  errorText: { color: coachColors.muted, fontSize: 16, fontFamily: fonts.body },
  heroCard: { padding: 20, marginBottom: 12 },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  categoryText: { fontSize: 13, fontWeight: '600', fontFamily: fonts.mono },
  section: { padding: 16, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: coachColors.glassBgHi,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  tagText: { fontSize: 13, color: coachColors.fg, fontFamily: fonts.body },
  detailText: { fontSize: 15, color: coachColors.fg, lineHeight: 22, fontFamily: fonts.body },
});
