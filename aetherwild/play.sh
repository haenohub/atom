#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
game_port="${1:-5173}"
if ! [[ "$game_port" =~ ^[0-9]+$ ]] || (( 10#$game_port < 1 || 10#$game_port > 65535 )); then
  echo '포트는 1~65535 사이의 정수여야 합니다.' >&2
  exit 1
fi
if [[ ! -f dist/index.html ]]; then
  npm ci --cache "${npm_config_cache:-/tmp/aetherwild-npm-cache}" --no-audit --no-fund
  npm run build
fi
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$game_port" --bind 0.0.0.0 --directory dist
else
  exec npm run preview -- --port "$game_port"
fi
