@echo off
title Prime Hotels Intranet - Dev Server
color 0A

echo ========================================
echo   Prime Hotels Intranet
echo   Starting Development Server...
echo ========================================
echo.

cd /d "%~dp0"

REM Set environment variables from .env file if it exists
echo [1/3] Checking environment configuration...
if exist ".env" (
    echo    Using .env file for configuration
) else (
    echo    WARNING: No .env file found!
    echo    Please create a .env file with your Supabase credentials.
    echo    See README.md for instructions.
    echo.
    REM The original script had a pause here and listed required variables.
    REM This has been removed as per instructions to simplify the .env check.
)
echo.

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies OK
)
echo.

echo [3/3] Starting Vite development server...
echo.
echo ========================================
echo   Server starting...
echo   URL: http://localhost:5173
echo ========================================
echo.
echo Login Credentials:
echo   Use the Admin credentials you created
echo   or see README.md for details
echo.
echo ========================================
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start
    echo Check the error messages above
    pause
)


