# Kimi Terminal Setup - Persistent Environment
Write-Host "=== KIMI TERMINAL SETUP ===" -ForegroundColor Magenta

# Set environment variables for this session
$env:SUPABASE_ACCESS_TOKEN = "<SET_YOUR_SUPABASE_PAT_HERE>"
$env:SUPABASE_PROJECT_ID = "htsvjfrofcpkfzvjpwvx"
$env:DATABASE_URL = "postgresql://postgres.htsvjfrofcpkfzvjpwvx.supabase.co:5432/postgres"
$env:MCP_CONFIG = ".codex/mcp.json"

# Verify they're set
Write-Host "SUPABASE_ACCESS_TOKEN: $env:SUPABASE_ACCESS_TOKEN" -ForegroundColor Green
Write-Host "SUPABASE_PROJECT_ID: $env:SUPABASE_PROJECT_ID" -ForegroundColor Green
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Green
Write-Host "MCP_CONFIG: $env:MCP_CONFIG" -ForegroundColor Green

Write-Host "=== KIMI READY ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Now run: kimi --mcp-config $env:MCP_CONFIG" -ForegroundColor Yellow
