import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';

export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
});
