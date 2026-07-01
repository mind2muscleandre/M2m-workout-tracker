import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(
  resolve(root, 'supabase/migrations/20260608120000_pt_workout_tracker_unified.sql'),
  'utf8'
);
const escaped = sql.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
writeFileSync(
  resolve(root, 'supabase/functions/apply-pt-schema/schema.ts'),
  `export const SCHEMA_SQL = \`${escaped}\`;\n`
);
