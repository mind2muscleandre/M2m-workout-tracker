import type {
  LumbarPelvicAngleBucket,
  MovementAssessmentCore,
  MovementAssessmentMobility,
  MovementAssessmentPostural,
  MovementAssessmentScores,
  MovementAssessmentStability,
  MovementAssessmentStickTest,
  MovementAssessmentLungeTest,
  OverheadReachQualitative,
  ScoreBand,
  StabilityCheckValue,
} from '../../types/movementAssessment';
import { POSTURAL_DEDUCTIONS } from '../../types/movementAssessment';

export type MobilityTestDirection = 'higher' | 'lower';

export type MobilityTestMeta = {
  key: string;
  labelSv: string;
  leftKey: keyof MovementAssessmentMobility;
  rightKey: keyof MovementAssessmentMobility;
  min: number;
  max: number;
  bilateral: boolean;
  direction?: MobilityTestDirection;
};

/** scoreForValue per spec — higher values score better. */
export function scoreForValue(value: number, min: number, max: number): number {
  if (value >= max) return 100;
  if (value >= min) {
    return 90 + ((value - min) / (max - min)) * 10;
  }
  if (min <= 0) {
    return Math.max(0, (value / Math.max(min, 1e-9)) * 90);
  }
  return Math.max(0, (value / min) * 90);
}

/** Lower values score better: ideal = 100p, threshold = 90p. */
export function scoreForValueLowerBetter(value: number, ideal: number, threshold: number): number {
  if (value <= ideal) return 100;
  if (value <= threshold) {
    return 90 + ((threshold - value) / (threshold - ideal)) * 10;
  }
  return Math.max(0, (threshold / value) * 90);
}

export function scoreMobilityTestValue(test: MobilityTestMeta, value: number): number {
  if (test.direction === 'lower') {
    return scoreForValueLowerBetter(value, test.min, test.max);
  }
  return scoreForValue(value, test.min, test.max);
}

export function scoreMobilityBilateral(
  test: MobilityTestMeta,
  left: number | null,
  right: number | null
): number | null {
  const ls = left != null ? scoreMobilityTestValue(test, left) : null;
  const rs = right != null ? scoreMobilityTestValue(test, right) : null;
  if (ls == null && rs == null) return null;
  if (ls != null && rs != null) return (ls + rs) / 2;
  return ls ?? rs!;
}

/** Bilateral combined score 0–100 (one side ok). */
export function scoreBilateralTest(
  left: number | null,
  right: number | null,
  min: number,
  max: number
): number | null {
  const ls = left != null ? scoreForValue(left, min, max) : null;
  const rs = right != null ? scoreForValue(right, min, max) : null;
  if (ls == null && rs == null) return null;
  if (ls != null && rs != null) return (ls + rs) / 2;
  return ls ?? rs!;
}

export function overheadReachScore(q: OverheadReachQualitative | null): number | null {
  if (q == null) return null;
  switch (q) {
    case 'symmetric':
      return 100;
    case 'minor_asymmetry':
      return 70;
    case 'major_asymmetry':
      return 40;
    default:
      return null;
  }
}

