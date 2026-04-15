import type {
  LumbarPelvicAngleBucket,
  MovementAssessmentCore,
  MovementAssessmentMobility,
  MovementAssessmentPostural,
  MovementAssessmentScores,
  MovementAssessmentStability,
  OverheadReachQualitative,
  ScoreBand,
} from '../../types/movementAssessment';
import { POSTURAL_DEDUCTIONS } from '../../types/movementAssessment';

/** scoreForValue per spec */
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

function bilateralAvg(left: number | null, right: number | null, min: number, max: number): number | null {
  return scoreBilateralTest(left, right, min, max);
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

  push(scoreBilateralTest(mobility.ankleLeft, mobility.ankleRight, 12, 14));
  push(scoreBilateralTest(mobility.slrLeft, mobility.slrRight, 60, 70));
  push(scoreBilateralTest(mobility.hipFlexionLeft, mobility.hipFlexionRight, 110, 120));
  push(scoreBilateralTest(mobility.hipAbductionLeft, mobility.hipAbductionRight, 40, 50));
  push(scoreBilateralTest(mobility.hipMedRotSupineLeft, mobility.hipMedRotSupineRight, 30, 40));
  push(scoreBilateralTest(mobility.hipLatRotSupineLeft, mobility.hipLatRotSupineRight, 45, 55));
  push(scoreBilateralTest(mobility.shoulderPositionLeft, mobility.shoulderPositionRight, 4, 6));
  push(scoreBilateralTest(mobility.shoulderMedRotLeft, mobility.shoulderMedRotRight, 60, 70));
  push(scoreBilateralTest(mobility.shoulderLatRotLeft, mobility.shoulderLatRotRight, 80, 90));
  push(scoreBilateralTest(mobility.armRaiseLeft, mobility.armRaiseRight, 170, 180));
  push(scoreBilateralTest(mobility.upperBodySideFlexLeft, mobility.upperBodySideFlexRight, 40, 50));
  push(scoreBilateralTest(mobility.neckSideFlexLeft, mobility.neckSideFlexRight, 30, 40));
  push(scoreBilateralTest(mobility.hipMedRotStandingLeft, mobility.hipMedRotStandingRight, 30, 40));
  push(scoreBilateralTest(mobility.hipLatRotStandingLeft, mobility.hipLatRotStandingRight, 45, 55));
  push(scoreBilateralTest(mobility.longHipFlexorLeft, mobility.longHipFlexorRight, 0, 14));
  push(scoreBilateralTest(mobility.upperBodyRotationLeft, mobility.upperBodyRotationRight, 60, 70));
  push(scoreBilateralTest(mobility.neckRotationLeft, mobility.neckRotationRight, 70, 80));

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

function countStickFlags(st: MovementAssessmentStability['stickTest']): number {
  let n = 0;
  if (st.transversalLeft) n++;
  if (st.transversalRight) n++;
  if (st.frontalLeft) n++;
  if (st.frontalRight) n++;
  if (st.sagital) n++;
  if (st.shouldersLeft) n++;
  if (st.shouldersRight) n++;
  if (st.pelvicHip) n++;
  return n;
}

function countLungeFlags(lt: MovementAssessmentStability['lungeTest']): number {
  let n = 0;
  if (lt.footLeft) n++;
  if (lt.footRight) n++;
  if (lt.kneeLeft) n++;
  if (lt.kneeRight) n++;
  if (lt.hipLeft) n++;
  if (lt.hipRight) n++;
  if (lt.upperBodyLeft) n++;
  if (lt.upperBodyRight) n++;
  if (lt.postureLeft) n++;
  if (lt.postureRight) n++;
  return n;
}

export function scoreStabilitySection(stability: MovementAssessmentStability): number {
  const stickFlags = countStickFlags(stability.stickTest);
  const stickScore = 100 - (stickFlags / 8) * 90;

  const lungeFlags = countLungeFlags(stability.lungeTest);
  const lungeScore = 100 - (lungeFlags / 10) * 90;

  return (stickScore + lungeScore) / 2;
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
  stabilityScore: number
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
  sum += stabilityScore * W_STABILITY;
  sumW += W_STABILITY;
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

/** Mobility test meta for flagging below-normal */
export const MOBILITY_TESTS: Array<{
  key: string;
  labelSv: string;
  leftKey: keyof MovementAssessmentMobility;
  rightKey: keyof MovementAssessmentMobility;
  min: number;
  max: number;
  bilateral: boolean;
}> = [
  { key: 'ankle', labelSv: 'Knölmobilitet (squat)', leftKey: 'ankleLeft', rightKey: 'ankleRight', min: 12, max: 14, bilateral: true },
  { key: 'slr', labelSv: 'SLR', leftKey: 'slrLeft', rightKey: 'slrRight', min: 60, max: 70, bilateral: true },
  { key: 'hip_flex', labelSv: 'Höftflexion', leftKey: 'hipFlexionLeft', rightKey: 'hipFlexionRight', min: 110, max: 120, bilateral: true },
  { key: 'hip_abd', labelSv: 'Höftabduktion', leftKey: 'hipAbductionLeft', rightKey: 'hipAbductionRight', min: 40, max: 50, bilateral: true },
  { key: 'hip_med_sup', labelSv: 'Höft innåtrotation (90°)', leftKey: 'hipMedRotSupineLeft', rightKey: 'hipMedRotSupineRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_lat_sup', labelSv: 'Höft utåtrotation (90°)', leftKey: 'hipLatRotSupineLeft', rightKey: 'hipLatRotSupineRight', min: 45, max: 55, bilateral: true },
  { key: 'shoulder_pos', labelSv: 'Axelled (golv–akromion)', leftKey: 'shoulderPositionLeft', rightKey: 'shoulderPositionRight', min: 4, max: 6, bilateral: true },
  { key: 'sh_med', labelSv: 'Axel innåtrotation (60°)', leftKey: 'shoulderMedRotLeft', rightKey: 'shoulderMedRotRight', min: 60, max: 70, bilateral: true },
  { key: 'sh_lat', labelSv: 'Axel utåtrotation (60°)', leftKey: 'shoulderLatRotLeft', rightKey: 'shoulderLatRotRight', min: 80, max: 90, bilateral: true },
  { key: 'arm_raise', labelSv: 'Armlyft stående', leftKey: 'armRaiseLeft', rightKey: 'armRaiseRight', min: 170, max: 180, bilateral: true },
  { key: 'side_flex', labelSv: 'Sidoflexion överkropp', leftKey: 'upperBodySideFlexLeft', rightKey: 'upperBodySideFlexRight', min: 40, max: 50, bilateral: true },
  { key: 'neck_side', labelSv: 'Sidoflexion hals', leftKey: 'neckSideFlexLeft', rightKey: 'neckSideFlexRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_med_st', labelSv: 'Höft innåtrotation (0°)', leftKey: 'hipMedRotStandingLeft', rightKey: 'hipMedRotStandingRight', min: 30, max: 40, bilateral: true },
  { key: 'hip_lat_st', labelSv: 'Höft utåtrotation (0°)', leftKey: 'hipLatRotStandingLeft', rightKey: 'hipLatRotStandingRight', min: 45, max: 55, bilateral: true },
  { key: 'long_hf', labelSv: 'Långa höftböjarna', leftKey: 'longHipFlexorLeft', rightKey: 'longHipFlexorRight', min: 0, max: 14, bilateral: true },
  { key: 'ub_rot', labelSv: 'Rotation överkropp sittande', leftKey: 'upperBodyRotationLeft', rightKey: 'upperBodyRotationRight', min: 60, max: 70, bilateral: true },
  { key: 'neck_rot', labelSv: 'Halsrotation sittande', leftKey: 'neckRotationLeft', rightKey: 'neckRotationRight', min: 70, max: 80, bilateral: true },
];
