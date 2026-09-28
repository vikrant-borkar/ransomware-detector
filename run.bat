@echo off
setlocal enabledelayedexpansion
title Ransomware Detector
cd /d "%~dp0"

echo ===============================================================
echo            RANSOMWARE DETECTOR - AUTO LAUNCHER
echo ===============================================================
echo.

REM 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

REM 2. Check Node / NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS) from https://nodejs.org/
    pause
    exit /b 1
)

REM 3. Setup Python Backend Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [1/4] Setting up Python virtual environment...
    python -m venv backend\.venv
    echo [2/4] Installing backend requirements...
    backend\.venv\Scripts\pip install -r backend\requirements.txt
)

REM 4. Setup Frontend Node Modules
if not exist "node_modules" (
    echo [3/4] Installing frontend dependencies (npm install)...
    cmd.exe /c "npm install"
)

REM 5. Launch Backend
echo [4/4] Starting AI Backend & Web Frontend...
start "Backend Detector API" cmd /k "cd /d "%~dp0" && backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 43124"

REM 6. Launch Frontend
start "Frontend Web Console" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ===============================================================
echo   Servers are starting!
echo   Opening http://localhost:43123 in your browser in 6 seconds...
echo ===============================================================
timeout /t 6 >nul
start http://localhost:43123