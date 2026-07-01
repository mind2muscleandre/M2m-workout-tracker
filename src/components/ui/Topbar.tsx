import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, fonts, layout } from '../../lib/theme';

interface TopbarProps {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function Topbar({ title = 'M2M COACH', left, right }: TopbarProps) {
  return (
    <View style={styles.topbar}>
      <View style={styles.side}>{left}</View>
      <Text style={styles.logo}>{title}</Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: layout.topbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(24,28,34,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: coachColors.coach,
  },
  side: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
