import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '../lib/supabase';
import type { ExerciseCategory, ExerciseTrackingType, MuscleGroup } from '../types/database';

export type AiExercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  tracking_type: ExerciseTrackingType;
  muscle_group: MuscleGroup[];
  equipment: string | null;
  description: string | null;
  video_url: string | null;
};

type ListResult = { success: boolean; exercises?: AiExercise[]; error?: string };

async function resolveAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  const refreshed = await supabase.auth.refreshSession();
  const rt = refreshed.data.session?.access_token;
  if (rt) return rt;
  throw new Error('Du måste vara inloggad för att hämta övningar.');
}

const parseJson = (txt: string): ListResult => {
  try {
    return JSON.parse(txt) as ListResult;
  } catch {
    return { success: false, error: 'Ogiltigt svar från servern.' };
  }
};

export async function listAiExercises(input?: {
  query?: string;
  category?: ExerciseCategory | '';
  limit?: number;
}): Promise<AiExercise[]> {
  const accessToken = await resolveAccessToken();
  const url = `${SUPABASE_URL}/functions/v1/m2m-assessment-bridge`;
  const body = JSON.stringify({
    action: 'list_exercises',
    access_token: accessToken,
    query: input?.query?.trim() ?? '',
    category: input?.category?.trim() ? input?.category : undefined,
    limit: input?.limit ?? 100,
  });

  let status = 0;
  let data: ListResult = { success: false, error: 'Tomt svar' };
  if (Platform.OS === 'web') {
    const xhr = new XMLHttpRequest();
    const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
      xhr.open('POST', url);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? '' });
      xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
      xhr.send(body);
    });
    status = result.status;
    data = parseJson(result.text);
  } else {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body,
    });
    status = res.status;
    data = parseJson(await res.text());
  }

  if (status >= 200 && status < 300 && data.success) {
    return data.exercises ?? [];
  }
  throw new Error(data.error || 'Kunde inte hämta övningar.');
}
