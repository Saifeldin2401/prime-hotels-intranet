@echo off
title Prime Hotels - Dev Server
color 0A
cls

echo ========================================
echo   Prime Hotels Intranet
echo   Starting Development Server...
echo ========================================
echo.

cd /d "%~dp0"

REM Kill any existing Node processes
taskkill /F /IM node.exe 2>nul

REM Set environment variables
if exist ".env" (
    echo [1/3] Using .env file configuration
) else (
    echo [1/3] WARNING: No .env file found. Please create one.
)
echo.

echo [2/3] Starting Vite server...
echo.
echo ========================================
echo   Server will be available at:
echo   http://localhost:5173
echo   http://127.0.0.1:5173
echo ========================================
echo.
echo Login Credentials:
echo   Use the Admin credentials you created
echo   or see README.md for details
echo.
echo ========================================
echo   Waiting for server to start...
echo   Then open http://localhost:5173
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.

npm run dev

pause



