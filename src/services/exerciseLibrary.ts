import { supabase } from '../lib/supabase';
import { COACH_DB, PLATFORM_DB } from '../lib/dbTables';
import { resolveUserId } from '../lib/resolveUserId';
import type { Exercise, ExerciseCategory, ExerciseInsert, ExerciseTrackingType } from '../types/database';
import type { LibraryCategory } from '../utils/helpers';
import { getEnergyLabelForCategory, getMuscleGroupLabel, getTrackingTypeLabel } from '../utils/helpers';

export type { LibraryCategory } from '../utils/helpers';

export type LibraryExerciseSource = 'exercise_bank' | 'exercises' | 'pt_exercises';

export type LibraryExercise = {
  id: string;
  name: string;
  source: LibraryExerciseSource;
  category: LibraryCategory;
  muscleLabel: string | null;
  energyLabel: string | null;
  trackingLabel: string | null;
  tags: string[];
  area: string | null;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  gifUrl: string | null;
  isFavorite?: boolean;
  isMine?: boolean;
  raw?: unknown;
};

export const LIBRARY_CATEGORIES: { id: LibraryCategory | 'alla'; label: string }[] = [
  { id: 'alla', label: 'Alla' },
  { id: 'styrka', label: 'Styrka' },
  { id: 'kondition', label: 'Kondition' },
  { id: 'rorlighet', label: 'Rörlighet' },
  { id: 'koordination', label: 'Koordination' },
  { id: 'explosion', label: 'Explosivitet' },
];

const BANK_BATCH_SIZE = 500;

type ExerciseBankRow = {
  id: string;
  Title: string;
  URL: string | null;
  Description: string | null;
  tags: string | null;
  area: string | null;
};

type PlatformExerciseRow = {
  id: string;
  name: string;
  muscle_groups: string[] | null;
  movement_type: string | null;
  description: string | null;
  video_url: string | null;
  image_url: string | null;
  gif_url: string | null;
  name_i18n: Record<string, string> | null;
  is_system: boolean;
};

const PT_CATEGORY_MAP: Record<ExerciseCategory, LibraryCategory> = {
  strength: 'styrka',
  power: 'explosion',
  conditioning: 'kondition',
  mobility: 'rorlighet',
  injury_prevention: 'rorlighet',
};

const MOVEMENT_TYPE_MAP: Record<string, LibraryCategory> = {
  conditioning: 'kondition',
  mobility: 'rorlighet',
  rotation: 'koordination',
  push: 'styrka',
  pull: 'styrka',
  hinge: 'styrka',
  squat: 'styrka',
  carry: 'styrka',
  other: 'styrka',
};

function parseTags(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed
              .map((entry) => String(entry ?? '').trim())
              .filter(Boolean)
          ),
        ];
      }
    } catch {
      // fall through to delimiter parsing
    }
  }

  return [
    ...new Set(
      trimmed
        .split(/[,;|\n]+/)
        .map((t) => t.trim().replace(/^["'[\]]+|["'[\]]+$/g, ''))
        .filter(Boolean)
    ),
  ];
}

function textBlob(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => !!p?.trim())
    .join(' ')
    .toLowerCase();
}

export function resolveBankCategory(area: string | null, tags: string[]): LibraryCategory {
  const blob = textBlob([area, ...tags]);
  if (/explos|plyo|hopp|sprint|atp|power/.test(blob)) return 'explosion';
  if (/kondition|aerob|glykol|cardio|löp|rowd/.test(blob)) return 'kondition';
  if (/koord|balans|stabilitet|get-up|rotation/.test(blob)) return 'koordination';
  if (/styrk|press|squat|deadlift|bänk|marklyft/.test(blob)) return 'styrka';
  return 'rorlighet';
}

export function resolveLibraryCategoryFromMovementType(movementType: string | null): LibraryCategory {
  if (!movementType) return 'styrka';
  return MOVEMENT_TYPE_MAP[movementType.toLowerCase()] ?? 'styrka';
}

function mapPtExercise(exercise: Exercise): LibraryExercise {
  const category = PT_CATEGORY_MAP[exercise.category] ?? 'styrka';
  const muscleLabel =
    exercise.muscle_group.length > 0
      ? getMuscleGroupLabel(exercise.muscle_group[0])
      : null;

  return {
    id: exercise.id,
    name: exercise.name,
    source: 'pt_exercises',
    category,
    muscleLabel,
    energyLabel: getEnergyLabelForCategory(category),
    trackingLabel: getTrackingTypeLabel(exercise.tracking_type),
    tags: exercise.muscle_group.map(getMuscleGroupLabel),
    area: null,
    description: exercise.description,
    videoUrl: exercise.video_url,
    imageUrl: null,
    gifUrl: null,
    isFavorite: exercise.is_favorite,
    isMine: true,
    raw: exercise,
  };
}

function mapBankRow(row: ExerciseBankRow): LibraryExercise {
  const tags = parseTags(row.tags);
  const category = resolveBankCategory(row.area, tags);
  const muscleLabel = row.area?.trim() || tags[0] || null;

  return {
    id: String(row.id),
    name: row.Title?.trim() || 'Okänd övning',
    source: 'exercise_bank',
    category,
    muscleLabel,
    energyLabel: getEnergyLabelForCategory(category),
    trackingLabel: category === 'rorlighet' ? 'Tid' : 'Reps',
    tags,
    area: row.area,
    description: row.Description,
    videoUrl: row.URL,
    imageUrl: null,
    gifUrl: null,
    isMine: false,
    raw: row,
  };
}

function resolvePlatformDisplayName(row: PlatformExerciseRow): string {
  return row.name_i18n?.sv?.trim() || row.name_i18n?.en?.trim() || row.name;
}

function mapPlatformRow(row: PlatformExerciseRow): LibraryExercise {
  const category = resolveLibraryCategoryFromMovementType(row.movement_type);
  const muscleLabel =
    row.muscle_groups?.length ? getMuscleGroupLabel(row.muscle_groups[0]) : null;

  return {
    id: row.id,
    name: resolvePlatformDisplayName(row),
    source: 'exercises',
    category,
    muscleLabel,
    energyLabel: getEnergyLabelForCategory(category),
    trackingLabel: category === 'kondition' ? 'Tid/Distans' : 'Vikt/Reps',
    tags: (row.muscle_groups ?? []).map(getMuscleGroupLabel),
    area: null,
    description: row.description,
    videoUrl: row.video_url,
    imageUrl: row.image_url,
    gifUrl: row.gif_url,
    isMine: false,
    raw: row,
  };
}

async function fetchAllExerciseBankRows(): Promise<ExerciseBankRow[]> {
  const rows: ExerciseBankRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(PLATFORM_DB.exerciseBank)
      .select('id, Title, URL, Description, tags, area')
      .order('Title', { ascending: true })
      .range(from, from + BANK_BATCH_SIZE - 1);

    if (error) throw error;
    const batch = (data ?? []) as ExerciseBankRow[];
    rows.push(...batch);
    if (batch.length < BANK_BATCH_SIZE) break;
    from += BANK_BATCH_SIZE;
  }

  return rows;
}

