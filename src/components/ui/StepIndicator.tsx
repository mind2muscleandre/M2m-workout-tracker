import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

interface StepIndicatorProps {
  current: number;
  total?: number;
  labels?: string[];
}

export function StepIndicator({ current, total = 4, labels }: StepIndicatorProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <React.Fragment key={step}>
            <View style={styles.step}>
              <View
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  done && styles.dotDone,
                ]}
              >
                <Text
                  style={[
                    styles.num,
                    active && styles.numActive,
                    done && styles.numDone,
                  ]}
                >
                  {done ? '✓' : step}
                </Text>
              </View>
              {labels?.[i] ? (
                <Text style={[styles.label, (active || done) && styles.labelActive]}>
                  {labels[i]}
                </Text>
              ) : null}
            </View>
            {i < total - 1 ? <View style={[styles.sep, done && styles.sepDone]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: coachColors.coach,
    backgroundColor: coachColors.coach,
  },
  dotDone: {
    borderColor: 'rgba(0,212,170,0.4)',
    backgroundColor: 'rgba(0,212,170,0.2)',
  },
  num: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: coachColors.muted,
  },
  numActive: {
    color: '#000',
  },
  numDone: {
    color: coachColors.coach,
    fontSize: 9,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  labelActive: {
    color: coachColors.coach,
  },
  sep: {
    flex: 1,
    height: 1,
    backgroundColor: coachColors.border,
    minWidth: 12,
    marginHorizontal: 0,
  },
  sepDone: {
    backgroundColor: 'rgba(0,212,170,0.3)',
  },
});
