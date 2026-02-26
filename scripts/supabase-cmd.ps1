# Supabase CLI Helper Script for PHG Connect
param(
    [Parameter(Mandatory=$true)]
    [string]$Command,
    
    [Parameter(ValueFromRemainingArguments=$true)]
    $Arguments
)

# Add supabase to PATH if not already present
$supabasePath = "$env:USERPROFILE\.local\bin"
if (-not ($env:Path -like "*$supabasePath*")) {
    $env:Path += ";$supabasePath"
}

# Ensure we're in the project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

# Guard against accidentally passing a JWT/service key via SUPABASE_ACCESS_TOKEN.
# Supabase CLI expects a personal access token that starts with "sbp_".
$accessToken = $env:SUPABASE_ACCESS_TOKEN
if ($accessToken -and ($accessToken -notmatch '^sbp_[A-Za-z0-9]{20,}$')) {
    Write-Host "Ignoring invalid SUPABASE_ACCESS_TOKEN format; using Supabase CLI stored login token."
    Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
}

# Run supabase command
& supabase $Command @Arguments
