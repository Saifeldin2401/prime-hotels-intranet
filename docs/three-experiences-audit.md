# PRIME Connect — Three Experiences Architecture & Access Control Audit

## 1. Executive Summary

PRIME Hotels Intranet (PRIME Connect) is architected around **three distinct, non-overlapping user experience tiers**. Each tier provides purpose-built workflows, isolated security boundaries, and tailored data projections.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: SAAS OPERATOR PLANE                     │
│                        Routes: /platform/*                             │
│  Actors: platform_admin, system_owner, platform_support                │
│  Scope: Multi-tenant governance, lifecycle, global flags & master ops │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Assisted-Access / Master Deploy
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    TIER 2: TENANT MANAGEMENT PLANE                     │
│                    Routes: /admin/*                                    │
│  Actors: corporate_admin, hotel_admin, hr_manager, department_head     │
│  Scope: Single-tenant organizational hierarchy, properties & training  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Assignments / SOP Policies
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 TIER 3: PROPERTY & LEARNER EXPERIENCE                  │
│                 Routes: /dashboard/*, /training/*, /sops/*             │
│  Actors: learner, staff, line employee, trainer                        │
│  Scope: Local property operations, shift rosters, assigned SOPs & LMS  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Experience Tiers Detail

### Tier 1: SaaS Operator Control Plane (`/platform/*`)
- **Primary Audience:** Platform Operations Engineers, SaaS Executives, Customer Success Leads.
- **Key Modules:**
  - **Executive Control Center (`/platform/control-center`):** Fleet-wide telemetry, cross-tenant global search with tenant context, and active background queue.
  - **Organizations Directory & Lifecycle (`/platform/organizations`, `/platform/organizations/:id`):** Lifecycle state transitions (`prospect` -> `trial` -> `active` -> `suspended` -> `archived`), entitlement enforcement, and organizational hierarchy trees (`<OrgStructureTree>`).
  - **Platform Directory (`/platform/directory`):** Operator provisioning, granular operator permission assignments (`org.create`, `tenant.manage`, `config.manage`, `assisted_access`), and MFA status.
  - **Master Content Library (`/platform/master-library`):** Master SOPs, courses, and question banks with one-click atomic distribution (`deploy_master_content`) and drift detection.
  - **Assisted Access Engine (`/platform/assisted-access`):** Audited time-bounded impersonation sessions with mandatory reason logging and TTL expiration.
  - **Operations Hub (`/platform/operations`):** Background AI course generation pipelines and `pg_cron` scheduler health.
  - **Platform Settings (`/platform/settings`):** Global feature flags, platform notification policies (`platform_notification_policies`), and session policies.

### Tier 2: Tenant Management Plane (`/admin/*`)
- **Primary Audience:** Hotel Brand Corporate Executives, General Managers, HR Directors, Property Admins.
- **Key Modules:**
  - **Organizational Control Center (`/admin/organization`):** Multi-property management, brand definitions, hotel assignments, department management, and entity hierarchy trees.
  - **User Management & Provisioning (`/admin/users`, `/admin/invitations`, `/admin/bulk-provisioning`):** Staff onboarding with runtime seat quota verification (`effective_entitlements`).
  - **Content & LMS Management (`/admin/training`, `/admin/sops`, `/admin/assessments`):** Tenant-scoped learning catalogs, custom courses, SOP authoring, and assignment rules.
  - **Subscription & Entitlements Card (`/admin/organization` -> Profile):** Live capacity counters (hotels used, learner seats consumed, storage GB) comparing current usage against licensed tier limits.

### Tier 3: Property & Learner Experience (`/dashboard/*`, `/training/*`, `/sops/*`)
- **Primary Audience:** Front desk agents, housekeeping crew, culinary staff, maintenance engineers, and supervisors.
- **Key Modules:**
  - **Daily Operations Dashboard (`/dashboard`):** Property shift notices, daily tasks, urgent broadcast announcements.
  - **Learner LMS Portal (`/training`, `/training/modules/:id`):** Course progress, quizzes, certificates, and compliance deadlines.
  - **SOP Knowledge Base (`/sops`):** Property-specific standard operating procedures, acknowledgment workflows, and search.
  - **Self-Service Profile (`/profile`):** Personal details, notification preferences, certifications, and language toggles (EN/AR).

---

## 3. Data Scoping & Isolation Architecture

### 1. Row Level Security (RLS) Suspension Gate
All tenant-scoped tables enforce the operational gate:
```sql
CREATE POLICY "tenant_table_select" ON public.training_modules
  FOR SELECT TO authenticated
  USING (
    public.is_platform_operator(auth.uid())
    OR (
      organization_id = ANY(public.current_user_organization_ids())
      AND public.org_is_operational(organization_id)
    )
  );
```
When an organization is set to `suspended`, non-operator queries for modules, tasks, assessments, enrollments, and SOPs return 0 rows immediately. Subscriptions remain accessible for self-service billing resolution.

### 2. Runtime Entitlement Triggers
Seat and property quotas are guarded at the database transaction boundary:
- **`enforce_hotel_entitlement_limit()`**: Prevents creating hotels exceeding `subscriptions.max_hotels`.
- **`enforce_learner_seat_limit()`**: Prevents inserting new `organization_memberships` when active members meet or exceed `subscriptions.max_learners`.
- **Operator Bypass:** Verified platform operators carrying `tenant.manage` can provision emergency resources when necessary.

### 3. System Settings Scoping
System configuration uses a hierarchical resolution pattern via `get_setting(p_org_id uuid, p_key text)`:
1. First checks `system_settings` where `organization_id = p_org_id` (Tenant override).
2. If not found, falls back to `system_settings` where `organization_id IS NULL` (Platform default).
3. Tenant administrators can only modify their own tenant overrides; platform operators control global defaults.

### 4. Master Content Deployment Flow
1. Master SOPs and Courses are created in platform storage with `is_master_template = true`.
2. Atomic RPC `deploy_master_content(p_master_id, p_content_type, p_org_id)` executes inside a single transaction:
   - Deep-clones the master record and all related child records (chapters, quiz questions) with `organization_id = p_org_id` and `is_master_template = false`.
   - Records metadata and tracking version in `master_content_deployments`.
   - Writes structured event to `platform_audit_logs`.
   - Idempotent: re-deploying updates existing cloned records in place and marks drift as resolved.

---

## 4. Verification & Audit Matrix

| Security & Governance Requirement | Implementation Mechanism | Status |
| :--- | :--- | :--- |
| **Operator Access Isolation** | `platform_operators` table + `is_platform_operator()` function + RLS | Verified |
| **Assisted Access Reason Requirement** | `operator_sessions` table with mandatory reason & TTL check | Verified |
| **Suspended Org Lockdown** | `org_is_operational()` helper across 12 multitenant tables | Verified |
| **Seat & Property Quota Enforcement** | `enforce_learner_seat_limit` + `enforce_hotel_entitlement_limit` triggers | Verified |
| **Cross-Tenant Content Deployment** | `deploy_master_content()` SECURITY DEFINER RPC | Verified |
| **Notification Policy Inheritance** | `platform_notification_policies` + `organization_notification_overrides` | Verified |
| **Audit Traceability** | `platform_audit_logs` capturing actor, target org, and action payload | Verified |
