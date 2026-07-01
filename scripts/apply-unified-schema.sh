#!/usr/bin/env bash
# Apply PT workout tracker schema to unified project cqpiejeiwtcopjnhccgn.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Embedding schema into edge function..."
node scripts/embed-schema-sql.mjs

echo "Deploying apply-pt-schema..."
npx supabase@latest functions deploy apply-pt-schema --project-ref cqpiejeiwtcopjnhccgn --no-verify-jwt

if [[ -z "${TARGET_SERVICE_ROLE_KEY:-}" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.migration" 2>/dev/null || true
  set +a
fi

if [[ -z "${TARGET_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set TARGET_SERVICE_ROLE_KEY in .env.migration, then invoke apply-pt-schema manually."
  exit 1
fi

echo "Invoking apply-pt-schema..."
curl -sf -X POST "https://cqpiejeiwtcopjnhccgn.supabase.co/functions/v1/apply-pt-schema" \
  -H "apikey: ${TARGET_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${TARGET_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "Done."
