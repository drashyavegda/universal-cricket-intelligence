#!/usr/bin/env bash
# UCIP quality gates — run from the repository root.
#
#   scripts/verify.sh            all gates
#   scripts/verify.sh --quick    skip the build and smoke (fast inner loop)
#
# Layout note: the Next.js application lives in frontend/ (Vercel Root Directory).
# Every frontend gate therefore runs with cwd=frontend; the Python gates run in
# backend/ and services/analytics/.
#
# Exit codes: 0 all green · 1 a gate failed · 2 environment problem.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
cd "$ROOT" || exit 2

QUICK=0
[ "${1:-}" = "--quick" ] && QUICK=1

PASS=0
FAIL=0
declare -a SUMMARY

step() {
  local name="$1"; shift
  printf '\n── %s ─────────────────────────────────────────────\n' "$name"
  if "$@"; then
    SUMMARY+=("PASS  $name")
    PASS=$((PASS + 1))
  else
    SUMMARY+=("FAIL  $name")
    FAIL=$((FAIL + 1))
    return 1
  fi
}

skip() { SUMMARY+=("SKIP  $1"); printf '\n-- %s skipped: %s --\n' "$1" "$2"; }

finish() {
  printf '\n════ summary ════\n'
  printf '%s\n' "${SUMMARY[@]}"
  printf '%d passed, %d failed\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ] || exit 1
}

# ── 1. environment ────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 2; }
[ -f "$FRONTEND/package.json" ] || { echo "frontend/package.json missing — wrong layout" >&2; exit 2; }
printf 'node %s · npm %s\n' "$(node -v)" "$(npm -v)"
[ -d "$FRONTEND/node_modules" ] || { echo "frontend/node_modules missing — run: cd frontend && npm install" >&2; exit 2; }

# ── 2. frontend gates ─────────────────────────────────────────────────────────
step "typecheck"        bash -c "cd '$FRONTEND' && npm run --silent typecheck" || finish
step "unit tests"       bash -c "cd '$FRONTEND' && npm test --silent" || finish

if [ "$QUICK" -eq 0 ]; then
  # A stale .next after a config change produces confusing failures; remove it first.
  rm -rf "$FRONTEND/.next"
  step "production build" bash -c "cd '$FRONTEND' && npm run --silent build" || finish

  if curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    step "smoke (live server)" bash -c "cd '$FRONTEND' && npm run --silent smoke" || finish
  else
    skip "smoke (live server)" "no server on :3000 — start it with: cd frontend && npm start"
  fi
fi

# ── 3. python gates ───────────────────────────────────────────────────────────
if command -v python3 >/dev/null 2>&1 && python3 -c "import fastapi" >/dev/null 2>&1; then
  [ -f "$ROOT/backend/requirements.txt" ] && { step "backend tests" bash -c "cd '$ROOT/backend' && python3 -m pytest -q" || finish; }
  [ -f "$ROOT/services/analytics/requirements.txt" ] && { step "analytics service tests" bash -c "cd '$ROOT/services/analytics' && python3 -m pytest -q" || finish; }
else
  skip "python tests" "fastapi not installed — pip install -r backend/requirements.txt"
fi

# ── 4. secret scan ───────────────────────────────────────────────────────────
step "secret scan" bash -c '
  patterns="sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY"
  files=$(git ls-files 2>/dev/null || find . -path ./node_modules -prune -o -path "*/node_modules" -prune -o -type f -print)
  if printf "%s\n" "$files" | xargs grep -IlE "$patterns" 2>/dev/null | grep -v -E "^(security/SECRETS_MANAGEMENT|docs/security)"; then
    echo "Potential secret material found (see files above)"
    exit 1
  fi
  echo "no key-like strings in tracked files"
' || finish

finish
