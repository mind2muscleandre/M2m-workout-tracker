import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import {
  appendSlot,
  createSlotFromBankExercise,
  extractExerciseIds,
  moveSlotDown,
  moveSlotUp,
  parseProgramValue,
  removeSlotAt,
  resolvePerformExercises,
  updateSlotAt,
  type PerformProgramSlot,
  type ResolvedPerformExercise,
} from '../lib/performProgramJson';
import type { MobilityProgramRow, OhsProgramRow } from '../types/platform';

export type PerformProgramType = 'mobility' | 'ohs';

export type PerformProgramDetail = {
  programType: PerformProgramType;
  program: MobilityProgramRow | OhsProgramRow;
  slots: PerformProgramSlot[];
  exercises: ResolvedPerformExercise[];
};

function tableForType(type: PerformProgramType): string {
  return type === 'mobility' ? PLATFORM_DB.mobilityPrograms : PLATFORM_DB.ohsPrograms;
}

async function fetchExerciseBankMap(ids: string[]): Promise<Record<string, Record<string, unknown>>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from(PLATFORM_DB.exerciseBank)
    .select('id, Title, URL, Description, area')
    .in('id', ids);
  if (error) throw error;
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    const id = String((row as { id: string }).id);
    map[id] = row as Record<string, unknown>;
  }
  return map;
}

export async function fetchPerformProgram(
  programId: string,
  programType: PerformProgramType
): Promise<PerformProgramDetail> {
  const table = tableForType(programType);
  const { data, error } = await supabase
    .from(table)
    .select('id, screening_id, user_id, program_full, program_short, exercise_substitutions, created_at')
    .eq('id', programId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Programmet hittades inte');

  const program = data as MobilityProgramRow | OhsProgramRow;
  const slots = parseProgramValue(program.program_full);
  const ids = extractExerciseIds(slots);
  const bankMap = await fetchExerciseBankMap(ids);

  return {
    programType,
    program,
    slots,
    exercises: resolvePerformExercises(slots, bankMap as never),
  };
}

export async function savePerformProgramSlots(
  programId: string,
  programType: PerformProgramType,
  slots: PerformProgramSlot[]
): Promise<void> {
  const table = tableForType(programType);
  const { error } = await supabase.from(table).update({ program_full: slots }).eq('id', programId);
  if (error) throw error;
}

export async function searchExerciseBank(input?: {
  query?: string;
  area?: string | null;
  limit?: number;
}): Promise<Array<{ id: string; Title: string; area: string | null; URL: string | null }>> {
  let q = supabase
    .from(PLATFORM_DB.exerciseBank)
    .select('id, Title, area, URL')
    .order('Title', { ascending: true })
    .limit(input?.limit ?? 50);

  if (input?.area?.trim()) {
    q = q.ilike('area', `%${input.area.trim()}%`);
  }
  if (input?.query?.trim()) {
    q = q.ilike('Title', `%${input.query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; Title: string; area: string | null; URL: string | null }>;
}

export function removeExerciseAt(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  return removeSlotAt(slots, index);
}

export function addExerciseToSlots(
  slots: PerformProgramSlot[],
  exerciseId: string,
  område?: string | null
): PerformProgramSlot[] {
  return appendSlot(slots, createSlotFromBankExercise(exerciseId, område));
}

export function updateExerciseSlot(
  slots: PerformProgramSlot[],
  index: number,
  patch: Partial<PerformProgramSlot>
): PerformProgramSlot[] {
  return updateSlotAt(slots, index, patch);
}

export function reorderExerciseUp(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  return moveSlotUp(slots, index);
}

export function reorderExerciseDown(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  return moveSlotDown(slots, index);
}

export async function resolveSlotsExercises(
  slots: PerformProgramSlot[]
): Promise<ResolvedPerformExercise[]> {
  const ids = extractExerciseIds(slots);
  const bankMap = await fetchExerciseBankMap(ids);
  return resolvePerformExercises(slots, bankMap as never);
}
