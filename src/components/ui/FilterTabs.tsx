import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';

export interface FilterTab {
  id: string;
  label: string;
  count?: number | string;
  dotColor?: string;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function FilterTabs({ tabs, activeId, onChange }: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, active && styles.tabActive]}
            activeOpacity={0.75}
          >
            {tab.dotColor ? (
              <View style={[styles.dot, { backgroundColor: tab.dotColor }]} />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {tab.count !== undefined ? (
              <Text style={[styles.count, active && styles.countActive]}>{tab.count}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 4,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
  },
  tabActive: {
    backgroundColor: coachColors.coachDim,
    borderColor: coachColors.coachHi,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  labelActive: {
    color: coachColors.coach,
  },
  count: {
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: '700',
    color: coachColors.muted,
  },
  countActive: {
    color: coachColors.coach,
  },
});
