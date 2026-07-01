const MA_MARKER_RE = /\[MA:([^\]]+)\]/;

export function parseMaAssessmentId(notes: string | null | undefined): string | null {
  const m = notes?.match(MA_MARKER_RE);
  return m?.[1]?.trim() || null;
}

export function isActionProgramWorkout(notes: string | null | undefined): boolean {
  return MA_MARKER_RE.test(notes ?? '');
}
