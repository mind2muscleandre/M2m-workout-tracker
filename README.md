# M2M Coach

Coach aggregation hub for the M2M ecosystem — reads platform data (Perform, Tracker, Goalsetter) and manages PT-owned tables.

**Design system:** [docs/design.md](../docs/design.md)

## Data model

See the monorepo reference: [DATABASE-OCH-APPKOPPLINGAR.md](../M2M-eco-appar/docs/DATABASE-OCH-APPKOPPLINGAR.md) when this app lives under `M2M-eco-appar`, or run `node scripts/inventory-db.mjs` against project `cqpiejeiwtcopjnhccgn`.

Table registry: `src/lib/dbTables.ts` (`COACH_DB` + `PLATFORM_DB`).

## Scripts

- `npm run web` — dev server
- `npm run build` — web export
- `npm run db:inventory` — list DB tables
- `bash scripts/apply-coach-platform-rls.sh` — apply platform read RLS (requires `.env.migration`)
- `bash scripts/sync-to-eco-appar.sh` — push this tree to `~/Documents/M2M-eco-appar/M2M-Coach`

## Env

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
