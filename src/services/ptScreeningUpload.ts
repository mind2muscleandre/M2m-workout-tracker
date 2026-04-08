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

const UPLOAD_TIMEOUT_MS = 30000;
const MAX_UPLOAD_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonSafely = async (response: Response): Promise<UploadResponse> => {
  try {
    return (await response.json()) as UploadResponse;
  } catch {
    return { success: false, error: 'Ogiltigt svar från servern.' };
  }
};

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

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pt-upload-screening`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: formData,
        signal: controller.signal,
      });

      const data = await parseJsonSafely(response);
      if (response.ok && data.success) {
        return data;
      }

      const shouldRetry =
        attempt < MAX_UPLOAD_ATTEMPTS && RETRYABLE_STATUS_CODES.has(response.status);
      if (shouldRetry) {
        await wait(600);
        continue;
      }

      throw new Error(data.error || 'Uppladdningen misslyckades.');
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const shouldRetry = attempt < MAX_UPLOAD_ATTEMPTS;

      if (shouldRetry) {
        await wait(600);
        continue;
      }

      if (isAbortError) {
        throw new Error(
          'Uppladdningen tog för lång tid. Kontrollera anslutningen och försök igen.'
        );
      }

      throw error instanceof Error
        ? error
        : new Error('Uppladdningen misslyckades. Försök igen.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Uppladdningen misslyckades. Försök igen.');
};
