import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AthleteStatus, statusColors, statusLabels, fonts, borderRadius } from '../../lib/theme';

interface StatusPillProps {
  status: AthleteStatus;
  label?: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  const colors = statusColors[status];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label ?? statusLabels[status]}</Text>
    </View>
  );
}

export type EnergySystem = 'atp' | 'glyco' | 'aero' | 'gym' | 'off';

const energyLabels: Record<EnergySystem, string> = {
  atp: 'ATP-PC',
  glyco: 'Glykolytisk',
  aero: 'Aerob',
  gym: 'Styrka',
  off: 'Vila',
};

const energyColors: Record<EnergySystem, { bg: string; text: string; border: string }> = {
  atp: { bg: 'rgba(247,233,40,0.11)', text: '#F7E928', border: 'rgba(247,233,40,0.18)' },
  glyco: { bg: 'rgba(255,95,31,0.11)', text: '#FF5F1F', border: 'rgba(255,95,31,0.18)' },
  aero: { bg: 'rgba(0,212,170,0.10)', text: '#00D4AA', border: 'rgba(0,212,170,0.18)' },
  gym: { bg: 'rgba(167,139,250,0.11)', text: '#A78BFA', border: 'rgba(167,139,250,0.18)' },
  off: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.48)', border: 'rgba(255,255,255,0.08)' },
};

export function EnergySystemPill({ system }: { system: EnergySystem }) {
  const c = energyColors[system];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{energyLabels[system]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
