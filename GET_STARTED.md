# 🚀 Get Started - Everything is Ready!

## ✅ What's Already Done

- ✅ All 12 database migrations applied
- ✅ Test property created: "Prime Hotel - Main"
- ✅ 6 test departments created (Front Office, Housekeeping, F&B, Maintenance, Security, Management)
- ✅ Edge Function deployed for email notifications
- ✅ All security policies configured

## 🎯 Quick Start (3 Steps)

### Step 1: Create Admin User

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/auth/users
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - Email: `admin@primehotels.com` (or your email)
   - Password: `Admin123!` (or your password)
   - ✅ Check **"Auto Confirm User"**
4. Click **"Create User"**

**Option B: Via Supabase CLI** (if you have it installed)
```bash
supabase auth users create admin@primehotels.com --password Admin123!
```

### Step 2: Set Up Admin Role

1. Go to Supabase Dashboard → **SQL Editor**
2. Open the file `create-admin-user.sql` from this project
3. **Change line 5** to match your email: `admin_email TEXT := 'admin@primehotels.com';`
4. Click **"Run"**

This will:
- Assign `regional_admin` role
- Link to the test property
- Set up everything you need

### Step 3: Start the App

**Windows PowerShell:**
```powershell
cd prime-hotels
.\start-dev.ps1
```

**Or manually:**
```powershell
cd prime-hotels

# Set environment variables
$env:VITE_SUPABASE_URL = "https://htsvjfrofcpkfzvjpwvx.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj"

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

The app will start at: **http://localhost:5173**

## 🔐 Login Credentials

- **Email**: The email you created in Step 1
- **Password**: The password you set

## 📋 What You'll See

After logging in, you'll see:
- **Dashboard** with your profile info
- **Sidebar** with navigation:
  - Dashboard
  - Users (admin only)
  - Documents
  - Training
  - Announcements
  - Settings
- **Notification bell** in the header

## 🧪 Test Features

1. **User Management**: Go to Users page (you'll see yourself)
2. **Documents**: Upload a test document
3. **Training**: Create a training module
4. **Announcements**: Post an announcement
5. **Notifications**: Check the bell icon

## 🐛 Troubleshooting

**"Failed to sign in"**
- Make sure you created the user AND ran the SQL script
- Check that the email matches exactly

**Blank page / Errors**
- Open browser console (F12) and check for errors
- Verify `.env` file exists OR environment variables are set
- Make sure `npm install` completed successfully

**"Unauthorized" page**
- You need to assign a role - run the SQL script from Step 2

**Can't see data**
- Check that you assigned the property in the SQL script
- Verify RLS policies aren't blocking access

## 📝 Environment Variables

If you prefer using a `.env` file instead of PowerShell variables:

Create `prime-hotels/.env`:
```env
VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
VITE_RESEND_API_KEY=
```

## 🎉 You're All Set!

The database is fully configured with:
- ✅ 1 Test Property
- ✅ 6 Departments
- ✅ All tables and security policies
- ✅ Edge Functions ready

Just create your admin user and start the app!


