import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, borderRadius } from '../../lib/theme';

export type TriageStatus = 'nytt' | 'granskas' | 'klar' | 'saknas';

const CONFIG: Record<TriageStatus, { label: string; bg: string; fg: string }> = {
  nytt: { label: 'NYTT', bg: '#F7E928', fg: '#17191c' },
  granskas: { label: 'GRANSKAS', bg: 'rgba(251,146,60,0.10)', fg: '#FB923C' },
  klar: { label: 'KLAR', bg: 'rgba(74,222,128,0.09)', fg: '#4ADE80' },
  saknas: { label: 'SAKNAS', bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.44)' },
};

export function TriageStatusChip({ status }: { status: TriageStatus }) {
  const c = CONFIG[status];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '500',
  },
});
