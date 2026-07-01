import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { EnergySystemPill } from './StatusPill';

export type SessionStatus = 'live' | 'planned' | 'completed';

interface SessionCardProps {
  title: string;
  athlete?: string;
  time?: string;
  system?: 'atp' | 'glyco' | 'aero';
  status: SessionStatus;
  onPress?: () => void;
}

export function SessionCard({
  title,
  athlete,
  time,
  system,
  status,
  onPress,
}: SessionCardProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'live') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [status, pulse]);

  const barColor =
    status === 'live'
      ? coachColors.coach
      : status === 'planned'
        ? coachColors.accent
        : coachColors.muted;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.card}
      disabled={!onPress}
    >
      <View style={[styles.statusBar, { backgroundColor: barColor }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          {time ? <Text style={styles.time}>{time}</Text> : null}
          {status === 'live' ? (
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        {athlete ? <Text style={styles.athlete}>{athlete}</Text> : null}
        {system ? <EnergySystemPill system={system} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statusBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '500',
    color: coachColors.coach,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: coachColors.coach,
  },
  liveText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '700',
    color: coachColors.coach,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: coachColors.fg,
  },
  athlete: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    color: coachColors.muted,
  },
});
