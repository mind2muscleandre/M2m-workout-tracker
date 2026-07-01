import type { ScoreBand } from './movementAssessment';

export interface AthleteProfile {
  user_id: string;
  name: string;
  email: string;
  team: string | null;
}

export interface MovementAssessmentSummary {
  id: string;
  created_at: string;
  assessment_date: string;
  client_name: string;
  client_email: string;
  user_id: string;
  tracker_client_id: string | null;
  resultat_hallning: number | null;
  resultat_rorlighet: number | null;
  resultat_karna: number | null;
  resultat_stabilitet: number | null;
  resultat_totalt: number | null;
  resultat_band: ScoreBand | string | null;
  raw_assessment: Record<string, unknown> | null;
  export_payload: Record<string, unknown> | null;
}

export interface ScreeningSummary {
  id: string;
  screening_id: string;
  user_id: string;
  name: string;
  email: string;
  analysis_type: string;
  uploaded_at: string;
  video_url: string | null;
  queue_status: string | null;
  testomrade: string | null;
}
