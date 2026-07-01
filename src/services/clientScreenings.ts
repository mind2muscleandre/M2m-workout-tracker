import { postScreeningBridge } from './m2mBridge';
import type { ScreeningSummary } from '../types/athlete';

type ListScreeningsResult = {
  success: boolean;
  screenings?: ScreeningSummary[];
  error?: string;
};

export async function listImageScreeningsForClient(
  clientId: string,
  limit = 20
): Promise<ScreeningSummary[]> {
  const data = await postScreeningBridge<ListScreeningsResult>({
    action: 'list_screenings',
    client_id: clientId,
    limit,
  });
  return data.screenings ?? [];
}
