import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

export interface MacroItem {
  name: string;
  current: number;
  target: number;
  unit?: string;
  variant?: 'default' | 'pro' | 'carb' | 'fat';
}

interface MacroBarProps {
  label?: string;
  items: MacroItem[];
}

const fillColors = {
  default: coachColors.coach,
  pro: coachColors.accent,
  carb: coachColors.orange,
  fat: 'rgba(167,139,250,0.85)',
};

export function MacroBar({ label, items }: MacroBarProps) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {items.map((item) => {
        const pct = Math.min(100, Math.round((item.current / item.target) * 100));
        const warn = item.current / item.target < 0.6;
        const unit = item.unit ?? (item.name === 'Kalorier' ? '' : 'g');
        return (
          <View key={item.name} style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: fillColors[item.variant ?? 'default'],
                  },
                ]}
              />
            </View>
            <Text style={[styles.nums, warn && styles.numsWarn]}>
              {item.current}
              {unit} / {item.target}
              {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    width: 72,
  },
  barWrap: {
    flex: 1,
    height: 4,
    backgroundColor: coachColors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  nums: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    width: 72,
    textAlign: 'right',
  },
  numsWarn: {
    color: coachColors.orange,
  },
});
