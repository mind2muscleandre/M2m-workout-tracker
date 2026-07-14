import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type KravChip = {
  label: string;
  tone?: 'default' | 'warn' | 'scr';
};

interface KravStripProps {
  title: string;
  chips: KravChip[];
}

export function KravStrip({ title, chips }: KravStripProps) {
  return (
    <GlassCard
      padding={14}
      style={styles.card}
    >
      <Text style={styles.k}>{title}</Text>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View
            key={chip.label}
            style={[
              styles.chip,
              chip.tone === 'warn' && styles.chipWarn,
              chip.tone === 'scr' && styles.chipScr,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                chip.tone === 'warn' && styles.chipTextWarn,
                chip.tone === 'scr' && styles.chipTextScr,
              ]}
            >
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(96,165,250,0.3)',
    marginBottom: 12,
  },
  k: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#60A5FA',
    textTransform: 'uppercase',
    marginBottom: 9,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  chipWarn: {
    backgroundColor: 'rgba(251,146,60,0.08)',
    borderColor: 'rgba(251,146,60,0.3)',
  },
  chipScr: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.3)',
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.4,
    color: coachColors.mutedHi,
    textTransform: 'uppercase',
  },
  chipTextWarn: { color: '#FB923C' },
  chipTextScr: { color: '#F87171' },
});
