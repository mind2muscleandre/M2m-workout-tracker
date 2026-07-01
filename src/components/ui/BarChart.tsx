import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { GlassCard } from './GlassCard';

interface BarChartProps {
  title?: string;
  data: { label: string; value: number }[];
  maxValue?: number;
}

export function BarChart({ title, data, maxValue }: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <GlassCard style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.chart}>
        {data.map((d) => (
          <View key={d.label} style={styles.col}>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.round((d.value / max) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.lbl}>{d.label}</Text>
            <Text style={styles.val}>{d.value}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  title: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    color: coachColors.muted,
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 120,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: coachColors.border,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    minHeight: 80,
  },
  bar: {
    width: '100%',
    backgroundColor: coachColors.coach,
    borderRadius: borderRadius.xs,
    minHeight: 4,
  },
  lbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  val: {
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '700',
    color: coachColors.fg,
  },
});
