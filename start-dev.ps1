# Complete startup script for Prime Hotels Intranet
# Run this script to start the development server

Write-Host "🚀 Starting Prime Hotels Intranet..." -ForegroundColor Cyan

# Set environment variables
$env:VITE_SUPABASE_URL = "https://htsvjfrofcpkfzvjpwvx.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
$env:VITE_RESEND_API_KEY = ""

Write-Host "✅ Environment variables configured" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

Write-Host "🌐 Starting development server..." -ForegroundColor Cyan
Write-Host "📍 App will be available at: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: Make sure you've created an admin user!" -ForegroundColor Red
Write-Host "   1. Go to Supabase Dashboard → Authentication → Users" -ForegroundColor White
Write-Host "   2. Create a user with email/password" -ForegroundColor White
Write-Host "   3. Run the SQL script in supabase/setup_first_admin.sql" -ForegroundColor White
Write-Host ""

npm run dev


