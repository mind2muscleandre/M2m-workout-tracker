import { supabase } from '../lib/supabase';

export type InviteAthleteParams = {
  client_id: string;
  email: string;
  name: string;
  sport?: string | null;
  age?: number | null;
};

export type InviteAthleteResult = {
  user_id: string;
  invited: boolean;
  already_linked: boolean;
};

export async function inviteAthlete(params: InviteAthleteParams): Promise<InviteAthleteResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Inte inloggad');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invite-athlete`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Okänt fel');
  return json as InviteAthleteResult;
}
