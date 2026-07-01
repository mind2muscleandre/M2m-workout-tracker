import { postAssessmentBridge } from './m2mBridge';
import type { MovementAssessmentSummary } from '../types/athlete';

type ListAssessmentsResult = {
  success: boolean;
  assessments?: MovementAssessmentSummary[];
  error?: string;
};

export async function listMovementAssessmentsForClient(
  clientId: string,
  limit = 20
): Promise<MovementAssessmentSummary[]> {
  const data = await postAssessmentBridge<ListAssessmentsResult>({
    action: 'list_assessments',
    client_id: clientId,
    limit,
  });
  return data.assessments ?? [];
}
