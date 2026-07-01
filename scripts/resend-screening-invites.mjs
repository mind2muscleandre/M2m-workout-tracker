#!/usr/bin/env node
/**
 * Resend account setup emails for athletes created via pt-upload-screening
 * before inviteUserByEmail was deployed (createUser without email).
 *
 * Existing auth users: resetPasswordForEmail (set-password link via Supabase).
 * Missing auth users: inviteUserByEmail.
 *
 * Usage:
 *   node scripts/resend-screening-invites.mjs
 * Requires TARGET_SERVICE_ROLE_KEY in .env.migration and anon key in .env.
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(ROOT, '.env.migration') });
dotenv.config({ path: resolve(ROOT, '.env') });

const SUPABASE_URL =
  process.env.TARGET_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://cqpiejeiwtcopjnhccgn.supabase.co';
const SERVICE_KEY = process.env.TARGET_SERVICE_ROLE_KEY ?? '';
const ANON_KEY =
  process.env.TARGET_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const REDIRECT_TO =
  process.env.AUTH_INVITE_REDIRECT_URL ?? 'https://app.mind2muscle.se';

/** @type {Array<{ name: string; email: string }>} */
const RECIPIENTS = [
  { name: 'Erik Sahlander', email: 'sahfre@icloud.com' },
  { name: 'Peder Albemark', email: 'gunnar.albemark@gmail.com' },
  { name: 'Emanuel Svärd', email: 'mathias.svard@gmail.com' },
  { name: 'Timofey Sevastianov', email: 'maxim.sevastianov@gmail.com' },
  { name: 'Carl Atle', email: 'lars.kjode@r-stahl.com' },
];

async function findAuthUserIdByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match?.id) return match;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  if (!SERVICE_KEY || !ANON_KEY) {
    throw new Error('Missing TARGET_SERVICE_ROLE_KEY or anon key in .env.migration / .env');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`Redirect: ${REDIRECT_TO}\n`);

  for (const person of RECIPIENTS) {
    const email = person.email.trim().toLowerCase();
    process.stdout.write(`${person.name} <${email}> … `);

    const existing = await findAuthUserIdByEmail(admin, email);

    if (!existing) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: REDIRECT_TO,
        data: { name: person.name },
      });
      if (error) {
        console.log(`INVITE FAILED: ${error.message}`);
        continue;
      }
      console.log(`invite sent (new user ${data.user?.id ?? '?'})`);
      continue;
    }

    const { error: recoverError } = await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo: REDIRECT_TO,
    });

    if (recoverError) {
      console.log(`RECOVERY FAILED: ${recoverError.message}`);
      continue;
    }

    console.log(`password-setup email sent (existing user ${existing.id})`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
