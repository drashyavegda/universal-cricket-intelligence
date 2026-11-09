#!/usr/bin/env bash
# UCIP backup / restore.
#
#   scripts/maintenance/backup.sh                     create a timestamped backup
#   scripts/maintenance/backup.sh --restore <dir>     restore (asks for confirmation)
#
# Backs up: the JSON store, a Postgres dump when DATABASE_URL is set, a manifest with hashes,
# and the NAMES of configured environment variables (never their values).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/.data}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT/backups}"
STORE="$DATA_DIR/store.json"

usage() { sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit "${1:-0}"; }

make_backup() {
  local stamp target
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  target="$BACKUP_ROOT/ucip-$stamp"
  mkdir -p "$target" || { echo "cannot create $target" >&2; exit 1; }

  echo "→ data dir:  $DATA_DIR"
  echo "→ backup to: $target"

  if [ -f "$STORE" ]; then
    cp "$STORE" "$target/store.json"
    echo "  store.json  $(wc -c <"$target/store.json") bytes"
  else
    echo "  store.json  MISSING (nothing to copy) — is DATA_DIR correct?" >&2
  fi

  if [ -n "${DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
    # --no-owner/--no-privileges so a restore works under a different role.
    if pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" >"$target/postgres.sql" 2>"$target/pg_dump.err"; then
      echo "  postgres.sql $(wc -c <"$target/postgres.sql") bytes"
      rm -f "$target/pg_dump.err"
    else
      echo "  pg_dump FAILED (see $target/pg_dump.err) — the JSON store is still backed up" >&2
    fi
  else
    echo "  postgres.sql skipped (no DATABASE_URL or no pg_dump)"
  fi

  # Environment variable NAMES only. A value here would turn a backup into a secret leak.
  if [ -f "$ROOT/.env.local" ]; then
    grep -oE '^[A-Z0-9_]+=' "$ROOT/.env.local" | tr -d '=' | sort >"$target/env.keys.txt"
  else
    printf '%s\n' "NEXT_PUBLIC_SITE_URL" "DATA_DIR" "DB_ADAPTER" "AI_API_KEY" >"$target/env.keys.txt"
  fi

  {
    echo "ucip backup"
    echo "created_at:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git_commit:   $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo "git_dirty:    $(git -C "$ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ') changed files"
    echo "data_dir:     $DATA_DIR"
    echo
    echo "sha256:"
    ( cd "$target" && shasum -a 256 -b ./* 2>/dev/null || sha256sum -b ./* 2>/dev/null )
  } >"$target/manifest.txt"

  echo "  manifest.txt written"
  echo "done: $target"
  echo
  echo "Verify a restore before you need one:"
  echo "  scripts/maintenance/backup.sh --restore $target   (into a scratch DATA_DIR)"
}

restore() {
  local src="$1"
  [ -d "$src" ] || { echo "not a directory: $src" >&2; exit 1; }
  [ -f "$src/store.json" ] || { echo "no store.json in $src" >&2; exit 1; }

  echo "This will overwrite: $STORE"
  echo "  incoming: $(wc -c <"$src/store.json") bytes, created $(sed -n 's/^created_at: *//p' "$src/manifest.txt" 2>/dev/null)"
  printf 'Type the word RESTORE to continue: '
  read -r answer
  [ "$answer" = "RESTORE" ] || { echo "aborted"; exit 1; }

  mkdir -p "$DATA_DIR"
  [ -f "$STORE" ] && cp "$STORE" "$STORE.bak-$(date -u +%Y%m%dT%H%M%SZ)" && echo "  previous store kept as .bak"
  cp "$src/store.json" "$STORE"
  echo "restored → $STORE"
  echo "Next: restart the app and run 'npm run smoke' before trusting it."
  if [ -f "$src/postgres.sql" ]; then
    echo "Postgres dump present but NOT applied automatically:"
    echo "  psql \"\$DATABASE_URL\" -f $src/postgres.sql"
  fi
}

case "${1:-}" in
  --restore) [ -n "${2:-}" ] || usage 1; restore "$2" ;;
  -h|--help) usage 0 ;;
  "") make_backup ;;
  *) usage 1 ;;
esac
