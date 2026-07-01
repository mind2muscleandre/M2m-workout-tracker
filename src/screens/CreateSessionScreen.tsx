import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useAuthStore } from '../stores/authStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { CoachShell } from '../components/ui/CoachShell';
import { Button } from '../components/ui/Button';
import { getTodayString } from '../utils/helpers';
import { coachColors, fonts, borderRadius, shadows } from '../lib/theme';
import type { EnergySystem } from '../components/ui/StatusPill';

type Props = StackScreenProps<RootStackParamList, 'CreateSession'>;

const ENERGY_SYSTEMS: { key: EnergySystem; label: string; tone: 'atp' | 'glyco' | 'aero' | 'styrka' }[] = [
  { key: 'atp', label: 'ATP-PC', tone: 'atp' },
  { key: 'glyco', label: 'Glykolytisk', tone: 'glyco' },
  { key: 'aero', label: 'Aerob', tone: 'aero' },
  { key: 'gym', label: 'Styrka', tone: 'styrka' },
];

const SYS_SELECTED: Record<string, { bg: string; border: string; text: string }> = {
  atp: { bg: coachColors.accentDim, border: 'rgba(247,233,40,0.28)', text: coachColors.accent },
  glyco: { bg: coachColors.orangeDim, border: 'rgba(255,95,31,0.28)', text: coachColors.orange },
  aero: { bg: coachColors.coachDim, border: 'rgba(0,212,170,0.28)', text: coachColors.coach },
  styrka: { bg: 'rgba(147,112,219,0.12)', border: 'rgba(147,112,219,0.28)', text: '#9370DB' },
};

