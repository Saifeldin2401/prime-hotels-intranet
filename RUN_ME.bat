@echo off
echo ========================================
echo   Prime Hotels Intranet - Quick Start
echo ========================================
echo.

echo [1/3] Setting environment variables...
set VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
set VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
set VITE_RESEND_API_KEY=
echo ✅ Environment variables set
echo.

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
) else (
    echo ✅ Dependencies already installed
)
echo.

echo [3/3] Starting development server...
echo.
echo 🌐 App will be available at: http://localhost:5173
echo.
echo ⚠️  IMPORTANT: Make sure you've created an admin user!
echo    1. Go to Supabase Dashboard → Authentication → Users
echo    2. Create a user with email/password
echo    3. Run the SQL script in create-admin-user.sql
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev


