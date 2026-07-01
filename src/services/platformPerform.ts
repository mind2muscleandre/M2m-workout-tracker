import { supabase } from '../lib/supabase';
import { PLATFORM_DB } from '../lib/dbTables';
import { programSlotCount } from '../lib/performProgramJson';
import type {
  MobilityProgramRow,
  MovementAssessmentRow,
  OhsProgramRow,
  PerformView,
  ScreeningResultRow,
  ScreeningSessionGroup,
  ScreeningUploadRow,
  WorkoutSessionRow,
} from '../types/platform';

export const EMPTY_PERFORM_VIEW: PerformView = {
  screeningSessions: [],
  screenings: [],
  screeningResults: [],
  movementAssessments: [],
  mobilityPrograms: [],
  ohsPrograms: [],
  workoutHistory: [],
  loadErrors: [],
};

type FetchPerformOptions = {
  email?: string | null;
};

const CRITICAL_TABLES = new Set(['screening_results', 'mobility_programs', 'ohs_programs']);

function formatQueryError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object') {
    const e = reason as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint, e.code].filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    );
    if (parts.length > 0) return parts.join(' — ');
    try {
      return JSON.stringify(reason);
    } catch {
      /* fall through */
    }
  }
  return String(reason);
}

function settledError(label: string, reason: unknown): string {
  return `${label}: ${formatQueryError(reason)}`;
}

function isCriticalError(label: string): boolean {
  return CRITICAL_TABLES.has(label);
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from(PLATFORM_DB.userProfiles)
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.email ?? null;
}

async function fetchScreeningResults(
  userId: string,
  email?: string | null
): Promise<{ data: ScreeningResultRow[]; error: unknown | null }> {
  const select = 'id, screening_id, user_id, "testområde", score, analysed_at, feedback';

  const byUser = await supabase
    .from(PLATFORM_DB.screeningResults)
    .select(select)
    .eq('user_id', userId)
    .order('analysed_at', { ascending: false })
    .limit(100);

  if (byUser.error) {
    return { data: [], error: byUser.error };
  }

  let rows = (byUser.data ?? []) as ScreeningResultRow[];
  if (rows.length === 0) {
    const uploads = await fetchScreeningUploads(userId, email);
    if (uploads.error) {
      return { data: rows, error: uploads.error };
    }
    const screeningIds = [
      ...new Set(
        uploads.data
          .map((row) => (row.screening_id ? String(row.screening_id) : ''))
          .filter(Boolean)
      ),
    ];
    if (screeningIds.length > 0) {
      const byScreening = await supabase
        .from(PLATFORM_DB.screeningResults)
        .select(select)
        .in('screening_id', screeningIds)
        .order('analysed_at', { ascending: false })
        .limit(100);
      if (byScreening.error) {
        return { data: rows, error: byScreening.error };
      }
      rows = (byScreening.data ?? []) as ScreeningResultRow[];
    }
  }

  return { data: rows, error: null };
}

function mergeProgramRows<T extends { id: string }>(...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) {
    for (const row of list) {
      byId.set(String(row.id), row);
    }
  }
  return Array.from(byId.values());
}

function collectScreeningIds(
  screeningResults: ScreeningResultRow[],
  screenings: ScreeningUploadRow[],
  movementAssessments: MovementAssessmentRow[] = []
): string[] {
  return [
    ...new Set([
      ...screeningResults.map((row) => String(row.screening_id)),
      ...screenings
        .map((row) => (row.screening_id ? String(row.screening_id) : ''))
        .filter(Boolean),
      ...movementAssessments.map((row) => String(row.id)),
    ]),
  ];
}

async function fetchMovementAssessmentsForUser(
  userId: string
): Promise<{ data: MovementAssessmentRow[]; error: unknown | null }> {
  const select =
    'id, user_id, created_at, assessment_date, client_name, client_email, resultat_hallning, resultat_rorlighet, resultat_karna, resultat_stabilitet, resultat_totalt, resultat_band, raw_assessment, export_payload';

  const { data, error } = await supabase
    .from(PLATFORM_DB.movementAssessmentResults)
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as MovementAssessmentRow[], error: null };
}

