#!/usr/bin/env bash
set -e

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo "========================================================"
echo "  Acoustic Annotator (Praat互換 Webエディション)"
echo "========================================================"
echo ""
echo "[起動情報]"
echo "  PCブラウザ用URL:    http://localhost:3000"
echo "  iPad / スマホ用URL: http://${LOCAL_IP}:3000"
echo "========================================================"

cd apps/annotator/backend
if [ -f ".venv/bin/python" ]; then
  .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
else
  uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!

cd ../frontend && npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait