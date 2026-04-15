/**
 * Flat kolumnvärden för movement_assessment_results (OH-squat-stil: en kolumn per testfält).
 * Kolumnnamn ASCII: `ror_`, `hallning_`, `karna_`, `stab_`.
 */

import type { MovementAssessment, PosturalObservationId } from '../../types/movementAssessment';
import { MOBILITY_TESTS } from './scoring';
import {
  scoreBilateralTest,
  scoreForValue,
  overheadReachScore,
  computeScores,
  coreBreathingPoints,
  coreRecruitmentPoints,
  coreLumbarPelvicPoints,
  coreNeckPoints,
} from './scoring';

export type FlatScalar = string | number | boolean | null;

const POSTURAL_IDS: PosturalObservationId[] = [
  'forward_head',
  'thoracic_kyphosis',
  'straightened_thoracic',
  'scoliosis',
  'lumbar_lordosis',
  'flattened_lumbar',
  'anterior_pelvic_tilt',
  'posterior_pelvic_tilt',
  'high_ilium',
  'pelvic_torsion',
  'rounded_shoulders',
  'winging_scapula',
  'bow_legs',
  'knock_knees',
  'excessive_pronation',
  'excessive_supination',
];

/** Kända kolumnnycklar (whitelist för Edge). */
export const FLAT_ASSESSMENT_COLUMN_KEYS: string[] = [
  ...MOBILITY_TESTS.flatMap((t) => [
    `ror_${t.key}_v`,
    `ror_${t.key}_h`,
    `ror_${t.key}_poang_v`,
    `ror_${t.key}_poang_h`,
    `ror_${t.key}_poang`,
  ]),
  'ror_oh_squat_grad',
  'ror_oh_squat_poang',
  'ror_oh_reach_kod',
  'ror_oh_reach_poang',
  ...POSTURAL_IDS.map((id) => `hallning_${id}`),
  'karna_andning_kod',
  'karna_sekvens_kod',
  'karna_lumb_vinkel_kod',
  'karna_lumb_reps',
  'karna_hals_grad',
  'karna_poang_andning',
  'karna_poang_sekvens',
  'karna_poang_lumb',
  'karna_poang_hals',
  'stab_pinne_transversal_v',
  'stab_pinne_transversal_h',
  'stab_pinne_frontal_v',
  'stab_pinne_frontal_h',
  'stab_pinne_sagittal',
  'stab_pinne_axlar_v',
  'stab_pinne_axlar_h',
  'stab_pinne_becken_hoft',
  'stab_pinne_poang',
  'stab_lunge_fot_v',
  'stab_lunge_fot_h',
  'stab_lunge_kna_v',
  'stab_lunge_kna_h',
  'stab_lunge_hoft_v',
  'stab_lunge_hoft_h',
  'stab_lunge_uk_v',
  'stab_lunge_uk_h',
  'stab_lunge_hallning_v',
  'stab_lunge_hallning_h',
  'stab_lunge_poang',
  'resultat_hallning',
  'resultat_rorlighet',
  'resultat_karna',
  'resultat_stabilitet',
  'resultat_totalt',
  'resultat_band',
];

export function mobilityTestPoang(
  mobility: MovementAssessment['mobility'],
  test: (typeof MOBILITY_TESTS)[number]
): number | null {
  const lv = mobility[test.leftKey] as number | null;
  const rv = mobility[test.rightKey] as number | null;
  return scoreBilateralTest(lv, rv, test.min, test.max);
}

export function mobilitySidePoang(
  mobility: MovementAssessment['mobility'],
  test: (typeof MOBILITY_TESTS)[number],
  side: 'left' | 'right'
): number | null {
  const value = side === 'left' ? mobility[test.leftKey] : mobility[test.rightKey];
  return value != null ? scoreForValue(value as number, test.min, test.max) : null;
}

