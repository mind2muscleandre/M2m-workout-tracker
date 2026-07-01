import { supabase } from '../lib/supabase';

export type ExerciseBankItem = {
  id: string;
  name: string;
  area: string | null;
  tags: string[];
  description: string | null;
  videoUrl: string | null;
};

type RawBankRow = {
  id: string;
  Title: string | null;
  URL: string | null;
  Description: string | null;
  tags: string | null;
  area: string | null;
};

function parseTags(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return (parsed as unknown[]).map(String).filter(Boolean);
    } catch {}
  }
  return trimmed
    .split(/[,;|\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function fetchExerciseBankItems(): Promise<ExerciseBankItem[]> {
  const BATCH = 500;
  const rows: RawBankRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('exercise_bank')
      .select('id, Title, URL, Description, tags, area')
      .order('Title', { ascending: true })
      .range(from, from + BATCH - 1);

    if (error) throw error;
    const batch = (data ?? []) as RawBankRow[];
    rows.push(...batch);
    if (batch.length < BATCH) break;
    from += BATCH;
  }

  return rows.map((r) => ({
    id: String(r.id),
    name: r.Title?.trim() || 'Okänd övning',
    area: r.area?.trim() || null,
    tags: parseTags(r.tags),
    description: r.Description ?? null,
    videoUrl: r.URL ?? null,
  }));
}

/**
 * Fetch one corrective exercise per mobility test area from the corrective_exercises table.
 * Returns exercises in area order (one per area, lowest level first).
 * Excludes postural (hållning) — only mobility test areas.
 */
export async function fetchCorrectiveMobilityExercises(): Promise<ExerciseBankItem[]> {
  const { data: mappings, error: mapErr } = await supabase
    .from('corrective_exercises')
    .select('test_area, level, exercise_ids')
    .not('test_area', 'is', null)
    .not('exercise_ids', 'is', null)
    .order('test_area', { ascending: true })
    .order('level', { ascending: true });

  if (mapErr) throw mapErr;
  if (!mappings?.length) return [];

  // One exercise per area (first row per area = lowest level)
  const seenAreas = new Set<string>();
  const selectedIds: string[] = [];
  const idToArea: Record<string, string> = {};

  for (const row of mappings) {
    const area = String(row.test_area ?? '').trim();
    if (!area || seenAreas.has(area)) continue;
    const ids = Array.isArray(row.exercise_ids)
      ? (row.exercise_ids as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
      : [];
    if (ids.length === 0) continue;
    seenAreas.add(area);
    selectedIds.push(ids[0]);
    idToArea[ids[0]] = area;
  }

  if (selectedIds.length === 0) return [];

  const { data: bankRows, error: bankErr } = await supabase
    .from('exercise_bank')
    .select('id, Title, URL, Description, tags, area')
    .in('id', selectedIds);

  if (bankErr) throw bankErr;

  return (bankRows ?? []).map((r) => {
    const row = r as { id: unknown; Title: string | null; URL: string | null; Description: string | null; tags: string | null; area: string | null };
    return {
      id: String(row.id),
      name: row.Title?.trim() || 'Okänd övning',
      area: row.area?.trim() || idToArea[String(row.id)] || null,
      tags: parseTags(row.tags),
      description: row.Description ?? null,
      videoUrl: row.URL ?? null,
    };
  });
}

export function getUniqueAreas(items: ExerciseBankItem[]): string[] {
  const seen = new Set<string>();
  const areas: string[] = [];
  for (const item of items) {
    if (item.area && !seen.has(item.area)) {
      seen.add(item.area);
      areas.push(item.area);
    }
  }
  return areas.sort((a, b) => a.localeCompare(b, 'sv'));
}

export function filterExerciseBankItems(
  items: ExerciseBankItem[],
  area: string | null,
  query: string
): ExerciseBankItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (area && item.area !== area) return false;
    if (!q) return true;
    const haystack = [item.name, item.area, item.description, ...item.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
