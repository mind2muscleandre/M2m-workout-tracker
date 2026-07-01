import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { GlassCard } from './GlassCard';

interface KpiCardProps {
  value: string | number;
  label: string;
  color?: 'coach' | 'accent' | 'orange' | 'muted';
  trend?: string;
  style?: ViewStyle;
}

const colors = {
  coach: coachColors.coach,
  accent: coachColors.accent,
  orange: coachColors.orange,
  muted: coachColors.mutedHi,
};

export function KpiCard({ value, label, color = 'coach', trend, style }: KpiCardProps) {
  return (
    <GlassCard style={[styles.card, style]} padding={14}>
      <Text style={[styles.value, { color: colors[color] }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend ? <Text style={styles.trend}>{trend}</Text> : null}
    </GlassCard>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: borderRadius.lg,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
    marginTop: 4,
  },
  trend: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.coach,
    marginTop: 6,
  },
});
