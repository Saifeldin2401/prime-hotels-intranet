# Prime Hotels Intranet System (PRIME Connect)

A comprehensive multi-property hotel intranet system built with React, TypeScript, and Supabase, featuring full bilingual support (English/Arabic).

## Features

### Core System
- **6 Role Levels**: Regional Admin, Regional HR, Property Manager, Property HR, Department Head, Staff
- **Multi-Property Support**: Manage multiple hotel properties from a single platform
- **Bilingual Interface**: Full English and Arabic localization with RTL support
- **Responsive Design**: Mobile-first design optimized for all devices

### Knowledge Base
- **Comprehensive Documentation System**: SOPs, policies, guides, checklists, FAQs, and more
- **Department-Specific Content**: Organized by department and content type
- **Search & Browse**: Full-text search with advanced filtering
- **Review Queue**: Admin workflow for content approval and publishing
- **Analytics Dashboard**: Content performance metrics and engagement tracking
- **PDF Support**: View and download PDF documents inline
- **Required Reading**: Track mandatory document acknowledgments

### Document Management
- **Upload & Approval Workflow**: Draft → Pending Review → Approved → Published
- **Version Control**: Track document history and changes
- **Acknowledgments**: Mandatory acknowledgments with tracking
- **Visibility Controls**: Property-level and department-level access control

### Training & Development
- **Module Creation**: Rich content blocks with videos, images, and text
- **Quiz Builder**: Multiple choice, true/false, and fill-in-the-blank questions
- **AI-Powered Question Generation**: Automatically generate quiz questions from content
- **Assignment System**: Assign to users, departments, properties, or all staff
- **Progress Tracking**: Monitor completion rates and scores
- **Certificates**: Auto-generated completion certificates
- **Learning Paths**: Structure training into career development tracks

### Communication
- **Announcements**: Targeted announcements with priority levels and scheduling
- **Bulk Notifications**: Batch notification system for large-scale communications
- **In-App Notifications**: Real-time notifications via Supabase Realtime
- **Email Notifications**: Automated email delivery via Resend
- **Notification Preferences**: User-configurable notification settings
- **HR Operations Center**: Centralized notification management and filtering

### HR & Staff Management
- **User Directory**: Searchable staff directory with advanced filters
- **Role Management**: Hierarchical role-based access control
- **Department Organization**: Organize staff by department and property
- **Job Posting System**: Internal job postings with application tracking
- **Leave Request System**: Digital leave request workflow with approvals
- **Maintenance Requests**: Property maintenance ticket system

### Audit & Compliance
- **Comprehensive Audit Logging**: All actions tracked with timestamps
- **PII Access Tracking**: Special tracking for sensitive data access
- **Retention Policies**: 3-year audit retention, 7-year PII retention
- **Security Advisors**: Built-in security and performance recommendations
- **Approval History**: Complete audit trail for all approvals

### Approval Engine
- **Multi-Level Approval Chains**: Configurable approval workflows
- **Temporary Delegation**: Delegate approval authority temporarily
- **Auto-Escalation**: Automatic escalation after configurable thresholds
- **Approval History**: Track approval decisions and comments

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

Run all migrations in the `supabase/migrations/` directory in chronological order. Key migrations include:
- Initial schema and authentication
- Security functions and RLS policies
- Documents, training, and knowledge base schemas
- Notifications and announcements
- Audit logging and retention
- Bulk notification system

4. **Set Up Storage Buckets**

Create storage buckets in Supabase:
- `documents` - For document files and PDFs
- `training` - For training materials
- `announcements` - For announcement attachments
- `knowledge` - For knowledge base attachments

5. **Deploy Edge Functions**

Deploy Edge Functions:

```bash
supabase functions deploy send-email
supabase functions deploy process-notification-batch
```

Set required secrets:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

6. **Enable pg_cron (Optional)**

For automated escalation and retention cleanup:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
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
│   │   ├── documents/    # Document viewer components
│   │   ├── layout/       # Layout components
│   │   ├── notifications/# Notification components
│   │   ├── common/       # Shared/common components
│   │   └── ui/           # Shadcn UI components
│   ├── contexts/         # React contexts (Auth, Theme)
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Internationalization
│   │   └── locales/      # Arabic and English translations
│   ├── lib/              # Utility functions and services
│   ├── pages/            # Page components
│   │   ├── knowledge/   # Knowledge Base pages
│   │   ├── learning/    # Training pages
│   │   ├── hr/          # HR pages
│   │   └── public/      # Public pages (login, homepage)
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
└── public/               # Static assets
```

## Recent Updates

### December 2024
- ✅ Complete Arabic localization for Knowledge Base
- ✅ Fixed translation key conflicts and duplicates
- ✅ Added bulk notification system for large-scale communications
- ✅ Implemented PDF viewer for knowledge base documents
- ✅ Added Saudi/International team representation in public pages
- ✅ Fixed RTL/LTR layout handling for bilingual interface
- ✅ Standardized toast notifications across all modules
- ✅ Added Knowledge Base analytics and review queue

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Internationalization**: react-i18next
- **Notifications**: Resend Email API
- **PDF Rendering**: react-pdf
- **Date Handling**: date-fns with locale support

## Security

- Row Level Security (RLS) policies on all tables
- Role-based access control at database level
- Secure password handling via Supabase Auth
- Comprehensive audit logging for compliance
- PII access tracking and retention policies
- Security advisor recommendations built-in

## Deployment

The application is designed for deployment on:
- **Frontend**: Netlify, Vercel, or similar
- **Backend**: Supabase managed service
- **Edge Functions**: Supabase Edge Runtime

## License

Private - Prime Hotels Internal Use Only

## Support

For internal support, contact the IT department or HR administration.
