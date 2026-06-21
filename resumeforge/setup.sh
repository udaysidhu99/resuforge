#!/usr/bin/env bash
set -e

echo "=== ResumeForge Setup ==="

# Check for pango (required by WeasyPrint on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if ! brew list pango &>/dev/null; then
    echo "WARNING: pango is not installed. WeasyPrint requires it."
    echo "Run: brew install pango"
    echo "Continuing anyway..."
  else
    echo "✓ pango found"
  fi
fi

# Python venv
echo ""
echo "--- Setting up Python backend ---"
cd backend

if [ ! -d ".venv" ]; then
  PYTHON=$(which python3.13 || which python3.12 || which python3.11 || which python3)
  $PYTHON -m venv .venv
  echo "✓ Created .venv using $PYTHON"
fi

source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✓ Python dependencies installed"
deactivate
cd ..

# Node / npm
echo ""
echo "--- Setting up React frontend ---"
cd frontend

if [ ! -f "package.json" ]; then
  echo "ERROR: frontend/package.json not found"
  exit 1
fi

npm install --silent
echo "✓ Node dependencies installed"
cd ..

echo ""
echo "=== Setup complete. Run ./start.sh to launch ResumeForge ==="
