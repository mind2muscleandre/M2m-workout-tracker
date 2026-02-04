import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// In Expo, try Constants.expoConfig.extra first (from app.config.js), then process.env
const SUPABASE_URL = 
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://your-project.supabase.co';
  
const SUPABASE_ANON_KEY = 
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'your-anon-key';

// #region agent log - Debug Supabase configuration
const logDebug = (location: string, message: string, data: any) => {
  fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'supabase-debug',
    }),
  }).catch(() => {});
};

logDebug('supabase.ts:init', 'Supabase client configuration', {
  hasUrl: !!SUPABASE_URL,
  urlLength: SUPABASE_URL?.length || 0,
  urlValue: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY,
  keyLength: SUPABASE_ANON_KEY?.length || 0,
  keyStartsWith: SUPABASE_ANON_KEY?.substring(0, 30) || 'N/A',
  processEnvUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'missing',
  processEnvKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) || 'missing',
  constantsExtraUrl: Constants.expoConfig?.extra?.supabaseUrl || 'missing',
  constantsExtraKey: Constants.expoConfig?.extra?.supabaseAnonKey?.substring(0, 30) || 'missing',
});
// #endregion

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
