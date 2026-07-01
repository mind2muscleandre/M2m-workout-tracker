#!/usr/bin/env bash
# Legacy: apply AI-screening SQL deltas. Unified project uses apply-unified-schema.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Use scripts/apply-unified-schema.sh for the unified cqpiejeiwtcopjnhccgn project."
exec "$ROOT/scripts/apply-unified-schema.sh"
