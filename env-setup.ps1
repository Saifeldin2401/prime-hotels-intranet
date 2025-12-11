# PowerShell script to set environment variables
# Run this before starting the dev server: . .\env-setup.ps1

$env:VITE_SUPABASE_URL = "https://htsvjfrofcpkfzvjpwvx.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
$env:VITE_RESEND_API_KEY = ""

Write-Host "Environment variables set!" -ForegroundColor Green
Write-Host "VITE_SUPABASE_URL: $env:VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "Now run: npm run dev" -ForegroundColor Yellow


