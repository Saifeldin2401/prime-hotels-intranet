# Complete startup script for Prime Hotels Intranet
# Run this script to start the development server

Write-Host "🚀 Starting Prime Hotels Intranet..." -ForegroundColor Cyan

# Check for .env file
if (Test-Path ".env") {
    Write-Host "✅ Using .env file for configuration" -ForegroundColor Green
    # Vite will automatically load .env file
} else {
    Write-Host "⚠️  WARNING: No .env file found!" -ForegroundColor Red
    Write-Host "   Please create a .env file with your Supabase credentials." -ForegroundColor Yellow
    Write-Host "   See README.md for setup instructions." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Required variables:" -ForegroundColor White
    # Environment variables should be loaded from .env file by Vite
    Write-Host "     VITE_SUPABASE_URL=your_supabase_project_url" -ForegroundColor Gray
    Write-Host "     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" -ForegroundColor Gray
    Write-Host "     RESEND_API_KEY=your_resend_api_key" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

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


