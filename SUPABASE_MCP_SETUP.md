# Supabase MCP & CLI Setup Guide

## ✅ CLI Connection - COMPLETED

Your Supabase CLI is now fully configured and connected to the **prime connect** project.

### Project Details
- **Project Name**: prime connect
- **Project Ref**: `htsvjfrofcpkfzvjpwvx`
- **Project URL**: https://htsvjfrofcpkfzvjpwvx.supabase.co
- **Region**: West EU (Ireland)
- **Org ID**: qgnrdpbcgacscdrruvgq

### Access Token Configuration
Your personal access token has been saved to `.env.supabase.local`:
```
SBP_ACCESS_TOKEN=sbp_910c77dee6fa0bf9521e020e8b4ff01a440b4e79
SUPABASE_ACCESS_TOKEN=sbp_910c77dee6fa0bf9521e020e8b4ff01a440b4e79
```

### Available API Keys
- **Anon Key**: For client-side requests
- **Service Role Key**: For admin/server-side operations (keep secret!)

### Edge Functions Deployed (55 Active)
Key functions include:
- `send-email` - Email notifications
- `create-user` - User management
- `process-ai-request` - AI processing
- `daily-workflows` - Scheduled workflows
- `training-notifications` - LMS notifications
- `guest-review-collector` - Guest review system
- `workflow-engine` - Automation engine
- `ai-admin` - AI administration
- `scheduled-reports` - Report generation

## 🔧 Using the CLI

### Load Environment (PowerShell)
```powershell
# Load the environment variables
Get-Content .env.supabase.local | ForEach-Object { 
    if ($_ -match '^([^#][^=]*)=(.*)$') { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) 
    } 
}
```

### Common CLI Commands
```powershell
# List all projects
supabase projects list

# List edge functions
supabase functions list

# List secrets
supabase secrets list

# Deploy a function
supabase functions deploy function-name

# View logs
supabase functions logs function-name

# Database commands (requires Docker for local development)
supabase db pull
supabase db push
supabase migration list
```

## 🔌 MCP Server Setup

### Option 1: PostgreSQL MCP Server
To use the MCP server for database access, you need your database password.

1. Get your database password from Supabase Dashboard → Settings → Database
2. Update the connection string in `.mcp-supabase.json`:

```json
{
  "mcpServers": {
    "supabase-prime-connect": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.hlsvjfrofcpkfzvjpwvx:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

### Option 2: Supabase Management API MCP
For management operations, use the Supabase CLI directly which is already configured.

## 🔐 Security Notes

1. **Access Token**: Never commit the access token to git
2. **Service Role Key**: This has full admin access - keep it secure
3. **Database Password**: Required for direct Postgres connections
4. **Anon Key**: Safe to use in client-side code

## 📊 Project Statistics

- **Migrations**: 400+ tracked migrations
- **Edge Functions**: 55 active functions
- **Secrets**: 23 configured secrets
- **Database**: PostgreSQL 17

## 🆘 Troubleshooting

### CLI Not Found
```powershell
# Add to PATH if needed
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
```

### Authentication Errors
```powershell
# Re-set the access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_910c77dee6fa0bf9521e020e8b4ff01a440b4e79"
supabase projects list
```

### Update CLI
```powershell
supabase update
```

## 📚 Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [MCP Postgres Server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
