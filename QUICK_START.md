# 🚀 Quick Start - Try the App

## Prerequisites

1. **Create `.env` file** in the `prime-hotels` directory:
   ```env
   VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
   VITE_RESEND_API_KEY=
   ```

2. **Install dependencies** (if not already done):
   ```powershell
   cd prime-hotels
   npm install
   ```

## Step 1: Create Your First Admin User

### Option A: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx)
2. Navigate to **Authentication** → **Users**
3. Click **"Add User"** → **"Create new user"**
4. Enter:
   - Email: `admin@primehotels.com` (or your email)
   - Password: Choose a strong password
   - Auto Confirm User: ✅ Checked
5. Click **"Create User"**

### Step 2: Set Up Admin Role and Test Data

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the contents of `supabase/setup_first_admin.sql`
4. **IMPORTANT**: Change the email on line 5 to match the email you used in Step 1
5. Click **"Run"**

This will:
- Assign `regional_admin` role to your user
- Create a test property "Prime Hotel - Main"
- Create test departments (Front Office, Housekeeping, etc.)
- Link everything together

## Step 3: Start the Development Server

```powershell
npm run dev
```

The app will start at: **http://localhost:5173**

## Step 4: Login

1. Open http://localhost:5173 in your browser
2. Login with the email and password you created
3. You should see the Dashboard! 🎉

## What You Can Test

- ✅ **Dashboard** - View your profile, role, properties, and departments
- ✅ **User Management** - View users (you'll need to create more via Supabase Dashboard for now)
- ✅ **Documents** - Document library (empty initially)
- ✅ **Training** - Training modules (empty initially)
- ✅ **Announcements** - Announcement feed (empty initially)
- ✅ **Notifications** - Notification bell (will show notifications as you use the app)

## Creating More Users

Currently, user creation from the UI requires admin privileges that need to be set up via Edge Function. For now, create users via:

1. **Supabase Dashboard** → Authentication → Users → Add User
2. Then run SQL to assign roles and properties:

```sql
-- Get user ID
SELECT id FROM auth.users WHERE email = 'user@example.com';

-- Assign role (replace USER_ID with the ID above)
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE'::uuid, 'staff'::app_role);

-- Assign property (replace USER_ID and PROPERTY_ID)
INSERT INTO user_properties (user_id, property_id)
VALUES ('USER_ID_HERE'::uuid, 'PROPERTY_ID_HERE'::uuid);
```

## Troubleshooting

- **"Failed to sign in"**: Make sure you created the user and ran the setup SQL script
- **Blank page**: Check browser console (F12) for errors
- **"Unauthorized"**: Make sure you assigned a role to your user
- **Can't see data**: Verify your `.env` file has the correct Supabase URL and key

## Next Steps

- Create properties and departments via the UI (once logged in as admin)
- Upload documents
- Create training modules
- Post announcements
- Test the notification system

Enjoy testing! 🎊


