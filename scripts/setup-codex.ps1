# Codex Terminal Setup
Write-Host "=== CODEX TERMINAL SETUP ===" -ForegroundColor Cyan
Write-Host "SUPABASE_ACCESS_TOKEN: $env:SUPABASE_ACCESS_TOKEN" -ForegroundColor Green
Write-Host "SUPABASE_PROJECT_ID: $env:SUPABASE_PROJECT_ID" -ForegroundColor Green
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Green
Write-Host "MCP_CONFIG: $env:MCP_CONFIG" -ForegroundColor Green
Write-Host "=== CODEX READY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run: codex --config mcp.config=$env:MCP_CONFIG" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or with prompt:" -ForegroundColor Yellow
Write-Host "codex --config mcp.config=$env:MCP_CONFIG '.codex/session-prompt.md'" -ForegroundColor Yellow
