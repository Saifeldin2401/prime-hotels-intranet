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
set "VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co"
set "VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
set "VITE_RESEND_API_KEY="

echo [1/3] Environment variables set
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
echo   Email: admin@prime.com
echo   Password: Reem1977
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



