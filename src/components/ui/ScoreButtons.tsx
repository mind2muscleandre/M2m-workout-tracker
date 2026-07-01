import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';

interface ScoreButtonsProps {
  value?: number;
  onChange: (score: number) => void;
}

function selectedStyle(score: number): { bg: string; border: string; color: string } {
  if (score <= 2) {
    return {
      bg: 'rgba(255,69,69,0.12)',
      border: 'rgba(255,69,69,0.3)',
      color: coachColors.danger,
    };
  }
  if (score === 3) {
    return {
      bg: coachColors.accentDim,
      border: 'rgba(247,233,40,0.3)',
      color: coachColors.accent,
    };
  }
  return {
    bg: coachColors.coachDim,
    border: 'rgba(0,212,170,0.3)',
    color: coachColors.coach,
  };
}

export function ScoreButtons({ value, onChange }: ScoreButtonsProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        const sel = selected ? selectedStyle(n) : null;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            style={[
              styles.btn,
              selected && sel
                ? { borderColor: sel.border, backgroundColor: sel.bg }
                : null,
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.num, selected && sel ? { color: sel.color } : null]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  btn: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: coachColors.muted,
  },
});
