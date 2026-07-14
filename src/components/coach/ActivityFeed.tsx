import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { SectionLabel } from '../ui/SectionLabel';
import { coachColors, fonts } from '../../lib/theme';
import type { ActivityItem } from '../../lib/dashboardInsights';

const SEV = {
  high: { bg: 'rgba(248,113,113,0.12)', fg: '#F87171', label: 'HÖG' },
  med: { bg: 'rgba(251,146,60,0.12)', fg: '#FB923C', label: 'MED' },
  good: { bg: 'rgba(74,222,128,0.12)', fg: '#4ADE80', label: 'OK' },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.hdr}>
        <SectionLabel>Aktivitetsflöde</SectionLabel>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>DIREKT</Text>
        </View>
      </View>
      <GlassCard padding={14}>
        {items.map((item, idx) => {
          const sev = SEV[item.severity];
          return (
            <View key={item.id} style={[styles.item, idx > 0 && styles.itemBorder]}>
              <View style={styles.top}>
                <View style={[styles.chip, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.chipText, { color: sev.fg }]}>{sev.label}</Text>
                </View>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.text}>
                {item.bold ? <Text style={styles.bold}>{item.bold}</Text> : null}
                {item.text}
              </Text>
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  hdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: '#4ADE80',
  },
  item: { paddingVertical: 9 },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  chip: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.6,
    fontWeight: '500',
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 7,
    color: 'rgba(255,255,255,0.24)',
    marginLeft: 'auto',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
    lineHeight: 17,
  },
  bold: {
    fontFamily: fonts.bodySemiBold,
    color: coachColors.fg,
  },
});
