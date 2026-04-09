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

const UPLOAD_TIMEOUT_MS = 45000;
const MAX_UPLOAD_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([401, 408, 429, 500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Valid access token for Edge Functions; refresh before expiry to avoid gateway 401. */
const resolveAccessToken = async (): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Du måste vara inloggad som PT för att ladda upp screening.');
  }
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  const refreshIfBefore = now + 120;
  if (expiresAt >= refreshIfBefore) {
    return session.access_token;
  }
  const { data, error } = await supabase.auth.refreshSession();
  const token = data.session?.access_token;
  if (token) {
    return token;
  }
  if (error) {
    throw new Error(
      'Inloggningen har gått ut. Logga in igen och försök på nytt.'
    );
  }
  throw new Error('Inloggningen har gått ut. Logga in igen och försök på nytt.');
};

const buildFormData = (payload: UploadPayload): FormData => {
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
  return formData;
};

const fetchWithHardTimeout = (url: string, init: RequestInit, timeoutMs: number): Promise<Response> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('UPLOAD_TIMEOUT'));
    }, timeoutMs);
    fetch(url, init)
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });

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
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const formData = buildFormData(payload);
    const accessToken = await resolveAccessToken();

    try {
      const response = await fetchWithHardTimeout(
        `${SUPABASE_URL}/functions/v1/m2m-screening-bridge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: formData,
        },
        UPLOAD_TIMEOUT_MS
      );

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

      const msg =
        response.status === 401
          ? data.error ||
            'Inloggningen verkar ha gått ut. Logga in igen och försök på nytt.'
          : data.error || 'Uppladdningen misslyckades.';
      throw new Error(msg);
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'UPLOAD_TIMEOUT';
      const shouldRetry = attempt < MAX_UPLOAD_ATTEMPTS;

      if (shouldRetry && (isTimeout || (error instanceof Error && error.name === 'AbortError'))) {
        await wait(600);
        continue;
      }

      if (isTimeout) {
        throw new Error(
          'Uppladdningen tog för lång tid. Kontrollera anslutningen och försök igen.'
        );
      }

      throw error instanceof Error
        ? error
        : new Error('Uppladdningen misslyckades. Försök igen.');
    }
  }

  throw new Error('Uppladdningen misslyckades. Försök igen.');
};