/** Mobility test meta for scoring and flagging */
export const MOBILITY_TESTS: MobilityTestMeta[] = [
  { key: 'ankle', labelSv: 'Knölmobilitet (squat)', leftKey: 'ankleLeft', rightKey: 'ankleRight', min: 12, max: 14, bilateral: true },
  { key: 'slr', labelSv: 'SLR', leftKey: 'slrLeft', rightKey: 'slrRight', min: 80, max: 90, bilateral: true },
  { key: 'hip_flex', labelSv: 'Höftflexion', leftKey: 'hipFlexionLeft', rightKey: 'hipFlexionRight', min: 110, max: 120, bilateral: true },
  { key: 'hip_abd', labelSv: 'Höftabduktion', leftKey: 'hipAbductionLeft', rightKey: 'hipAbductionRight', min: 40, max: 50, bilateral: true },
  { key: 'hip_med_sup', labelSv: 'Höft innåtrotation (90°)', leftKey: 'hipMedRotSupineLeft', rightKey: 'hipMedRotSupineRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_lat_sup', labelSv: 'Höft utåtrotation (90°)', leftKey: 'hipLatRotSupineLeft', rightKey: 'hipLatRotSupineRight', min: 45, max: 55, bilateral: true },
  {
    key: 'shoulder_pos',
    labelSv: 'Axelled (golv–akromion)',
    leftKey: 'shoulderPositionLeft',
    rightKey: 'shoulderPositionRight',
    min: 4,
    max: 6,
    bilateral: true,
    direction: 'lower',
  },
  { key: 'sh_med', labelSv: 'Axel innåtrotation (60°)', leftKey: 'shoulderMedRotLeft', rightKey: 'shoulderMedRotRight', min: 60, max: 70, bilateral: true },
  { key: 'sh_lat', labelSv: 'Axel utåtrotation (60°)', leftKey: 'shoulderLatRotLeft', rightKey: 'shoulderLatRotRight', min: 80, max: 90, bilateral: true },
  { key: 'arm_raise', labelSv: 'Armlyft stående', leftKey: 'armRaiseLeft', rightKey: 'armRaiseRight', min: 170, max: 180, bilateral: true },
  { key: 'side_flex', labelSv: 'Sidoflexion överkropp', leftKey: 'upperBodySideFlexLeft', rightKey: 'upperBodySideFlexRight', min: 40, max: 50, bilateral: true },
  { key: 'neck_side', labelSv: 'Sidoflexion hals', leftKey: 'neckSideFlexLeft', rightKey: 'neckSideFlexRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_med_st', labelSv: 'Höft innåtrotation (0°)', leftKey: 'hipMedRotStandingLeft', rightKey: 'hipMedRotStandingRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_lat_st', labelSv: 'Höft utåtrotation (0°)', leftKey: 'hipLatRotStandingLeft', rightKey: 'hipLatRotStandingRight', min: 45, max: 55, bilateral: true },
  {
    key: 'long_hf',
    labelSv: 'Långa höftböjarna',
    leftKey: 'longHipFlexorLeft',
    rightKey: 'longHipFlexorRight',
    min: 0,
    max: 15,
    bilateral: true,
    direction: 'lower',
  },
  { key: 'ub_rot', labelSv: 'Rotation överkropp sittande', leftKey: 'upperBodyRotationLeft', rightKey: 'upperBodyRotationRight', min: 60, max: 70, bilateral: true },
  { key: 'neck_rot', labelSv: 'Halsrotation sittande', leftKey: 'neckRotationLeft', rightKey: 'neckRotationRight', min: 70, max: 80, bilateral: true },
];

export function mobilityTestCriteriaLabel(test: MobilityTestMeta): string {
  const unit = test.key === 'shoulder_pos' || test.key === 'ankle' ? ' cm' : '°';
  if (test.direction === 'lower') {
    if (test.key === 'shoulder_pos') {
      return `${test.labelSv} (mål ≤${test.min}${unit}, 90p vid ${test.max}${unit})`;
    }
    return `${test.labelSv} (mål ${test.min}${unit}, 90p vid ${test.max}${unit})`;
  }
  return `${test.labelSv} (normal ${test.min}–${test.max}${unit})`;
}

export function mobilityTestPlaceholder(test: MobilityTestMeta): string {
  if (test.direction === 'lower') {
    return `≤${test.max}`;
  }
  return `${test.min}–${test.max}`;
}

export function scorePosturalSection(postural: MovementAssessmentPostural): number {
  let deduction = 0;
  for (const id of postural.observations) {
    deduction += POSTURAL_DEDUCTIONS[id] ?? 0;
  }
  return Math.max(0, 100 - deduction);
}

export function scoreMobilitySection(mobility: MovementAssessmentMobility): number | null {
  const testScores: number[] = [];

  const push = (s: number | null) => {
    if (s != null) testScores.push(s);
  };

  for (const test of MOBILITY_TESTS) {
    const left = mobility[test.leftKey] as number | null;
    const right = mobility[test.rightKey] as number | null;
    push(scoreMobilityBilateral(test, left, right));
  }

  if (mobility.overheadSquat != null) {
    push(scoreForValue(mobility.overheadSquat, 80, 90));
  }
  push(overheadReachScore(mobility.overheadReach));

  if (testScores.length === 0) return null;
  return testScores.reduce((a, b) => a + b, 0) / testScores.length;
}

