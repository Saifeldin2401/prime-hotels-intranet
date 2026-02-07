@echo off
echo ========================================
echo   Prime Hotels Intranet - Quick Start
echo ========================================
echo.

echo [1/3] Setting environment variables...
echo ⚠️  Please set your environment variables in a .env file or here:
echo     VITE_SUPABASE_URL=your_supabase_project_url
echo     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
echo     VITE_RESEND_API_KEY=your_resend_api_key
echo.
if exist ".env" (
    echo ✅ Using .env file for environment variables
) else (
    echo ⚠️  No .env file found. Please create one with your Supabase credentials.
    echo     See README.md for instructions.
    pause
)
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


