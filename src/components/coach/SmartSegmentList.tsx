import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts } from '../../lib/theme';

export type SmartSegment = {
  id: string;
  label: string;
  count: number;
};

interface SmartSegmentListProps {
  segments: SmartSegment[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SmartSegmentList({ segments, selectedId, onSelect }: SmartSegmentListProps) {
  return (
    <GlassCard padding={16} style={styles.card}>
      <Text style={styles.k}>Smart segment</Text>
      {segments.map((seg) => {
        const on = seg.id === selectedId;
        return (
          <TouchableOpacity
            key={seg.id}
            style={styles.row}
            onPress={() => onSelect(seg.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, on && styles.radioOn]}>
              {on ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{seg.label}</Text>
            <Text style={[styles.count, on && styles.countOn]}>{seg.count}</Text>
          </TouchableOpacity>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  k: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.24)',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: coachColors.accent },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: coachColors.accent,
  },
  label: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  labelOn: {
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.24)',
  },
  countOn: { color: coachColors.accent },
});
