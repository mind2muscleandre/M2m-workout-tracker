import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { GlassCard } from './GlassCard';

export interface StatItem {
  value: string | number;
  label: string;
  color?: 'coach' | 'accent' | 'orange' | 'muted';
}

interface StatsStripProps {
  items: StatItem[];
}

const valueColors = {
  coach: coachColors.coach,
  accent: coachColors.accent,
  orange: coachColors.orange,
  muted: coachColors.mutedHi,
};

export function StatsStrip({ items }: StatsStripProps) {
  return (
    <GlassCard variant="coach" padding={0} style={styles.strip}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={[styles.cell, i < items.length - 1 && styles.cellBorder]}
        >
          <Text
            style={[
              styles.value,
              { color: valueColors[item.color ?? 'coach'] },
            ]}
          >
            {item.value}
          </Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: coachColors.border,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
