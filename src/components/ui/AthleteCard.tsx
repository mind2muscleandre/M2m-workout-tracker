import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts, AthleteStatus, statusColors } from '../../lib/theme';
import { StatusPill } from './StatusPill';
import { ProgressBar } from './ProgressBar';
import { Sparkline } from './Sparkline';
import type { AppBadges as AppBadgesType } from '../../types/platform';

export interface AthleteCardData {
  id: string;
  initials: string;
  name: string;
  sport?: string | null;
  goal?: string;
  goalPct?: number;
  status: AthleteStatus;
  lastSession?: string;
  color?: string;
  selected?: boolean;
  /** Use accent (yellow) border/background instead of teal when selected — desktop detail-panel context */
  selectedAccent?: boolean;
  sparkline?: number[];
  apps?: AppBadgesType | null;
}

interface AthleteCardProps {
  athlete: AthleteCardData;
  onPress: () => void;
}

export function AthleteCard({ athlete, onPress }: AthleteCardProps) {
  const avatarColor = athlete.color ?? coachColors.coach;
  const barColor =
    athlete.status === 'alert' || (athlete.goalPct ?? 0) < 45
      ? coachColors.orange
      : athlete.status === 'recovery'
        ? coachColors.accent
        : coachColors.coach;
  const pctColor =
    athlete.status === 'alert' || (athlete.goalPct ?? 0) < 45
      ? coachColors.orange
      : athlete.status === 'recovery'
        ? coachColors.accent
        : coachColors.coach;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        athlete.selected && (athlete.selectedAccent ? styles.selectedAccent : styles.selected),
        athlete.status === 'alert' && styles.alert,
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: `${avatarColor}30`,
            borderColor: statusColors[athlete.status].text,
          },
        ]}
      >
        <Text style={[styles.initials, { color: '#000' }]}>{athlete.initials}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{athlete.name}</Text>
        {athlete.sport ? (
          <Text style={styles.sport} numberOfLines={1}>{athlete.sport}</Text>
        ) : null}
        {athlete.goal ? (
          <Text style={styles.goal} numberOfLines={1}>{athlete.goal}</Text>
        ) : null}
        {athlete.goalPct !== undefined ? (
          <ProgressBar value={athlete.goalPct} color={barColor} style={styles.bar} />
        ) : null}
        {athlete.sparkline?.length ? (
          <Sparkline values={athlete.sparkline} height={18} />
        ) : null}
      </View>
      <View style={styles.meta}>
        {athlete.apps ? (
          <View style={styles.apps}>
            {(['perform', 'tracker', 'macro', 'goalsetter'] as const).map((key) => {
              const labels = { perform: 'P', tracker: 'T', macro: 'M', goalsetter: 'G' };
              const on = athlete.apps?.[key];
              return (
                <View key={key} style={[styles.appBadge, !on && styles.appBadgeOff]}>
                  <Text style={[styles.appBadgeText, !on && styles.appBadgeTextOff]}>
                    {labels[key]}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {athlete.goalPct !== undefined ? (
          <Text style={[styles.pct, { color: pctColor }]}>
            {athlete.goalPct}
            <Text style={styles.pctUnit}>%</Text>
          </Text>
        ) : null}
        <StatusPill status={athlete.status} />
        {athlete.lastSession ? (
          <Text style={styles.session}>{athlete.lastSession}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  selected: {
    backgroundColor: coachColors.glassBgHi,
    borderColor: 'rgba(0,212,170,0.35)',
  },
  selectedAccent: {
    backgroundColor: coachColors.glassBgAccent,
    borderColor: coachColors.accentHi,
  },
  alert: {
    borderColor: 'rgba(255,95,31,0.26)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: coachColors.fg,
  },
  sport: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
    marginTop: 2,
  },
  goal: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    marginTop: 6,
  },
  bar: { marginTop: 5 },
  meta: { alignItems: 'flex-end', gap: 5 },
  pct: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
  },
  pctUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: coachColors.muted,
  },
  session: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    color: coachColors.muted,
  },
  apps: { flexDirection: 'row', gap: 3, marginBottom: 4 },
  appBadge: {
    width: 15,
    height: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  appBadgeOff: { opacity: 0.25 },
  appBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    color: coachColors.mutedHi,
  },
  appBadgeTextOff: { color: coachColors.muted },
});
