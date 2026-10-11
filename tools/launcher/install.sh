#!/usr/bin/env sh
set -e

ROOT=$(cd "$(dirname "$0")" && pwd)
WEB="$ROOT/web"
GAMES_DIR=${LEONPS5_GAMES_DIR:-"$HOME/Games/LeonPS5"}
PORT=${LEONPS5_PORT:-8245}
SERVE=1

while [ $# -gt 0 ]; do
  case "$1" in
    --no-serve) SERVE=0; shift ;;
    --port) PORT=$2; shift 2 ;;
    --games-dir) GAMES_DIR=$2; shift 2 ;;
    -h|--help)
      printf 'Usage: install.sh [--no-serve] [--port N] [--games-dir PATH]\n'
      exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1"; exit 1 ;;
  esac
done

say() { printf '\n  %s\n' "$1"; }

say "LeonPS5 launcher setup"

command -v python3 >/dev/null 2>&1 || {
  printf '\n  Python 3 is required and was not found.\n  Ubuntu: sudo apt install python3   macOS: brew install python\n'
  exit 1
}

NODE_BIN=$(command -v node || true)
NPM_BIN=$(command -v npm || true)
LOCAL_NODE="$HOME/.local/share/leonps5/node"

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  if [ -x "$LOCAL_NODE/bin/node" ]; then
    NODE_BIN="$LOCAL_NODE/bin/node"
    NPM_BIN="$LOCAL_NODE/bin/npm"
    PATH="$LOCAL_NODE/bin:$PATH"
    export PATH
  else
    say "Node.js was not found, installing it for this user"
    OS=$(uname -s)
    case "$OS" in
      Linux)
        if command -v apt-get >/dev/null 2>&1; then
          sudo apt-get update -qq && sudo apt-get install -y -qq nodejs npm
          NODE_BIN=$(command -v node); NPM_BIN=$(command -v npm)
        fi ;;
      Darwin)
        if command -v brew >/dev/null 2>&1; then
          brew install node
          NODE_BIN=$(command -v node); NPM_BIN=$(command -v npm)
        fi ;;
    esac
    if [ -z "$NODE_BIN" ]; then
      printf '\n  Node.js could not be installed automatically.\n  Install it and run this script again: https://nodejs.org\n'
      exit 1
    fi
  fi
fi

say "Node.js $("$NODE_BIN" --version) found"

[ -d "$WEB" ] || { printf '\n  web directory missing at %s\n' "$WEB"; exit 1; }

if [ -d "$WEB/dist" ] && [ "$WEB/dist/index.html" -nt "$WEB/package.json" ] 2>/dev/null; then
  say "UI build is up to date"
else
  say "Building the launcher UI"
  (cd "$WEB" && "$NPM_BIN" install --no-audit --no-fund && "$NPM_BIN" run build)
fi

mkdir -p "$GAMES_DIR"
say "Games directory: $GAMES_DIR"

if [ -x "$ROOT/../../build/core/runner/leonps5" ]; then
  say "Runner: $ROOT/../../build/core/runner/leonps5"
else
  say "The leonps5 runner was not built yet. Build it with: cmake --build build --target leonps5"
fi

if [ "$SERVE" -eq 0 ]; then
  say "Setup done. Start the launcher with: python3 $ROOT/server.py"
  exit 0
fi

say "Starting the launcher on http://127.0.0.1:$PORT"
exec python3 "$ROOT/server.py" --games-dir "$GAMES_DIR" --port "$PORT" --open