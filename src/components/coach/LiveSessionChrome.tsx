import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

const REST_RING_SIZE = 64;
const REST_RING_RADIUS = 26;
const REST_RING_STROKE = 5;
const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_RADIUS;

export function SessionProgressBar({
  total,
  currentIndex,
}: {
  total: number;
  currentIndex: number;
}) {
  if (total <= 0) return null;
  return (
    <View style={styles.prog}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progSeg,
            i < currentIndex && styles.progDone,
            i === currentIndex && styles.progCur,
          ]}
        />
      ))}
    </View>
  );
}

export function CurrentExerciseCard({
  tag,
  name,
  subtitle,
  onVideo,
}: {
  tag: string;
  name: string;
  subtitle: string;
  onVideo?: () => void;
}) {
  return (
    <GlassCard variant="coach" style={styles.curEx}>
      <View style={styles.curTop}>
        <Text style={styles.curTag}>{tag}</Text>
        {onVideo ? (
          <Text style={styles.curVid} onPress={onVideo}>
            VIDEO
          </Text>
        ) : null}
      </View>
      <Text style={styles.curName}>{name}</Text>
      <Text style={styles.curSub}>{subtitle}</Text>
    </GlassCard>
  );
}

export function RestTimerRing({
  secondsRemaining,
  totalSeconds = 90,
  label,
  meta,
  onSkip,
}: {
  secondsRemaining: number;
  totalSeconds?: number;
  label: string;
  meta?: string;
  onSkip?: () => void;
}) {
  const pct = Math.min(1, Math.max(0, secondsRemaining / totalSeconds));
  const dashOffset = REST_RING_CIRCUMFERENCE * (1 - pct);
  return (
    <GlassCard style={styles.rest}>
      <View style={styles.rringWrap}>
        <Svg
          width={REST_RING_SIZE}
          height={REST_RING_SIZE}
          viewBox={`0 0 ${REST_RING_SIZE} ${REST_RING_SIZE}`}
        >
          <Circle
            cx={REST_RING_SIZE / 2}
            cy={REST_RING_SIZE / 2}
            r={REST_RING_RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={REST_RING_STROKE}
            fill="none"
          />
          <Circle
            cx={REST_RING_SIZE / 2}
            cy={REST_RING_SIZE / 2}
            r={REST_RING_RADIUS}
            stroke={coachColors.accent}
            strokeWidth={REST_RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${REST_RING_CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            origin={`${REST_RING_SIZE / 2}, ${REST_RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.rringInner}>
          <Text style={styles.rringVal}>{secondsRemaining}s</Text>
        </View>
      </View>
      <View style={styles.restBody}>
        <Text style={styles.restTitle}>{label}</Text>
        <Text style={styles.restMeta}>
          {meta ?? `Nästa set · vila ${(pct * 100).toFixed(0)}% kvar`}
        </Text>
      </View>
      {onSkip ? (
        <Text style={styles.restSkip} onPress={onSkip}>
          HOPPA ÖVER
        </Text>
      ) : null}
    </GlassCard>
  );
}

export function NextExercisePreview({
  name,
  meta,
}: {
  name: string;
  meta: string;
}) {
  return (
    <GlassCard style={styles.next}>
      <Text style={styles.nextN}>NÄSTA</Text>
      <View style={styles.nextMid}>
        <Text style={styles.nextTitle}>{name}</Text>
        <Text style={styles.nextMeta}>{meta}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  prog: { flexDirection: 'row', gap: 5, marginTop: 14 },
  progSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  progDone: { backgroundColor: coachColors.accent },
  progCur: { backgroundColor: coachColors.accent, opacity: 0.5 },
  curEx: {
    marginTop: 16,
    padding: 18,
    borderColor: 'rgba(247,233,40,0.35)',
  },
  curTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  curTag: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: '#17191c',
    backgroundColor: coachColors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontWeight: '500',
  },
  curVid: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: coachColors.accent,
    borderWidth: 1,
    borderColor: 'rgba(247,233,40,0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  curName: {
    fontFamily: fonts.display,
    fontSize: 21,
    fontWeight: '600',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  curSub: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: coachColors.muted,
    marginTop: 3,
  },
  rest: {
    marginTop: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rringWrap: {
    width: REST_RING_SIZE,
    height: REST_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rringInner: {
    position: 'absolute',
    width: REST_RING_SIZE - REST_RING_STROKE * 2,
    height: REST_RING_SIZE - REST_RING_STROKE * 2,
    borderRadius: (REST_RING_SIZE - REST_RING_STROKE * 2) / 2,
    backgroundColor: '#1d2024',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: coachColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  rringVal: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: coachColors.fg,
  },
  restBody: { flex: 1 },
  restTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  restMeta: {
    fontFamily: fonts.mono,
    fontSize: 7.5,
    letterSpacing: 1,
    color: coachColors.muted,
    marginTop: 4,
    lineHeight: 14,
  },
  restSkip: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    color: coachColors.accent,
  },
  next: {
    marginTop: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.7,
  },
  nextN: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: 'rgba(255,255,255,0.24)',
  },
  nextMid: { flex: 1 },
  nextTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: coachColors.mutedHi,
  },
  nextMeta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: 'rgba(255,255,255,0.24)',
    marginTop: 2,
  },
});
