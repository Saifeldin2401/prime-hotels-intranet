# Supabase CLI Setup Guide

## ✅ Installation Complete

Supabase CLI v2.75.0 is installed at:
```
%USERPROFILE%\.local\bin\supabase.exe
```

## 🔐 Step 1: Authenticate

You need to get an access token from Supabase Dashboard:

1. Go to: https://app.supabase.com/account/tokens
2. Click "Generate New Token"
3. Give it a name (e.g., "PHG-Connect-CLI")
4. Copy the token (starts with `sbp_`)

Then run:
```powershell
$env:Path += ";$env:USERPROFILE\.local\bin"
supabase login --token YOUR_TOKEN_HERE
```

## 🔗 Step 2: Link Project

Once authenticated, link to your project:

```powershell
cd "c:\Users\mahro\Desktop\prime-hotels-intranet-master"
$env:Path += ";$env:USERPROFILE\.local\bin"
supabase link --project-ref htsvjfrofcpkfzvjpwvx
```

## 📝 Step 3: Create Your First Migration

```powershell
supabase migration new my_new_feature
```

This creates: `supabase/migrations/YYYYMMDDHHMMSS_my_new_feature.sql`

## 🚀 Step 4: Deploy Migrations

```powershell
# Check pending migrations
supabase migration list

# Push to cloud
supabase db push
```

## 📚 Useful Commands

| Command | Description |
|---------|-------------|
| `supabase --version` | Check CLI version |
| `supabase migration new <name>` | Create new migration |
| `supabase migration list` | List pending migrations |
| `supabase db push` | Deploy migrations to cloud |
| `supabase db pull` | Pull schema from cloud |
| `supabase db diff` | Compare local vs remote |
| `npm run check:migrations` | Validate migration files |

## 🔄 Migration Workflow

```powershell
# 1. Create migration
supabase migration new add_user_preferences

# 2. Edit the SQL file (in supabase/migrations/)

# 3. Validate
npm run check:migrations

# 4. Deploy
supabase db push
```

## ⚠️ Troubleshooting

**If login fails:**
- Make sure token starts with `sbp_`
- Check token hasn't expired at https://app.supabase.com/account/tokens

**If link fails:**
- Verify you're logged in: `supabase projects list`
- Check project ref: `htsvjfrofcpkfzvjpwvx`

**To add to permanent PATH:**
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.local\bin", "User")
```
