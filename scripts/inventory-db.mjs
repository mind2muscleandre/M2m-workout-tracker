#!/usr/bin/env node
/** Print table row counts on source/target using service role keys. */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(ROOT, '.env.migration') });
dotenv.config({ path: resolve(ROOT, '.env') });

const PT_TABLES = [
  'pt_users',
  'users',
  'clients',
  'pt_exercises',
  'exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'conversations',
  'messages',
  'pt_coach_notes',
  'coach_notes',
  'screening_uploads',
  'movement_assessment_results',
  'user_profiles',
];

const PLATFORM_TABLES = [
  'workout_sessions',
  'planned_sessions',
  'user_program_subscriptions',
  'training_programs_tracker',
  'program_assignments',
  'training_sessions',
  'session_exercises',
  'nutrition_goals',
  'nutrition_plan_assignments',
  'physical_test_results',
  'weight_entries',
  'water_entries',
  'season_calendar',
  'screening_results',
];

async function inventory(label, url, key) {
  if (!url || !key) {
    console.log(`\n=== ${label} (skipped: missing url/key) ===`);
    return;
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log(`\n=== ${label} ${url} ===`);
  for (const table of PT_TABLES) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${table}: — (${error.message})`);
    } else {
      console.log(`  ${table}: ${count ?? 0}`);
    }
  }
  console.log('  --- platform (coach read-model) ---');
  for (const table of PLATFORM_TABLES) {
    const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${table}: — (${error.message})`);
    } else {
      console.log(`  ${table}: ${count ?? 0}`);
    }
  }
}

async function main() {
  await inventory('SOURCE', process.env.SOURCE_SUPABASE_URL, process.env.SOURCE_SERVICE_ROLE_KEY);
  await inventory('TARGET', process.env.TARGET_SUPABASE_URL, process.env.TARGET_SERVICE_ROLE_KEY);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
