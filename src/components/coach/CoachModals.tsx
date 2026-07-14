import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ModalShell } from '../ui/ModalShell';
import { TogglePill } from '../ui/TogglePill';
import { Button } from '../ui/Button';
import { coachColors, fonts, borderRadius } from '../../lib/theme';

const TEMPLATE_LEVELS = ['Pass', 'Block', 'Helt program'] as const;
const TAGS = ['Hockey', 'Maxstyrka', 'Off-season', 'Fotboll', 'Rehab'];

export function SaveTemplateSheet({
  visible,
  onClose,
  onSave,
  preview,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  preview?: string;
}) {
  const [level, setLevel] = useState<(typeof TEMPLATE_LEVELS)[number]>('Block');
  const [name, setName] = useState('Maxstyrka hockey 4v');
  const [tags, setTags] = useState<string[]>(['Hockey', 'Maxstyrka']);
  const [withProgression, setWithProgression] = useState(true);
  const [withKrav, setWithKrav] = useState(true);

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Spara som mall"
      subtitle="Mallen blir återanvändbar för alla dina klienter — atletdata följer aldrig med."
      scrollable
    >
      <Text style={styles.lbl}>Nivå</Text>
      <View style={styles.chips}>
        {TEMPLATE_LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.chip, level === l && styles.chipOn]}
            onPress={() => setLevel(l)}
          >
            <Text style={[styles.chipText, level === l && styles.chipTextOn]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.lbl}>Mallnamn</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={coachColors.muted}
      />

      <Text style={styles.lbl}>Taggar</Text>
      <View style={styles.chips}>
        {TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <TouchableOpacity
              key={t}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() =>
                setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
              }
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Innehåll som sparas</Text>
          <Text style={styles.previewMeta}>{preview}</Text>
        </View>
      ) : null}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Ta med %-baserad progression (anpassas per atlets 1RM)</Text>
        <TogglePill checked={withProgression} onChange={setWithProgression} label="" />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Ta med kravtaggar för kravmatchning</Text>
        <TogglePill checked={withKrav} onChange={setWithKrav} label="" />
      </View>

      <Button label="Spara blockmall" variant="primary" onPress={() => onSave(name)} />
    </ModalShell>
  );
}

export function BookSessionSheet({
  visible,
  onClose,
  athleteName,
  onBook,
}: {
  visible: boolean;
  onClose: () => void;
  athleteName: string;
  onBook: (date: string, time: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(15);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const times = ['08:00', '09:00', '10:30', '14:00', '16:00'];

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Boka session"
      subtitle={`För ${athleteName}`}
      scrollable
    >
      <View style={styles.cal}>
        <View style={styles.calHead}>
          <Text style={styles.calMonth}>JULI 2026</Text>
          <Text style={styles.calNav}>‹ ›</Text>
        </View>
        <View style={styles.dgrid}>
          {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d) => (
            <Text key={d} style={styles.dh}>{d}</Text>
          ))}
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.d, selectedDay === d && styles.dSel]}
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dText, selectedDay === d && styles.dTextSel]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.lbl}>Tid</Text>
      <View style={styles.times}>
        {times.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tm, selectedTime === t && styles.tmOn]}
            onPress={() => setSelectedTime(t)}
          >
            <Text style={[styles.tmText, selectedTime === t && styles.tmTextOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        label="Boka session"
        variant="primary"
        onPress={() => onBook(`2026-07-${selectedDay}`, selectedTime)}
      />
    </ModalShell>
  );
}

export type SwapSuggestion = {
  id: string;
  name: string;
  meta: string;
  screeningMatch?: boolean;
};

export function ExerciseSwapSheet({
  visible,
  onClose,
  currentName,
  suggestions,
  onSelect,
  onKeepSets,
  onToggleKeepSets,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  suggestions: SwapSuggestion[];
  onSelect: (id: string) => void;
  onKeepSets: boolean;
  onToggleKeepSets: (v: boolean) => void;
}) {
  const [filter, setFilter] = useState<'alla' | 'screening' | 'gym'>('alla');

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Byt övning"
      subtitle={`Ersätter ${currentName} — set och logg sparas om du väljer behåll set.`}
      scrollable
    >
      <View style={styles.chips}>
        {(['alla', 'screening', 'gym'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
              {f === 'alla' ? 'Alla' : f === 'screening' ? 'Screening' : 'Gym'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.keepinfo}>
        <Text style={styles.keepIcon}>✓</Text>
        <Text style={styles.keepText}>
          <Text style={styles.keepBold}>Behåll set och logg</Text> — byter bara övningsnamn och mål.
        </Text>
        <TogglePill checked={onKeepSets} onChange={onToggleKeepSets} label="" />
      </View>

      {suggestions
        .filter((s) => {
          if (filter === 'screening') return s.screeningMatch;
          if (filter === 'gym') return !s.screeningMatch;
          return true;
        })
        .map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.swaprow}
            onPress={() => onSelect(s.id)}
          >
            <View style={styles.swapThumb}>
              <Text style={styles.swapThumbTxt}>↗</Text>
            </View>
            <View style={styles.swapMid}>
              <Text style={styles.swapTitle}>{s.name}</Text>
              <Text style={styles.swapMeta}>
                {s.screeningMatch ? (
                  <Text style={styles.swapMetaB}>Screening-match · </Text>
                ) : null}
                {s.meta}
              </Text>
            </View>
            <Text style={styles.swapAdd}>+</Text>
          </TouchableOpacity>
        ))}

      <Button label="Avbryt" variant="secondary" onPress={onClose} />
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  lbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    color: coachColors.muted,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipOn: {
    backgroundColor: coachColors.accent,
    borderColor: coachColors.accent,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
  },
  chipTextOn: {
    color: '#17191c',
    fontFamily: fonts.bodySemiBold,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(247,233,40,0.45)',
    borderRadius: 15,
    padding: 13,
    fontFamily: fonts.body,
    fontSize: 14,
    color: coachColors.fg,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  preview: {
    marginTop: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  previewTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: coachColors.fg,
  },
  previewMeta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 4,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.mutedHi,
    lineHeight: 17,
  },
  cal: {
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  calHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calMonth: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: coachColors.mutedHi,
  },
  calNav: { color: coachColors.muted, fontSize: 11 },
  dgrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dh: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 7,
    color: 'rgba(255,255,255,0.24)',
    paddingVertical: 4,
  },
  d: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  dSel: { backgroundColor: coachColors.accent },
  dText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.mutedHi,
  },
  dTextSel: { color: '#17191c', fontWeight: '700' },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tm: {
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  tmOn: {
    backgroundColor: coachColors.accent,
    borderColor: coachColors.accent,
  },
  tmText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.mutedHi,
  },
  tmTextOn: { color: '#17191c', fontWeight: '500' },
  keepinfo: {
    marginTop: 14,
    padding: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(74,222,128,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
  },
  keepIcon: { color: '#4ADE80', fontSize: 12, marginTop: 1 },
  keepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.mutedHi,
    lineHeight: 16,
  },
  keepBold: { color: coachColors.fg, fontFamily: fonts.bodySemiBold },
  swaprow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  swapThumb: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  swapThumbTxt: { fontSize: 14, color: coachColors.muted },
  swapMid: { flex: 1, minWidth: 0 },
  swapTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: coachColors.fg,
  },
  swapMeta: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 3,
  },
  swapMetaB: { color: coachColors.accent, fontWeight: '500' },
  swapAdd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(247,233,40,0.45)',
    color: coachColors.accent,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
  },
});
