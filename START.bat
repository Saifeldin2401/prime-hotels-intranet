@echo off
title Prime Hotels Intranet - Dev Server
color 0A

echo ========================================
echo   Prime Hotels Intranet
echo   Starting Development Server...
echo ========================================
echo.

cd /d "%~dp0"

REM Set environment variables
set "VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co"
set "VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
set "VITE_RESEND_API_KEY="

echo [1/3] Environment variables configured
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
echo   Email: admin@prime.com
echo   Password: Reem1977
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


