# Debugging Console Errors

## How to Check Console Errors

1. **Open Browser Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows)
   - Or right-click → "Inspect" → "Console" tab

2. **Look for Red Errors**:
   - Red text indicates errors
   - Yellow text indicates warnings
   - Check both "Console" and "Network" tabs

## Common Errors & Fixes

### 1. Supabase Connection Errors
**Error**: `Failed to fetch` or `Network error`
**Fix**: Check environment variables are set correctly

### 2. RLS Policy Errors
**Error**: `new row violates row-level security policy`
**Fix**: User doesn't have permission. Check RLS policies in Supabase.

### 3. Storage Bucket Errors
**Error**: `Bucket not found` or `Storage error`
**Fix**: Ensure `documents` bucket exists in Supabase Storage

### 4. Type Errors
**Error**: `Cannot read property 'X' of undefined`
**Fix**: Check if data exists before accessing properties

### 5. Query Errors
**Error**: `Invalid query` or `syntax error`
**Fix**: Check Supabase query syntax

## Quick Fixes Applied

✅ Fixed Dashboard query for empty departments/properties
✅ Added validation for property/department selection in upload
✅ Fixed type issues in recent activity query

## If You See Errors

Please share:
1. The exact error message (red text)
2. Which page/action caused it
3. Any stack trace shown

I'll fix them immediately!



