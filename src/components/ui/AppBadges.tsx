import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AppBadges as AppBadgesType } from '../../types/platform';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

const APP_LABELS: Record<keyof AppBadgesType, { label: string; color: string }> = {
  perform: { label: 'Perform', color: '#6C8CFF' },
  tracker: { label: 'Tracker', color: coachColors.coach },
  macro: { label: 'Macro', color: '#FFB347' },
  goalsetter: { label: 'Goalsetter', color: '#C77DFF' },
};

export function AppBadges({ apps }: { apps: AppBadgesType }) {
  const active = (Object.keys(APP_LABELS) as Array<keyof AppBadgesType>).filter(
    (k) => apps[k]
  );
  if (active.length === 0) {
    return <Text style={styles.none}>Inga appar</Text>;
  }
  return (
    <View style={styles.row}>
      {active.map((key) => (
        <View
          key={key}
          style={[styles.badge, { borderColor: APP_LABELS[key].color }]}
        >
          <Text style={[styles.badgeText, { color: APP_LABELS[key].color }]}>
            {APP_LABELS[key].label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.06,
  },
  none: { fontSize: 11, color: coachColors.muted, fontFamily: fonts.body },
});
