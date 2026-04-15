import type { MovementAssessment, ScoreBand } from '../../types/movementAssessment';
import { buildSortedFlags } from './flags';
import { buildRecommendedActions } from './recommendedActions';
import { computeScores } from './scoring';

export interface PerformExportPayload {
  stacScore: number;
  stacBand: string;
  stacSectionScores: {
    postural: number;
    mobility: number | null;
    core: number | null;
    stability: number;
  };
  stacFlags: Array<{
    id: string;
    label: string;
    severity: number;
    category: string;
    impactHint?: string;
  }>;
  /** Snapshot for external systems; may normalize fields (e.g. breathing as array). */
  stacRawData: Record<string, unknown>;
  recommendedActions: string[];
}

const BAND_LABEL_SV: Record<ScoreBand, string> = {
  excellent: 'Utmärkt (inom normalområde)',
  good: 'Bra (mindre avvikelser)',
  fair: 'Acceptabelt (måttliga begränsningar)',
  poor: 'Svagt (tydliga begränsningar)',
  critical: 'Kritiskt (kräver omedelbart fokus)',
};

export function bandDisplaySv(band: ScoreBand): string {
  return BAND_LABEL_SV[band];
}

export function buildPerformExportPayload(assessment: MovementAssessment): PerformExportPayload {
  const scores = computeScores(
    assessment.postural,
    assessment.mobility,
    assessment.core,
    assessment.stability
  );
  const full: MovementAssessment = { ...assessment, scores };
  const flags = buildSortedFlags(full);
  const recommendedActions = buildRecommendedActions(flags);

  const rawForExport = JSON.parse(JSON.stringify(full)) as Record<string, unknown>;
  const core = rawForExport.core as Record<string, unknown> | undefined;
  if (core && core.breathingPattern != null && !Array.isArray(core.breathingPattern)) {
    core.breathingPattern = [core.breathingPattern];
  }

  return {
    stacScore: Math.round(scores.total * 10) / 10,
    stacBand: BAND_LABEL_SV[scores.band],
    stacSectionScores: {
      postural: scores.postural,
      mobility: scores.mobility,
      core: scores.core,
      stability: scores.stability,
    },
    stacFlags: flags.map((f) => ({
      id: f.id,
      label: f.label,
      severity: f.severity,
      category: f.category,
      ...(f.impactHint ? { impactHint: f.impactHint } : {}),
    })),
    stacRawData: rawForExport,
    recommendedActions,
  };
}
