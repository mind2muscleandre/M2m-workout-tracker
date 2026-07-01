#!/usr/bin/env bash
# Sync M2M Coach app source to M2M-eco-appar monorepo.
# Default: merge src/ + scripts/ + key root files (safe when source repo is partial).
# Set FULL_SYNC=1 to mirror entire tree (destructive --delete on target).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${M2M_ECO_APPAR:-$HOME/Documents/M2M-eco-appar}/M2M-Coach"
BACKUP_DIR="$(mktemp -d)"

echo "Source: $ROOT"
echo "Target: $TARGET"

for f in .env .env.migration .env.local; do
  if [[ -f "$TARGET/$f" ]]; then
    cp "$TARGET/$f" "$BACKUP_DIR/$f"
    echo "Backed up $f"
  fi
done

if [[ "${FULL_SYNC:-0}" == "1" ]]; then
  rsync -a --delete \
    --exclude node_modules \
    --exclude dist \
    --exclude .git \
    --exclude .expo \
    --exclude 'M2M-Coach' \
    "$ROOT/" "$TARGET/"
else
  echo "Merge sync (set FULL_SYNC=1 for full mirror with --delete)"
  [[ -d "$ROOT/src" ]] && rsync -a "$ROOT/src/" "$TARGET/src/"
  [[ -d "$ROOT/scripts" ]] && rsync -a "$ROOT/scripts/" "$TARGET/scripts/"
  [[ -d "$ROOT/supabase" ]] && rsync -a "$ROOT/supabase/" "$TARGET/supabase/"
  for f in App.tsx index.ts app.json app.config.js babel.config.js tailwind.config.js tsconfig.json vercel.json web.css package.json README.md; do
    [[ -f "$ROOT/$f" ]] && cp "$ROOT/$f" "$TARGET/$f"
  done
fi

for f in .env .env.migration .env.local; do
  if [[ -f "$BACKUP_DIR/$f" ]]; then
    cp "$BACKUP_DIR/$f" "$TARGET/$f"
    echo "Restored $f"
  fi
done

rm -rf "$BACKUP_DIR"
echo "Sync complete → $TARGET"
