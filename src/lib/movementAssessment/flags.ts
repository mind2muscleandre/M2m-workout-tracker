import type {
  MovementAssessment,
  MovementAssessmentCore,
  MovementAssessmentMobility,
  MovementAssessmentPostural,
  MovementAssessmentStability,
} from '../../types/movementAssessment';
import { POSTURAL_DEDUCTIONS, POSTURAL_LABELS_SV } from '../../types/movementAssessment';
import { MOBILITY_TESTS } from './scoring';

export interface AssessmentFlag {
  id: string;
  label: string;
  severity: number;
  category: 'postural' | 'mobility' | 'core' | 'stability';
  impactHint?: string;
}

function posturalFlags(postural: MovementAssessmentPostural): AssessmentFlag[] {
  return postural.observations.map((id) => {
    const deduction = POSTURAL_DEDUCTIONS[id] ?? 0;
    const severity = Math.min(5, Math.max(1, Math.ceil(deduction / 2)));
    return {
      id: `postural_${id}`,
      label: POSTURAL_LABELS_SV[id],
      severity,
      category: 'postural' as const,
      impactHint: `-${deduction} p`,
    };
  });
}

function mobilityBelowNormalFlags(mobility: MovementAssessmentMobility): AssessmentFlag[] {
  const out: AssessmentFlag[] = [];

  for (const t of MOBILITY_TESTS) {
    const lv = mobility[t.leftKey] as number | null;
    const rv = mobility[t.rightKey] as number | null;
    const check = (side: 'Vänster' | 'Höger', v: number | null) => {
      if (v == null) return;
      if (v < t.min) {
        const gap = t.min - v;
        const severity = Math.min(5, Math.max(1, Math.ceil(gap / 10) + 2));
        out.push({
          id: `mobility_${t.key}_${side === 'Vänster' ? 'L' : 'R'}`,
          label: `${t.labelSv} (${side}) under normalområde`,
          severity,
          category: 'mobility',
          impactHint: `${v} (normal ${t.min}–${t.max})`,
        });
      }
    };
    check('Vänster', lv);
    check('Höger', rv);
  }

  if (mobility.overheadSquat != null && mobility.overheadSquat < 80) {
    const gap = 80 - mobility.overheadSquat;
    out.push({
      id: 'mobility_overhead_squat',
      label: 'Overhead squat under normalområde',
      severity: Math.min(5, Math.max(1, 2 + Math.ceil(gap / 5))),
      category: 'mobility',
      impactHint: `${mobility.overheadSquat}° (normal 80–90°)`,
    });
  }

  if (mobility.overheadReach === 'minor_asymmetry') {
    out.push({
      id: 'mobility_overhead_reach_minor',
      label: 'Lätt asymmetri vid räckhöjd',
      severity: 2,
      category: 'mobility',
    });
  } else if (mobility.overheadReach === 'major_asymmetry') {
    out.push({
      id: 'mobility_overhead_reach_major',
      label: 'Påtaglig asymmetri vid räckhöjd',
      severity: 4,
      category: 'mobility',
    });
  }

  return out;
}

