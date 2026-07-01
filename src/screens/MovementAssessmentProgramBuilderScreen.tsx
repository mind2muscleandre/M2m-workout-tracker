import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Wraps a library item in a draggable DOM node (web only)
function DraggableLibItem({ exerciseId, children }: { exerciseId: string; children: React.ReactNode }) {
  const ref = useCallback(
    (node: View | null) => {
      if (!node || Platform.OS !== 'web') return;
      const el = node as unknown as HTMLElement;
      el.setAttribute('draggable', 'true');
      el.ondragstart = (e: DragEvent) => {
        e.dataTransfer?.setData('text/plain', exerciseId);
      };
    },
    [exerciseId]
  );
  return <View ref={ref}>{children}</View>;
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { ExerciseCategory, ExerciseTrackingType, MuscleGroup } from '../types/database';
import { listMovementAssessmentsForClient } from '../services/clientAssessments';
import { upsertMovementActionProgramForUser } from '../services/platformPerform';
import { MOBILITY_TESTS } from '../lib/movementAssessment/scoring';
import {
  fetchExerciseBankItems,
  filterExerciseBankItems,
  getUniqueAreas,
  type ExerciseBankItem,
} from '../services/exerciseBankService';
import {
  buildProgramSuggestion,
  type AssessmentSectionScores,
  type SuggestedExercise,
} from '../lib/movementAssessment/programSuggestion';
import { supabase } from '../lib/supabase';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StepIndicator } from '../components/ui/StepIndicator';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessmentProgramBuilder'>;
type SelectedExercise = ExerciseBankItem & { target_sets: number; target_reps: string };

const DRAFT_DEBOUNCE_MS = 1500;
const STEP_LABELS = ['Atlet', 'Bedömning', 'Program', 'Resultat'];
const FREQ_OPTIONS = [
  'Dagligen (rekommenderat)',
  '5 dagar/vecka',
  '3 dagar/vecka',
  'Anpassat schema',
] as const;

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <Text style={styles.sectionDividerText}>{label}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  );
}

