import React from 'react';
import { View, StyleSheet } from 'react-native';
import { coachColors, borderRadius } from '../../lib/theme';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  style?: object;
}

export function ProgressBar({
  value,
  max = 100,
  color = coachColors.coach,
  height = 3,
  style,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: coachColors.border,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: borderRadius.xs,
  },
});