async function fetchSystemPlatformExercises(): Promise<PlatformExerciseRow[]> {
  const rows: PlatformExerciseRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(PLATFORM_DB.platformExercises)
      .select(
        'id, name, muscle_groups, movement_type, description, video_url, image_url, gif_url, name_i18n, is_system'
      )
      .eq('is_system', true)
      .order('name', { ascending: true })
      .range(from, from + BANK_BATCH_SIZE - 1);

    if (error) throw error;
    const batch = (data ?? []) as PlatformExerciseRow[];
    rows.push(...batch);
    if (batch.length < BANK_BATCH_SIZE) break;
    from += BANK_BATCH_SIZE;
  }

  return rows;
}

async function fetchPtExercisesForLibrary(): Promise<Exercise[]> {
  const userId = await resolveUserId();
  const { data, error } = await supabase
    .from(COACH_DB.exercises)
    .select('*')
    .eq('created_by_pt_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Exercise[];
}

function dedupeKey(item: LibraryExercise): string {
  return `${item.source}:${item.id}`;
}

export async function fetchLibraryExercises(): Promise<LibraryExercise[]> {
  const [bankRows, platformRows, ptRows] = await Promise.all([
    fetchAllExerciseBankRows().catch(() => [] as ExerciseBankRow[]),
    fetchSystemPlatformExercises().catch(() => [] as PlatformExerciseRow[]),
    fetchPtExercisesForLibrary().catch(() => [] as Exercise[]),
  ]);

  const seen = new Set<string>();
  const merged: LibraryExercise[] = [];

  const push = (item: LibraryExercise) => {
    const key = dedupeKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  for (const row of bankRows) push(mapBankRow(row));
  for (const row of platformRows) push(mapPlatformRow(row));
  for (const row of ptRows) push(mapPtExercise(row));

  return merged.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export type LibraryFilterInput = {
  category?: LibraryCategory | 'alla' | null;
  search?: string;
};

export function filterLibraryExercises(
  items: LibraryExercise[],
  input: LibraryFilterInput
): LibraryExercise[] {
  const category = input.category ?? 'alla';
  const query = (input.search ?? '').trim().toLowerCase();

  return items.filter((item) => {
    const categoryMatch = category === 'alla' || item.category === category;
    if (!categoryMatch) return false;
    if (!query) return true;

    const haystack = [
      item.name,
      item.muscleLabel,
      item.area,
      item.energyLabel,
      item.trackingLabel,
      ...item.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function ptCategoryFromLibrary(category: LibraryCategory): ExerciseCategory {
  switch (category) {
    case 'explosion':
      return 'power';
    case 'kondition':
      return 'conditioning';
    case 'rorlighet':
      return 'mobility';
    case 'koordination':
      return 'mobility';
    default:
      return 'strength';
  }
}

function trackingTypeFromLabel(label: string | null): ExerciseTrackingType {
  if (label === 'Tid' || label === 'Tid/Distans') return 'time';
  if (label === 'Vikt/Reps') return 'weight';
  return 'other';
}

/** Copy a catalog exercise into pt_exercises so it can be used in workouts. */
export async function importLibraryExerciseToPt(
  item: LibraryExercise,
  userId: string
): Promise<Exercise> {
  if (item.source === 'pt_exercises' && item.raw) {
    return item.raw as Exercise;
  }

  const muscle_group =
    item.source === 'pt_exercises'
      ? ((item.raw as Exercise | undefined)?.muscle_group ?? [])
      : item.tags.length > 0
        ? item.tags.map((t) => t.toLowerCase().replace(/\s+/g, '_'))
        : item.muscleLabel
          ? [item.muscleLabel.toLowerCase().replace(/\s+/g, '_')]
          : [];

  const insert: ExerciseInsert = {
    name: item.name,
    category: ptCategoryFromLibrary(item.category),
    tracking_type: trackingTypeFromLabel(item.trackingLabel),
    muscle_group: muscle_group as Exercise['muscle_group'],
    equipment: null,
    description: item.description,
    video_url: item.videoUrl,
    is_favorite: false,
    created_by_pt_id: userId,
  };

  const { data, error } = await supabase
    .from(COACH_DB.exercises)
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Exercise;
}
