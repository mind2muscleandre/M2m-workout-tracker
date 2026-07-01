import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, fonts, layout } from '../../lib/theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  search?: React.ReactNode;
}

export function PageHeader({ title, subtitle, left, right, search }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {left}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {search}
      </View>
      {right ? <View style={styles.actions}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: layout.pageHeaderHeight,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.88,
    color: coachColors.fg,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: coachColors.muted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
});