export function coreBreathingPoints(pattern: MovementAssessmentCore['breathingPattern']): number | null {
  if (pattern == null) return null;
  switch (pattern) {
    case 'belly':
      return 100;
    case 'can_alternate':
      return 80;
    case 'double':
      return 60;
    case 'chest':
      return 40;
    default:
      return null;
  }
}

export function coreRecruitmentPoints(pattern: MovementAssessmentCore['recruitmentPattern']): number | null {
  if (pattern == null) return null;
  switch (pattern) {
    case 'ok':
      return 100;
    case 'r_dominant':
      return 65;
    case 'wrong_order':
      return 40;
    case 'cant_recruit':
      return 10;
    default:
      return null;
  }
}

export function coreLumbarPelvicPoints(angle: LumbarPelvicAngleBucket | null, reps: number | null): number | null {
  if (angle == null) return null;
  if (angle !== '90') {
    switch (angle) {
      case '0-10':
        return 10;
      case '11-25':
        return 25;
      case '26-45':
        return 45;
      case '46-60':
        return 65;
      case '61-75':
        return 80;
      case '76-89':
        return 90;
      default:
        return null;
    }
  }
  const r = reps ?? 0;
  if (r >= 16) return 100;
  if (r >= 11) return 97;
  if (r >= 6) return 95;
  if (r >= 1) return 92;
  return 92;
}

export function coreNeckPoints(grade: MovementAssessmentCore['neckStrengthGrade']): number | null {
  if (grade == null) return null;
  switch (grade) {
    case 0:
      return 10;
    case 1:
      return 30;
    case 2:
      return 55;
    case 3:
      return 75;
    case 4:
      return 90;
    case 5:
      return 100;
    default:
      return null;
  }
}

export function scoreCoreSection(core: MovementAssessmentCore): number | null {
  const a = coreBreathingPoints(core.breathingPattern);
  const b = coreRecruitmentPoints(core.recruitmentPattern);
  const c =
    core.lumbarPelvicAngle === '90'
      ? coreLumbarPelvicPoints('90', core.lumbarPelvicReps)
      : coreLumbarPelvicPoints(core.lumbarPelvicAngle, null);
  const d = coreNeckPoints(core.neckStrengthGrade);

  const parts: Array<{ w: number; s: number | null }> = [
    { w: 0.25, s: a },
    { w: 0.25, s: b },
    { w: 0.35, s: c },
    { w: 0.15, s: d },
  ];

  let weightSum = 0;
  let sum = 0;
  for (const { w, s } of parts) {
    if (s != null) {
      sum += w * s;
      weightSum += w;
    }
  }
  if (weightSum === 0) return null;
  return sum / weightSum;
}

const STICK_KEYS: (keyof Omit<MovementAssessmentStickTest, 'notes'>)[] = [
  'transversalLeft',
  'transversalRight',
  'frontalLeft',
  'frontalRight',
  'sagital',
  'shouldersLeft',
  'shouldersRight',
  'pelvicHip',
];

const LUNGE_KEYS: (keyof Omit<MovementAssessmentLungeTest, 'notes'>)[] = [
  'footLeft',
  'footRight',
  'kneeLeft',
  'kneeRight',
  'hipLeft',
  'hipRight',
  'upperBodyLeft',
  'upperBodyRight',
  'postureLeft',
  'postureRight',
];

function isLegacyStabilityFormat(stability: MovementAssessmentStability): boolean {
  return stability.stabilityFormatVersion !== 2;
}

