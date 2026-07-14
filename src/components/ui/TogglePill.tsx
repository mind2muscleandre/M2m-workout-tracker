import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

export type TogglePillProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  style?: ViewStyle;
};

const THUMB_SIZE = 18;
const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;

export function TogglePill({ checked, onChange, label, style }: TogglePillProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={[styles.row, style]}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
    >
      <View style={[styles.track, checked && styles.trackOn]}>
        <View style={[styles.thumb, checked && styles.thumbOn]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: coachColors.border,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: coachColors.accentDim,
    borderColor: 'rgba(247,233,40,0.40)',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: coachColors.fg,
  },
  thumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: coachColors.accent,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
  },
});
