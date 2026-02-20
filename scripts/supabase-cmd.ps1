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

# Run supabase command
& supabase $Command @Arguments
