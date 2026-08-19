#!/usr/bin/env sh
#
# Strudel Workshop Notebook - one-command setup (macOS / Linux)
#
#   ./setup.sh
#
# Needs internet. Downloads Strudel and every sample it uses into ./vendor,
# so the notebook works with the network disconnected afterwards.

set -e
cd "$(dirname "$0")"

MIN_NODE_MAJOR=18

say() { printf '%s\n' "$1"; }

node_major() {
  node --version 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

install_node() {
  say ""
  say "  Node.js $MIN_NODE_MAJOR+ is required and was not found."
  say ""

  if command -v brew >/dev/null 2>&1; then
    MGR="brew install node"
  elif command -v apt-get >/dev/null 2>&1; then
    MGR="sudo apt-get update && sudo apt-get install -y nodejs npm"
  elif command -v dnf >/dev/null 2>&1; then
    MGR="sudo dnf install -y nodejs"
  elif command -v pacman >/dev/null 2>&1; then
    MGR="sudo pacman -S --noconfirm nodejs npm"
  elif command -v zypper >/dev/null 2>&1; then
    MGR="sudo zypper install -y nodejs"
  else
    say "  No supported package manager found (brew/apt/dnf/pacman/zypper)."
    say "  Install Node.js $MIN_NODE_MAJOR or newer from https://nodejs.org and run ./setup.sh again."
    say ""
    exit 1
  fi

  say "  This will run:"
  say "      $MGR"
  say ""
  printf "  Install Node.js now? [y/N] "
  read -r reply
  case "$reply" in
    [Yy]*) ;;
    *)
      say ""
      say "  Skipped. Install Node.js $MIN_NODE_MAJOR+ yourself, then run ./setup.sh again."
      say ""
      exit 1
      ;;
  esac

  sh -c "$MGR"
}

if ! command -v node >/dev/null 2>&1; then
  install_node
fi

MAJOR="$(node_major)"
if [ -z "$MAJOR" ] || [ "$MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  say ""
  say "  Found Node $(node --version 2>/dev/null), but $MIN_NODE_MAJOR+ is required."
  say "  Upgrade from https://nodejs.org, then run ./setup.sh again."
  say ""
  exit 1
fi

exec node scripts/setup.mjs "$@"
