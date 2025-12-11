# Check if Server is Running

## Step 1: Look for the Command Window

A new command window should have opened. Look for it - it should show:
```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## Step 2: Open Browser

1. Open your browser (Chrome, Edge, Firefox)
2. Go to: **http://localhost:5173**
3. Press **F12** to open Developer Tools
4. Go to **Console** tab

## Step 3: Check for Errors

Look for any **red error messages** in the console. Common errors:

### "Missing Supabase environment variables"
**Fix:** The environment variables aren't being read. The code now has fallback values, so this should work.

### "Failed to fetch" or Network errors
**Fix:** Check if the server is actually running. Look at the command window.

### Blank white page with no errors
**Fix:** This might be a React rendering issue. Check the Console tab for warnings.

## Step 4: What Should You See?

You should see a **login page** with:
- Title: "Prime Hotels Intranet"
- Email input field
- Password input field
- "Sign In" button

## If Still Nothing Shows:

1. **Check the command window** - Is the server running?
2. **Try http://127.0.0.1:5173** instead of localhost
3. **Clear browser cache** (Ctrl+Shift+Delete)
4. **Try a different browser**
5. **Check Windows Firewall** - Make sure it's not blocking port 5173

## Quick Test:

Open this in your browser: http://localhost:5173/src/main.tsx

If you see code, the server is working. If you see an error, the server isn't running properly.



