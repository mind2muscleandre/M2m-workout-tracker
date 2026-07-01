import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';

export async function resolveBridgeAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  const refreshed = await supabase.auth.refreshSession();
  const rt = refreshed.data.session?.access_token;
  if (rt) return rt;
  throw new Error('Du måste vara inloggad.');
}

export async function postAssessmentBridge<T>(body: Record<string, unknown>): Promise<T> {
  const accessToken = await resolveBridgeAccessToken();
  const url = `${SUPABASE_URL}/functions/v1/m2m-assessment-bridge`;
  const payload = JSON.stringify({ access_token: accessToken, ...body });

  let status = 0;
  let text = '';
  if (Platform.OS === 'web') {
    const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? '' });
      xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
      xhr.send(payload);
    });
    status = result.status;
    text = result.text;
  } else {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    status = res.status;
    text = await res.text();
  }

  let data: T & { success?: boolean; error?: string };
  try {
    data = JSON.parse(text) as T & { success?: boolean; error?: string };
  } catch {
    throw new Error('Ogiltigt svar från servern.');
  }

  if (status >= 200 && status < 300 && data.success !== false) {
    return data;
  }
  throw new Error(data.error || 'Begäran misslyckades.');
}

export async function postScreeningBridge<T>(body: Record<string, unknown>): Promise<T> {
  const accessToken = await resolveBridgeAccessToken();
  const url = `${SUPABASE_URL}/functions/v1/m2m-screening-bridge`;
  const payload = JSON.stringify({ access_token: accessToken, ...body });

  let status = 0;
  let text = '';
  if (Platform.OS === 'web') {
    const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? '' });
      xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
      xhr.send(payload);
    });
    status = result.status;
    text = result.text;
  } else {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    status = res.status;
    text = await res.text();
  }

  let data: T & { success?: boolean; error?: string };
  try {
    data = JSON.parse(text) as T & { success?: boolean; error?: string };
  } catch {
    throw new Error('Ogiltigt svar från servern.');
  }

  if (status >= 200 && status < 300 && data.success !== false) {
    return data;
  }
  throw new Error(data.error || 'Begäran misslyckades.');
}
