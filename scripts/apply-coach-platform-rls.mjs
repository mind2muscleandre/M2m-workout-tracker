#!/usr/bin/env node
/**
 * Apply coach platform read RLS migration to unified Supabase project.
 * Requires one of in .env.migration:
 *   - TARGET_DATABASE_URL (or SUPABASE_DB_URL)
 *   - SUPABASE_ACCESS_TOKEN (Management API)
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
  'supabase/migrations/20260610100000_coach_platform_read_rls.sql'
);

async function applyViaPg(connectionString) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = readFileSync(SQL_PATH, 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Coach platform RLS applied via Postgres connection.');
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
  console.log('Coach platform RLS applied via Supabase Management API.');
}

async function main() {
  if (!existsSync(SQL_PATH)) {
    throw new Error(`Missing migration file: ${SQL_PATH}`);
  }

  const dbUrl = process.env.TARGET_DATABASE_URL || process.env.SUPABASE_DB_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (dbUrl) {
    await applyViaPg(dbUrl);
    return;
  }
  if (accessToken) {
    await applyViaManagementApi(accessToken);
    return;
  }

  throw new Error(
    'Set TARGET_DATABASE_URL (or SUPABASE_DB_URL) or SUPABASE_ACCESS_TOKEN in .env.migration.\n' +
      'Get the DB URL from Supabase Dashboard → Project cqpiejeiwtcopjnhccgn → Database → Connection string (URI).\n' +
      'Then run: node scripts/apply-coach-platform-rls.mjs'
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
