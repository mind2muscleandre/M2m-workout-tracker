import { postAssessmentBridge } from './m2mBridge';
import type { AthleteProfile } from '../types/athlete';

type ListAthletesResult = {
  success: boolean;
  athletes?: AthleteProfile[];
  error?: string;
};

export async function listAssignableAthletes(input?: {
  query?: string;
  limit?: number;
}): Promise<AthleteProfile[]> {
  const data = await postAssessmentBridge<ListAthletesResult>({
    action: 'list_athletes',
    query: input?.query?.trim() ?? '',
    limit: input?.limit ?? 80,
  });
  return data.athletes ?? [];
}
