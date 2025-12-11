# Quick Start Guide

## Step 1: Create Environment File

Create a `.env` file in the `prime-hotels` directory with:

```env
VITE_SUPABASE_URL=https://htsvjfrofcpkfzvjpwvx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_UZohxDu_vLACkxWTBgv_hQ_ra-Pk_Hj
VITE_RESEND_API_KEY=
```

## Step 2: Install Dependencies

Open PowerShell in the `prime-hotels` directory and run:

```powershell
npm install
```

If you get an execution policy error, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Step 3: Start Development Server

```powershell
npm run dev
```

The app will start at `http://localhost:5173`

## Step 4: Create Your First User

Since the database is empty, you'll need to create your first admin user:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter an email and password
4. After creating the user, go to SQL Editor and run:

```sql
-- Replace 'user-email@example.com' with the email you just created
UPDATE profiles 
SET full_name = 'Admin User'
WHERE email = 'user-email@example.com';

-- Assign regional_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'regional_admin'::app_role
FROM profiles
WHERE email = 'user-email@example.com';

-- Create a test property (optional)
INSERT INTO properties (name, address, phone)
VALUES ('Test Property', '123 Main St', '+1234567890')
RETURNING id;

-- Assign the property to the admin user (replace PROPERTY_ID with the returned ID)
INSERT INTO user_properties (user_id, property_id)
SELECT p.id, 'PROPERTY_ID_HERE'::uuid
FROM profiles p
WHERE p.email = 'user-email@example.com';
```

## Step 5: Login

1. Go to `http://localhost:5173`
2. Login with the email and password you created
3. You should see the dashboard!

## Troubleshooting

- **Can't login?** Make sure you've assigned a role to your user in the database
- **Blank page?** Check browser console for errors
- **Database errors?** Verify your `.env` file has the correct Supabase URL and key


