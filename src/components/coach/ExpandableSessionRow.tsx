import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

export type SetRowData = {
  label: string;
  weight: string;
  reps: string;
  rpe?: string;
  pb?: boolean;
  state: 'done' | 'current' | 'todo';
};

export type ExpandableSessionData = {
  id: string;
  badge: string;
  badgeColor?: string;
  title: string;
  meta: string;
  screeningNote?: string;
  sets?: SetRowData[];
};

export function ExpandableSessionRow({
  session,
  defaultExpanded,
}: {
  session: ExpandableSessionData;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultExpanded);

  return (
    <GlassCard padding={0} style={styles.card}>
      <TouchableOpacity style={styles.head} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        <View style={[styles.badge, { backgroundColor: session.badgeColor ?? coachColors.accentDim }]}>
          <Text style={[styles.badgeText, { color: session.badgeColor ? coachColors.fg : coachColors.accent }]}>
            {session.badge}
          </Text>
        </View>
        <View style={styles.mid}>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.meta}>{session.meta}</Text>
        </View>
        <Text style={styles.chev}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open ? (
        <View style={styles.body}>
          {session.screeningNote ? (
            <View style={styles.note}>
              <Text style={styles.noteK}>SCREENING · ANT.</Text>
              <Text style={styles.noteT}>{session.screeningNote}</Text>
            </View>
          ) : null}
          {session.sets?.map((set) => (
            <View key={set.label} style={styles.setRow}>
              <View
                style={[
                  styles.setCircle,
                  set.state === 'done' && styles.setDone,
                  set.state === 'current' && styles.setCurrent,
                  set.state === 'todo' && styles.setTodo,
                ]}
              >
                {set.state === 'done' ? <Text style={styles.setCheck}>✓</Text> : null}
              </View>
              <Text style={styles.setLbl}>{set.label}</Text>
              <Text style={styles.setVal}>
                <Text style={styles.setValB}>{set.weight}</Text> · {set.reps}
              </Text>
              {set.rpe ? (
                <Text style={[styles.rpe, set.rpe.includes('9') && styles.rpeHi]}>{set.rpe}</Text>
              ) : null}
              {set.pb ? <Text style={styles.pb}>PB</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(247,233,40,0.25)',
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '600',
  },
  mid: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  chev: { color: coachColors.muted, fontSize: 10 },
  body: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(96,165,250,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
  },
  noteK: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 1,
    color: '#60A5FA',
    marginBottom: 4,
  },
  noteT: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    lineHeight: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  setCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setDone: { backgroundColor: coachColors.accent },
  setCurrent: {
    borderWidth: 1.5,
    borderColor: coachColors.accent,
  },
  setTodo: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    borderStyle: 'dashed',
  },
  setCheck: { fontSize: 11, fontWeight: '700', color: '#17191c' },
  setLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.24)',
    width: 40,
  },
  setVal: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.fg,
  },
  setValB: { color: coachColors.accent, fontWeight: '500' },
  rpe: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    width: 46,
    textAlign: 'right',
  },
  rpeHi: { color: '#FB923C' },
  pb: {
    fontFamily: fonts.mono,
    fontSize: 7,
    color: '#17191c',
    backgroundColor: '#4ADE80',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontWeight: '500',
    overflow: 'hidden',
  },
});
