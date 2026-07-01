import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { coachColors, fonts } from '../../lib/theme';
import { GlassCard } from './GlassCard';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title?: string;
  segments: DonutSegment[];
  size?: number;
}

export function DonutChart({ title, segments, size = 120 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;

  return (
    <GlassCard style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.row}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${cx}, ${cy}`}>
            {segments.map((seg) => {
              const len = (seg.value / total) * circumference;
              const dash = `${len} ${circumference - len}`;
              const circle = (
                <Circle
                  key={seg.label}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={seg.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return circle;
            })}
          </G>
        </Svg>
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendLabel}>{seg.label}</Text>
              <Text style={styles.legendVal}>{Math.round((seg.value / total) * 100)}%</Text>
            </View>
          ))}
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legend: { flex: 1, gap: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  legendVal: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: coachColors.fg,
  },
});
