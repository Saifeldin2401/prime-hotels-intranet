# PowerShell script to set environment variables
# Run this before starting the dev server: . .\env-setup.ps1

$env:VITE_SUPABASE_URL = "your_supabase_project_url"
$env:VITE_SUPABASE_ANON_KEY = "your_supabase_anon_key"
$env:RESEND_API_KEY = "your_resend_api_key"

Write-Host "Environment variables set!" -ForegroundColor Green
Write-Host "VITE_SUPABASE_URL: $env:VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "Now run: npm run dev" -ForegroundColor Yellow


