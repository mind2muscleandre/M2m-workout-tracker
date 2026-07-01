import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { coachColors, borderRadius } from '../../lib/theme';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function ToggleSwitch({ value, onValueChange }: ToggleSwitchProps) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: coachColors.coachDim,
    borderColor: 'rgba(0,212,170,0.30)',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: coachColors.muted,
  },
  thumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: coachColors.coach,
  },
});