/** Legacy data used boolean false as default (= ej kontrollerad). Normalisera till null. */
export function normalizeStabilityForScoring(
  stability: MovementAssessmentStability
): MovementAssessmentStability {
  if (!isLegacyStabilityFormat(stability)) {
    return stability;
  }

  const normalizeStick = (test: MovementAssessmentStickTest): MovementAssessmentStickTest => {
    const values = STICK_KEYS.map((k) => test[k]);
    if (!values.every((v) => v === false)) return test;
    const out = { ...test };
    for (const k of STICK_KEYS) {
      out[k] = null;
    }
    return out;
  };

  const normalizeLunge = (test: MovementAssessmentLungeTest): MovementAssessmentLungeTest => {
    const values = LUNGE_KEYS.map((k) => test[k]);
    if (!values.every((v) => v === false)) return test;
    const out = { ...test };
    for (const k of LUNGE_KEYS) {
      out[k] = null;
    }
    return out;
  };

  return {
    ...stability,
    stickTest: normalizeStick(stability.stickTest),
    lungeTest: normalizeLunge(stability.lungeTest),
  };
}

function scoreTriStateChecks(
  values: StabilityCheckValue[]
): number | null {
  const reviewed = values.filter((v) => v !== null);
  if (reviewed.length === 0) return null;
  const flags = reviewed.filter((v) => v === true).length;
  return 100 - (flags / reviewed.length) * 90;
}

export function scoreStickTest(stickTest: MovementAssessmentStickTest): number | null {
  return scoreTriStateChecks(STICK_KEYS.map((k) => stickTest[k]));
}

export function scoreLungeTest(lungeTest: MovementAssessmentLungeTest): number | null {
  return scoreTriStateChecks(LUNGE_KEYS.map((k) => lungeTest[k]));
}

export function scoreStabilitySection(stability: MovementAssessmentStability): number | null {
  const normalized = normalizeStabilityForScoring(stability);
  const stickScore = scoreStickTest(normalized.stickTest);
  const lungeScore = scoreLungeTest(normalized.lungeTest);

  const parts: number[] = [];
  if (stickScore != null) parts.push(stickScore);
  if (lungeScore != null) parts.push(lungeScore);
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export function bandFromTotal(total: number): ScoreBand {
  if (!Number.isFinite(total)) return 'critical';
  if (total >= 90) return 'excellent';
  if (total >= 75) return 'good';
  if (total >= 60) return 'fair';
  if (total >= 40) return 'poor';
  return 'critical';
}

const W_POSTURAL = 0.15;
const W_MOBILITY = 0.45;
const W_CORE = 0.25;
const W_STABILITY = 0.15;

/**
 * Total och band när rörlighet/kärna kan saknas: vikter normaliseras om till bara mätta sektioner.
 */
export function reweightedTotalAndBand(
  posturalScore: number,
  mobilityScore: number | null,
  coreScore: number | null,
  stabilityScore: number | null
): { total: number; band: ScoreBand } {
  let sum = 0;
  let sumW = 0;
  sum += posturalScore * W_POSTURAL;
  sumW += W_POSTURAL;
  if (mobilityScore != null) {
    sum += mobilityScore * W_MOBILITY;
    sumW += W_MOBILITY;
  }
  if (coreScore != null) {
    sum += coreScore * W_CORE;
    sumW += W_CORE;
  }
  if (stabilityScore != null) {
    sum += stabilityScore * W_STABILITY;
    sumW += W_STABILITY;
  }
  const total = sumW > 0 ? sum / sumW : 0;
  return { total, band: bandFromTotal(total) };
}

export function computeScores(
  postural: MovementAssessmentPostural,
  mobility: MovementAssessmentMobility,
  core: MovementAssessmentCore,
  stability: MovementAssessmentStability
): MovementAssessmentScores {
  const posturalScore = scorePosturalSection(postural);
  const mobilityScore = scoreMobilitySection(mobility);
  const coreScore = scoreCoreSection(core);
  const stabilityScore = scoreStabilitySection(stability);

  const { total, band } = reweightedTotalAndBand(
    posturalScore,
    mobilityScore,
    coreScore,
    stabilityScore
  );

  return {
    postural: posturalScore,
    mobility: mobilityScore,
    core: coreScore,
    stability: stabilityScore,
    total,
    band,
  };
}
