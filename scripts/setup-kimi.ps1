# Kimi Terminal Setup
Write-Host "=== KIMI TERMINAL SETUP ===" -ForegroundColor Magenta
Write-Host "SUPABASE_ACCESS_TOKEN: $env:SUPABASE_ACCESS_TOKEN" -ForegroundColor Green
Write-Host "SUPABASE_PROJECT_ID: $env:SUPABASE_PROJECT_ID" -ForegroundColor Green
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Green
Write-Host "MCP_CONFIG: $env:MCP_CONFIG" -ForegroundColor Green
Write-Host "=== KIMI READY ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Run: kimi --mcp-config $env:MCP_CONFIG" -ForegroundColor Yellow
