import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { SectionLabel } from '../ui/SectionLabel';
import { coachColors, fonts, borderRadius } from '../../lib/theme';
import type { NeedsYouItem } from '../../lib/dashboardInsights';

interface NeedsYouQueueProps {
  items: NeedsYouItem[];
  onPressItem: (clientId: string) => void;
  title?: string;
  emphasized?: boolean;
}

export function NeedsYouQueue({ items, onPressItem, title, emphasized }: NeedsYouQueueProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionLabel style={emphasized ? styles.emphasizedLabel : undefined}>
        {title ?? 'Behöver dig nu'}
      </SectionLabel>
      <GlassCard padding={14} style={styles.card}>
        {items.map((item, idx) => (
          <View key={item.clientId} style={[styles.row, idx < items.length - 1 && styles.rowBorder]}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{item.initials}</Text>
            </View>
            <View style={styles.mid}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.why}>
                {item.reasonHighlight ? (
                  <Text style={styles.whyHi}>{item.reasonHighlight} · </Text>
                ) : null}
                {item.reason}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.go}
              onPress={() => onPressItem(item.clientId)}
              accessibilityRole="button"
            >
              <Text style={styles.goText}>{item.actionLabel}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  emphasizedLabel: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 10,
  },
  card: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '600',
    color: coachColors.fg,
  },
  mid: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  why: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.4,
    color: coachColors.muted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  whyHi: { color: coachColors.orange },
  go: {
    borderWidth: 1,
    borderColor: 'rgba(247,233,40,0.3)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: coachColors.accent,
    textTransform: 'uppercase',
  },
});
