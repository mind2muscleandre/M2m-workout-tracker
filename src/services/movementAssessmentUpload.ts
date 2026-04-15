import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';
import type { MovementAssessment } from '../types/movementAssessment';
import type { PerformExportPayload } from '../lib/movementAssessment/exportPayload';
import type { FlatScalar } from '../lib/movementAssessment/supabaseFlatRow';
import type { QueuePerson } from './ptScreeningUpload';

export interface MovementAssessmentUploadInput {
  person: QueuePerson;
  trackerClientId: string;
  assessment: MovementAssessment;
  exportPayload: PerformExportPayload;
  /** OH-squat-stil: kolumner per test för screeningappen */
  flatAssessmentColumns: Record<string, FlatScalar>;
}

interface UploadResponse {
  success: boolean;
  assessment_id?: string;
  target_user_id?: string;
  error?: string;
}

const REQUEST_TIMEOUT_MS = 45000;
const AUTH_RESOLVE_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;
const RETRYABLE = new Set([401, 408, 429, 500, 502, 503, 504]);

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

const resolveAccessToken = async (): Promise<string> => {
  return withTimeout(
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session?.expires_at ?? 0;
      if (!session?.access_token) {
        throw new Error('Du måste vara inloggad som PT för att skicka bedömning.');
      }
      const refreshIfBefore = now + 120;
      if (expiresAt >= refreshIfBefore) {
        return session.access_token;
      }
      const { data, error } = await supabase.auth.refreshSession();
      const token = data.session?.access_token;
      if (token) return token;
      if (error) {
        throw new Error('Inloggningen har gått ut. Logga in igen och försök på nytt.');
      }
      throw new Error('Inloggningen har gått ut. Logga in igen och försök på nytt.');
    })(),
    AUTH_RESOLVE_TIMEOUT_MS,
    'AUTH_TIMEOUT'
  ).catch((e) => {
    if (e instanceof Error && e.message === 'AUTH_TIMEOUT') {
      return supabase.auth
        .getSession()
        .then(({ data }) => {
          const t = data.session?.access_token;
          if (t) return t;
          throw new Error('Kunde inte bekräfta inloggning i tid.');
        })
        .catch(() => {
          throw new Error('Kunde inte bekräfta inloggning i tid.');
        });
    }
    throw e;
  });
};

const parseJson = (text: string): UploadResponse => {
  try {
    return JSON.parse(text) as UploadResponse;
  } catch {
    return { success: false, error: 'Ogiltigt svar från servern.' };
  }
};

const postJsonWebWithXhr = (
  url: string,
  body: string,
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
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = timeoutMs;
    xhr.onload = () => resolve({ status: xhr.status, bodyText: xhr.responseText ?? '' });
    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.ontimeout = () => reject(new Error('UPLOAD_TIMEOUT'));
    xhr.send(body);
  });

const fetchWithTimeout = (url: string, init: RequestInit, timeoutMs: number): Promise<Response> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), timeoutMs);
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

export async function uploadMovementAssessment(
  input: MovementAssessmentUploadInput
): Promise<UploadResponse> {
  const url = `${SUPABASE_URL}/functions/v1/m2m-assessment-bridge`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const accessToken = await resolveAccessToken();
    const payload = {
      access_token: accessToken,
      target_email: input.person.email.trim().toLowerCase(),
      target_name: input.person.name.trim(),
      team: input.person.team?.trim() ?? '',
      tracker_client_id: input.trackerClientId,
      assessment: input.assessment,
      export_payload: input.exportPayload,
      flat_assessment_columns: input.flatAssessmentColumns,
    };
    const body = JSON.stringify(payload);

    try {
      let status: number;
      let data: UploadResponse;

      if (Platform.OS === 'web') {
        const { status: st, bodyText } = await postJsonWebWithXhr(
          url,
          body,
          SUPABASE_ANON_KEY,
          `Bearer ${accessToken}`,
          REQUEST_TIMEOUT_MS
        );
        status = st;
        data = parseJson(bodyText);
      } else {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey: SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body,
          },
          REQUEST_TIMEOUT_MS
        );
        status = res.status;
        data = parseJson(await res.text());
      }

      const ok = status >= 200 && status < 300;
      if (ok && data.success) {
        return data;
      }

      if (attempt < MAX_ATTEMPTS && RETRYABLE.has(status)) {
        await wait(600);
        continue;
      }

      const msg =
        status === 401
          ? data.error ||
            'Inloggningen verkar ha gått ut. Logga in igen och försök på nytt.'
          : data.error || 'Begäran misslyckades.';
      throw new Error(msg);
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'UPLOAD_TIMEOUT';
      const isNetwork = error instanceof Error && error.message === 'NETWORK_ERROR';
      if (attempt < MAX_ATTEMPTS && (isTimeout || isNetwork)) {
        await wait(600);
        continue;
      }
      if (isTimeout) {
        throw new Error('Begäran tog för lång tid. Försök igen.');
      }
      if (isNetwork) {
        throw new Error('Nätverksfel. Kontrollera anslutningen.');
      }
      throw error instanceof Error ? error : new Error('Begäran misslyckades.');
    }
  }

  throw new Error('Begäran misslyckades.');
}
