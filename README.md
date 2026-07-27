<div align="center">

<img src="public/altus-logo-brand.png" alt="Altus Advisory" width="200"/>

# Altus Advisory Intranet Platform

**A comprehensive multi-property hotel intranet system with bilingual support (English/Arabic)**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Live Demo](#) · [Documentation](#documentation) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Support](#support)

---

## 🎯 Overview

REMAL Connect is an enterprise-grade intranet platform built for multi-property hotel management. It provides a centralized hub for staff communication, document management, training, and HR operations with full support for both English and Arabic languages.

### ✨ Highlights

- 🌍 **Bilingual Interface** - Complete English & Arabic localization with RTL support
- 🏨 **Multi-Property** - Manage multiple hotel properties from a single platform
- 📱 **Mobile-First** - Responsive design optimized for all devices
- 🔐 **Enterprise Security** - Role-based access control with comprehensive audit logging
- ⚡ **Real-time** - Live notifications and updates via Supabase Realtime

---

## 🔑 Key Features

### 👥 Role-Based Access Control
6 hierarchical role levels with granular permissions:

| Role | Scope |
|------|-------|
| Regional Admin | Cross-property system administration |
| Regional HR | HR operations across all properties |
| Property Manager | Single property oversight |
| Property HR | HR operations within property |
| Department Head | Department-level management |
| Staff | Standard employee access |

### 📚 Knowledge Base
- **Document Management** - SOPs, policies, guides, checklists, FAQs
- **Approval Workflow** - Draft → Pending Review → Approved → Published
- **Version Control** - Track document history and changes
- **Required Reading** - Mandatory acknowledgments with tracking
- **Analytics Dashboard** - Content performance metrics

### 🎓 Training & Development
- **Module Creation** - Rich content with videos, images, and text
- **Quiz Builder** - Multiple choice, true/false, fill-in-the-blank
- **AI Question Generation** - Auto-generate quiz questions from content
- **Assignment System** - Assign to users, departments, or properties
- **Certificates** - Auto-generated completion certificates
- **Learning Paths** - Structured career development tracks

### 📢 Communication Hub
- **Announcements** - Targeted with priority levels and scheduling
- **Bulk Notifications** - Large-scale communications
- **In-App Notifications** - Real-time via Supabase Realtime
- **Email Notifications** - Automated delivery via Resend
- **HR Operations Center** - Centralized notification management

### 🏢 HR & Staff Management
- **Staff Directory** - Searchable with advanced filters
- **Job Postings** - Internal postings with application tracking
- **Leave Requests** - Digital workflow with approvals
- **Maintenance Tickets** - Property maintenance request system

### � Finance & Procurement
- **Budget Management** - Track and allocate budgets across properties
- **Invoice Processing** - Vendor invoice approval workflow
- **Purchase Requests** - Submit and approve purchase requests
- **Purchase Orders** - Track orders and receive goods
- **Inventory Management** - Per-property inventory tracking
- **Supplier Registry** - Corporate-wide supplier management

### 🏨 Operations & Housekeeping
- **CAPEX Projects** - Capital expenditure tracking and renovation milestones
- **Room Status Board** - Live room status monitoring
- **Housekeeping Tasks** - Assign and track housekeeping tasks
- **Daily Logbook** - Shift logs and handover notes
- **Guest Requests** - Track and fulfill guest service requests
- **Incidents** - Log and track operational incidents
- **VIP Guests** - Flag VIP guests for staff attention
- **Lost & Found** - Track lost and found items

### 💼 Commercial CRM
- **Account Management** - Corporate and commercial client accounts
- **Leads Pipeline** - Sales pipeline and opportunity tracking
- **Contract Management** - Manage commercial contracts

### � Audit & Compliance
- **Comprehensive Logging** - All actions tracked with timestamps
- **PII Tracking** - Special tracking for sensitive data access
- **Retention Policies** - 3-year audit, 7-year PII retention
- **Security Advisors** - Built-in security recommendations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React 18  │  │ TypeScript  │  │    Tailwind CSS     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Supabase Platform                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │PostgreSQL│ │   Auth   │ │ Storage  │ │Realtime│  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Edge Functions                             │
│         ┌─────────────────┐  ┌─────────────────┐            │
│         │   send-email    │  │ bulk-notification│           │
│         └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Resend API key (for email notifications)

### Installation

```bash
# Clone the repository
git clone https://github.com/Saifeldin2401/remal-intranet.git
cd remal-intranet

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Environment Configuration

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=https://remal-connect.com
VITE_ALLOWED_ORIGINS=https://remal-connect.com,https://www.remal-connect.com
```

### Database Setup

Run all migrations in `supabase/migrations/` directory in chronological order.

### Storage Buckets

Create the following Supabase Storage buckets:
- `documents` - For document files and PDFs
- `training` - For training materials
- `announcements` - For announcement attachments
- `knowledge` - For knowledge base attachments

### Edge Functions

```bash
# Deploy Edge Functions
supabase functions deploy send-email
supabase functions deploy bulk-notification-processor

# Set secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key \
  APP_BASE_URL=https://remal-connect.com \
  EMAIL_FROM_ADDRESS=notifications@remal-connect.com \
  EMAIL_FROM_NAME="REMAL Connect"
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [User Manual](USER_MANUAL.md) | End-user guide for platform navigation and features |
| [Admin Technical Guide](ADMIN_TECHNICAL_GUIDE.md) | System administration and configuration |
| [System Architecture](SYSTEM_ARCHITECTURE.md) | Technical architecture overview |
| [Full System Manual](FULL_SYSTEM_MANUAL.md) | Comprehensive system documentation |
| [Production Deployment](PRODUCTION_DEPLOYMENT_GUIDE.md) | Deployment guide for production environments |
| [Testing Guide](TESTING_GUIDE.md) | Testing procedures and best practices |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |
| [Knowledge Base Guide](KNOWLEDGE_BASE_GUIDE.md) | KB system documentation |
| [Guest Reviews Setup](SETUP_GUEST_REVIEWS.md) | Guest review system configuration |
| [Get Started](GET_STARTED.md) | Quick onboarding guide |

---

## 📸 Screenshots

<div align="center">

*Dashboard and Analytics*

*Knowledge Base Interface*

*Training Module View*

*Mobile Responsive Design*

</div>

---

## 🛣️ Roadmap

- [x] Finance & Procurement Module
- [x] Operations & Housekeeping Module
- [x] Commercial CRM Module
- [x] CAPEX Projects Management
- [ ] Guest Review Intelligence System
- [ ] Advanced Analytics & Reporting
- [ ] Mobile App (iOS/Android)
- [ ] AI-Powered Content Recommendations
- [ ] Integration with Property Management Systems
- [ ] Advanced Workflow Automation
- [ ] Multi-Factor Authentication

See [FEATURES.md](FEATURES.md) for detailed feature planning.

---

## 🛡️ Security

- ✅ Row Level Security (RLS) policies on all tables
- ✅ Role-based access control at database level
- ✅ Secure password handling via Supabase Auth
- ✅ Comprehensive audit logging for compliance
- ✅ PII access tracking and retention policies
- ✅ Security advisor recommendations built-in

---

## 📦 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Framework** | Tailwind CSS, Shadcn UI |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **i18n** | react-i18next |
| **Email** | Resend API |
| **PDF** | react-pdf |
| **Dates** | date-fns |

---

## 🤝 Contributing

This is a private repository for REMAL internal use. For internal development guidelines, contact the IT department.

---

## 📄 License

Private - REMAL Connect Internal Use Only

Copyright © 2024 REMAL. All rights reserved.

---

## 🆘 Support

For technical support or questions:

- **Internal Users**: Contact IT Department or HR Administration
- **Technical Issues**: [Open an issue](../../issues)

---

<div align="center">

**[⬆ Back to Top](#remal-connect-intranet-platform)**

Built with ❤️ by the REMAL IT Team

</div>
