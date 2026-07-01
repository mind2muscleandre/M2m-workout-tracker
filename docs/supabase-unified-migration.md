# Unified Supabase (cqpiejeiwtcopjnhccgn)

PT Workout Tracker and M2M Screening share one Supabase project.

## App environment

```env
EXPO_PUBLIC_SUPABASE_URL=https://cqpiejeiwtcopjnhccgn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Dashboard → Settings → API>
```

Never put `service_role` in `.env` for the Expo app.

## PT table names (avoid platform collisions)

| App concept | Table |
|-------------|-------|
| PT profile | `pt_users` (+ fallback `user_profiles`) |
| Exercises | `pt_exercises` |
| Coach notes | `pt_coach_notes` |
| Clients, workouts, sets | unchanged |

## Schema

Apply (idempotent):

```bash
node scripts/embed-schema-sql.mjs
npx supabase functions deploy apply-pt-schema --project-ref cqpiejeiwtcopjnhccgn --no-verify-jwt
# Invoke once with service role:
curl -X POST "https://cqpiejeiwtcopjnhccgn.supabase.co/functions/v1/apply-pt-schema" \
  -H "apikey: $TARGET_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $TARGET_SERVICE_ROLE_KEY"
```

Or: `node scripts/apply-unified-schema.mjs` with `TARGET_DATABASE_URL` / `SUPABASE_ACCESS_TOKEN`.

## Data migration from tutwflzzvvrfciogaqfo

```bash
# 1. Deploy export function (one-time)
npx supabase functions deploy export-pt-data --project-ref tutwflzzvvrfciogaqfo --no-verify-jwt

# 2. Copy .env.migration.example → .env.migration (TARGET_SERVICE_ROLE_KEY required)
node scripts/migrate-pt-data.mjs
```

## Edge function secrets (Dashboard → Edge Functions → Secrets)

Set on **cqpiejeiwtcopjnhccgn**:

| Secret | Value |
|--------|-------|
| `M2M_BRIDGE_SHARED_SECRET` | Strong random string (same on all bridge/pt-* functions) |
| `AUTH_INVITE_REDIRECT_URL` | `https://app.mind2muscle.se` |
| `AI_SCREENING_FUNCTION_URL` | `https://cqpiejeiwtcopjnhccgn.supabase.co/functions/v1/pt-upload-screening` |
| `AI_SCREENING_LIST_SCREENINGS_URL` | `.../pt-list-screenings` |
| `AI_SCREENING_ASSESSMENT_FUNCTION_URL` | `.../pt-upload-movement-assessment` (legacy split-project only; same-host uploads use in-bridge ingest) |
| `AI_SCREENING_LIST_ASSESSMENTS_URL` | `.../pt-list-assessments` |
| `AI_SCREENING_LIST_ATHLETES_URL` | `.../pt-list-athletes` |
| `AI_SCREENING_EXERCISES_FUNCTION_URL` | `.../pt-list-exercises` |
| `AI_SCREENING_ANON_KEY` | Project anon key |
| `AI_SCREENING_SERVICE_ROLE_KEY` | Project service role (server only) |

Requires `supabase login` for CLI: `npx supabase secrets set ... --project-ref cqpiejeiwtcopjnhccgn`

## Auth URL configuration

Dashboard → Authentication → URL Configuration:

- Site URL: `https://app.mind2muscle.se`
- Redirect URLs: `https://app.mind2muscle.se`, `https://app.mind2muscle.se/`

See [supabase-auth-prod-checklist.md](./auth/supabase-auth-prod-checklist.md).

## Security

- Rotate **service_role** if it was ever committed to `.env` as a client key.
- Remove or restrict `export-pt-data` and `apply-pt-schema` after migration if no longer needed.
