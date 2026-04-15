import { Platform } from 'react-native';
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
const AUTH_RESOLVE_TIMEOUT_MS = 15000;
const MAX_UPLOAD_ATTEMPTS = 2;
const RETRYABLE_STATUS_CODES = new Set([401, 408, 429, 500, 502, 503, 504]);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

/** Valid access token for Edge Functions; refresh before expiry to avoid gateway 401. */
const resolveAccessToken = async (): Promise<string> => {
  return withTimeout(
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session?.expires_at ?? 0;
      if (!session?.access_token) {
        throw new Error('Du måste vara inloggad som PT för att ladda upp screening.');
      }
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
    })(),
    AUTH_RESOLVE_TIMEOUT_MS,
    'AUTH_TIMEOUT'
  ).catch((e) => {
    if (e instanceof Error && e.message === 'AUTH_TIMEOUT') {
      // Fallback for intermittent web stalls in auth client: re-read session once without race timeout.
      return supabase.auth
        .getSession()
        .then(({ data }) => {
          const fallbackToken = data.session?.access_token;
          if (fallbackToken) return fallbackToken;
          throw new Error('Kunde inte bekräfta inloggning i tid. Uppdatera sidan eller logga in igen.');
        })
        .catch(() => {
          throw new Error('Kunde inte bekräfta inloggning i tid. Uppdatera sidan eller logga in igen.');
        });
    }
    throw e;
  });
};

/** Native only: RN FormData file parts ({ uri, name, type }). */
const buildFormData = async (payload: UploadPayload): Promise<FormData> => {
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

/** Web: multipart + access_token field — large JSON bodies caused gateway to drop Authorization. */
const buildWebFormData = async (payload: UploadPayload, accessToken: string): Promise<FormData> => {
  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('target_email', payload.person.email.trim().toLowerCase());
  formData.append('target_name', payload.person.name.trim());
  formData.append('team', payload.person.team?.trim() ?? '');
  formData.append('injury_history', payload.injuryHistory?.trim() ?? '');
  formData.append('analysis_types', JSON.stringify(payload.analysisTypes));
  for (const file of payload.files) {
    const res = await fetch(file.uri);
    const blob = await res.blob();
    const type = file.type || blob.type || 'image/jpeg';
    const f = new File([blob], file.name, { type });
    formData.append('files', f);
  }
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

/**
 * Web: `fetch` + large FormData often reaches Supabase without `Authorization` (gateway 401).
 * XHR + setRequestHeader keeps apikey + Bearer before send(FormData); do not set Content-Type.
 */
const postMultipartWebWithXhr = (
  url: string,
  formData: FormData,
  apikey: string,
  authorization: string,
  timeoutMs: number
): Promise<{ status: number; bodyText: string }> =>
  new Promise((resolve, reject) => {
    const BrowserXHR =
      typeof window !== 'undefined' && typeof window.XMLHttpRequest === 'function'
        ? window.XMLHttpRequest
        : XMLHttpRequest;
    const xhr = new BrowserXHR();
    xhr.open('POST', url);
    xhr.setRequestHeader('apikey', apikey);
    xhr.setRequestHeader('Authorization', authorization);
    xhr.timeout = timeoutMs;
    xhr.onload = () =>
      resolve({ status: xhr.status, bodyText: xhr.responseText ?? '' });
    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.ontimeout = () => reject(new Error('UPLOAD_TIMEOUT'));
    xhr.send(formData);
  });

const parseJsonSafely = async (response: Response): Promise<UploadResponse> => {
  try {
    return (await response.json()) as UploadResponse;
  } catch {
    return { success: false, error: 'Ogiltigt svar från servern.' };
  }
};

const parseJsonFromText = (text: string): UploadResponse => {
  try {
    return JSON.parse(text) as UploadResponse;
  } catch {
    return { success: false, error: 'Ogiltigt svar från servern.' };
  }
};

export const uploadPtScreening = async (
  payload: UploadPayload
): Promise<UploadResponse> => {
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const accessToken = await resolveAccessToken();
    const url = `${SUPABASE_URL}/functions/v1/m2m-screening-bridge`;
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    };

    try {
      let status: number;
      let data: UploadResponse;

      if (Platform.OS === 'web') {
        const formData = await buildWebFormData(payload, accessToken);
        const { status: st, bodyText } = await postMultipartWebWithXhr(
          url,
          formData,
          SUPABASE_ANON_KEY,
          `Bearer ${SUPABASE_ANON_KEY}`,
          UPLOAD_TIMEOUT_MS
        );
        status = st;
        data = parseJsonFromText(bodyText);
      } else {
        const formData = await buildFormData(payload);
        const response = await fetchWithHardTimeout(
          url,
          {
            method: 'POST',
            headers: authHeaders,
            body: formData,
          },
          UPLOAD_TIMEOUT_MS
        );
        status = response.status;
        data = await parseJsonSafely(response);
      }

      const ok = status >= 200 && status < 300;
      if (ok && data.success) {
        return data;
      }

      const shouldRetry =
        attempt < MAX_UPLOAD_ATTEMPTS && RETRYABLE_STATUS_CODES.has(status);
      if (shouldRetry) {
        await wait(600);
        continue;
      }

      const msg =
        status === 401
          ? data.error ||
            'Inloggningen verkar ha gått ut. Logga in igen och försök på nytt.'
          : data.error || 'Uppladdningen misslyckades.';
      throw new Error(msg);
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'UPLOAD_TIMEOUT';
      const isNetwork = error instanceof Error && error.message === 'NETWORK_ERROR';
      const shouldRetry = attempt < MAX_UPLOAD_ATTEMPTS;

      if (
        shouldRetry &&
        (isTimeout ||
          isNetwork ||
          (error instanceof Error && error.name === 'AbortError'))
      ) {
        await wait(600);
        continue;
      }

      if (isTimeout) {
        throw new Error(
          'Uppladdningen tog för lång tid. Kontrollera anslutningen och försök igen.'
        );
      }
      if (isNetwork) {
        throw new Error('Nätverksfel vid uppladdning. Kontrollera anslutningen och försök igen.');
      }

      throw error instanceof Error
        ? error
        : new Error('Uppladdningen misslyckades. Försök igen.');
    }
  }

  throw new Error('Uppladdningen misslyckades. Försök igen.');
};
