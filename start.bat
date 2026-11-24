@echo off
title CampusSync - Launch All Servers
cd /d "%~dp0"

echo ========================================================
echo           CampusSync - Server Launcher
echo ========================================================
echo.

:: Detect folder structure
set "BACKEND_DIR="
set "FRONTEND_DIR="

if exist "%~dp0CampusSync\backend" (
    set "BACKEND_DIR=%~dp0CampusSync\backend"
    set "FRONTEND_DIR=%~dp0CampusSync\frontend"
) else if exist "%~dp0backend" (
    set "BACKEND_DIR=%~dp0backend"
    set "FRONTEND_DIR=%~dp0frontend"
)

if "%BACKEND_DIR%"=="" (
    echo [ERROR] Could not find backend directory!
    pause
    exit /b 1
)

echo [1/2] Starting Backend (FastAPI on port 8000)...
start "CampusSync Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite on port 3000)...
start "CampusSync Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo ========================================================
echo   CampusSync is running!
echo ========================================================
echo.
echo   - PC Browser:    http://localhost:3000
echo   - Phone Browser: Check the Vite window for your Network URL
echo                    (e.g., http://10.13.101.158:3000)
echo.
echo   Press any key to close this launcher (servers will keep running).
pause >nul