function AreaFilterRow({
  areas,
  selected,
  onSelect,
}: {
  areas: string[];
  selected: string | null;
  onSelect: (area: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.areaFilterRow}
    >
      <TouchableOpacity
        style={[styles.areaChip, !selected && styles.areaChipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.areaChipText, !selected && styles.areaChipTextActive]}>Alla</Text>
      </TouchableOpacity>
      {areas.map((area) => (
        <TouchableOpacity
          key={area}
          style={[styles.areaChip, selected === area && styles.areaChipActive]}
          onPress={() => onSelect(area)}
        >
          <Text style={[styles.areaChipText, selected === area && styles.areaChipTextActive]}>
            {area}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

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

function showCoachAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  if (onOk) {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    return;
  }
  Alert.alert(title, message);
}

function ExerciseSuggestionCard({
  exercise,
  checked,
  onToggle,
  onAdd,
}: {
  exercise: ExerciseBankItem;
  checked: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.suggestionCard}>
      <TouchableOpacity
        style={[styles.sugCheck, !checked && styles.sugCheckUnchecked]}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        {checked ? <Text style={styles.sugCheckMark}>✓</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.sugBody} onPress={onAdd} activeOpacity={0.8}>
        <Text style={styles.sugName}>{exercise.name}</Text>
        {exercise.description ? (
          <Text style={styles.sugWhy} numberOfLines={3}>
            {exercise.description}
          </Text>
        ) : null}
        <View style={styles.sugMeta}>
          {exercise.area ? <Text style={styles.sugTag}>{exercise.area}</Text> : null}
          {exercise.tags.slice(0, 2).map((t) => (
            <Text key={t} style={styles.sugTag}>
              {t}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function MovementAssessmentProgramBuilderScreen({ route, navigation }: Props) {
  const { clientId, assessmentId, inviteSent, targetEmail, autoGenerate } = route.params;
  const client = useClientStore((s) => s.clients.find((c) => c.id === clientId) ?? null);
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [allExercises, setAllExercises] = useState<ExerciseBankItem[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('Åtgärdsprogram');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftWorkoutId, setDraftWorkoutId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [weaknessSummary, setWeaknessSummary] = useState<string | null>(null);
  const [weaknessCount, setWeaknessCount] = useState(0);
  const [programFrequency, setProgramFrequency] = useState<string>(FREQ_OPTIONS[0]);
  const [assessmentScores, setAssessmentScores] = useState<AssessmentSectionScores | null>(null);
  const [testAreaScores, setTestAreaScores] = useState<Record<string, number | null>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOverProgram, setDragOverProgram] = useState(false);
  const allExercisesRef = useRef(allExercises);
  const addExerciseCallbackRef = useRef<(e: ExerciseBankItem) => void>(() => {});

  const mobilityLabelMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const t of MOBILITY_TESTS) m[t.key] = t.labelSv;
    m['oh_squat'] = 'OH Squat';
    m['oh_reach'] = 'OH Reach';
    return m;
  }, []);

  const localKey = useMemo(
    () => `ma_program_draft:${clientId}:${assessmentId}`,
    [clientId, assessmentId]
  );
  const marker = useMemo(() => `[MA:${assessmentId}]`, [assessmentId]);

  const displayedExercises = useMemo(
    () => filterExerciseBankItems(allExercises, selectedArea, query),
    [allExercises, selectedArea, query]
  );

  const suggestions = useMemo<SuggestedExercise[]>(() => {
    if (!assessmentScores || allExercises.length === 0) return [];
    return buildProgramSuggestion(assessmentScores, allExercises);
  }, [assessmentScores, allExercises]);

  const saveLocal = useCallback(async () => {
    const payload = { title, selected, draftWorkoutId };
    await AsyncStorage.setItem(localKey, JSON.stringify(payload));
  }, [title, selected, draftWorkoutId, localKey]);

  const ensureExercisesInPtDb = useCallback(
    async (items: SelectedExercise[]): Promise<Map<string, string>> => {
      const idMap = new Map<string, string>();
      if (!user?.id || items.length === 0) return idMap;

      for (const e of items) {
        const row = {
          name: e.name,
          category: 'mobility' as ExerciseCategory,
          tracking_type: 'other' as ExerciseTrackingType,
          muscle_group: e.tags.length > 0
            ? e.tags.map((t) => t.toLowerCase().replace(/\s+/g, '_'))
            : ([] as MuscleGroup[]),
          equipment: null,
          description: e.description,
          video_url: e.videoUrl,
          is_favorite: false,
          created_by_pt_id: user.id,
        };

        const { data: existing, error: lookupError } = await supabase
          .from('pt_exercises')
          .select('id, created_by_pt_id')
          .eq('id', e.id)
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existing?.created_by_pt_id === user.id) {
          const { error } = await supabase.from('pt_exercises').update(row).eq('id', e.id);
          if (error) throw error;
          idMap.set(e.id, e.id);
          continue;
        }

        const ptExerciseId =
          existing && existing.created_by_pt_id !== user.id
            ? String(uuid.v4())
            : e.id;

        const { error } = await supabase.from('pt_exercises').insert({ ...row, id: ptExerciseId });
        if (error) throw error;
        idMap.set(e.id, ptExerciseId);
      }

      return idMap;
    },
    [user?.id]
  );

  const saveDraftToServer = useCallback(async () => {
    if (!user?.id) throw new Error('Du måste vara inloggad.');
    const datedTitle = title.trim() || `Åtgärdsprogram ${new Date().toISOString().slice(0, 10)}`;
    const exerciseIdMap = await ensureExercisesInPtDb(selected);

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
        exercise_id: exerciseIdMap.get(e.id) ?? e.id,
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

  const resolveAthleteUserId = useCallback(async (): Promise<string> => {
    if (client?.client_user_id) return client.client_user_id;

    // Re-fetch from DB in case it was updated after component mounted
    const { data, error } = await supabase
      .from('clients')
      .select('client_user_id, email')
      .eq('id', clientId)
      .maybeSingle();
    if (error) throw error;
    if (data?.client_user_id) return data.client_user_id;

    // Fallback: look up by email in user_profiles
    const email = (data?.email ?? targetEmail ?? '').trim().toLowerCase();
    if (email) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .ilike('email', email)
        .maybeSingle();
      if (profile?.user_id) {
        // Persist the link so future calls don't need this fallback
        await supabase
          .from('clients')
          .update({ client_user_id: profile.user_id })
          .eq('id', clientId)
          .is('client_user_id', null);
        return profile.user_id;
      }
    }

    throw new Error(
      'Klienten saknar kopplad användare i Perform. Tilldela atleten till en användare innan publicering.'
    );
  }, [client?.client_user_id, clientId, targetEmail]);

  const publish = useCallback(async () => {
    if (selected.length === 0) {
      showCoachAlert('Inga övningar', 'Lägg till minst en övning innan du publicerar.');
      return;
    }
    setSaving(true);
    try {
      // Resolve Perform user — optional, we continue even without one
      let athleteUserId: string | null = null;
      try {
        athleteUserId = await resolveAthleteUserId();
      } catch {
        // No Perform user linked — will skip Perform sync below
      }

      const workoutId = await saveDraftToServer();
      const { error: statusErr } = await supabase
        .from('workouts')
        .update({ status: 'planned' })
        .eq('id', workoutId);
      if (statusErr) throw statusErr;

      if (athleteUserId) {
        await upsertMovementActionProgramForUser({
          athleteUserId,
          screeningId: assessmentId,
          title,
          exercises: selected.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            targetSets: exercise.target_sets,
            targetReps: exercise.target_reps,
            area: exercise.area ?? null,
            description: exercise.description ?? null,
            videoUrl: exercise.videoUrl ?? null,
          })),
        });
      }

      await AsyncStorage.removeItem(localKey);

      const message = athleteUserId
        ? 'Åtgärdsprogrammet är publicerat som planerat pass.'
        : 'Passet sparades och aktiverades, men synkades inte till Perform — atleten saknar kopplad Perform-användare.';

      showCoachAlert('Sparat', message, () =>
        navigation.navigate('ClientDetail', { clientId })
      );
    } catch (e) {
      showCoachAlert(
        'Kunde inte spara',
        e instanceof Error ? e.message : 'Försök igen.'
      );
    } finally {
      setSaving(false);
    }
  }, [
    resolveAthleteUserId,
    saveDraftToServer,
    assessmentId,
    title,
    selected,
    localKey,
    navigation,
    clientId,
  ]);

  const saveDraftNow = useCallback(async () => {
    setSaving(true);
    try {
      await saveDraftToServer();
      showCoachAlert('Sparat', 'Utkastet är sparat.');
    } catch (e) {
      showCoachAlert(
        'Kunde inte spara utkast',
        e instanceof Error ? e.message : 'Försök igen.'
      );
    } finally {
      setSaving(false);
    }
  }, [saveDraftToServer]);

  // Hämta alla övningar från exercise_bank en gång – filtreras lokalt
  useEffect(() => {
    let alive = true;
    setLoadingCatalog(true);
    fetchExerciseBankItems()
      .then((items) => {
        if (!alive) return;
        setAllExercises(items);
        setAreas(getUniqueAreas(items));
      })
      .catch((e) => {
        if (alive) {
          showCoachAlert(
            'Kunde inte hämta övningar',
            e instanceof Error ? e.message : 'Försök igen.'
          );
        }
      })
      .finally(() => {
        if (alive) setLoadingCatalog(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Ladda bedömningsresultat och beräkna svaghetssummering + poäng för förslag
  useEffect(() => {
    let alive = true;
    listMovementAssessmentsForClient(clientId, 10)
      .then((rows) => {
        if (!alive) return;
        const assessment = rows.find((r) => r.id === assessmentId) ?? rows[0];
        if (!assessment) return;
        const weak: string[] = [];
        if (assessment.resultat_rorlighet != null && Number(assessment.resultat_rorlighet) < 60) {
          weak.push(`Rörlighet (${(Number(assessment.resultat_rorlighet) / 20).toFixed(1)}/5)`);
        }
        if (assessment.resultat_karna != null && Number(assessment.resultat_karna) < 60) {
          weak.push(`Kärna (${(Number(assessment.resultat_karna) / 20).toFixed(1)}/5)`);
        }
        if (assessment.resultat_stabilitet != null && Number(assessment.resultat_stabilitet) < 60) {
          weak.push(`Stabilitet (${(Number(assessment.resultat_stabilitet) / 20).toFixed(1)}/5)`);
        }
        if (weak.length > 0) {
          setWeaknessCount(weak.length);
          setWeaknessSummary(`${weak.join(' och ')} kräver riktade insatser.`);
        } else {
          setWeaknessCount(0);
          setWeaknessSummary('Bedömningen är i god form. Välj övningar för underhåll och progression.');
        }

        setAssessmentScores({
          mobility: assessment.resultat_rorlighet != null ? Number(assessment.resultat_rorlighet) : null,
          core: assessment.resultat_karna != null ? Number(assessment.resultat_karna) : null,
          stability: assessment.resultat_stabilitet != null ? Number(assessment.resultat_stabilitet) : null,
          postural: assessment.resultat_hallning != null ? Number(assessment.resultat_hallning) : null,
        });

        // Fetch per-test flat scores for the specific assessment
        const flatCols = MOBILITY_TESTS.map((t) => `ror_${t.key}_poang`).join(',') + ',ror_oh_squat_poang,ror_oh_reach_poang';
        void supabase
          .from('movement_assessment_results')
          .select(flatCols)
          .eq('id', assessment.id)
          .maybeSingle()
          .then(({ data: flat }) => {
            if (!alive || !flat) return;
            const flatAny = flat as unknown as Record<string, unknown>;
            const scores: Record<string, number | null> = {};
            for (const t of MOBILITY_TESTS) {
              const v = flatAny[`ror_${t.key}_poang`];
              scores[t.key] = v != null ? Math.round(Number(v)) : null;
            }
            const ohSq = flatAny['ror_oh_squat_poang'];
            if (ohSq != null) scores['oh_squat'] = Math.round(Number(ohSq));
            const ohR = flatAny['ror_oh_reach_poang'];
            if (ohR != null) scores['oh_reach'] = Math.round(Number(ohR));
            setTestAreaScores(scores);
          });
      })
      .catch(() => {
        if (alive) setWeaknessSummary(null);
      });
    return () => {
      alive = false;
    };
  }, [assessmentId, clientId]);

  // Återställ eventuellt sparat utkast
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
            .select('target_sets,target_reps,exercise:pt_exercises(*)')
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
                  area: e.area ?? null,
                  tags: Array.isArray(e.muscle_group)
                    ? e.muscle_group.map(String)
                    : [],
                  description: e.description ?? null,
                  videoUrl: e.video_url ?? null,
                  target_sets: Number(row.target_sets ?? 3) || 3,
                  target_reps: String(row.target_reps ?? '10'),
                };
              })
              .filter(Boolean) as SelectedExercise[];
            setSelected(mapped);
            setCheckedIds(new Set(mapped.map((m) => m.id)));
          }
        } else if (local) {
          const parsed = JSON.parse(local) as {
            title?: string;
            selected?: SelectedExercise[];
            draftWorkoutId?: string | null;
          };
          if (parsed.title) setTitle(parsed.title);
          if (parsed.selected) {
            setSelected(parsed.selected);
            setCheckedIds(new Set(parsed.selected.map((s) => s.id)));
          }
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

  // Autospara utkast lokalt + på servern
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

  const addExercise = useCallback((e: ExerciseBankItem) => {
    setSelected((prev) =>
      prev.some((x) => x.id === e.id)
        ? prev
        : [...prev, { ...e, target_sets: 3, target_reps: '10' }]
    );
    setCheckedIds((prev) => new Set(prev).add(e.id));
  }, []);

  // Keep refs fresh to avoid stale closures in DOM event handlers
  allExercisesRef.current = allExercises;
  addExerciseCallbackRef.current = addExercise;

  // Drop zone ref for the program column — attach once on mount
  const programDropRef = useCallback((node: View | null) => {
    if (!node || Platform.OS !== 'web') return;
    const el = node as unknown as HTMLElement;
    let dragCount = 0;
    el.addEventListener('dragenter', () => { dragCount++; setDragOverProgram(true); });
    el.addEventListener('dragleave', () => { if (--dragCount === 0) setDragOverProgram(false); });
    el.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); });
    el.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      dragCount = 0;
      setDragOverProgram(false);
      const id = e.dataTransfer?.getData('text/plain');
      if (!id) return;
      const ex = allExercisesRef.current.find((x) => x.id === id);
      if (ex) addExerciseCallbackRef.current(ex);
    });
  }, []);

  const toggleExercise = useCallback((e: ExerciseBankItem) => {
    if (checkedIds.has(e.id)) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(e.id);
        return next;
      });
      setSelected((prev) => prev.filter((x) => x.id !== e.id));
    } else {
      addExercise(e);
    }
  }, [checkedIds, addExercise]);

  const removeExercise = (id: string) => {
    setSelected((prev) => prev.filter((x) => x.id !== id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const setSets = (id: string, n: number) =>
    setSelected((prev) =>
      prev.map((x) => (x.id === id ? { ...x, target_sets: Math.max(1, n) } : x))
    );
  const setReps = (id: string, reps: string) =>
    setSelected((prev) =>
      prev.map((x) => (x.id === id ? { ...x, target_reps: reps.replace(/[^\d,-]/g, '') } : x))
    );

  const moveExercise = (index: number, direction: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const cycleFrequency = () => {
    const idx = FREQ_OPTIONS.indexOf(programFrequency as (typeof FREQ_OPTIONS)[number]);
    const next = FREQ_OPTIONS[(idx + 1) % FREQ_OPTIONS.length];
    setProgramFrequency(next);
  };

  if (!client) {
    return (
      <ScreenContainer title="Åtgärdsprogram" scroll>
        <Text style={styles.muted}>Klienten hittades inte.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Åtgärdsprogram"
      subtitle={client.name}
      scroll={false}
      headerRight={
        <Text style={styles.headerAthlete} numberOfLines={1}>
          {client.name}
        </Text>
      }
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: coachColors.coach }]}>Tillbaka</Text>
        </TouchableOpacity>
      }
    >
      {/* ── Top strip (full width, no scroll) ── */}
      <View>
        <StepIndicator current={3} labels={STEP_LABELS} />

        {inviteSent && targetEmail ? (
          <GlassCard padding={14} style={styles.inviteBanner}>
            <Text style={styles.inviteBannerText}>
              Bedömningen sparades. Inbjudan skickad till {targetEmail}.
            </Text>
          </GlassCard>
        ) : null}

        {weaknessSummary ? (
          <View style={styles.weaknessAlert}>
            <Text style={styles.weaknessIcon}>⚠️</Text>
            <View style={styles.weaknessBody}>
              <Text style={styles.weaknessTitle}>
                {weaknessCount > 0
                  ? `${weaknessCount} prioriterade åtgärdsområden identifierade`
                  : 'Åtgärdsområden från bedömningen'}
              </Text>
              <Text style={styles.weaknessSub}>{weaknessSummary}</Text>
            </View>
          </View>
        ) : null}

        <GlassCard padding={12} style={styles.card}>
          <View style={styles.topBarRow}>
            <View style={styles.topBarTitle}>
              <SectionLabel>Programtitel</SectionLabel>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Åtgärdsprogram"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.topBarSearch}>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Sök övning i biblioteket"
                style={styles.search}
              />
              <AreaFilterRow areas={areas} selected={selectedArea} onSelect={setSelectedArea} />
            </View>
          </View>
        </GlassCard>
      </View>

      {/* ── Split layout: program (left) + library (right) ── */}
      <View style={styles.splitRow}>

        {/* LEFT: Program / Valda övningar */}
        <View
          ref={programDropRef}
          style={[styles.splitCol, dragOverProgram && styles.splitColDrop]}
        >
          <Text style={styles.splitColLabel}>
            Åtgärdsprogram{selected.length > 0 ? ` (${selected.length})` : ''}
            {dragOverProgram ? '  ⊕ släpp här' : ''}
          </Text>
          <ScrollView style={styles.splitScroll} contentContainerStyle={styles.splitContent}>
            {selected.length === 0 ? (
              <View style={styles.dropHintBox}>
                <Text style={styles.dropHintText}>Dra övningar hit från biblioteket →</Text>
              </View>
            ) : null}
            {selected.map((item, index) => {
              const areaLabel = item.area ? (mobilityLabelMap[item.area] ?? item.area) : null;
              const areaScore = item.area ? (testAreaScores[item.area] ?? null) : null;
              const scoreColor =
                areaScore == null ? coachColors.muted
                : areaScore >= 90 ? coachColors.coach
                : areaScore >= 75 ? '#a3e635'
                : areaScore >= 60 ? coachColors.accent
                : coachColors.orange;
              return (
                <GlassCard key={item.id} padding={10} style={styles.selectedCard}>
                  <View style={styles.selHeader}>
                    <Text style={styles.selIndex}>{index + 1}</Text>
                    <View style={styles.selReorderBtns}>
                      <TouchableOpacity
                        onPress={() => moveExercise(index, -1)}
                        disabled={index === 0}
                        style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                      >
                        <Text style={styles.reorderBtnText}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveExercise(index, 1)}
                        disabled={index === selected.length - 1}
                        style={[styles.reorderBtn, index === selected.length - 1 && styles.reorderBtnDisabled]}
                      >
                        <Text style={styles.reorderBtnText}>▼</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.selTitle} numberOfLines={2}>{item.name}</Text>
                  </View>
                  {areaLabel ? (
                    <View style={styles.selAreaRow}>
                      <Text style={styles.selAreaLabel}>{areaLabel}</Text>
                      {areaScore != null ? (
                        <View style={[styles.selScorePill, { borderColor: scoreColor }]}>
                          <Text style={[styles.selScoreText, { color: scoreColor }]}>{areaScore}p</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={styles.selControls}>
                    <TextInput
                      style={styles.smallInput}
                      value={String(item.target_sets)}
                      onChangeText={(t) => setSets(item.id, Number(t.replace(/\D/g, '')) || 1)}
                      keyboardType="number-pad"
                    />
                    <Text style={styles.selX}>×</Text>
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
                </GlassCard>
              );
            })}

            <View style={styles.freqCard}>
              <Text style={styles.freqLabel}>Programfrekvens</Text>
              <TouchableOpacity style={styles.freqSelect} onPress={cycleFrequency} activeOpacity={0.8}>
                <Text style={styles.freqSelectText}>{programFrequency}</Text>
                <Text style={styles.freqChevron}>▾</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Button
                label="Tillbaka"
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={saving}
                style={styles.footerBtn}
              />
              <Button
                label="Spara utkast"
                variant="secondary"
                onPress={saveDraftNow}
                disabled={saving}
                style={styles.footerBtn}
              />
              <Button
                label="Spara & publicera →"
                variant="primary"
                onPress={publish}
                loading={saving}
                disabled={saving}
                style={styles.footerBtnPrimary}
              />
            </View>
          </ScrollView>
        </View>

        {/* RIGHT: Library */}
        <View style={styles.splitCol}>
          <Text style={styles.splitColLabel}>Övningsbibliotek</Text>
          <ScrollView style={styles.splitScroll} contentContainerStyle={styles.splitContent}>
            {suggestions.length > 0 ? (
              <>
                <Text style={styles.libSectionHeader}>Förslag utifrån bedömning</Text>
                {suggestions.map((item) => (
                  <DraggableLibItem key={`sug-${item.id}`} exerciseId={item.id}>
                    <View style={styles.suggestionReasonBadge}>
                      <Text style={styles.suggestionReasonText}>{item.suggestionReason}</Text>
                    </View>
                    <ExerciseSuggestionCard
                      exercise={item}
                      checked={checkedIds.has(item.id)}
                      onToggle={() => toggleExercise(item)}
                      onAdd={() => addExercise(item)}
                    />
                  </DraggableLibItem>
                ))}
                <View style={styles.libDivider} />
              </>
            ) : null}

            {loadingCatalog ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : displayedExercises.length === 0 ? (
              <Text style={styles.muted}>
                Inga övningar hittades — prova en annan sökning eller ett annat filter.
              </Text>
            ) : (
              displayedExercises.map((item) => (
                <DraggableLibItem key={item.id} exerciseId={item.id}>
                  <ExerciseSuggestionCard
                    exercise={item}
                    checked={checkedIds.has(item.id)}
                    onToggle={() => toggleExercise(item)}
                    onAdd={() => addExercise(item)}
                  />
                </DraggableLibItem>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 16, marginBottom: 6, fontFamily: fonts.bodyMedium },
  headerAthlete: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.coach,
    flexShrink: 1,
    maxWidth: 140,
    textAlign: 'right',
  },
  inviteBanner: {
    marginBottom: 12,
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderColor: 'rgba(0,212,170,0.25)',
  },
  inviteBannerText: {
    fontSize: 13,
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
  },
  weaknessAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,95,31,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,95,31,0.22)',
    marginBottom: 16,
  },
  weaknessIcon: { fontSize: 20, flexShrink: 0 },
  weaknessBody: { flex: 1 },
  weaknessTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: coachColors.orange,
    fontFamily: fonts.bodySemiBold,
  },
  weaknessSub: {
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: fonts.body,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionDividerText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: coachColors.border,
  },
  card: { marginBottom: 16 },
  search: { maxWidth: '100%', marginBottom: 12 },
  input: {
    height: 40,
    backgroundColor: coachColors.glassBg,
    color: coachColors.fg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  areaFilterRow: {
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: coachColors.border,
    backgroundColor: coachColors.glassBg,
  },
  areaChipActive: {
    backgroundColor: coachColors.coach,
    borderColor: coachColors.coach,
  },
  areaChipText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: coachColors.muted,
  },
  areaChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  sugCheck: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: coachColors.coach,
    backgroundColor: coachColors.coach,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sugCheckUnchecked: { backgroundColor: 'transparent' },
  sugCheckMark: { color: '#000', fontSize: 12, fontWeight: '700' },
  sugBody: { flex: 1, minWidth: 0 },
  sugName: {
    fontSize: 13,
    fontWeight: '600',
    color: coachColors.fg,
    marginBottom: 4,
    fontFamily: fonts.bodySemiBold,
  },
  sugWhy: {
    fontSize: 11,
    color: coachColors.mutedHi,
    lineHeight: 16,
    marginBottom: 6,
    fontFamily: fonts.body,
  },
  sugMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sugTag: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: coachColors.glassBgHi,
    borderWidth: 1,
    borderColor: coachColors.border,
    color: coachColors.muted,
  },
  suggestionReasonBadge: {
    marginTop: 6,
    marginBottom: 2,
  },
  suggestionReasonText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.coach,
  },
  freqCard: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  freqLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    marginBottom: 8,
  },
  freqSelect: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
  },
  freqSelectText: {
    color: coachColors.fg,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  freqChevron: {
    color: coachColors.muted,
    fontSize: 12,
    marginLeft: 8,
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    minHeight: 0,
  },
  splitCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  splitColDrop: {
    borderColor: coachColors.coach,
    borderWidth: 2,
    backgroundColor: 'rgba(0,212,170,0.05)',
  },
  splitColLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: coachColors.mutedHi,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.glassBorder,
  },
  splitScroll: { flex: 1 },
  splitContent: { padding: 8, paddingBottom: 24 },
  dropHintBox: {
    margin: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
  },
  dropHintText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.muted,
    textAlign: 'center',
  },
  libSectionHeader: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: coachColors.muted,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  libDivider: { height: 1, backgroundColor: coachColors.glassBorder, marginVertical: 8 },
  topBarRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  topBarTitle: { flex: 1 },
  topBarSearch: { flex: 2 },
  selectedCard: { marginBottom: 6 },
  selHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  selIndex: { color: coachColors.muted, fontFamily: fonts.mono, fontSize: 12, minWidth: 16, paddingTop: 2 },
  selReorderBtns: { flexDirection: 'column', gap: 2 },
  reorderBtn: { padding: 3, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', minWidth: 22, alignItems: 'center' },
  reorderBtnDisabled: { opacity: 0.25 },
  reorderBtnText: { color: coachColors.fg, fontSize: 10 },
  selTitle: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fonts.bodySemiBold },
  selAreaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  selAreaLabel: { color: coachColors.mutedHi, fontFamily: fonts.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  selScorePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  selScoreText: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '600' },
  selControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selX: { color: coachColors.muted },
  smallInput: {
    width: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  remove: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodyMedium },
  loader: { marginVertical: 16 },
  muted: { color: colors.textSecondary, fontFamily: fonts.body },
  footer: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 8 },
  footerBtn: { flex: 1, height: 48, justifyContent: 'center' },
  footerBtnPrimary: { flex: 2, height: 48, justifyContent: 'center' },
});
