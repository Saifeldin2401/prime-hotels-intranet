# PRIME Connect: System Architecture Reference

**Version**: 1.0
**Status**: Production Ready
**Classification**: CONFIDENTIAL

---

## 1. High-Level Topology

PRIME Connect employs a **Serverless, JAMstack architecture** designed for high availability, low latency, and infinite scalability.

```mermaid
graph TD
    User[End User Device] --> CDN[Edge CDN (Vercel/Netlify)]
    CDN --> Frontend[React SPA]
    Frontend --> Auth[Supabase Auth (GoTrue)]
    Frontend --> API[PostgREST API]
    Frontend --> Realtime[Realtime Subscriptions]
    
    subgraph "Backend Infrastructure (Supabase)"
        Auth --> DB[(PostgreSQL Database)]
        API --> DB
        Realtime --> DB
        Edge[Edge Functions (Deno)] --> DB
        Storage[Object Storage (S3)] --> DB
    end
    
    subgraph "External Integrations"
        Edge --> SES[Email Service (AWS SES)]
        Edge --> PMS[Hotel PMS (Oracle/Opera)]
        Edge --> AI[OpenAI / Anthropic API]
    end
```

### Key Components
1.  **Client Layer**: A Single Page Application (SPA) built with React 18, TypeScript, and Vite.
2.  **API Layer**: Auto-generated RESTful API via PostgREST. No manual CRUD backend servers to maintain.
3.  **Data Layer**: PostgreSQL 15 with Row Level Security (RLS) enabled.
4.  **Compute Layer**: Deno-based Edge Functions for complex business logic (e.g., PDF generation, AI processing).

---

## 2. Database Design & Schema

The database is the "Brain" of PRIME Connect. It uses a **Relational Model** with strict foreign key constraints.

### Core Entity Relationship Diagram (ERD)

*   **Identity**: `auth.users` (Managed by Supabase) -> `public.profiles` (Custom attributes like Job Title, Property ID).
*   **Organization**:
    *   `properties` (Hotels)
    *   `departments` (Global List)
    *   `property_departments` (Which hotel has which dept)
*   **Operations**:
    *   `requests` (Tables for Leave, Documents, etc.)
    *   `request_steps` (Audit trail of approval flow)
*   **RBAC**:
    *   `roles` (Enum of available roles)
    *   `user_roles` (Many-to-Many mapping)

### Key Design Patterns
*   **UUIDs**: All primary keys are UUIDv4 for security and distributed generation.
*   **Soft Deletes**: Critical tables use `is_active` or `deleted_at` columns; data is never physically removed.
*   **Audit Columns**: Every table has `created_at` and `updated_at`. Major entities have `created_by` and `updated_by`.

---

## 3. Security Architecture

We operate on a **"Zero Trust"** model. The frontend is considered untrusted. All security is enforced at the Database level.

### A. Authentication (AuthN)
*   **Provider**: Supabase Auth (wrapping GoTrue).
*   **Mechanism**: JWT (JSON Web Tokens).
*   **Session**: Short-lived Access Tokens (1 hour) + Long-lived Refresh Tokens.

### B. Authorization (AuthZ) - Row Level Security (RLS)
RLS is the firewall of our database. It executes *for every single SQL query*.

**Example RLS Policy (Requests Table):**
```sql
CREATE POLICY "Users can only see their own requests"
ON "public"."requests"
FOR SELECT
USING (
  auth.uid() = requester_id
  OR 
  (auth.uid() = supervisor_id) -- Manager access
  OR
  exists ( 
    select 1 from user_roles 
    where user_id = auth.uid() 
    and role = 'corporate_admin' 
  ) -- Admin access
);
```

### C. Data Privacy
*   **PII Protection**: Sensitive columns (like Salary) are protected by separate, stricter RLS policies.
*   **Encryption**: Data is encrypted at rest (AES-256) and in transit (TLS 1.3).

---

## 4. Frontend Architecture

The frontend is a **Modular Monolith** designed for maintainability.

### Tech Stack
*   **Framework**: React 18
*   **Language**: TypeScript 5.0 (Strict Mode)
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS + Shadcn UI (Radix Primitives)
*   **State Management**: React Query (TanStack Query) v5

### Directory Structure
```
src/
├── components/     # Atomic UI components (Buttons, Inputs)
├── features/       # Domain-specific modules (LeaveRequest, Maintenance)
├── hooks/          # Custom React Hooks (useAuth, useRequests)
├── lib/            # Utilities (Supabase client, Date formatters)
├── pages/          # Route views
└── types/          # TypeScript interfaces
```

### Key Patterns
*   **Custom Hooks**: All data fetching logic is encapsulated in hooks (e.g., `useRequests.ts`). Components never call `fetch()` directly.
*   **Optimistic Updates**: The UI updates immediately when a user acts, then syncs with the server in the background.
*   **Internationalization (i18n)**: All text is extracted into JSON files (`en.json`, `ar.json`) loaded via `i18next`.

---

## 5. Integration Architecture

PRIME Connect interacts with external systems via **Edge Functions**.

### A. Hotel PMS (Property Management System)
*   **Direction**: One-way Sync (PMS -> PRIME).
*   **Mechanism**: Nightly cron job triggers an Edge Function.
*   **Data**: Occupancy rates, Arrivals, Departures.
*   **Purpose**: Operational KPIs for Managers.

### B. Email Service
*   **Direction**: Outbound.
*   **Trigger**: Database Webhooks (e.g., `INSERT on requests`).
*   **Flow**: DB Trigger -> Edge Function -> AWS SES API -> User Email.

---

## 6. Scalability & Performance

*   **Database**: Vertical scaling via Supabase Compute Add-ons. Read Replicas can be added for analytics.
*   **Frontend**: Served via Edge Network (globally distributed).
*   **Assets**: Images/Documents stored in Supabase Storage (S3-compatible) with CDN caching.

---

*Architected by PRIME Hotels IT Division.*
