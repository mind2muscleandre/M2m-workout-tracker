import type { ExerciseBankItem } from '../../services/exerciseBankService';

export type SuggestedExercise = ExerciseBankItem & {
  suggestionReason: string;
  priority: 1 | 2 | 3;
};

export type AssessmentSectionScores = {
  mobility: number | null;
  core: number | null;
  stability: number | null;
  postural: number | null;
};

type SectionRule = {
  scoreKey: keyof AssessmentSectionScores;
  keywords: string[];
  reason: string;
  priority: 1 | 2 | 3;
};

const SECTION_RULES: SectionRule[] = [
  {
    scoreKey: 'mobility',
    keywords: ['fotled', 'hamstring', 'höft', 'axled', 'bröstrygg', 'rörlighet', 'lateral', 'lår', 'arm', 'rak'],
    reason: 'Rörlighetssektion under målvärde',
    priority: 1,
  },
  {
    scoreKey: 'core',
    keywords: ['mag', 'kärna', 'säte', 'bäcken', 'core', 'djup', 'nedre'],
    reason: 'Kärnsektion under målvärde',
    priority: 1,
  },
  {
    scoreKey: 'stability',
    keywords: ['stabilitet', 'stabilisering', 'balans', 'pinn', 'utfall'],
    reason: 'Stabilitetssektion under målvärde',
    priority: 2,
  },
  {
    scoreKey: 'postural',
    keywords: ['hållning', 'bröstrygg', 'axel', 'nacke', 'scapul', 'trapez'],
    reason: 'Hållningssektion under målvärde',
    priority: 2,
  },
];

const THRESHOLD = 75;
const MAX_PER_SECTION = 5;

function areaMatchesKeywords(area: string | null, keywords: string[]): boolean {
  if (!area) return false;
  const lower = area.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function buildProgramSuggestion(
  scores: AssessmentSectionScores,
  exercises: ExerciseBankItem[]
): SuggestedExercise[] {
  const suggested: SuggestedExercise[] = [];
  const addedIds = new Set<string>();

  for (const rule of SECTION_RULES) {
    const score = scores[rule.scoreKey];
    if (score == null || score >= THRESHOLD) continue;

    const matches = exercises
      .filter((e) => !addedIds.has(e.id) && areaMatchesKeywords(e.area, rule.keywords))
      .slice(0, MAX_PER_SECTION);

    for (const e of matches) {
      addedIds.add(e.id);
      suggested.push({ ...e, suggestionReason: rule.reason, priority: rule.priority });
    }
  }

  return suggested.sort((a, b) => a.priority - b.priority);
}
