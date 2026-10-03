#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "==============================================================="
echo "           RANSOMWARE DETECTOR - AUTO LAUNCHER"
echo "==============================================================="

# 1. Setup Python Backend Environment
if [ ! -d "backend/.venv" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv backend/.venv
    echo "[2/3] Installing Python dependencies..."
    backend/.venv/bin/pip install -r backend/requirements.txt
fi

# 2. Setup Node Modules
if [ ! -d "node_modules" ]; then
    echo "[3/3] Installing frontend dependencies..."
    npm install
fi

# 3. Start Backend & Frontend
echo "Starting Backend API on port 43124..."
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 43124 &
BACKEND_PID=$!

echo "Starting Frontend Web Console on port 43123..."
npm run dev &
FRONTEND_PID=$!

sleep 5
echo "Opening http://localhost:43123..."
if which xdg-open > /dev/null; then
    xdg-open http://localhost:43123
elif which open > /dev/null; then
    open http://localhost:43123
fi

trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT
wait