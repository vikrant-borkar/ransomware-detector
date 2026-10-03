@echo off
cd /d "%~dp0"
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 43124
pause
