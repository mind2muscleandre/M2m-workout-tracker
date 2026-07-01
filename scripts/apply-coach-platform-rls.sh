#!/usr/bin/env bash
# Apply coach platform read RLS migration to unified project cqpiejeiwtcopjnhccgn.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec node scripts/apply-coach-platform-rls.mjs
