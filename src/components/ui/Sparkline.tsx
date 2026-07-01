import React from 'react';
import { View, StyleSheet } from 'react-native';
import { coachColors } from '../../lib/theme';

interface SparklineProps {
  values: number[];
  height?: number;
  highlightLast?: boolean;
}

export function Sparkline({ values, height = 24, highlightLast = true }: SparklineProps) {
  const max = Math.max(...values, 1);
  return (
    <View style={[styles.container, { height }]}>
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * height);
        const isHi = highlightLast && i === values.length - 1;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: barH,
                backgroundColor: isHi ? coachColors.coach : coachColors.glassBgHi,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minWidth: 4,
  },
});
