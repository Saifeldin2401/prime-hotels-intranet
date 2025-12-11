# Troubleshooting Guide

## Server Won't Start

### Issue: "ERR_CONNECTION_REFUSED" or "localhost refused to connect"

**Solution 1: Use the Batch File**
1. Double-click `START.bat` in the `prime-hotels` folder
2. Wait for the server to start (you'll see "Local: http://localhost:5173")
3. Then open http://localhost:5173 in your browser

**Solution 2: Manual PowerShell Start**
1. Open PowerShell in the `prime-hotels` folder
2. Run these commands one by one:

```powershell
$env:VITE_SUPABASE_URL = "https://htsvjfrofcpkfzvjpwvx.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
npm run dev
```

**Solution 3: Check if Port 5173 is Already in Use**
```powershell
netstat -ano | findstr :5173
```
If something is using port 5173, kill it:
```powershell
taskkill /PID <PID_NUMBER> /F
```

### Issue: "Missing Supabase environment variables"

**Solution:** Make sure environment variables are set before running `npm run dev`:

```powershell
$env:VITE_SUPABASE_URL = "https://htsvjfrofcpkfzvjpwvx.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"
```

Or create a `.env` file in the `prime-hotels` folder:
```env
VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
VITE_RESEND_API_KEY=
```

### Issue: "Cannot find module" errors

**Solution:** Install dependencies:
```powershell
cd prime-hotels
npm install
```

### Issue: PowerShell Execution Policy Error

**Solution:** Run this in PowerShell (as Administrator):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Login Issues

### Issue: "Failed to sign in"

**Check:**
1. User exists in Supabase Dashboard → Authentication → Users
2. You ran the SQL script to assign the role
3. Email/password are correct (case-sensitive)

**Verify user setup:**
Go to Supabase SQL Editor and run:
```sql
SELECT p.email, ur.role, pr.name as property
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN user_properties up ON up.user_id = p.id
LEFT JOIN properties pr ON pr.id = up.property_id
WHERE p.email = 'admin@prime.com';
```

### Issue: "Unauthorized" page

**Solution:** You need a role assigned. Run `setup-admin-prime.sql` in SQL Editor.

## Browser Issues

### Issue: Blank page or errors in console

**Check:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab - are requests failing?
4. Verify environment variables are set correctly

### Issue: CORS errors

**Solution:** Make sure you're using the correct Supabase URL and anon key from your project.

## Quick Fixes

1. **Restart everything:**
   - Close all PowerShell windows
   - Kill all Node processes: `taskkill /F /IM node.exe`
   - Start fresh with `START.bat`

2. **Clear cache:**
   - Clear browser cache
   - Try incognito/private window

3. **Check logs:**
   - Look at the terminal output when starting the server
   - Check browser console (F12)

## Still Having Issues?

1. Make sure you're in the `prime-hotels` directory
2. Verify `node_modules` folder exists
3. Check that `package.json` is present
4. Try: `npm install` then `npm run dev`
5. Check that port 5173 is not blocked by firewall


