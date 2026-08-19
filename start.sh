#!/usr/bin/env sh
#
# Strudel Workshop Notebook - one-command start (macOS / Linux)
#
#   ./start.sh
#
# Runs fully offline. If it complains about missing assets, run ./setup.sh once
# on a machine with internet.

set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' ""
  printf '%s\n' "  Node.js is not installed - run ./setup.sh first."
  printf '%s\n' ""
  exit 1
fi

if [ ! -f vendor/manifest.json ]; then
  printf '%s\n' ""
  printf '%s\n' "  Offline assets are missing (vendor/ is empty)."
  printf '%s\n' "  Run ./setup.sh once, on a machine with internet."
  printf '%s\n' ""
  exit 1
fi

exec node server.mjs --open "$@"
