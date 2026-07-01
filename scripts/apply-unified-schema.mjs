#!/usr/bin/env node
/**
 * Apply PT workout tracker schema to unified Supabase project.
 * Requires one of:
 *   - TARGET_DATABASE_URL in .env.migration
 *   - SUPABASE_ACCESS_TOKEN in .env.migration (Management API)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROJECT_REF = 'cqpiejeiwtcopjnhccgn';

dotenv.config({ path: resolve(ROOT, '.env.migration') });
dotenv.config({ path: resolve(ROOT, '.env') });

const SQL_PATH = resolve(
  ROOT,
  'supabase/migrations/20260608120000_pt_workout_tracker_unified.sql'
);

async function applyViaPg(connectionString) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = readFileSync(SQL_PATH, 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Schema applied via Postgres connection.');
}

async function applyViaManagementApi(token) {
  const sql = readFileSync(SQL_PATH, 'utf8');
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text}`);
  }
  console.log('Schema applied via Supabase Management API.');
}

async function tryServiceRolePg() {
  const serviceKey = process.env.TARGET_SERVICE_ROLE_KEY;
  if (!serviceKey) return false;
  const client = new pg.Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: serviceKey,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const sql = readFileSync(SQL_PATH, 'utf8');
    await client.query(sql);
    await client.end();
    console.log('Schema applied via direct Postgres (service role password).');
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function main() {
  if (!existsSync(SQL_PATH)) {
    throw new Error(`Missing migration file: ${SQL_PATH}`);
  }

  const dbUrl = process.env.TARGET_DATABASE_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (dbUrl) {
    await applyViaPg(dbUrl);
    return;
  }
  if (accessToken) {
    await applyViaManagementApi(accessToken);
    return;
  }
  if (await tryServiceRolePg()) {
    return;
  }

  throw new Error(
    'Set TARGET_DATABASE_URL or SUPABASE_ACCESS_TOKEN in .env.migration, then re-run:\n' +
      '  node scripts/apply-unified-schema.mjs'
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