export function buildFlatAssessmentColumns(assessment: MovementAssessment): Record<string, FlatScalar> {
  const { postural, mobility, core, stability } = assessment;
  const scores = assessment.scores ?? computeScores(postural, mobility, core, stability);

  const out: Record<string, FlatScalar> = {};

  for (const t of MOBILITY_TESTS) {
    const prefix = `ror_${t.key}`;
    out[`${prefix}_v`] = (mobility[t.leftKey] as number | null) ?? null;
    out[`${prefix}_h`] = (mobility[t.rightKey] as number | null) ?? null;
    out[`${prefix}_poang_v`] = mobilitySidePoang(mobility, t, 'left');
    out[`${prefix}_poang_h`] = mobilitySidePoang(mobility, t, 'right');
    out[`${prefix}_poang`] = mobilityTestPoang(mobility, t);
  }

  out.ror_oh_squat_grad = mobility.overheadSquat ?? null;
  out.ror_oh_squat_poang =
    mobility.overheadSquat != null ? scoreForValue(mobility.overheadSquat, 80, 90) : null;
  out.ror_oh_reach_kod = mobility.overheadReach ?? null;
  out.ror_oh_reach_poang = overheadReachScore(mobility.overheadReach);

  const obsSet = new Set(postural.observations);
  for (const id of POSTURAL_IDS) {
    out[`hallning_${id}`] = obsSet.has(id);
  }

  out.karna_andning_kod = core.breathingPattern ?? null;
  out.karna_sekvens_kod = core.recruitmentPattern ?? null;
  out.karna_lumb_vinkel_kod = core.lumbarPelvicAngle ?? null;
  out.karna_lumb_reps = core.lumbarPelvicReps ?? null;
  out.karna_hals_grad = core.neckStrengthGrade ?? null;
  out.karna_poang_andning = coreBreathingPoints(core.breathingPattern);
  out.karna_poang_sekvens = coreRecruitmentPoints(core.recruitmentPattern);
  out.karna_poang_lumb =
    core.lumbarPelvicAngle === '90'
      ? coreLumbarPelvicPoints('90', core.lumbarPelvicReps)
      : coreLumbarPelvicPoints(core.lumbarPelvicAngle, null);
  out.karna_poang_hals = coreNeckPoints(core.neckStrengthGrade);

  const st = stability.stickTest;
  out.stab_pinne_transversal_v = st.transversalLeft;
  out.stab_pinne_transversal_h = st.transversalRight;
  out.stab_pinne_frontal_v = st.frontalLeft;
  out.stab_pinne_frontal_h = st.frontalRight;
  out.stab_pinne_sagittal = st.sagital;
  out.stab_pinne_axlar_v = st.shouldersLeft;
  out.stab_pinne_axlar_h = st.shouldersRight;
  out.stab_pinne_becken_hoft = st.pelvicHip;

  const lu = stability.lungeTest;
  out.stab_lunge_fot_v = lu.footLeft;
  out.stab_lunge_fot_h = lu.footRight;
  out.stab_lunge_kna_v = lu.kneeLeft;
  out.stab_lunge_kna_h = lu.kneeRight;
  out.stab_lunge_hoft_v = lu.hipLeft;
  out.stab_lunge_hoft_h = lu.hipRight;
  out.stab_lunge_uk_v = lu.upperBodyLeft;
  out.stab_lunge_uk_h = lu.upperBodyRight;
  out.stab_lunge_hallning_v = lu.postureLeft;
  out.stab_lunge_hallning_h = lu.postureRight;

  let stickFlags = 0;
  if (st.transversalLeft) stickFlags++;
  if (st.transversalRight) stickFlags++;
  if (st.frontalLeft) stickFlags++;
  if (st.frontalRight) stickFlags++;
  if (st.sagital) stickFlags++;
  if (st.shouldersLeft) stickFlags++;
  if (st.shouldersRight) stickFlags++;
  if (st.pelvicHip) stickFlags++;
  out.stab_pinne_poang = 100 - (stickFlags / 8) * 90;

  let lungeFlags = 0;
  if (lu.footLeft) lungeFlags++;
  if (lu.footRight) lungeFlags++;
  if (lu.kneeLeft) lungeFlags++;
  if (lu.kneeRight) lungeFlags++;
  if (lu.hipLeft) lungeFlags++;
  if (lu.hipRight) lungeFlags++;
  if (lu.upperBodyLeft) lungeFlags++;
  if (lu.upperBodyRight) lungeFlags++;
  if (lu.postureLeft) lungeFlags++;
  if (lu.postureRight) lungeFlags++;
  out.stab_lunge_poang = 100 - (lungeFlags / 10) * 90;

  out.resultat_hallning = scores.postural;
  out.resultat_rorlighet = scores.mobility;
  out.resultat_karna = scores.core;
  out.resultat_stabilitet = scores.stability;
  out.resultat_totalt = Math.round(scores.total * 100) / 100;
  out.resultat_band = scores.band;

  return out;
}

/** Filtrerar till whitelistade nycklar (Edge-säker). */
export function pickWhitelistedFlatColumns(
  row: Record<string, FlatScalar | undefined>
): Record<string, FlatScalar> {
  const allow = new Set(FLAT_ASSESSMENT_COLUMN_KEYS);
  const out: Record<string, FlatScalar> = {};
  for (const [k, v] of Object.entries(row)) {
    if (allow.has(k) && v !== undefined) {
      out[k] = v as FlatScalar;
    }
  }
  return out;
}