const AVATAR_COLORS = [
  coachColors.coach,
  coachColors.accent,
  coachColors.orange,
  '#8B5CF6',
  '#22D3EE',
  '#F43F5E',
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function CreateSessionScreen({ route, navigation }: Props) {
  const presetClientId = route.params?.clientId;
  const { clients, fetchClients } = useClientStore();
  const { createWorkout } = useWorkoutStore();
  const user = useAuthStore((s) => s.user);
  const [clientId, setClientId] = useState(presetClientId ?? '');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [energySystems, setEnergySystems] = useState<EnergySystem[]>(['glyco']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients().catch(() => {});
  }, [fetchClients]);

  useEffect(() => {
    if (presetClientId) setClientId(presetClientId);
    else if (!clientId && clients.length > 0) {
      const first = clients.find((c) => c.is_active);
      if (first) setClientId(first.id);
    }
  }, [presetClientId, clients, clientId]);

  const toggleEnergy = (key: EnergySystem) => {
    setEnergySystems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!clientId) {
      Alert.alert('Välj atlet', 'Du måste välja en atlet för passet.');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      const energyNote =
        energySystems.length > 0
          ? `Energisystem: ${energySystems.join(', ')}`
          : '';
      const combinedNotes = [notes.trim(), energyNote].filter(Boolean).join('\n') || null;

      const workoutId = await createWorkout({
        client_id: clientId,
        created_by_pt_id: user.id,
        date,
        title: title.trim() || 'Coach-session',
        notes: combinedNotes,
        status: 'planned',
        is_template: false,
        template_name: null,
        total_duration_seconds: null,
        completed_at: null,
      });
      navigation.replace('SessionTimer', { clientId, workoutId });
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const activeClients = clients.filter((c) => c.is_active);

  return (
    <CoachShell>
    <ScreenContainer
      title="Ny session"
      scroll={false}
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Grundinformation</Text>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Sessionstitel</Text>
            <TextInput
              style={styles.fieldInput}
              value={title}
              onChangeText={setTitle}
              placeholder="t.ex. Sprint-block vecka 8 — Dag 3"
              placeholderTextColor={coachColors.muted}
            />
          </View>
          <View style={styles.formFieldRow}>
            <View style={styles.formFieldHalf}>
              <Text style={styles.fieldLabel}>Datum</Text>
              <TextInput
                style={styles.fieldInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={coachColors.muted}
              />
            </View>
            <View style={styles.formFieldHalf}>
              <Text style={styles.fieldLabel}>Starttid</Text>
              <TextInput
                style={styles.fieldInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={coachColors.muted}
              />
            </View>
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Beräknad längd (min)</Text>
            <TextInput
              style={styles.fieldInput}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={coachColors.muted}
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Energisystem</Text>
            <View style={styles.sysSelect}>
              {ENERGY_SYSTEMS.map((sys) => {
                const selected = energySystems.includes(sys.key);
                const tone = SYS_SELECTED[sys.tone];
                return (
                  <TouchableOpacity
                    key={sys.key}
                    onPress={() => toggleEnergy(sys.key)}
                    style={[
                      styles.sysOpt,
                      selected && {
                        backgroundColor: tone.bg,
                        borderColor: tone.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sysOptText,
                        selected && { color: tone.text },
                      ]}
                    >
                      {sys.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.formField, styles.formFieldLast]}>
            <Text style={styles.fieldLabel}>Anteckningar</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Fokusområde, coachingpunkter, varningar…"
              placeholderTextColor={coachColors.muted}
              multiline
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Atleter</Text>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Välj 1–4 atleter för sessionen</Text>
            <View style={styles.athletePicker}>
              {activeClients.map((c, i) => {
                const selected = clientId === c.id;
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setClientId(c.id)}
                    style={[styles.athPick, selected && styles.athPickSelected]}
                  >
                    <View style={[styles.athPickAv, { backgroundColor: color }]}>
                      <Text style={styles.athPickAvText}>{initials(c.name)}</Text>
                    </View>
                    <Text style={styles.athPickName}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Övningar</Text>
          <View style={styles.formField}>
            <Text style={styles.fieldHint}>
              Övningar läggs till efter att passet skapats
            </Text>
            <TouchableOpacity
              style={styles.addExBtn}
              onPress={() =>
                Alert.alert(
                  'Lägg till övningar',
                  'Övningar kan läggas till från timer-vyn efter att passet skapats.'
                )
              }
            >
              <Text style={styles.addExBtnText}>+ Lägg till övning från biblioteket</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.actionBar}>
        <Button
          label="Avbryt"
          style={styles.actionBtn}
          onPress={() => navigation.goBack()}
        />
        <Button
          label="Spara utkast"
          style={styles.actionBtn}
          onPress={handleCreate}
          disabled={saving}
        />
        <Button
          label={saving ? 'Skapar…' : 'Starta nu'}
          variant="primary"
          style={styles.actionBtn}
          onPress={handleCreate}
          disabled={saving}
        />
      </View>
    </ScreenContainer>
    </CoachShell>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    fontSize: 20,
    color: coachColors.mutedHi,
    fontFamily: fonts.body,
    paddingHorizontal: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  formSection: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    ...shadows.glass,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.mono,
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  formField: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  formFieldLast: { borderBottomWidth: 0 },
  formFieldRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  formFieldHalf: { flex: 1 },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: coachColors.muted,
    marginBottom: 6,
  },
  fieldHint: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    marginBottom: 10,
  },
  fieldInput: {
    height: 38,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    color: coachColors.fg,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  fieldTextarea: {
    height: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  sysSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sysOpt: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
  },
  sysOptSelected: {},
  sysOptText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
  },
  sysOptTextSelected: {},
  athletePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  athPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingRight: 10,
    paddingLeft: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: coachColors.glassBg,
  },
  athPickSelected: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.28)',
  },
  athPickAv: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athPickAvText: {
    fontFamily: fonts.display,
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  athPickName: { fontSize: 12, fontWeight: '500', color: coachColors.fg, fontFamily: fonts.bodyMedium },
  addExBtn: {
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  addExBtnText: { fontSize: 12, color: coachColors.muted, fontFamily: fonts.body },
  spacer: { height: 80 },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: coachColors.border,
    backgroundColor: coachColors.screenBg,
  },
  actionBtn: { flex: 1 },
});
