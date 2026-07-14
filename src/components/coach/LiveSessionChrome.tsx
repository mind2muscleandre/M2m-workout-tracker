import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

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
  seconds,
  label,
  onSkip,
}: {
  seconds: number;
  label: string;
  onSkip?: () => void;
}) {
  const pct = Math.min(100, Math.max(0, (seconds / 90) * 100));
  return (
    <GlassCard style={styles.rest}>
      <View style={styles.rring}>
        <Text style={styles.rringVal}>{seconds}s</Text>
      </View>
      <View style={styles.restBody}>
        <Text style={styles.restTitle}>{label}</Text>
        <Text style={styles.restMeta}>Nästa set · vila {pct.toFixed(0)}% kvar</Text>
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
  rring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: coachColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d2024',
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
