import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AiExercise = {
  id: string
  name: string
  category: string
  tracking_type: string
  muscle_group: string[]
  equipment: string | null
  description: string | null
  video_url: string | null
}

export type ListScreeningExercisesInput = {
  query?: string
  category?: string | null
  limit?: number
}

type ScreeningCategory = 'mobility' | 'injury_prevention'

type ExerciseMeta = {
  category: ScreeningCategory
  test_area: string | null
  level: number | null
}

const BANK_BATCH_SIZE = 100

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const msg = String(error.message ?? '').toLowerCase()
  return error.code === '42P01' || msg.includes('does not exist') || msg.includes('relation')
}

async function fetchMappingTable(
  admin: SupabaseClient,
  table: string,
  screeningCategory: ScreeningCategory
): Promise<Map<string, ExerciseMeta>> {
  const { data, error } = await admin.from(table).select('test_area, level, exercise_ids')
  if (error) {
    if (isMissingTableError(error)) return new Map()
    throw error
  }

  const map = new Map<string, ExerciseMeta>()
  for (const row of data ?? []) {
    const testArea = row.test_area != null ? String(row.test_area) : null
    const level = row.level != null ? Number(row.level) : null
    const ids = Array.isArray(row.exercise_ids) ? row.exercise_ids : []
    for (const rawId of ids) {
      const id = String(rawId ?? '').trim()
      if (!id) continue
      map.set(id, { category: screeningCategory, test_area: testArea, level })
    }
  }
  return map
}

async function fetchExerciseBankRows(
  admin: SupabaseClient,
  ids: string[]
): Promise<Array<Record<string, unknown>>> {
  if (ids.length === 0) return []

  const rows: Array<Record<string, unknown>> = []
  for (let i = 0; i < ids.length; i += BANK_BATCH_SIZE) {
    const batch = ids.slice(i, i + BANK_BATCH_SIZE)
    const { data, error } = await admin
      .from('exercise_bank')
      .select('id, Title, URL, Description, tags, area')
      .in('id', batch)
    if (error) throw error
    rows.push(...((data ?? []) as Array<Record<string, unknown>>))
  }
  return rows
}

function matchesQuery(row: Record<string, unknown>, query: string): boolean {
  if (!query) return true
  const title = String(row.Title ?? '').toLowerCase()
  const desc = String(row.Description ?? '').toLowerCase()
  const tags = String(row.tags ?? '').toLowerCase()
  const area = String(row.area ?? '').toLowerCase()
  return (
    title.includes(query) ||
    desc.includes(query) ||
    tags.includes(query) ||
    area.includes(query)
  )
}

function mapBankRow(row: Record<string, unknown>, meta: ExerciseMeta | undefined): AiExercise {
  const id = String(row.id ?? '')
  return {
    id,
    name: String(row.Title ?? 'Okänd övning'),
    category: meta?.category ?? 'mobility',
    tracking_type: 'other',
    muscle_group: [],
    equipment: null,
    description: row.Description != null ? String(row.Description) : null,
    video_url: row.URL != null ? String(row.URL) : null,
  }
}

async function fetchPtExercises(
  admin: SupabaseClient,
  query: string,
  category: string,
  limit: number
): Promise<AiExercise[]> {
  let dbQuery = admin.from('pt_exercises').select('*').order('name', { ascending: true }).limit(limit)
  if (category) dbQuery = dbQuery.eq('category', category)
  const { data, error } = await dbQuery
  if (error) throw error

  return (data ?? [])
    .filter((r) => {
      if (!query) return true
      const name = String(r.name ?? '').toLowerCase()
      const desc = String(r.description ?? '').toLowerCase()
      return name.includes(query) || desc.includes(query)
    })
    .map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? 'Okänd övning'),
      category: String(r.category ?? 'injury_prevention'),
      tracking_type: String(r.tracking_type ?? 'other'),
      muscle_group: Array.isArray(r.muscle_group) ? r.muscle_group : [],
      equipment: r.equipment ?? null,
      description: r.description ?? null,
      video_url: r.video_url ?? null,
    }))
}

async function listScreeningBankExercises(
  admin: SupabaseClient,
  query: string,
  category: string
): Promise<AiExercise[]> {
  const includeMobility = !category || category === 'mobility'
  const includeInjury = !category || category === 'injury_prevention'

  const metaMap = new Map<string, ExerciseMeta>()
  if (includeMobility) {
    const mobilityMap = await fetchMappingTable(admin, 'corrective_exercises', 'mobility')
    for (const [id, meta] of mobilityMap) metaMap.set(id, meta)
  }
  if (includeInjury) {
    const ohsMap = await fetchMappingTable(admin, 'overhead_squat_exercises', 'injury_prevention')
    for (const [id, meta] of ohsMap) {
      if (!metaMap.has(id)) metaMap.set(id, meta)
    }
  }

  if (metaMap.size === 0) return []

  const bankRows = await fetchExerciseBankRows(admin, [...metaMap.keys()])
  return bankRows
    .filter((row) => matchesQuery(row, query))
    .map((row) => mapBankRow(row, metaMap.get(String(row.id ?? ''))))
}

export async function listScreeningExercises(
  admin: SupabaseClient,
  input: ListScreeningExercisesInput = {}
): Promise<AiExercise[]> {
  const query = String(input.query ?? '').trim().toLowerCase()
  const category = input.category ? String(input.category).trim() : ''
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(200, Number(input.limit))) : 100

  if (category === 'mobility' || category === 'injury_prevention') {
    const exercises = await listScreeningBankExercises(admin, query, category)
    return exercises.sort((a, b) => a.name.localeCompare(b.name, 'sv')).slice(0, limit)
  }

  if (category && category !== 'strength') {
    const ptRows = await fetchPtExercises(admin, query, category, limit)
    return ptRows.slice(0, limit)
  }

  const screeningExercises = await listScreeningBankExercises(admin, query, '')
  const seen = new Set(screeningExercises.map((e) => e.id))
  const merged = [...screeningExercises]

  if (!category || category === 'strength') {
    const ptCategory = category === 'strength' ? 'strength' : ''
    const ptRows = await fetchPtExercises(admin, query, ptCategory, limit)
    for (const row of ptRows) {
      if (!seen.has(row.id)) {
        merged.push(row)
        seen.add(row.id)
      }
    }
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name, 'sv')).slice(0, limit)
}
