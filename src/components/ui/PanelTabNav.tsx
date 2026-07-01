import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { coachColors, fonts } from '../../lib/theme';

export interface PanelTab {
  id: string;
  label: string;
}

interface PanelTabNavProps {
  tabs: PanelTab[];
  activeId: string;
  onChange: (id: string) => void;
}

export function PanelTabNav({ tabs, activeId, onChange }: PanelTabNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.nav}
      contentContainerStyle={styles.navContent}
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
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    backgroundColor: 'rgba(18,22,28,0.9)',
    flexGrow: 0,
  },
  navContent: {
    flexDirection: 'row',
    minWidth: '100%',
  },
  tab: {
    flex: 1,
    minWidth: 72,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 6,
  },
  tabActive: {
    borderBottomColor: coachColors.coach,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
  },
  labelActive: {
    color: coachColors.coach,
  },
});
