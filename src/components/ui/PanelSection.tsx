import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { SectionLabel } from './SectionLabel';

interface PanelSectionProps {
  label?: string;
  children: React.ReactNode;
  variant?: 'default' | 'coach';
}

export function PanelSection({ label, children, variant = 'default' }: PanelSectionProps) {
  return (
    <View
      style={[
        styles.section,
        variant === 'coach' && styles.coach,
      ]}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      {children}
    </View>
  );
}

export function PanelRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{label}</Text>
      <Text style={[styles.val, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  coach: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  key: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  val: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.fg,
    lineHeight: 20,
  },
});
