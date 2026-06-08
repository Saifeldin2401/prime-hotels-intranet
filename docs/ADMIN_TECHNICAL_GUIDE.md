# PRIME Connect: Comprehensive Administrator & Technical Manual

**Version**: 2.1 (Technical Deep Dive)
**Confidentiality**: INTERNAL USE ONLY
**Target Audience**: System Administrators, CTO, HR Directors, IT Support Staff.

---

## 📋 Table of Contents

1.  [System Architecture](#1-system-architecture)
2.  [Security Model & Access Control](#2-security-model--access-control)
3.  [User & Identity Management](#3-user--identity-management)
4.  [Organization Configuration](#4-organization-configuration)
5.  [Core Routing Engine (Technical Logic)](#5-core-routing-engine-technical-logic)
6.  [Advanced Delegation System](#6-advanced-delegation-system)
7.  [Notification Infrastructure](#7-notification-infrastructure)
8.  [AI Capabilities & Limitations](#8-ai-capabilities--limitations)
9.  [System Health & Troubleshooting](#9-system-health--troubleshooting)
10. [Audit & Compliance](#10-audit--compliance)

---

## 1. System Architecture

PRIME Connect is a modern **Serverless Web Application** built on a highly scalable stack.

*   **Frontend**: React (TypeScript) + Vite. Hosted on Edge CDN.
    *   *Significance*: Extremely fast loading times; works offline for basic tasks.
*   **Backend / Database**: Supabase (PostgreSQL).
    *   *Significance*: Real-time data updates; Row Level Security (RLS) ensures data privacy at the database engine level (physically impossible to hack via API).
*   **Infrastructure**: Hosted on Cloud (AWS/Google Cloud via Supabase).
*   **Edge Functions**: Server-side logic (Sending emails, AI processing) runs on distributed edge nodes for low latency.

---

## 2. Security Model & Access Control

We utilize a **Role-Based Access Control (RBAC)** system combined with **Row Level Security (RLS)**.

### A. The Role Hierarchy
Permissions are additive. A higher role inherits lower role views, but with expanded scope.

| Role | Scope (What they see) | Key Permissions |
| :--- | :--- | :--- |
| **staff** | `Self` | Submit requests, View own profile, Complete training. |
| **manager** | `Self` + `Direct Reports` | Approve leaves, View team attendance. |
| **department_head** | `Department` (in 1 Property) | Budget oversight, All dept staff performance. |
| **property_hr** | `Property` (All Depts) | Onboarding, Payroll, Disputes, Local Broadcasts. |
| **property_manager** | `Property` (All Depts) | Operational Analytics, Property-wide approvals. |
| **regional_hr** | `Region` (Multiple Props) | Cross-property transfers, Regional policy. |
| **corporate_admin** | `Global` (All Data) | System config, Global settings, Audit logs. |

### B. RLS Examples (Technical)
*   *Query*: `SELECT * FROM requests`
*   **Staff User**: DB returns `WHERE requester_id = me`.
*   **Manager**: DB returns `WHERE requester_id = me OR supervisor_id = me`.
*   **Admin**: DB returns `ALL`.

> **Critical**: Never manually bypass RLS in SQL functions unless using `SECURITY DEFINER` for specific system tasks (e.g., creating a user).

---

## 3. User & Identity Management

### Provisioning New Users
1.  **Navigate**: `/admin/users` -> "Add User".
2.  **Required Fields**: Full Name, Email (Must be `@primehotels.sa`), Property, Department.
3.  **Role Assignment**: Default is `staff`. Upgrade carefully.
4.  **Reporting Line**: **CRITICAL**. You MUST assign a "Reporting To" manager immediately.
    *   *Risk*: If a user has no Manager, their Leave Requests will get stuck (See Section 5).

### Offboarding / Termination
1.  **Deactivate**: Toggle "Account Active" to OFF.
2.  **Effect**: User is instantly logged out. API tokens revoked.
3.  **Data Retention**: We perform "Soft Deletes". Historical data remains for Audit/Legal reasons.

---

## 4. Organization Configuration

### Properties vs. Departments
*   **Properties**: Physical hotels (e.g., "Prime Al Hamra").
    *   *Config*: Must have a Timezone and Localization setting.
*   **Departments**: Functional units (e.g., "Front Office").
    *   *Logic*: Departments are Global Master Data, but linked to Properties via `property_departments`.

### Critical Setup Rule
For the "Routing Engine" to work, **EVERY Property MUST have at least one user with the `property_hr` role.**
*   *Why?* Requests that pass the Supervisor need a "Local HR" to land on. If missing, they escalate to Regional/Corporate, causing noise.

---

## 5. Core Routing Engine (Technical Logic)

Understanding how requests travel is vital for troubleshooting.

### The "Smart Route" Algorithm
When `Submit Request` is clicked:

1.  **Validation**:
    *   Is the date valid?
    *   Is the attachment virus-scanned? (Coming soon)
    *   **Action**: Record created with status `pending_supervisor`.

2.  **Step 1: Supervisor Assignment**
    *   System looks up `profiles.reporting_to`.
    *   **Success**: `supervisor_id` is set. Notification sent to Manager.
    *   **Failure (Null)**: `supervisor_id` set to NULL. **ALERT Triggered**.
    *   *Auto-Fix*: System looks for Department Head. If found, assigns them.

3.  **Step 2: HR Review**
    *   Once Supervisor approves, status -> `pending_hr`.
    *   System query: `SELECT id FROM user_roles WHERE role = 'property_hr' AND property_id = [RequesterProperty]`.
    *   **Fallback 1**: If 0 results, query `regional_hr`.
    *   **Fallback 2**: If 0 results, assign to `corporate_admin`.
    *   **Admin Alert**: "Routing Fallback Triggered for Request #123".

---

## 6. Advanced Delegation System

Managers can delegate authority. This is not just a UI change; it modifies RLS access temporarily.

### Technical Implementation
*   **Table**: `temporary_approvers`
*   **Logic**:
    *   Manager A delegates to Manager B (Scope: All).
    *   When Manager B logs in, `useRequestsInbox` hook fetches:
        1.  Own requests.
        2.  PLUS requests where `supervisor_id` = Manager A.
*   **Security**: Manager B does **NOT** get full access to Manager A's profile or salary. Only "Operational Approval" rights.

### Audit Trail
*   When Manager B approves, the log writes: `Approved by Manager B (Delegate for Manager A)`.

---

## 7. Notification Infrastructure

### Granular Delivery Logic
Users control what they receive, but System Alerts override preferences.

1.  **Preferences**: Stored in `notification_preferences` table.
2.  **Batching**:
    *   High Priority (Assignments): Sent Immediately (Real-time).
    *   Low Priority (Info): Batched every 15 mins to prevent spam.
3.  **Channels**:
    *   **In-App**: WebSocket (Realtime) via Supabase Channels.
    *   **Email**: Via SMTP (SendGrid/AWS SES).
    *   **Push**: Browser Notification API.

### Troubleshooting "Emails Not Received"
1.  Check Spam folder.
2.  Check User Profile -> Settings -> "Enable All Emails".
3.  Check Admin -> Audit Logs -> Filter by "Email Failure".

---

## 8. AI Capabilities & Limitations

The Admin AI Tools (`/admin/ai-tools`) leverage LLMs (Large Language Models).

### A. Feedback Analyzer
*   **Input**: Employee Surveys (User needs to upload CSV).
*   **Process**: AI clusters sentiment (Positive/Negative) and extracts topics.
*   **Privacy**: PII is anonymized Before sending to AI.

### B. Onboarding Path Generator
*   **Function**: Generates 30-60-90 day plans based on Job Title.
*   **Limitation**: Output is a *suggestion*. HR must review before publishing.

### C. Document Summarizer
*   **Function**: Summarizes long PDF policies.
*   **Capacity**: Max 10MB file size. OCR supported for English/Arabic.

---

## 9. System Health & Troubleshooting

### Usage of "/admin/routing-health"
This is your "Repair Shop".

*   **"Missing Manager" Alert**:
    *   *Cause*: A user was created without a manager.
    *   *Fix*: Click "Fix Routing" -> Search for their Manager -> Save.
*   **"Stuck Request"**:
    *   *Cause*: The assigned manager left the company causing a dead end.
    *   *Fix*: Use "Reassign" tool to force-move the request to a new manager.

### Common Error Codes
*   **401 Unauthorized**: User session expired. Re-login.
*   **403 Forbidden**: User tried to access data outside their RLS scope.
*   **400 Bad Request**: usually invalid input (e.g., End Date before Start Date).

---

## 10. Audit & Compliance

### Audit Logs (`/admin/audit`)
Immutable record of actions.
*   **Retention**: 7 Years (Legal Requirement).
*   **Searchable**: By User, IP Address, or Action Type.

### PII Access Logs (`/admin/pii-access`)
Special log for "Sensitive Data".
*   Tracks *View* events.
*   Example: "HR User John viewed Salary of Employee Jane".
*   *Purpose*: GDPR/PDPL Compliance. Monitoring for internal snooping.

---

*This manual describes the system state as of Build 2.1.0. Unauthorized distribution is prohibited.*
