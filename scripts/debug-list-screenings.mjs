#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(ROOT, '.env.migration') });

const url = process.env.TARGET_SUPABASE_URL;
const key = process.env.TARGET_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: uploads, error: uploadError } = await admin
  .from('screening_uploads')
  .select('id, screening_id, user_id, name, email, analysis_type, uploaded_at, video_url, uploaded_by_pt_id')
  .limit(1);

if (uploadError) {
  console.log('UPLOADS_ERROR:', uploadError.message, uploadError.code);
} else {
  console.log('UPLOADS_OK:', uploads?.length ?? 0);
}

const sid = uploads?.[0]?.screening_id;
if (sid) {
  const { data: queueRows, error: queueError } = await admin
    .from('screening_queue')
    .select('screening_id, status, testområde')
    .eq('screening_id', sid)
    .limit(1);
  if (queueError) {
    console.log('QUEUE_ERROR:', queueError.message, queueError.code);
  } else {
    console.log('QUEUE_OK:', queueRows?.length ?? 0);
  }
} else {
  const { error: queueError } = await admin.from('screening_queue').select('screening_id, status, testområde').limit(1);
  console.log('QUEUE_PROBE:', queueError ? `ERR ${queueError.message}` : 'OK');
}
