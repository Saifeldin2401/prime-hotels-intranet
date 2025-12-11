@echo off
echo Starting Prime Hotels Intranet...
echo.

cd /d "%~dp0"

set VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
set VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
set VITE_RESEND_API_KEY=

echo Environment variables set
echo.
echo Starting development server...
echo App will be available at: http://localhost:5173
echo.
echo Login with:
echo   Email: admin@prime.com
echo   Password: Reem1977
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause


