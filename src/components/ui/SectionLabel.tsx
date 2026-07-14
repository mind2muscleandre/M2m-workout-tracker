import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

export type SectionLabelProps = {
  children: string;
  style?: TextStyle;
};

export function SectionLabel({ children, style }: SectionLabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
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
