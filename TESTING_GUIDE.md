# Testing Guide - Prime Hotels Intranet

## 🚀 Quick Start

1. **Server Status**: The dev server should be running on http://localhost:5173
2. **Login Credentials**:
   - Email: `admin@prime.com`
   - Password: `Reem1977`

## ✅ Features Ready for Testing

### 1. **Dashboard** ✅
**Location**: Home page (`/`)

**What to Test**:
- ✅ View your role, properties, and departments
- ✅ See document count, training progress, and announcement stats
- ✅ Check pending approvals and notifications
- ✅ View recent activity feed
- ✅ Use quick action buttons to navigate

**Expected Behavior**:
- Stats cards show real data from the database
- Quick actions navigate to respective pages
- Recent activity shows announcements and training assignments

---

### 2. **Document Management** ✅
**Location**: `/documents`

**What to Test**:
- ✅ **View Documents**: See list of all documents
- ✅ **Search**: Use search bar to filter documents
- ✅ **Upload Document**: Click "Upload Document" button
  - Select a file (PDF, DOCX, etc.)
  - Enter title and description
  - Choose visibility (All Properties, Specific Property, Department, Role)
  - Select property/department if needed
  - Toggle "Requires acknowledgment"
  - Click "Upload Document"
- ✅ **View/Download**: Click eye or download icons

**Expected Behavior**:
- Documents list loads from database
- Upload dialog opens and closes properly
- File uploads to Supabase Storage
- Document record created in database
- Search filters documents correctly

**Note**: Make sure the `documents` storage bucket exists in Supabase (already created)

---

### 3. **User Management** ✅
**Location**: `/admin/users` (Regional Admin/HR only)

**What to Test**:
- ✅ View list of all users
- ✅ Search users by name or email
- ✅ **Create User**: Click "Add User"
  - Enter email, full name, phone
  - Select role
  - Assign properties and departments
  - Click "Create User"
- ✅ **Edit User**: Click on existing user
  - Modify details
  - Update role, properties, departments
  - Click "Update User"

**Expected Behavior**:
- User list loads correctly
- Search filters users
- Create user creates auth user and profile
- Edit updates user information
- Role/property/department assignments work

---

### 4. **Training Modules** (Basic View)
**Location**: `/training`

**Current Status**: Basic list view (full CRUD coming next)

**What to Test**:
- ✅ View list of training modules
- ✅ See module titles and descriptions

---

### 5. **Announcements** (Basic View)
**Location**: `/announcements`

**Current Status**: Basic list view (full CRUD coming next)

**What to Test**:
- ✅ View list of announcements
- ✅ See pinned announcements
- ✅ See priority badges

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module" errors
**Solution**: Run `npm install` in the project directory

### Issue: Blank page or errors in browser console
**Solution**: 
1. Check browser console (F12) for errors
2. Verify server is running
3. Check that environment variables are set

### Issue: File upload fails
**Solution**: 
1. Verify `documents` bucket exists in Supabase Storage
2. Check file size (should be under bucket limit)
3. Check browser console for specific error

### Issue: Database queries fail
**Solution**:
1. Verify you're logged in
2. Check Supabase dashboard for RLS policies
3. Verify your user has the correct role

---

## 📋 Testing Checklist

- [ ] Login works with admin credentials
- [ ] Dashboard loads and shows stats
- [ ] Document Library page loads
- [ ] Can upload a document
- [ ] Can search documents
- [ ] Can view/download documents
- [ ] User Management page loads (if admin)
- [ ] Can create a new user
- [ ] Can edit existing user
- [ ] Training Modules page loads
- [ ] Announcements page loads
- [ ] Navigation between pages works
- [ ] Logout works

---

## 🔍 What to Look For

### ✅ Good Signs:
- Pages load without errors
- Data appears from database
- Forms submit successfully
- Navigation works smoothly
- No console errors

### ⚠️ Issues to Report:
- Blank pages
- Console errors (red text)
- Failed API calls
- Missing data
- Broken navigation
- Form submission failures

---

## 📝 Next Features Coming

After testing, we'll build:
1. **Training & Certification** - Full module creation, content, quizzes, assignments
2. **Announcements** - Create, target, attachments, read tracking
3. **Approval Workflows** - Document approvals, multi-level approval chains
4. **Notifications** - Real-time notifications, email integration
5. **Audit Logs** - View audit logs and PII access logs

---

## 🆘 Need Help?

If you encounter any issues:
1. Check browser console (F12 → Console tab)
2. Check server terminal for errors
3. Share the error message and I'll help fix it!

Happy Testing! 🎉



