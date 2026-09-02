#!/usr/bin/env bash
# DYNMECH CycleView - test launcher (macOS / Linux)
#
#   ./start.sh          build the production bundle, then run it in Electron
#   ./start.sh dev      Vite dev server + Electron with hot reload and DevTools
#   ./start.sh build    production bundle only, no launch
#
# Run from any directory; it changes into the project folder itself.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[CycleView] Node.js was not found on PATH. Install Node 18+ from https://nodejs.org" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[CycleView] node_modules missing - running npm install..."
  npm install
fi

case "${1:-}" in
  dev)
    echo "[CycleView] Starting Vite dev server and Electron with hot reload..."
    exec npm run dev
    ;;
  build)
    echo "[CycleView] Building production bundle..."
    exec npx vite build
    ;;
  "")
    echo "[CycleView] Building production bundle and launching Electron..."
    exec npm run start
    ;;
  *)
    echo "Usage: $0 [dev|build]" >&2
    exit 2
    ;;
esac
