import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { SectionLabel } from '../ui/SectionLabel';
import { Button } from '../ui/Button';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type SessionSummaryStat = {
  label: string;
  value: string | number;
  accent?: boolean;
};

export type ExerciseSummaryRow = {
  name: string;
  sets: string;
  pb?: boolean;
};

interface SessionSummaryViewProps {
  athleteName: string;
  sessionName: string;
  duration: string;
  stats: SessionSummaryStat[];
  exercises: ExerciseSummaryRow[];
  note: string;
  onNoteChange: (text: string) => void;
  selectedRpe: number | null;
  onRpeSelect: (rpe: number) => void;
  onDone: () => void;
}

export function SessionSummaryView({
  athleteName,
  sessionName,
  duration,
  stats,
  exercises,
  note,
  onNoteChange,
  selectedRpe,
  onRpeSelect,
  onDone,
}: SessionSummaryViewProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.ok}>
          <Text style={styles.okIcon}>✓</Text>
        </View>
        <Text style={styles.title}>Pass klart</Text>
        <Text style={styles.sub}>
          {athleteName.toUpperCase()} · {sessionName.toUpperCase()} · {duration}
        </Text>
      </View>

      <View style={styles.sums}>
        {stats.map((s) => (
          <GlassCard key={s.label} padding={12} style={styles.sum}>
            <Text style={[styles.sumVal, s.accent && styles.sumValY]}>{s.value}</Text>
            <Text style={styles.sumK}>{s.label}</Text>
          </GlassCard>
        ))}
      </View>

      <SectionLabel>Övningar</SectionLabel>
      <GlassCard padding={6}>
        {exercises.map((ex) => (
          <View key={ex.name} style={styles.exRow}>
            <Text style={styles.exName}>{ex.name}</Text>
            <Text style={styles.exSets}>
              <Text style={styles.exSetsB}>{ex.sets}</Text>
            </Text>
            {ex.pb ? <Text style={styles.pb}>PB</Text> : null}
          </View>
        ))}
      </GlassCard>

      <SectionLabel>Upplevd ansträngning (RPE)</SectionLabel>
      <View style={styles.rpes}>
        {[6, 7, 8, 9, 10].map((r) => (
          <Text
            key={r}
            style={[styles.rp, selectedRpe === r && styles.rpOn]}
            onPress={() => onRpeSelect(r)}
          >
            {r}
          </Text>
        ))}
      </View>

      <SectionLabel>Coach-anteckning</SectionLabel>
      <TextInput
        style={styles.note}
        multiline
        placeholder="Hur kändes passet? Notera asymmetrier, teknik, nästa steg…"
        placeholderTextColor={coachColors.muted}
        value={note}
        onChangeText={onNoteChange}
      />

      <Button label="Spara & stäng" variant="primary" onPress={onDone} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  ok: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: coachColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okIcon: { fontSize: 26, color: '#17191c' },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '600',
    color: coachColors.fg,
    textTransform: 'uppercase',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  sub: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: coachColors.muted,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  sums: { flexDirection: 'row', gap: 8 },
  sum: { flex: 1, alignItems: 'center' },
  sumVal: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: coachColors.fg,
  },
  sumValY: { color: coachColors.accent },
  sumK: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.24)',
    marginTop: 5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  exSets: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.fg,
  },
  exSetsB: { color: coachColors.accent, fontWeight: '500' },
  pb: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.6,
    color: '#17191c',
    backgroundColor: '#4ADE80',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontWeight: '500',
    overflow: 'hidden',
  },
  rpes: { flexDirection: 'row', gap: 6 },
  rp: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.muted,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: 12,
    paddingVertical: 11,
    overflow: 'hidden',
  },
  rpOn: {
    color: '#17191c',
    backgroundColor: coachColors.accent,
    borderColor: coachColors.accent,
  },
  note: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
    lineHeight: 18,
    textAlignVertical: 'top',
  },
  cta: { marginTop: 8 },
});