export function movementAssessmentToSessionGroup(
  row: MovementAssessmentRow
): ScreeningSessionGroup {
  const analysedAt = row.assessment_date ?? row.created_at;
  const areas: ScreeningSessionGroup['areas'] = [];
  const pushArea = (label: string, value: number | null) => {
    if (value != null && Number.isFinite(Number(value))) {
      areas.push({ testområde: label, score: Math.round(Number(value)) });
    }
  };

  pushArea('Hållning', row.resultat_hallning);
  pushArea('Rörlighet', row.resultat_rorlighet);
  pushArea('Kärna', row.resultat_karna);
  pushArea('Stabilitet', row.resultat_stabilitet);

  return {
    screeningId: row.id,
    analysedAt,
    areas,
  };
}

function mergeScreeningSessions(...lists: ScreeningSessionGroup[][]): ScreeningSessionGroup[] {
  const byId = new Map<string, ScreeningSessionGroup>();

  for (const list of lists) {
    for (const session of list) {
      const existing = byId.get(session.screeningId);
      if (!existing) {
        byId.set(session.screeningId, session);
        continue;
      }
      const areas =
        existing.areas.length >= session.areas.length ? existing.areas : session.areas;
      const analysedAt = [existing.analysedAt, session.analysedAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .reverse()[0] ?? null;
      byId.set(session.screeningId, {
        ...existing,
        ...session,
        areas,
        analysedAt,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const da = a.analysedAt ?? '';
    const db = b.analysedAt ?? '';
    return db.localeCompare(da);
  });
}

async function fetchMobilityProgramsForAthlete(
  userId: string,
  screeningIds: string[]
): Promise<{ data: MobilityProgramRow[]; error: unknown | null }> {
  const select =
    'id, screening_id, user_id, program_full, program_short, exercise_substitutions, created_at';

  const byUser = await supabase
    .from(PLATFORM_DB.mobilityPrograms)
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (byUser.error) {
    return { data: [], error: byUser.error };
  }

  let rows = (byUser.data ?? []) as MobilityProgramRow[];
  if (screeningIds.length > 0) {
    const byScreening = await supabase
      .from(PLATFORM_DB.mobilityPrograms)
      .select(select)
      .in('screening_id', screeningIds)
      .order('created_at', { ascending: false })
      .limit(20);
    if (byScreening.error) {
      return { data: rows, error: byScreening.error };
    }
    rows = mergeProgramRows(rows, (byScreening.data ?? []) as MobilityProgramRow[]);
  }

  return { data: rows, error: null };
}

async function fetchOhsProgramsForAthlete(
  userId: string,
  screeningIds: string[]
): Promise<{ data: OhsProgramRow[]; error: unknown | null }> {
  const select =
    'id, screening_id, user_id, program_full, program_short, exercise_substitutions, created_at';

  const byUser = await supabase
    .from(PLATFORM_DB.ohsPrograms)
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (byUser.error) {
    return { data: [], error: byUser.error };
  }

  let rows = (byUser.data ?? []) as OhsProgramRow[];
  if (screeningIds.length > 0) {
    const byScreening = await supabase
      .from(PLATFORM_DB.ohsPrograms)
      .select(select)
      .in('screening_id', screeningIds)
      .order('created_at', { ascending: false })
      .limit(20);
    if (byScreening.error) {
      return { data: rows, error: byScreening.error };
    }
    rows = mergeProgramRows(rows, (byScreening.data ?? []) as OhsProgramRow[]);
  }

  return { data: rows, error: null };
}

async function fetchScreeningUploads(
  userId: string,
  email?: string | null
): Promise<{ data: ScreeningUploadRow[]; error: unknown | null }> {
  const select = 'id, screening_id, user_id, analysis_type, uploaded_at, email, video_url';

  const byUser = await supabase
    .from(PLATFORM_DB.screeningUploads)
    .select(select)
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(20);

  if (byUser.error) {
    return { data: [], error: byUser.error };
  }

  let rows = (byUser.data ?? []) as ScreeningUploadRow[];
  if (rows.length === 0) {
    const lookupEmail = email ?? (await resolveUserEmail(userId));
    if (lookupEmail) {
      const byEmail = await supabase
        .from(PLATFORM_DB.screeningUploads)
        .select(select)
        .ilike('email', lookupEmail)
        .order('uploaded_at', { ascending: false })
        .limit(20);
      if (byEmail.error) {
        return { data: rows, error: byEmail.error };
      }
      rows = (byEmail.data ?? []) as ScreeningUploadRow[];
    }
  }

  return { data: rows, error: null };
}

export function groupScreeningResults(rows: ScreeningResultRow[]): ScreeningSessionGroup[] {
  const bySession = new Map<string, ScreeningSessionGroup>();

  for (const row of rows) {
    const key = String(row.screening_id);
    let group = bySession.get(key);
    if (!group) {
      group = {
        screeningId: key,
        analysedAt: row.analysed_at,
        areas: [],
      };
      bySession.set(key, group);
    }
    group.areas.push({
      testområde: row.testområde,
      score: row.score != null ? Number(row.score) : null,
    });
    if (row.analysed_at && (!group.analysedAt || row.analysed_at > group.analysedAt)) {
      group.analysedAt = row.analysed_at;
    }
  }

  return Array.from(bySession.values()).sort((a, b) => {
    const da = a.analysedAt ?? '';
    const db = b.analysedAt ?? '';
    return db.localeCompare(da);
  });
}

function enrichScreeningSessions(
  sessions: ScreeningSessionGroup[],
  uploads: ScreeningUploadRow[],
  mobilityPrograms: MobilityProgramRow[],
  ohsPrograms: OhsProgramRow[]
): ScreeningSessionGroup[] {
  const uploadBySid = new Map<string, ScreeningUploadRow>();
  for (const u of uploads) {
    if (u.screening_id) uploadBySid.set(String(u.screening_id), u);
  }
  const mobilityBySid = new Map<string, MobilityProgramRow>();
  for (const p of mobilityPrograms) {
    if (p.screening_id) mobilityBySid.set(String(p.screening_id), p);
  }
  const ohsBySid = new Map<string, OhsProgramRow>();
  for (const p of ohsPrograms) {
    if (p.screening_id) ohsBySid.set(String(p.screening_id), p);
  }

  const enriched = sessions.map((s) => ({
    ...s,
    uploadMeta: uploadBySid.get(s.screeningId) ?? null,
    mobilityProgram: mobilityBySid.get(s.screeningId) ?? null,
    ohsProgram: ohsBySid.get(s.screeningId) ?? null,
  }));

  const knownIds = new Set(enriched.map((s) => s.screeningId));

  for (const p of mobilityPrograms) {
    const sid = String(p.screening_id);
    if (!knownIds.has(sid)) {
      enriched.push({
        screeningId: sid,
        analysedAt: null,
        areas: [],
        uploadMeta: uploadBySid.get(sid) ?? null,
        mobilityProgram: p,
        ohsProgram: ohsBySid.get(sid) ?? null,
      });
      knownIds.add(sid);
    }
  }
  for (const p of ohsPrograms) {
    const sid = String(p.screening_id);
    if (!knownIds.has(sid)) {
      enriched.push({
        screeningId: sid,
        analysedAt: null,
        areas: [],
        uploadMeta: uploadBySid.get(sid) ?? null,
        mobilityProgram: mobilityBySid.get(sid) ?? null,
        ohsProgram: p,
      });
      knownIds.add(sid);
    }
  }

  return enriched.sort((a, b) => {
    const da = a.analysedAt ?? a.uploadMeta?.uploaded_at ?? '';
    const db = b.analysedAt ?? b.uploadMeta?.uploaded_at ?? '';
    return String(db).localeCompare(String(da));
  });
}

export async function fetchPerformViewForUser(
  userId: string,
  options: FetchPerformOptions = {}
): Promise<PerformView> {
  const criticalErrors: string[] = [];
  const optionalErrors: string[] = [];

  const pushError = (label: string, reason: unknown) => {
    const msg = settledError(label, reason);
    if (isCriticalError(label)) criticalErrors.push(msg);
    else optionalErrors.push(msg);
  };

  const resultsPromise = fetchScreeningResults(userId, options.email);
  const uploadsPromise = fetchScreeningUploads(userId, options.email);
  const movementPromise = fetchMovementAssessmentsForUser(userId);
  const historyPromise = supabase
    .from(PLATFORM_DB.workoutSessions)
    .select(
      'id, user_id, program_type, completed_at, duration_seconds, intensity, workout_type, exercises_completed, total_exercises'
    )
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(30);

  const [resultsSettled, uploadsSettled, movementSettled, historySettled] = await Promise.allSettled([
    resultsPromise,
    uploadsPromise,
    movementPromise,
    historyPromise,
  ]);

  let screeningResults: ScreeningResultRow[] = [];
  if (resultsSettled.status === 'fulfilled') {
    if (resultsSettled.value.error) {
      pushError('screening_results', resultsSettled.value.error);
    } else {
      screeningResults = resultsSettled.value.data;
    }
  } else {
    pushError('screening_results', resultsSettled.reason);
  }

  let screenings: ScreeningUploadRow[] = [];
  if (uploadsSettled.status === 'fulfilled') {
    if (uploadsSettled.value.error) {
      pushError('screening_uploads', uploadsSettled.value.error);
    } else {
      screenings = uploadsSettled.value.data;
    }
  } else {
    pushError('screening_uploads', uploadsSettled.reason);
  }

  let movementAssessments: MovementAssessmentRow[] = [];
  if (movementSettled.status === 'fulfilled') {
    if (movementSettled.value.error) {
      pushError('movement_assessment_results', movementSettled.value.error);
    } else {
      movementAssessments = movementSettled.value.data;
    }
  } else {
    pushError('movement_assessment_results', movementSettled.reason);
  }

  let workoutHistory: WorkoutSessionRow[] = [];
  if (historySettled.status === 'fulfilled') {
    if (historySettled.value.error) {
      pushError('workout_sessions', historySettled.value.error);
    } else {
      workoutHistory = (historySettled.value.data ?? []) as WorkoutSessionRow[];
    }
  } else {
    pushError('workout_sessions', historySettled.reason);
  }

  const screeningIds = collectScreeningIds(screeningResults, screenings, movementAssessments);
  const [mobilitySettled, ohsSettled] = await Promise.allSettled([
    fetchMobilityProgramsForAthlete(userId, screeningIds),
    fetchOhsProgramsForAthlete(userId, screeningIds),
  ]);

  let mobilityPrograms: MobilityProgramRow[] = [];
  if (mobilitySettled.status === 'fulfilled') {
    if (mobilitySettled.value.error) {
      pushError('mobility_programs', mobilitySettled.value.error);
    } else {
      mobilityPrograms = mobilitySettled.value.data;
    }
  } else {
    pushError('mobility_programs', mobilitySettled.reason);
  }

  let ohsPrograms: OhsProgramRow[] = [];
  if (ohsSettled.status === 'fulfilled') {
    if (ohsSettled.value.error) {
      pushError('ohs_programs', ohsSettled.value.error);
    } else {
      ohsPrograms = ohsSettled.value.data;
    }
  } else {
    pushError('ohs_programs', ohsSettled.reason);
  }

  const assessmentSessions = movementAssessments.map(movementAssessmentToSessionGroup);
  const baseSessions = mergeScreeningSessions(
    groupScreeningResults(screeningResults),
    assessmentSessions
  );
  const screeningSessions = enrichScreeningSessions(
    baseSessions,
    screenings,
    mobilityPrograms,
    ohsPrograms
  );

  return {
    screeningSessions,
    screenings,
    screeningResults,
    movementAssessments,
    mobilityPrograms,
    ohsPrograms,
    workoutHistory,
    loadErrors: criticalErrors.length > 0 ? criticalErrors : undefined,
  };
}

export async function updateMobilityProgramSubstitutions(
  programId: string,
  substitutions: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from(PLATFORM_DB.mobilityPrograms)
    .update({ exercise_substitutions: substitutions })
    .eq('id', programId);
  if (error) throw error;
}

export async function updateOhsProgramSubstitutions(
  programId: string,
  substitutions: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from(PLATFORM_DB.ohsPrograms)
    .update({ exercise_substitutions: substitutions })
    .eq('id', programId);
  if (error) throw error;
}

export function programExerciseCount(program: unknown): number {
  const fromArray = programSlotCount(program);
  if (fromArray > 0) return fromArray;
  if (!program || typeof program !== 'object') return 0;
  const obj = program as Record<string, unknown>;
  const exercises = obj.exercises ?? obj.övningar;
  if (Array.isArray(exercises)) return exercises.length;
  return 0;
}

export function performActivityCount(perform: PerformView | null | undefined): number {
  if (!perform) return 0;
  const sessionIds = new Set(perform.screeningSessions.map((s) => s.screeningId));
  for (const p of perform.mobilityPrograms) {
    if (p.screening_id) sessionIds.add(String(p.screening_id));
  }
  for (const p of perform.ohsPrograms) {
    if (p.screening_id) sessionIds.add(String(p.screening_id));
  }
  return sessionIds.size;
}

export function screeningResultScoreSummary(result: ScreeningResultRow): string {
  if (result.score != null) return String(result.score);
  const scores = result.poäng_per_område;
  if (!scores || typeof scores !== 'object') return '—';
  const values = Object.values(scores).filter((v) => typeof v === 'number') as number[];
  if (values.length === 0) return '—';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return `${Math.round(avg * 10) / 10}`;
}

export type MovementActionProgramExercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  area?: string | null;
  description?: string | null;
  videoUrl?: string | null;
};

type UpsertMovementActionProgramInput = {
  athleteUserId: string;
  screeningId: string;
  title?: string | null;
  exercises: MovementActionProgramExercise[];
};

function toPerformProgramSlots(
  title: string | null | undefined,
  exercises: MovementActionProgramExercise[]
): Array<Record<string, unknown>> {
  const cleanTitle = title?.trim() || 'Åtgärdsprogram';
  return exercises.map((exercise, index) => ({
    övning: exercise.id,
    name: exercise.name,
    område: exercise.area ?? null,
    reps: exercise.targetReps,
    sets: Math.max(1, Number(exercise.targetSets) || 1),
    beskrivning: exercise.description ?? null,
    video_url: exercise.videoUrl ?? null,
    program_title: cleanTitle,
    order_index: index,
  }));
}

export async function upsertMovementActionProgramForUser(
  input: UpsertMovementActionProgramInput
): Promise<string> {
  const fullProgram = toPerformProgramSlots(input.title, input.exercises);
  const shortProgram = fullProgram.slice(0, Math.min(4, fullProgram.length));

  const { data: existing, error: existingError } = await supabase
    .from(PLATFORM_DB.mobilityPrograms)
    .select('id')
    .eq('user_id', input.athleteUserId)
    .eq('screening_id', input.screeningId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from(PLATFORM_DB.mobilityPrograms)
      .update({
        program_full: fullProgram,
        program_short: shortProgram,
        user_id: input.athleteUserId,
      })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from(PLATFORM_DB.mobilityPrograms)
    .insert({
      screening_id: input.screeningId,
      user_id: input.athleteUserId,
      program_full: fullProgram,
      program_short: shortProgram,
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!created?.id) throw new Error('Kunde inte skapa mobility_programs-post.');
  return String(created.id);
}
