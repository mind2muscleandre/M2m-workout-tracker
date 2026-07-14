import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts } from '../../lib/theme';

type CoverageTone = 'matched' | 'unmatched';

interface CoverageBannerProps {
  tone: CoverageTone;
  message: string;
  fixLabel?: string;
  onFix?: () => void;
}

export function CoverageBanner({ tone, message, fixLabel, onFix }: CoverageBannerProps) {
  const isMatched = tone === 'matched';
  return (
    <GlassCard
      padding={12}
      style={[
        styles.card,
        isMatched ? styles.matched : styles.unmatched,
      ]}
    >
      <View style={[styles.dot, isMatched ? styles.dotGood : styles.dotWarn]} />
      <Text style={styles.text}>
        {message.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <Text key={i} style={isMatched ? styles.boldGood : styles.boldWarn}>
              {part.slice(2, -2)}
            </Text>
          ) : (
            part
          )
        )}
      </Text>
      {!isMatched && fixLabel ? (
        <TouchableOpacity onPress={onFix}>
          <Text style={styles.fix}>{fixLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  matched: { borderColor: 'rgba(74,222,128,0.25)' },
  unmatched: { borderColor: 'rgba(251,146,60,0.3)' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  dotGood: { backgroundColor: '#4ADE80' },
  dotWarn: { backgroundColor: '#FB923C' },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    lineHeight: 17,
  },
  boldGood: { color: '#4ADE80', fontWeight: '600' },
  boldWarn: { color: '#FB923C', fontWeight: '600' },
  fix: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: coachColors.accent,
    marginTop: 3,
    textTransform: 'uppercase',
  },
});
