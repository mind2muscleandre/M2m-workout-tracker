import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type WeekSlot = 'done' | 'current' | 'plan' | 'rest';

export type BlockPhaseData = {
  id: string;
  phaseLabel: string;
  title: string;
  meta: string;
  weeks: WeekSlot[];
  dimmed?: boolean;
  accent?: boolean;
  onOpenSessions?: () => void;
  onSaveTemplate?: () => void;
};

const PHASE_COLORS: Record<string, { bg: string; fg: string }> = {
  b1: { bg: 'rgba(96,165,250,0.10)', fg: '#60A5FA' },
  b2: { bg: coachColors.accentDim, fg: coachColors.accent },
  b3: { bg: 'rgba(74,222,128,0.09)', fg: '#4ADE80' },
};

export function BlockPhaseCard({ block }: { block: BlockPhaseData }) {
  const phaseStyle = PHASE_COLORS[block.phaseLabel.toLowerCase()] ?? PHASE_COLORS.b1;

  return (
    <GlassCard
      padding={16}
      style={[
        styles.card,
        block.dimmed && styles.dimmed,
        block.accent && styles.accent,
      ]}
    >
      <View style={styles.top}>
        <Text style={styles.drag}>⠿</Text>
        <View style={[styles.phase, { backgroundColor: phaseStyle.bg }]}>
          <Text style={[styles.phaseText, { color: phaseStyle.fg }]}>{block.phaseLabel}</Text>
        </View>
        <Text style={styles.title}>{block.title}</Text>
        <Text style={styles.menu}>⋯</Text>
      </View>
      <Text style={styles.meta}>{block.meta}</Text>
      <View style={styles.weekRow}>
        {block.weeks.map((w, i) => (
          <View
            key={`${block.id}-w${i}`}
            style={[
              styles.week,
              w === 'done' && styles.weekDone,
              w === 'current' && styles.weekCurrent,
              w === 'plan' && styles.weekPlan,
            ]}
          >
            <Text
              style={[
                styles.weekText,
                w === 'done' && styles.weekTextDone,
                w === 'current' && styles.weekTextCurrent,
              ]}
            >
              V{i + 1}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <TouchableOpacity style={styles.footBtn} onPress={block.onOpenSessions}>
          <Text style={styles.footBtnText}>Öppna pass · {block.weeks.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footBtn, styles.footBtnY]} onPress={block.onSaveTemplate}>
          <Text style={[styles.footBtnText, styles.footBtnTextY]}>Spara som blockmall</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  dimmed: { opacity: 0.55 },
  accent: { borderColor: 'rgba(247,233,40,0.35)' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drag: { color: 'rgba(255,255,255,0.24)', fontSize: 13 },
  phase: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phaseText: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '600',
    color: coachColors.fg,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  menu: { color: 'rgba(255,255,255,0.24)', fontSize: 13 },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  weekRow: { flexDirection: 'row', gap: 5 },
  week: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDone: {
    backgroundColor: coachColors.accent,
    borderStyle: 'solid',
    borderColor: coachColors.accent,
  },
  weekCurrent: {
    borderColor: coachColors.accent,
    borderStyle: 'solid',
  },
  weekPlan: {},
  weekText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: 'rgba(255,255,255,0.24)',
    letterSpacing: 0.3,
  },
  weekTextDone: { color: '#17191c', fontWeight: '500' },
  weekTextCurrent: { color: coachColors.accent },
  foot: { flexDirection: 'row', gap: 8, marginTop: 12 },
  footBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footBtnY: { borderColor: 'rgba(247,233,40,0.3)' },
  footBtnText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.muted,
    textTransform: 'uppercase',
  },
  footBtnTextY: { color: coachColors.accent },
});
