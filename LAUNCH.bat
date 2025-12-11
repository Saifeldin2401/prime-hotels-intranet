@echo off
title Prime Hotels Intranet
color 0B
cls

echo.
echo ========================================
echo   PRIME HOTELS INTRANET
echo   Development Server Launcher
echo ========================================
echo.

cd /d "%~dp0"

REM Stop any existing servers
echo [1/4] Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo    Done
echo.

REM Set environment variables
echo [2/4] Setting environment variables...
set "VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co"
set "VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
set "VITE_RESEND_API_KEY="
echo    Done
echo.

REM Verify node_modules
echo [3/4] Checking dependencies...
if not exist "node_modules" (
    echo    Installing dependencies...
    call npm install
) else (
    echo    Dependencies OK
)
echo.

REM Start server
echo [4/4] Starting development server...
echo.
echo ========================================
echo   SERVER STARTING...
echo ========================================
echo.
echo   URL: http://localhost:5173
echo.
echo   Login:
echo     Email: admin@prime.com
echo     Password: Reem1977
echo.
echo ========================================
echo   Wait for "Local: http://localhost:5173"
echo   Then open that URL in your browser
echo ========================================
echo.
echo   Press Ctrl+C to stop the server
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start
    echo Check the error messages above
    pause
)



