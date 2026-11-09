#!/usr/bin/env bash
# UCIP quality gates. Run from the repository root.
#
#   scripts/verify.sh            all gates
#   scripts/verify.sh --quick    skip the build and smoke (fast inner loop)
#
# Exit codes: 0 all green · 1 a gate failed · 2 environment problem.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

finish() {
  printf '\n════ summary ════\n'
  printf '%s\n' "${SUMMARY[@]}"
  printf '%d passed, %d failed\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ] || exit 1
}

# ── 1. environment ────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 2; }
printf 'node %s · npm %s\n' "$(node -v)" "$(npm -v)"
[ -d node_modules ] || { echo "node_modules missing — run: npm install" >&2; exit 2; }

# ── 2. gates ──────────────────────────────────────────────────────────────────
step "typecheck" npm run --silent typecheck || finish
step "unit tests" npm test --silent || finish

if [ "$QUICK" -eq 0 ]; then
  # A stale .next after a config change produces confusing failures; remove it first.
  rm -rf .next
  step "production build" npm run --silent build || finish

  if curl -fsS -m 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    step "smoke (live server)" npm run --silent smoke || finish
  else
    printf '\n-- smoke skipped: no server on :3000 (start it with npm run dev) --\n'
    SUMMARY+=("SKIP  smoke (no server)")
  fi
fi

if [ -f backend/requirements.txt ] && command -v python3 >/dev/null 2>&1; then
  if python3 -c "import fastapi" >/dev/null 2>&1; then
    step "python service tests" bash -c 'cd backend && python3 -m pytest -q' || finish
  else
    printf '\n-- pytest skipped: fastapi not installed (pip install -r backend/requirements.txt) --\n'
    SUMMARY+=("SKIP  python service tests (deps missing)")
  fi
fi

step "secret scan" bash -c '
  # High-signal patterns only; a generic entropy check produces too much noise to act on.
  patterns="sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY"
  files=$(git ls-files 2>/dev/null || find . -path ./node_modules -prune -o -type f -print)
  if printf "%s\n" "$files" | xargs grep -IlE "$patterns" 2>/dev/null | grep -v -E "^(security/SECRETS_MANAGEMENT|docs/security)" ; then
    echo "Potential secret material found (see files above)"
    exit 1
  fi
  echo "no key-like strings in tracked files"
' || finish

finish
