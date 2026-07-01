#!/usr/bin/env node
/**
 * Migrate PT workout data from tutwflzz → cqpiejeiwtcopjnhccgn.
 * Requires SOURCE_SERVICE_ROLE_KEY + TARGET_SERVICE_ROLE_KEY in .env.migration.
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(ROOT, '.env.migration') });

const SOURCE_URL =
  process.env.SOURCE_SUPABASE_URL ?? 'https://tutwflzzvvrfciogaqfo.supabase.co';
const TARGET_URL =
  process.env.TARGET_SUPABASE_URL ?? 'https://cqpiejeiwtcopjnhccgn.supabase.co';
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY ?? '';
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY ?? '';
const SOURCE_ANON =
  process.env.SOURCE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1dHdmbHp6dnZyZmNpb2dhcWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjU1NDQsImV4cCI6MjA4NTU0MTU0NH0.WFqD-rZcBBFjTPvN32tvYPCggfEKrxs5WVM0dU3kdP8';
const EXPORT_TOKEN = process.env.PT_EXPORT_TOKEN ?? 'm2m-pt-export-one-time';

const PAGE = 500;

const TABLE_MAP = {
  users: 'pt_users',
  exercises: 'pt_exercises',
  clients: 'clients',
  workouts: 'workouts',
  workout_exercises: 'workout_exercises',
  sets: 'sets',
  conversations: 'conversations',
  messages: 'messages',
  coach_notes: 'pt_coach_notes',
};

const ORDER = [
  'users',
  'clients',
  'exercises',
  'workouts',
  'workout_exercises',
  'sets',
  'conversations',
  'messages',
  'coach_notes',
];

function decodeJwtRole(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    return payload.role;
  } catch {
    return 'unknown';
  }
}

async function fetchAll(admin, table) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} read: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function upsertRows(target, table, rows) {
  if (!rows.length) return 0;
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await target.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

async function listAuthUsers(admin) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if (!data.users?.length || data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function buildEmailUuidMap(targetAdmin) {
  const map = new Map();
  const targetUsers = await listAuthUsers(targetAdmin);
  for (const u of targetUsers) {
    if (u.email) map.set(u.email.toLowerCase(), u.id);
  }
  return map;
}

async function migrateAuth(sourceAdmin, targetAdmin, report) {
  const targetByEmail = await buildEmailUuidMap(targetAdmin);
  const sourceUsers = await listAuthUsers(sourceAdmin);
  const uuidMap = new Map();

  for (const u of sourceUsers) {
    const email = (u.email ?? '').toLowerCase();
    if (!email) continue;
    const existing = targetByEmail.get(email);
    if (existing) {
      uuidMap.set(u.id, existing);
      report.auth.collisions.push({ email, sourceId: u.id, targetId: existing });
      continue;
    }

    const { data, error } = await targetAdmin.auth.admin.createUser({
      id: u.id,
      email: u.email,
      email_confirm: true,
      user_metadata: u.user_metadata ?? {},
      app_metadata: u.app_metadata ?? {},
    });
    if (error) {
      report.auth.errors.push({ email, error: error.message });
      continue;
    }
    uuidMap.set(u.id, data.user?.id ?? u.id);
    report.auth.created += 1;
  }

  return uuidMap;
}

function remapUuid(value, uuidMap) {
  if (!value) return value;
  return uuidMap.get(value) ?? value;
}

const COLUMN_WHITELIST = {
  pt_users: ['id', 'email', 'full_name', 'role', 'gym_id', 'created_at'],
  clients: [
    'id',
    'assigned_pt_id',
    'client_user_id',
    'name',
    'email',
    'phone',
    'notes',
    'sport',
    'age',
    'weight_kg',
    'is_active',
    'created_at',
  ],
  pt_exercises: [
    'id',
    'name',
    'category',
    'tracking_type',
    'muscle_group',
    'equipment',
    'description',
    'video_url',
    'is_favorite',
    'created_by_pt_id',
    'created_at',
  ],
  workouts: [
    'id',
    'client_id',
    'created_by_pt_id',
    'date',
    'title',
    'notes',
    'total_duration_seconds',
    'is_template',
    'template_name',
    'status',
    'created_at',
    'completed_at',
  ],
  workout_exercises: [
    'id',
    'workout_id',
    'exercise_id',
    'order_index',
    'target_sets',
    'target_reps',
    'notes',
    'is_superset_with_next',
  ],
  sets: [
    'id',
    'workout_exercise_id',
    'set_number',
    'weight_kg',
    'reps',
    'duration_seconds',
    'rest_time_seconds',
    'rpe',
    'rir',
    'notes',
    'is_pr',
    'completed_at',
  ],
  conversations: ['id', 'pt_id', 'client_id', 'last_message_at', 'created_at'],
  messages: ['id', 'conversation_id', 'sender_id', 'body', 'read_at', 'created_at'],
  pt_coach_notes: ['id', 'pt_id', 'client_id', 'title', 'body', 'tags', 'updated_at', 'created_at'],
};

function pickColumns(table, row) {
  const allowed = COLUMN_WHITELIST[table];
  if (!allowed) return row;
  const next = {};
  for (const key of allowed) {
    if (key in row) next[key] = row[key];
  }
  return next;
}

function remapRow(table, row, uuidMap) {
  const next = pickColumns(table, { ...row });
  if (table === 'pt_users' || table === 'users') {
    next.id = remapUuid(next.id, uuidMap);
  }
  if ('assigned_pt_id' in next) next.assigned_pt_id = remapUuid(next.assigned_pt_id, uuidMap);
  if ('client_user_id' in next) next.client_user_id = remapUuid(next.client_user_id, uuidMap);
  if ('created_by_pt_id' in next) next.created_by_pt_id = remapUuid(next.created_by_pt_id, uuidMap);
  if ('pt_id' in next) next.pt_id = remapUuid(next.pt_id, uuidMap);
  if ('sender_id' in next) next.sender_id = remapUuid(next.sender_id, uuidMap);
  return next;
}

async function fetchExportSnapshot() {
  const res = await fetch(`${SOURCE_URL}/functions/v1/export-pt-data`, {
    method: 'POST',
    headers: {
      apikey: SOURCE_ANON,
      Authorization: `Bearer ${SOURCE_ANON}`,
      'Content-Type': 'application/json',
      'x-export-token': EXPORT_TOKEN,
    },
    body: '{}',
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Export failed (${res.status})`);
  }
  return data;
}

async function main() {
  if (!TARGET_KEY) {
    throw new Error('Set TARGET_SERVICE_ROLE_KEY in .env.migration');
  }
  if (decodeJwtRole(TARGET_KEY) !== 'service_role') {
    console.warn('WARNING: TARGET key does not look like service_role');
  }

  const target = createClient(TARGET_URL, TARGET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const report = {
    auth: { created: 0, collisions: [], errors: [] },
    tables: {},
  };

  let uuidMap = new Map();
  let tableData = {};

  if (SOURCE_KEY && decodeJwtRole(SOURCE_KEY) === 'service_role') {
    const source = createClient(SOURCE_URL, SOURCE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log('Migrating auth users (service role)...');
    uuidMap = await migrateAuth(source, target, report);
    for (const sourceTable of ORDER) {
      tableData[sourceTable] = await fetchAll(source, sourceTable);
    }
  } else {
    console.log('Exporting from source via export-pt-data edge function...');
    const snapshot = await fetchExportSnapshot();
    const targetByEmail = await buildEmailUuidMap(target);
    for (const u of snapshot.auth_users ?? []) {
      const email = (u.email ?? '').toLowerCase();
      if (!email) continue;
      const existing = targetByEmail.get(email);
      if (existing) {
        uuidMap.set(u.id, existing);
        report.auth.collisions.push({ email, sourceId: u.id, targetId: existing });
        continue;
      }
      const { data, error } = await target.auth.admin.createUser({
        id: u.id,
        email: u.email,
        email_confirm: true,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
      });
      if (error) {
        report.auth.errors.push({ email, error: error.message });
        continue;
      }
      uuidMap.set(u.id, data.user?.id ?? u.id);
      report.auth.created += 1;
    }
    tableData = snapshot.tables ?? {};
  }

  for (const sourceTable of ORDER) {
    const targetTable = TABLE_MAP[sourceTable] ?? sourceTable;
    console.log(`Importing ${sourceTable} → ${targetTable}...`);
    const rows = tableData[sourceTable] ?? [];
    const remapped = rows.map((r) => remapRow(targetTable, r, uuidMap));
    const count = await upsertRows(target, targetTable, remapped);
    report.tables[targetTable] = { source: rows.length, upserted: count };
  }

  console.log('\n=== Migration report ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
