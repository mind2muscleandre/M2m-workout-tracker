import type { AssessmentFlag } from './flags';

/** Rule-based Swedish recommendations from flags (deterministic). */
export function buildRecommendedActions(flags: AssessmentFlag[]): string[] {
  const ids = new Set(flags.map((f) => f.id));
  const categories = new Set(flags.map((f) => f.category));
  const actions: string[] = [];

  if (categories.has('postural')) {
    actions.push(
      'Prioritera postural medvetenhet och daglig hållningsträning; komplettera med mobilitet för identifierade avvikelser.'
    );
  }
  if (flags.some((f) => f.category === 'mobility')) {
    actions.push(
      'Planera riktad rörlighets- och stretchträning utifrån sidor och leder som ligger under normalområdet.'
    );
  }
  if (flags.some((f) => f.id.startsWith('core_'))) {
    actions.push(
      'Lägg in andnings- och djup stabiliseringsträning (t.ex. diaphragm/core sequencing) samt gradvis progress av lumbopelvikontroll.'
    );
  }
  if (flags.some((f) => f.id.startsWith('stick_') || f.id.startsWith('lunge_'))) {
    actions.push(
      'Träna enbensstabilitet och anti-rotation; progressera från statiska till dynamiska mönster utifrån pinn- och utfallsfynd.'
    );
  }
  if (ids.has('mobility_overhead_reach_major')) {
    actions.push('Utred asymmetri vid overheadrörelse med scapulär och thorakal mobilitet innan tung belastning.');
  }
  if (ids.has('core_neck_strength')) {
    actions.push('Försiktig progress av djupa halsflexorer/extensorer i neutral position med fokus på teknik.');
  }

  if (actions.length === 0) {
    actions.push('Fortsätt underhåll av rörlighet, styrka och stabilitet enligt nuvarande träningsplan.');
  }

  return [...new Set(actions)];
}
