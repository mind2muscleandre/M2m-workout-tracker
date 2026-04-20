import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { ExerciseCategory, ExerciseTrackingType, MuscleGroup } from '../types/database';
import { listAiExercises, type AiExercise } from '../services/aiExerciseCatalog';
import { supabase } from '../lib/supabase';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessmentProgramBuilder'>;
type SelectedExercise = AiExercise & { target_sets: number; target_reps: string };

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  primary: '#F7E928',
  danger: '#FF3B30',
  success: '#34C759',
};

const DRAFT_DEBOUNCE_MS = 1500;

function sanitizeCategory(v: string): ExerciseCategory {
  if (
    v === 'strength' ||
    v === 'power' ||
    v === 'conditioning' ||
    v === 'mobility' ||
    v === 'injury_prevention'
  ) {
    return v;
  }
  return 'injury_prevention';
}

function sanitizeTracking(v: string): ExerciseTrackingType {
  if (v === 'weight' || v === 'time' || v === 'other') return v;
  return 'other';
}

const parseMuscles = (raw: unknown): MuscleGroup[] =>
  Array.isArray(raw) ? (raw.filter((m) => typeof m === 'string') as MuscleGroup[]) : [];

export default function MovementAssessmentProgramBuilderScreen({ route, navigation }: Props) {
  const { clientId, assessmentId } = route.params;
  const client = useClientStore((s) => s.clients.find((c) => c.id === clientId) ?? null);
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | ''>('');
  const [catalog, setCatalog] = useState<AiExercise[]>([]);
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [title, setTitle] = useState('Åtgärdsprogram');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftWorkoutId, setDraftWorkoutId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localKey = useMemo(
    () => `ma_program_draft:${clientId}:${assessmentId}`,
    [clientId, assessmentId]
  );
  const marker = useMemo(() => `[MA:${assessmentId}]`, [assessmentId]);

  const saveLocal = useCallback(async () => {
    const payload = { title, selected, draftWorkoutId };
    await AsyncStorage.setItem(localKey, JSON.stringify(payload));
  }, [title, selected, draftWorkoutId, localKey]);

  const ensureExercisesInPtDb = useCallback(
    async (items: SelectedExercise[]) => {
      if (!user?.id || items.length === 0) return;
      const rows = items.map((e) => ({
        id: e.id,
        name: e.name,
        category: sanitizeCategory(e.category),
        tracking_type: sanitizeTracking(e.tracking_type),
        muscle_group: e.muscle_group,
        equipment: e.equipment,
        description: e.description,
        video_url: e.video_url,
        is_favorite: false,
        created_by_pt_id: user.id,
      }));
      const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    },
    [user?.id]
  );

  const saveDraftToServer = useCallback(async () => {
    if (!user?.id) throw new Error('Du måste vara inloggad.');
    const datedTitle = title.trim() || `Åtgärdsprogram ${new Date().toISOString().slice(0, 10)}`;
    await ensureExercisesInPtDb(selected);

    let workoutId = draftWorkoutId;
    if (!workoutId) {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          client_id: clientId,
          created_by_pt_id: user.id,
          date: new Date().toISOString().slice(0, 10),
          title: datedTitle,
          notes: `${marker}`,
          total_duration_seconds: null,
          is_template: false,
          template_name: null,
          status: 'draft',
          completed_at: null,
        })
        .select('id')
        .single();
      if (error || !data?.id) throw error ?? new Error('Kunde inte skapa utkast.');
      workoutId = data.id;
      setDraftWorkoutId(data.id);
    } else {
      const { error } = await supabase
        .from('workouts')
        .update({
          title: datedTitle,
          notes: `${marker}`,
          status: 'draft',
        })
        .eq('id', workoutId);
      if (error) throw error;
    }

    const { error: delError } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', workoutId);
    if (delError) throw delError;

    if (selected.length > 0) {
      const rows = selected.map((e, idx) => ({
        workout_id: workoutId,
        exercise_id: e.id,
        order_index: idx,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        notes: null,
        is_superset_with_next: false,
      }));
      const { error: insError } = await supabase.from('workout_exercises').insert(rows);
      if (insError) throw insError;
    }

    await saveLocal();
    return workoutId;
  }, [user?.id, title, ensureExercisesInPtDb, selected, draftWorkoutId, clientId, marker, saveLocal]);

  const publish = useCallback(async () => {
    setSaving(true);
    try {
      const workoutId = await saveDraftToServer();
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'planned' })
        .eq('id', workoutId);
      if (error) throw error;
      await AsyncStorage.removeItem(localKey);
      Alert.alert('Publicerat', 'Åtgärdsprogrammet är publicerat som planerat pass.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Kunde inte publicera', e instanceof Error ? e.message : 'Försök igen.');
    } finally {
      setSaving(false);
    }
  }, [saveDraftToServer, localKey, navigation]);

  const saveDraftNow = useCallback(async () => {
    setSaving(true);
    try {
      await saveDraftToServer();
      Alert.alert('Sparat', 'Utkastet är sparat.');
    } catch (e) {
      Alert.alert('Kunde inte spara utkast', e instanceof Error ? e.message : 'Försök igen.');
    } finally {
      setSaving(false);
    }
  }, [saveDraftToServer]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [remote, local] = await Promise.all([
          supabase
            .from('workouts')
            .select('id,title,notes,status')
            .eq('client_id', clientId)
            .eq('status', 'draft')
            .ilike('notes', `%${marker}%`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          AsyncStorage.getItem(localKey),
        ]);

        if (!alive) return;
        if (remote.data?.id) {
          setDraftWorkoutId(remote.data.id);
          setTitle(remote.data.title ?? 'Åtgärdsprogram');
          const ex = await supabase
            .from('workout_exercises')
            .select('target_sets,target_reps,exercise:exercises(*)')
            .eq('workout_id', remote.data.id)
            .order('order_index', { ascending: true });
          if (ex.data) {
            const mapped: SelectedExercise[] = ex.data
              .map((row: any) => {
                const e = row.exercise;
                if (!e?.id || !e?.name) return null;
                return {
                  id: String(e.id),
                  name: String(e.name),
                  category: sanitizeCategory(String(e.category ?? 'injury_prevention')),
                  tracking_type: sanitizeTracking(String(e.tracking_type ?? 'other')),
                  muscle_group: parseMuscles(e.muscle_group),
                  equipment: e.equipment ?? null,
                  description: e.description ?? null,
                  video_url: e.video_url ?? null,
                  target_sets: Number(row.target_sets ?? 3) || 3,
                  target_reps: String(row.target_reps ?? '10'),
                };
              })
              .filter(Boolean) as SelectedExercise[];
            setSelected(mapped);
          }
        } else if (local) {
          const parsed = JSON.parse(local) as {
            title?: string;
            selected?: SelectedExercise[];
            draftWorkoutId?: string | null;
          };
          if (parsed.title) setTitle(parsed.title);
          if (parsed.selected) setSelected(parsed.selected);
          if (parsed.draftWorkoutId) setDraftWorkoutId(parsed.draftWorkoutId);
        }
      } catch {
        // non-blocking restore
      } finally {
        if (alive) setLoaded(true);
      }
    })();

    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [clientId, marker, localKey]);

  useEffect(() => {
    let alive = true;
    setLoadingCatalog(true);
    listAiExercises({ query, category, limit: 150 })
      .then((rows) => {
        if (alive) setCatalog(rows);
      })
      .catch((e) => {
        if (alive) Alert.alert('Kunde inte hämta övningar', e instanceof Error ? e.message : 'Försök igen.');
      })
      .finally(() => {
        if (alive) setLoadingCatalog(false);
      });
    return () => {
      alive = false;
    };
  }, [query, category]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveLocal();
        await saveDraftToServer();
      } catch {
        // background autosave should not interrupt editing
      }
    }, DRAFT_DEBOUNCE_MS);
  }, [title, selected, loaded, saveLocal, saveDraftToServer]);

  const addExercise = (e: AiExercise) => {
    setSelected((prev) =>
      prev.some((x) => x.id === e.id)
        ? prev
        : [...prev, { ...e, target_sets: 3, target_reps: '10' }]
    );
  };

  const removeExercise = (id: string) => setSelected((prev) => prev.filter((x) => x.id !== id));
  const setSets = (id: string, n: number) =>
    setSelected((prev) => prev.map((x) => (x.id === id ? { ...x, target_sets: Math.max(1, n) } : x)));
  const setReps = (id: string, reps: string) =>
    setSelected((prev) => prev.map((x) => (x.id === id ? { ...x, target_reps: reps.replace(/[^\d,-]/g, '') } : x)));

  if (!client) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>Klienten hittades inte.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Åtgärdsprogram</Text>
        <Text style={styles.subtitle}>{client.name} · screening {assessmentId.slice(0, 8)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Programtitel</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Åtgärdsprogram"
          placeholderTextColor={colors.textSecondary}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex]}
            value={query}
            onChangeText={setQuery}
            placeholder="Sök övning"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setCategory((c) => (c ? '' : 'mobility'))}
          >
            <Text style={styles.filterChipText}>{category || 'Alla kategorier'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Valda övningar ({selected.length})</Text>
        <FlatList
          data={selected}
          keyExtractor={(i) => `sel-${i.id}`}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item, index }) => (
            <View style={styles.selRow}>
              <View style={styles.flex}>
                <Text style={styles.selTitle}>{index + 1}. {item.name}</Text>
                <Text style={styles.mutedSmall}>{item.category}</Text>
              </View>
              <TextInput
                style={styles.smallInput}
                value={String(item.target_sets)}
                onChangeText={(t) => setSets(item.id, Number(t.replace(/\D/g, '')) || 1)}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.smallInput}
                value={item.target_reps}
                onChangeText={(t) => setReps(item.id, t)}
                keyboardType="number-pad"
              />
              <TouchableOpacity onPress={() => removeExercise(item.id)}>
                <Text style={styles.remove}>Ta bort</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>Inga valda övningar ännu.</Text>}
        />
      </View>

      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Övningar från AI-screening DB</Text>
        {loadingCatalog ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(i) => `cat-${i.id}`}
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.catRow} onPress={() => addExercise(item)}>
                <View style={styles.flex}>
                  <Text style={styles.selTitle}>{item.name}</Text>
                  <Text style={styles.mutedSmall}>{item.category}</Text>
                </View>
                <Text style={styles.add}>Lägg till</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, styles.btnGhost, saving && styles.disabled]}
          onPress={saveDraftNow}
          disabled={saving}
        >
          <Text style={styles.btnGhostText}>Spara utkast</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, saving && styles.disabled]}
          onPress={publish}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Publicera</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  back: { color: colors.primary, fontSize: 16, marginBottom: 6 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex: { flex: 1 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  filterChipText: { color: colors.textSecondary, fontSize: 12 },
  sectionWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 10,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  selRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  selTitle: { color: colors.text, fontSize: 14 },
  muted: { color: colors.textSecondary },
  mutedSmall: { color: colors.textSecondary, fontSize: 12 },
  smallInput: {
    width: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  remove: { color: colors.danger, fontSize: 12 },
  add: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  btnGhostText: { color: colors.text },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: '#000', fontWeight: '700' },
  disabled: { opacity: 0.65 },
});
