import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type ProgressBarVariant = 'default' | 'accent' | 'teal' | 'orange' | 'coach';

export type ProgressBarProps = {
  value?: number;
  max?: number;
  label?: string;
  variant?: ProgressBarVariant;
  color?: string;
  height?: number;
  style?: ViewStyle;
};

const variantColors: Record<ProgressBarVariant, string> = {
  default: coachColors.coach,
  accent: coachColors.accent,
  teal: coachColors.coach,
  orange: coachColors.orange,
  coach: coachColors.coach,
};

export function ProgressBar({
  value = 0,
  max = 100,
  label,
  variant = 'default',
  color,
  height = 4,
  style,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fillColor = color ?? variantColors[variant];

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%` as `${number}%`,
              backgroundColor: fillColor,
              height,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: coachColors.muted,
    marginBottom: 6,
  },
  track: {
    backgroundColor: coachColors.border,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
