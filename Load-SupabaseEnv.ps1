# Supabase Environment Loader for PHG Connect
# Usage: .\Load-SupabaseEnv.ps1

$envFile = Join-Path $PSScriptRoot ".env.supabase.local"

if (-not (Test-Path $envFile)) {
    Write-Error "Environment file not found: $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object { 
    if ($_ -match '^([^#][^=]*)=(.*)$') { 
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value)
        Write-Host "Set $name" -ForegroundColor Green
    } 
}

# Add Supabase CLI to PATH if not already present
$supabasePath = "$env:USERPROFILE\.local\bin"
if (-not ($env:PATH -like "*$supabasePath*")) {
    $env:PATH = "$supabasePath;$env:PATH"
    Write-Host "Added Supabase CLI to PATH" -ForegroundColor Green
}

Write-Host "`nSupabase environment loaded successfully!" -ForegroundColor Cyan
Write-Host "Project: prime connect (htsvjfrofcpkfzvjpwvx)" -ForegroundColor White
Write-Host "`nAvailable commands:" -ForegroundColor Yellow
Write-Host "  supabase projects list" -ForegroundColor Gray
Write-Host "  supabase functions list" -ForegroundColor Gray
Write-Host "  supabase secrets list" -ForegroundColor Gray
