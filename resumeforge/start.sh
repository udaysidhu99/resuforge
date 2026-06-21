#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Starting ResumeForge ==="

# Backend
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "ERROR: backend/.venv not found. Run ./setup.sh first."
  exit 1
fi

source .venv/bin/activate
echo "Starting FastAPI backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
deactivate

# Frontend
cd "$ROOT/frontend"
echo "Starting Vite frontend on http://localhost:5173 ..."
npm run dev -- --open &
FRONTEND_PID=$!

echo ""
echo "ResumeForge is running:"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM

wait
