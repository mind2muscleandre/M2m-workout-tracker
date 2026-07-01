#!/usr/bin/env node
/** One-off debug: reproduce movement_assessment_results insert failure. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
dotenv.config({ path: resolve(ROOT, '.env.migration') });

const url = process.env.TARGET_SUPABASE_URL;
const key = process.env.TARGET_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing TARGET_SUPABASE_URL or TARGET_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

// Pick any auth user for FK test
const { data: users, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
if (listErr || !users?.users?.[0]) {
  console.error('listUsers failed', listErr?.message);
  process.exit(1);
}
const uid = users.users[0].id;

const insertRow = {
  user_id: uid,
  uploaded_by_pt_id: null,
  tracker_client_id: 'debug-test-client',
  client_email: 'debug-insert-test@example.com',
  client_name: 'Debug Test',
  team: null,
  assessment_date: '2026-06-15',
  raw_assessment: { date: '2026-06-15', scores: { stability: null } },
  export_payload: { stacScore: 50, stacSectionScores: { stability: null } },
  perform_sync_status: 'skipped',
  perform_last_error: null,
  stab_pinne_transversal_v: null,
  stab_pinne_transversal_h: null,
  stab_lunge_fot_v: null,
  resultat_stabilitet: null,
  resultat_totalt: 50,
  resultat_band: 'fair',
};

const { data, error } = await admin.from('movement_assessment_results').insert(insertRow).select('id').single();
if (error) {
  console.log('INSERT_ERROR:', error.message);
  console.log('INSERT_CODE:', error.code);
  console.log('INSERT_DETAILS:', error.details);
  process.exit(1);
}
console.log('INSERT_OK:', data.id);
await admin.from('movement_assessment_results').delete().eq('id', data.id);
