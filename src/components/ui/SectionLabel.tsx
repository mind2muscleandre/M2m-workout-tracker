import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    marginBottom: 10,
  },
});
