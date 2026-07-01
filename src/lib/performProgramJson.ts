/** Parse Perform mobility/OHS program JSON (array slots in program_full / program_short). */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PerformProgramSlot = Record<string, unknown>;

export type ResolvedPerformExercise = {
  index: number;
  slot: PerformProgramSlot;
  exerciseId: string | null;
  name: string;
  område: string | null;
  reps: string | number | null;
  sets: string | number | null;
  videoUrl: string | null;
  description: string | null;
};

export function parseProgramValue(val: unknown): PerformProgramSlot[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as PerformProgramSlot[];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as PerformProgramSlot[]) : [];
    } catch {
      return val
        .split(',')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((id) => ({ övning: id }));
    }
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const nested = obj.exercises ?? obj.övningar;
    if (Array.isArray(nested)) return nested as PerformProgramSlot[];
  }
  return [];
}

export function programSlotCount(program: unknown): number {
  return parseProgramValue(program).length;
}

export function extractExerciseIds(slots: PerformProgramSlot[]): string[] {
  const ids = slots
    .map((slot) => {
      if (!slot) return null;
      if (typeof slot === 'string') return slot;
      if (typeof slot.övning === 'string') return slot.övning;
      if (typeof slot.id === 'string') return slot.id;
      return null;
    })
    .filter((id): id is string => Boolean(id && UUID_REGEX.test(id)));
  return Array.from(new Set(ids));
}

type ExerciseBankRow = {
  id: string;
  Title?: string | null;
  title?: string | null;
  name?: string | null;
  URL?: string | null;
  video_url?: string | null;
  Description?: string | null;
  description?: string | null;
  area?: string | null;
};

function bankName(row: ExerciseBankRow | undefined, fallback: string): string {
  if (!row) return fallback;
  return row.Title ?? row.title ?? row.name ?? fallback;
}

function bankVideo(row: ExerciseBankRow | undefined): string | null {
  if (!row) return null;
  return row.URL ?? row.video_url ?? null;
}

function bankDescription(row: ExerciseBankRow | undefined): string | null {
  if (!row) return null;
  return row.Description ?? row.description ?? null;
}

export function resolvePerformExercises(
  slots: PerformProgramSlot[],
  bankById: Record<string, ExerciseBankRow>
): ResolvedPerformExercise[] {
  return slots.map((slot, index) => {
    const fallback = `Övning ${index + 1}`;
    if (typeof slot === 'string') {
      const row = bankById[slot] ?? bankById[String(slot)];
      return {
        index,
        slot: { övning: slot },
        exerciseId: slot,
        name: bankName(row, slot),
        område: row?.area ?? null,
        reps: null,
        sets: null,
        videoUrl: bankVideo(row),
        description: bankDescription(row),
      };
    }

    const övningId =
      typeof slot.övning === 'string'
        ? slot.övning
        : typeof slot.id === 'string'
          ? slot.id
          : null;
    const row = övningId
      ? bankById[övningId] ?? bankById[String(övningId)]
      : undefined;

    const område =
      (typeof slot.område === 'string' ? slot.område : null) ??
      (typeof slot['område'] === 'string' ? (slot['område'] as string) : null) ??
      row?.area ??
      null;

    return {
      index,
      slot,
      exerciseId: övningId,
      name: bankName(row, typeof slot.name === 'string' ? slot.name : fallback),
      område,
      reps: (slot.reps as string | number | null | undefined) ?? null,
      sets: (slot.sets as string | number | null | undefined) ?? null,
      videoUrl: bankVideo(row) ?? (typeof slot.URL === 'string' ? slot.URL : null),
      description: bankDescription(row),
    };
  });
}

export function removeSlotAt(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  return slots.filter((_, i) => i !== index);
}

export function updateSlotAt(
  slots: PerformProgramSlot[],
  index: number,
  patch: Partial<PerformProgramSlot>
): PerformProgramSlot[] {
  return slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
}

export function moveSlotUp(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  if (index <= 0) return slots;
  const next = [...slots];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function moveSlotDown(slots: PerformProgramSlot[], index: number): PerformProgramSlot[] {
  if (index >= slots.length - 1) return slots;
  const next = [...slots];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

export const DEFAULT_SLOT_SETS = 1;
export const DEFAULT_SLOT_REPS = '12 höger + 12 vänster';

export function createSlotFromBankExercise(
  exerciseId: string,
  område?: string | null
): PerformProgramSlot {
  return {
    övning: exerciseId,
    ...(område ? { område } : {}),
    sets: DEFAULT_SLOT_SETS,
    reps: DEFAULT_SLOT_REPS,
  };
}

export function appendSlot(
  slots: PerformProgramSlot[],
  slot: PerformProgramSlot
): PerformProgramSlot[] {
  return [...slots, slot];
}
