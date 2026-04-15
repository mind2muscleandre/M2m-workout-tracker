// ============================================
// Movement assessment (internal model; neutral naming)
// ============================================

export type PosturalObservationId =
  | 'forward_head'
  | 'thoracic_kyphosis'
  | 'straightened_thoracic'
  | 'scoliosis'
  | 'lumbar_lordosis'
  | 'flattened_lumbar'
  | 'anterior_pelvic_tilt'
  | 'posterior_pelvic_tilt'
  | 'high_ilium'
  | 'pelvic_torsion'
  | 'rounded_shoulders'
  | 'winging_scapula'
  | 'bow_legs'
  | 'knock_knees'
  | 'excessive_pronation'
  | 'excessive_supination';

export type BreathingPattern = 'belly' | 'chest' | 'double' | 'can_alternate';

export type RecruitmentPattern = 'ok' | 'r_dominant' | 'wrong_order' | 'cant_recruit';

export type LumbarPelvicAngleBucket =
  | '0-10'
  | '11-25'
  | '26-45'
  | '46-60'
  | '61-75'
  | '76-89'
  | '90';

export type OverheadReachQualitative = 'symmetric' | 'minor_asymmetry' | 'major_asymmetry';

export type ScoreBand = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface MovementAssessmentScores {
  postural: number;
  /** null om inget rörlighetsdata registrerats */
  mobility: number | null;
  /** null om ingen kärndata registrerats */
  core: number | null;
  stability: number;
  total: number;
  band: ScoreBand;
}

export interface MovementAssessmentPostural {
  observations: PosturalObservationId[];
  notes: string;
}

export interface MovementAssessmentMobility {
  ankleLeft: number | null;
  ankleRight: number | null;
  slrLeft: number | null;
  slrRight: number | null;
  hipFlexionLeft: number | null;
  hipFlexionRight: number | null;
  hipAbductionLeft: number | null;
  hipAbductionRight: number | null;
  hipMedRotSupineLeft: number | null;
  hipMedRotSupineRight: number | null;
  hipLatRotSupineLeft: number | null;
  hipLatRotSupineRight: number | null;
  shoulderPositionLeft: number | null;
  shoulderPositionRight: number | null;
  shoulderMedRotLeft: number | null;
  shoulderMedRotRight: number | null;
  shoulderLatRotLeft: number | null;
  shoulderLatRotRight: number | null;
  armRaiseLeft: number | null;
  armRaiseRight: number | null;
  upperBodySideFlexLeft: number | null;
  upperBodySideFlexRight: number | null;
  neckSideFlexLeft: number | null;
  neckSideFlexRight: number | null;
  hipMedRotStandingLeft: number | null;
  hipMedRotStandingRight: number | null;
  hipLatRotStandingLeft: number | null;
  hipLatRotStandingRight: number | null;
  longHipFlexorLeft: number | null;
  longHipFlexorRight: number | null;
  upperBodyRotationLeft: number | null;
  upperBodyRotationRight: number | null;
  neckRotationLeft: number | null;
  neckRotationRight: number | null;
  overheadSquat: number | null;
  overheadReach: OverheadReachQualitative | null;
}

export interface MovementAssessmentCore {
  breathingPattern: BreathingPattern | null;
  recruitmentPattern: RecruitmentPattern | null;
  lumbarPelvicAngle: LumbarPelvicAngleBucket | null;
  lumbarPelvicReps: number | null;
  neckStrengthGrade: 0 | 1 | 2 | 3 | 4 | 5 | null;
}

export interface MovementAssessmentStickTest {
  transversalLeft: boolean;
  transversalRight: boolean;
  frontalLeft: boolean;
  frontalRight: boolean;
  sagital: boolean;
  shouldersLeft: boolean;
  shouldersRight: boolean;
  pelvicHip: boolean;
  notes: string;
}

export interface MovementAssessmentLungeTest {
  footLeft: boolean;
  footRight: boolean;
  kneeLeft: boolean;
  kneeRight: boolean;
  hipLeft: boolean;
  hipRight: boolean;
  upperBodyLeft: boolean;
  upperBodyRight: boolean;
  postureLeft: boolean;
  postureRight: boolean;
  notes: string;
}

export interface MovementAssessmentStability {
  stickTest: MovementAssessmentStickTest;
  lungeTest: MovementAssessmentLungeTest;
}

