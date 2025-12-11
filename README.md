# Prime Hotels Intranet System

A comprehensive multi-property hotel intranet system built with React, TypeScript, and Supabase.

## Features

- **6 Role Levels**: Regional Admin, Regional HR, Property Manager, Property HR, Department Head, Staff
- **Document Management**: Upload, approval workflow, version control, acknowledgments
- **Training System**: Module creation, quizzes, assignments, certificates
- **Announcements**: Targeted announcements with priority levels
- **Notifications**: In-app and email notifications via Resend
- **Audit Logging**: Comprehensive audit trail and PII access tracking
- **Approval Engine**: Multi-level approvals with escalation and delegation

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Resend API key (for email notifications)

## Setup

1. **Install Dependencies**

```bash
npm install
```

2. **Configure Environment Variables**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key
```

3. **Set Up Supabase Database**

Run the migrations in order:

```bash
# Apply migrations via Supabase CLI or Dashboard SQL Editor
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_security_functions.sql
supabase/migrations/003_rls_policies.sql
supabase/migrations/004_documents_schema.sql
supabase/migrations/005_training_schema.sql
supabase/migrations/006_announcements_schema.sql
supabase/migrations/007_notifications_schema.sql
supabase/migrations/008_audit_schema.sql
supabase/migrations/009_retention_policy.sql
supabase/migrations/010_approval_schema.sql
supabase/migrations/011_escalation_function.sql
```

4. **Set Up Storage Buckets**

Create storage buckets in Supabase:
- `documents` - For document files
- `training` - For training materials
- `announcements` - For announcement attachments

5. **Deploy Edge Functions**

Deploy the email sending Edge Function:

```bash
supabase functions deploy send-email
```

Set the `RESEND_API_KEY` secret:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

6. **Enable pg_cron (Optional)**

If you want automated escalation and retention cleanup:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Then uncomment the cron schedules in migrations 009 and 011
```

## Development

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## Project Structure

```
prime-hotels/
├── src/
│   ├── components/        # React components
│   │   ├── admin/        # Admin-specific components
│   │   ├── auth/         # Authentication components
│   │   ├── layout/       # Layout components
│   │   ├── notifications/# Notification components
│   │   ├── shared/       # Shared components
│   │   └── ui/           # Shadcn UI components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and services
│   └── pages/            # Page components
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
└── public/               # Static assets
```

## Key Features Implementation

### Authentication
- Email/password authentication via Supabase Auth
- Session management
- Protected routes with role-based access

### User Management
- Create/edit users
- Assign roles, properties, and departments
- User directory with filtering

### Document Management
- Upload documents with metadata
- Approval workflow (Draft → Pending Review → Approved → Published)
- Version control
- Mandatory acknowledgments

### Training System
- Create training modules with content blocks
- Quiz builder (MCQ, true/false, fill-in-the-blank)
- Assign to users, departments, properties, or all
- Progress tracking and certificates

### Notifications
- In-app notifications via Supabase Realtime
- Email notifications via Resend Edge Function
- User preferences for notification types

### Audit & Compliance
- Comprehensive audit logging
- PII access tracking
- Retention policies (3 years audit, 7 years PII)

### Approval Engine
- Multi-level approval chains
- Temporary approver delegation
- Auto-escalation after threshold
- Approval history tracking

## Security

- Row Level Security (RLS) policies on all tables
- Role-based access control
- Secure password handling via Supabase Auth
- Audit logging for compliance

## License

Private - Prime Hotels Internal Use Only
