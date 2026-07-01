import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import {
  addExerciseToSlots,
  fetchPerformProgram,
  removeExerciseAt,
  reorderExerciseDown,
  reorderExerciseUp,
  resolveSlotsExercises,
  savePerformProgramSlots,
  searchExerciseBank,
  updateExerciseSlot,
  type PerformProgramType,
} from '../services/performPrograms';
import type { PerformProgramSlot, ResolvedPerformExercise } from '../lib/performProgramJson';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'PerformProgramEditor'>;

async function confirmDestructive(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Avbryt', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Ta bort', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function parseSetsInput(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : trimmed;
}

export function PerformProgramEditorScreen({ route, navigation }: Props) {
  const { programId, programType, screeningId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<PerformProgramSlot[]>([]);
  const [exercises, setExercises] = useState<ResolvedPerformExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankResults, setBankResults] = useState<
    Array<{ id: string; Title: string; area: string | null; URL: string | null }>
  >([]);

  const applySlots = useCallback(async (nextSlots: PerformProgramSlot[]) => {
    setSlots(nextSlots);
    const resolved = await resolveSlotsExercises(nextSlots);
    setExercises(resolved);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await fetchPerformProgram(programId, programType as PerformProgramType);
      setSlots(detail.slots);
      setExercises(detail.exercises);
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [programId, programType, navigation]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const handleRemove = async (index: number) => {
    const ok = await confirmDestructive(
      'Ta bort övning',
      'Vill du ta bort denna övning från programmet?'
    );
    if (!ok) return;
    try {
      await applySlots(removeExerciseAt(slots, index));
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    try {
      await applySlots(reorderExerciseUp(slots, index));
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= slots.length - 1) return;
    try {
      await applySlots(reorderExerciseDown(slots, index));
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    }
  };

  const handleSlotFieldChange = (index: number, field: 'sets' | 'reps', rawValue: string) => {
    const value = field === 'sets' ? parseSetsInput(rawValue) : rawValue;
    const nextSlots = updateExerciseSlot(slots, index, { [field]: value });
    setSlots(nextSlots);
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setBankLoading(true);
    try {
      const rows = await searchExerciseBank({ query: bankQuery, limit: 40 });
      setBankResults(rows);
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    } finally {
      setBankLoading(false);
    }
  };

  const searchBank = async (query: string) => {
    setBankQuery(query);
    setBankLoading(true);
    try {
      const rows = await searchExerciseBank({ query, limit: 40 });
      setBankResults(rows);
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    } finally {
      setBankLoading(false);
    }
  };

  const handleAdd = (exerciseId: string, area: string | null) => {
    applySlots(addExerciseToSlots(slots, exerciseId, area))
      .then(() => setPickerOpen(false))
      .catch((e) => Alert.alert('Fel', (e as Error).message));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePerformProgramSlots(programId, programType as PerformProgramType, slots);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Programmet har uppdaterats.');
      } else {
        Alert.alert('Sparat', 'Programmet har uppdaterats.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer title="Åtgärdsprogram" scroll>
        <ActivityIndicator color={coachColors.coach} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  const typeLabel = programType === 'mobility' ? 'Mobilitet' : 'OH-squat';

  return (
    <ScreenContainer title="Åtgärdsprogram" scroll>
      <GlassCard style={styles.card}>
        <SectionLabel>{typeLabel}</SectionLabel>
        <Text style={styles.meta}>
          {exercises.length} övningar
          {screeningId ? ` · screening ${String(screeningId).slice(0, 8)}…` : ''}
        </Text>
      </GlassCard>

      {exercises.length === 0 ? (
        <Text style={styles.muted}>Inga övningar i programmet.</Text>
      ) : (
        exercises.map((ex, listIndex) => (
          <GlassCard key={`slot-${listIndex}-${ex.exerciseId ?? ex.name}`} style={styles.exerciseCard}>
            <View style={styles.exerciseRow}>
              <View style={styles.orderCol}>
                <TouchableOpacity
                  onPress={() => handleMoveUp(listIndex)}
                  disabled={listIndex === 0}
                  style={[styles.orderBtn, listIndex === 0 && styles.orderBtnDisabled]}
                >
                  <Text style={styles.orderBtnText}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMoveDown(listIndex)}
                  disabled={listIndex === exercises.length - 1}
                  style={[
                    styles.orderBtn,
                    listIndex === exercises.length - 1 && styles.orderBtnDisabled,
                  ]}
                >
                  <Text style={styles.orderBtnText}>↓</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.exerciseBody}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>{ex.område ?? '—'}</Text>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.fieldLabel}>Set</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={ex.sets != null ? String(ex.sets) : ''}
                      onChangeText={(v) => handleSlotFieldChange(listIndex, 'sets', v)}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={coachColors.muted}
                    />
                  </View>
                  <View style={[styles.fieldCol, styles.fieldColWide]}>
                    <Text style={styles.fieldLabel}>Reps</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={ex.reps != null ? String(ex.reps) : ''}
                      onChangeText={(v) => handleSlotFieldChange(listIndex, 'reps', v)}
                      placeholder="12 höger + 12 vänster"
                      placeholderTextColor={coachColors.muted}
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemove(listIndex)} hitSlop={8}>
                <Text style={styles.removeBtn}>Ta bort</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))
      )}

      <View style={styles.actions}>
        <Button label="Lägg till övning" variant="secondary" onPress={openPicker} />
        <Button label={saving ? 'Sparar…' : 'Spara program'} onPress={handleSave} disabled={saving} />
      </View>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Lägg till övning</Text>
            <SearchBar value={bankQuery} onChangeText={searchBank} placeholder="Sök i övningsbanken" />
            {bankLoading ? (
              <ActivityIndicator color={coachColors.coach} style={{ marginVertical: 16 }} />
            ) : (
              <FlatList
                data={bankResults}
                keyExtractor={(item) => item.id}
                style={styles.bankList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bankRow}
                    onPress={() => handleAdd(item.id, item.area)}
                  >
                    <Text style={styles.bankTitle}>{item.Title}</Text>
                    {item.area ? <Text style={styles.bankArea}>{item.area}</Text> : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.muted}>Inga övningar hittades.</Text>}
              />
            )}
            <Button label="Stäng" variant="secondary" onPress={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  meta: { fontSize: 13, color: coachColors.muted, marginTop: 4, fontFamily: fonts.body },
  exerciseCard: { padding: 14, marginBottom: 8 },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderCol: { gap: 4, paddingTop: 2 },
  orderBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: coachColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: coachColors.glassBg,
  },
  orderBtnDisabled: { opacity: 0.35 },
  orderBtnText: { fontSize: 14, color: coachColors.fg, fontFamily: fonts.bodyMedium },
  exerciseBody: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: coachColors.fg, fontFamily: fonts.body },
  exerciseMeta: { fontSize: 12, color: coachColors.muted, marginTop: 4, fontFamily: fonts.body },
  fieldRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  fieldCol: { flex: 1 },
  fieldColWide: { flex: 2 },
  fieldLabel: { fontSize: 10, color: coachColors.muted, marginBottom: 4, fontFamily: fonts.mono },
  fieldInput: {
    borderWidth: 1,
    borderColor: coachColors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
    color: coachColors.fg,
    fontFamily: fonts.body,
    fontSize: 13,
    backgroundColor: coachColors.glassBg,
  },
  removeBtn: { fontSize: 12, color: '#ff8a8a', fontFamily: fonts.bodyMedium, paddingTop: 2 },
  actions: { gap: 8, marginTop: 16, marginBottom: 24 },
  muted: { fontSize: 13, color: coachColors.muted, fontFamily: fonts.body, paddingVertical: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: coachColors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.fg,
    fontFamily: fonts.display,
  },
  bankList: { maxHeight: 320 },
  bankRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  bankTitle: { fontSize: 14, color: coachColors.fg, fontFamily: fonts.body },
  bankArea: { fontSize: 11, color: coachColors.muted, marginTop: 2, fontFamily: fonts.mono },
});
