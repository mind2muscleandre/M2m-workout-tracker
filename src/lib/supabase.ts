import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// In Expo, try Constants.expoConfig.extra first (from app.config.js), then process.env
export const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://your-project.supabase.co';
  
export const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'your-anon-key';

function warnIfServiceRoleKey(key: string) {
  try {
    const payload = JSON.parse(atob(key.split('.')[1] ?? ''));
    if (payload?.role === 'service_role' && __DEV__) {
      console.warn(
        'SUPABASE_ANON_KEY is a service_role JWT. Use the anon/publishable key in client .env.'
      );
    }
  } catch {
    /* ignore */
  }
}

warnIfServiceRoleKey(SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