function coreFlags(core: MovementAssessmentCore): AssessmentFlag[] {
  const out: AssessmentFlag[] = [];
  if (core.breathingPattern && core.breathingPattern !== 'belly') {
    const sev =
      core.breathingPattern === 'can_alternate'
        ? 2
        : core.breathingPattern === 'double'
          ? 3
          : 4;
    out.push({
      id: 'core_breathing',
      label: 'Andningsmönster inte primärt diafragmatiskt',
      severity: sev,
      category: 'core',
    });
  }
  if (core.recruitmentPattern && core.recruitmentPattern !== 'ok') {
    const sev =
      core.recruitmentPattern === 'r_dominant'
        ? 2
        : core.recruitmentPattern === 'wrong_order'
          ? 4
          : 5;
    out.push({
      id: 'core_recruitment',
      label: 'Avvikande aktiveringssekvens eller svårighet att rekrytera',
      severity: sev,
      category: 'core',
    });
  }
  if (core.lumbarPelvicAngle && core.lumbarPelvicAngle !== '90') {
    const lowBuckets = new Set(['0-10', '11-25', '26-45']);
    if (lowBuckets.has(core.lumbarPelvicAngle)) {
      out.push({
        id: 'core_lumbar_control',
        label: 'Begränsad lumbopelvikontroll (lågt vinkelintervall)',
        severity: core.lumbarPelvicAngle === '0-10' ? 5 : core.lumbarPelvicAngle === '11-25' ? 4 : 3,
        category: 'core',
      });
    }
  }
  if (core.neckStrengthGrade != null && core.neckStrengthGrade <= 2) {
    out.push({
      id: 'core_neck_strength',
      label: 'Låg statisk styrka huvud/hals',
      severity: 5 - core.neckStrengthGrade,
      category: 'core',
    });
  }
  return out;
}

const STICK_LABELS: Array<{ key: keyof MovementAssessmentStability['stickTest']; label: string }> = [
  { key: 'transversalLeft', label: 'Pinne: transversalplan vänster' },
  { key: 'transversalRight', label: 'Pinne: transversalplan höger' },
  { key: 'frontalLeft', label: 'Pinne: frontalplan vänster' },
  { key: 'frontalRight', label: 'Pinne: frontalplan höger' },
  { key: 'sagital', label: 'Pinne: sagittalplan' },
  { key: 'shouldersLeft', label: 'Pinne: axlar vänster' },
  { key: 'shouldersRight', label: 'Pinne: axlar höger' },
  { key: 'pelvicHip', label: 'Pinne: bäcken/höft' },
];

const LUNGE_LABELS: Array<{ key: keyof MovementAssessmentStability['lungeTest']; label: string }> = [
  { key: 'footLeft', label: 'Utfall: fot vänster' },
  { key: 'footRight', label: 'Utfall: fot höger' },
  { key: 'kneeLeft', label: 'Utfall: knä vänster' },
  { key: 'kneeRight', label: 'Utfall: knä höger' },
  { key: 'hipLeft', label: 'Utfall: höft vänster' },
  { key: 'hipRight', label: 'Utfall: höft höger' },
  { key: 'upperBodyLeft', label: 'Utfall: överkropp vänster' },
  { key: 'upperBodyRight', label: 'Utfall: överkropp höger' },
  { key: 'postureLeft', label: 'Utfall: hållning vänster' },
  { key: 'postureRight', label: 'Utfall: hållning höger' },
];

function stabilityFlags(stability: MovementAssessmentStability): AssessmentFlag[] {
  const out: AssessmentFlag[] = [];
  for (const { key, label } of STICK_LABELS) {
    if (stability.stickTest[key] === true) {
      out.push({
        id: `stick_${String(key)}`,
        label,
        severity: 3,
        category: 'stability',
      });
    }
  }
  for (const { key, label } of LUNGE_LABELS) {
    if (stability.lungeTest[key] === true) {
      out.push({
        id: `lunge_${String(key)}`,
        label,
        severity: 3,
        category: 'stability',
      });
    }
  }
  return out;
}

/** Sort by impact: postural deduction, then severity */
export function buildSortedFlags(assessment: Omit<MovementAssessment, 'scores'>): AssessmentFlag[] {
  const all = [
    ...posturalFlags(assessment.postural),
    ...mobilityBelowNormalFlags(assessment.mobility),
    ...coreFlags(assessment.core),
    ...stabilityFlags(assessment.stability),
  ];

  const posturalDeduction = (f: AssessmentFlag) => {
    if (f.category !== 'postural' || !f.impactHint) return 0;
    const m = f.impactHint.match(/-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  return all.sort((a, b) => {
    const da = posturalDeduction(a);
    const db = posturalDeduction(b);
    if (da !== db) return db - da;
    return b.severity - a.severity;
  });
}
