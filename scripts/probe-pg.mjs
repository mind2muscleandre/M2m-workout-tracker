import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.migration') });
const key = process.env.TARGET_SERVICE_ROLE_KEY;
const REF = 'cqpiejeiwtcopjnhccgn';
const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-west-1',
];
for (let i = 0; i <= 1; i++) {
  for (const region of regions) {
    const host = `aws-${i}-${region}.pooler.supabase.com`;
    const client = new pg.Client({
      host,
      port: 5432,
      database: 'postgres',
      user: `postgres.${REF}`,
      password: key,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    try {
      await client.connect();
      const r = await client.query('select current_database() as db');
      console.log('OK', { host, db: r.rows[0].db });
      await client.end();
      process.exit(0);
    } catch (e) {
      console.log('fail', host, e.message?.slice(0, 100));
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
}
console.log('no pooler connection worked');