/** Full assessment record (included in external export JSON as raw snapshot) */
export interface MovementAssessment {
  id: string;
  clientId: string;
  assessorId: string;
  date: string;
  postural: MovementAssessmentPostural;
  mobility: MovementAssessmentMobility;
  core: MovementAssessmentCore;
  stability: MovementAssessmentStability;
  scores: MovementAssessmentScores;
}

export const POSTURAL_DEDUCTIONS: Record<PosturalObservationId, number> = {
  forward_head: 8,
  thoracic_kyphosis: 7,
  straightened_thoracic: 5,
  scoliosis: 10,
  lumbar_lordosis: 6,
  flattened_lumbar: 5,
  anterior_pelvic_tilt: 7,
  posterior_pelvic_tilt: 6,
  high_ilium: 5,
  pelvic_torsion: 8,
  rounded_shoulders: 6,
  winging_scapula: 6,
  bow_legs: 5,
  knock_knees: 5,
  excessive_pronation: 4,
  excessive_supination: 4,
};

export const POSTURAL_LABELS_SV: Record<PosturalObservationId, string> = {
  forward_head: 'Framskjutet huvud',
  thoracic_kyphosis: 'Thorakal kyfos',
  straightened_thoracic: 'Rak thorakalkurva',
  scoliosis: 'Skolios',
  lumbar_lordosis: 'Lumbal lordos',
  flattened_lumbar: 'Platt lumbalkurva',
  anterior_pelvic_tilt: 'Framåtlutat bäcken',
  posterior_pelvic_tilt: 'Bakåtlutat bäcken',
  high_ilium: 'Höjd iliak kam',
  pelvic_torsion: 'Bäckenrotation',
  rounded_shoulders: 'Rundade axlar',
  winging_scapula: 'Scapula winging',
  bow_legs: 'O-bensställning',
  knock_knees: 'X-bensställning',
  excessive_pronation: 'Överdriven pronation',
  excessive_supination: 'Överdriven supination',
};

export function createEmptyStickTest(): MovementAssessmentStickTest {
  return {
    transversalLeft: false,
    transversalRight: false,
    frontalLeft: false,
    frontalRight: false,
    sagital: false,
    shouldersLeft: false,
    shouldersRight: false,
    pelvicHip: false,
    notes: '',
  };
}

export function createEmptyLungeTest(): MovementAssessmentLungeTest {
  return {
    footLeft: false,
    footRight: false,
    kneeLeft: false,
    kneeRight: false,
    hipLeft: false,
    hipRight: false,
    upperBodyLeft: false,
    upperBodyRight: false,
    postureLeft: false,
    postureRight: false,
    notes: '',
  };
}

export function createEmptyMobility(): MovementAssessmentMobility {
  return {
    ankleLeft: null,
    ankleRight: null,
    slrLeft: null,
    slrRight: null,
    hipFlexionLeft: null,
    hipFlexionRight: null,
    hipAbductionLeft: null,
    hipAbductionRight: null,
    hipMedRotSupineLeft: null,
    hipMedRotSupineRight: null,
    hipLatRotSupineLeft: null,
    hipLatRotSupineRight: null,
    shoulderPositionLeft: null,
    shoulderPositionRight: null,
    shoulderMedRotLeft: null,
    shoulderMedRotRight: null,
    shoulderLatRotLeft: null,
    shoulderLatRotRight: null,
    armRaiseLeft: null,
    armRaiseRight: null,
    upperBodySideFlexLeft: null,
    upperBodySideFlexRight: null,
    neckSideFlexLeft: null,
    neckSideFlexRight: null,
    hipMedRotStandingLeft: null,
    hipMedRotStandingRight: null,
    hipLatRotStandingLeft: null,
    hipLatRotStandingRight: null,
    longHipFlexorLeft: null,
    longHipFlexorRight: null,
    upperBodyRotationLeft: null,
    upperBodyRotationRight: null,
    neckRotationLeft: null,
    neckRotationRight: null,
    overheadSquat: null,
    overheadReach: null,
  };
}

export function createEmptyCore(): MovementAssessmentCore {
  return {
    breathingPattern: null,
    recruitmentPattern: null,
    lumbarPelvicAngle: null,
    lumbarPelvicReps: null,
    neckStrengthGrade: null,
  };
}
