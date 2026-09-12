#!/usr/bin/env bash
set -euo pipefail
mkdir -p verification/mango
npm ci --no-audit --no-fund
npm test | tee verification/mango/unit-tests.tap
npm run check
npx wrangler deploy --dry-run --outdir /tmp/mango-worker-build
npx wrangler d1 migrations apply DB --local
python scripts/mango-test-fixture.py
python -m pip install -q playwright aiohttp
python -m playwright install --with-deps chromium
npx wrangler dev --ip 127.0.0.1 --port 8787 > verification/mango/worker.log 2>&1 &
WORKER_PID=$!
trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT
export BASE_URL=http://127.0.0.1:8787
python - <<'PY'
import time,urllib.request
for attempt in range(90):
 try:
  with urllib.request.urlopen('http://127.0.0.1:8787/api/mango/health',timeout=2) as r:
   if r.status==200:break
 except Exception:time.sleep(1)
else:raise SystemExit('Local Worker did not become ready')
PY
python tests/mango-auth.py
python tests/mango-cloud-browser.py
if [ "${MANGO_LIVE:-0}" = "1" ]; then
  python scripts/mango-wait-live.py
  export BASE_URL=https://duck-bear-hq.zachary-chambers2.workers.dev
  export MANGO_REPORT_DIR=verification/mango/live-browser
  python tests/mango-browser.py
else
  python tests/mango-browser.py
  # Existing public/private/racing browser contracts must remain intact.
  python tests/setup-browser.py
  python tests/live-room-smoke.py
  python tests/browser_clients.py
fi
