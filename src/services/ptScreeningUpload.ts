import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';

export interface QueuePerson {
  email: string;
  name: string;
  team?: string;
}

export interface UploadPayload {
  person: QueuePerson;
  injuryHistory?: string;
  analysisTypes: string[];
  files: Array<{ uri: string; name: string; type: string }>;
}

interface UploadResponse {
  success: boolean;
  screening_id?: string;
  upload_count?: number;
  error?: string;
}

export const uploadPtScreening = async (
  payload: UploadPayload
): Promise<UploadResponse> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Du måste vara inloggad som PT för att ladda upp screening.');
  }

  const formData = new FormData();
  formData.append('target_email', payload.person.email.trim().toLowerCase());
  formData.append('target_name', payload.person.name.trim());
  formData.append('team', payload.person.team?.trim() ?? '');
  formData.append('injury_history', payload.injuryHistory?.trim() ?? '');
  formData.append('analysis_types', JSON.stringify(payload.analysisTypes));

  payload.files.forEach((file) => {
    formData.append('files', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  });

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/pt-upload-screening`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: formData,
    }
  );

  const data = (await response.json()) as UploadResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Uppladdningen misslyckades.');
  }

  return data;
};
