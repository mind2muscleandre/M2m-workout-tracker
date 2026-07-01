import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';

/** Prefer in-memory profile id; avoids a round-trip to auth.getUser on every list fetch. */
export async function resolveUserId(): Promise<string> {
  const cached = useAuthStore.getState().user?.id;
  if (cached) {
    return cached;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}
