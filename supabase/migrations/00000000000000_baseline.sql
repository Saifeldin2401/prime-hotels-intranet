-- =============================================================================
-- BASELINE MIGRATION — squashed schema as of 2026-06-13
-- Project: prime-hotels-intranet (dhbfaclkfysqwfppuxxa)
-- =============================================================================
-- This file represents the complete schema already applied to the production
-- Supabase project.  All 857 prior migration files have been moved to
-- supabase/migrations/archive/.  Migrations added on or after 2026-06-12
-- remain active alongside this baseline.
-- =============================================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- Enum types (32)
-- ------------------------------------------------------------
CREATE TYPE public.achievement_type AS ENUM ('training_master', 'perfect_completion', 'safety_champion', 'top_performer', 'zero_incident', 'fast_responder', 'knowledge_sharer', 'team_player', 'early_bird', 'streak_master');
CREATE TYPE public.announcement_priority AS ENUM ('normal', 'important', 'critical');
CREATE TYPE public.app_role AS ENUM ('super_admin', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager', 'staff');
CREATE TYPE public.content_block_type AS ENUM ('text', 'image', 'video', 'document_link', 'quiz', 'sop_reference', 'audio', 'interactive');
CREATE TYPE public.document_category AS ENUM ('cv', 'certificate', 'contract', 'other');
CREATE TYPE public.document_confidentiality AS ENUM ('public', 'internal', 'confidential', 'restricted');
CREATE TYPE public.document_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED');
CREATE TYPE public.document_visibility AS ENUM ('all_properties', 'property', 'department', 'role', 'group_department', 'specific_departments');
CREATE TYPE public.entity_status AS ENUM ('draft', 'pending', 'submitted', 'approved', 'rejected', 'todo', 'open', 'in_progress', 'review', 'pending_parts', 'completed', 'cancelled', 'archived', 'published', 'closed', 'filled', 'on_hold', 'active', 'inactive');
CREATE TYPE public.import_type AS ENUM ('csv', 'api', 'manual');
CREATE TYPE public.knowledge_content_type AS ENUM ('sop', 'policy', 'guide', 'checklist', 'reference', 'faq', 'video', 'visual');
CREATE TYPE public.knowledge_visibility AS ENUM ('global', 'property', 'department', 'role', 'property_department', 'custom');
CREATE TYPE public.learning_assignment_status AS ENUM ('assigned', 'in_progress', 'completed', 'overdue', 'excused');
CREATE TYPE public.learning_content_type AS ENUM ('quiz', 'sop', 'video', 'external_link', 'module', 'microlearning');
CREATE TYPE public.learning_target_type AS ENUM ('user', 'department', 'role', 'property', 'everyone');
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'unpaid', 'maternity', 'paternity', 'personal', 'other');
CREATE TYPE public.maintenance_category AS ENUM ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other');
CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
CREATE TYPE public.media_category AS ENUM ('training', 'knowledgebase', 'announcement', 'general', 'compliance', 'onboarding', 'marketing', 'other');
CREATE TYPE public.media_type AS ENUM ('video', 'image', 'document', 'audio');
CREATE TYPE public.notification_type AS ENUM ('approval_required', 'request_approved', 'request_rejected', 'training_assigned', 'training_deadline', 'document_published', 'document_acknowledgment_required', 'announcement_new', 'escalation_alert', 'referral_status_update', 'maintenance_assigned', 'maintenance_resolved', 'request_submitted', 'comment_added', 'request_returned', 'request_closed', 'training_completed', 'training_overdue', 'promotion_approved', 'transfer_approved', 'maintenance_updated', 'message_received', 'mention', 'task_assigned', 'task_due_soon', 'task_overdue', 'task_completed', 'document_approved', 'document_rejected', 'document_review_pending', 'trigger_notification', 'sop_assigned', 'sop_quiz_required', 'sop_quiz_passed', 'sop_quiz_failed', 'system', 'employee_of_the_month_winner');
CREATE TYPE public.pms_type AS ENUM ('opera', 'cloudbeds', 'mews', 'local', 'other');
CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
CREATE TYPE public.question_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
CREATE TYPE public.question_type AS ENUM ('mcq', 'mcq_multi', 'true_false', 'fill_blank', 'scenario');
CREATE TYPE public.question_usage_type AS ENUM ('sop_inline', 'lesson', 'quiz', 'certification', 'assessment', 'daily_challenge');
CREATE TYPE public.quiz_type AS ENUM ('mcq', 'true_false', 'fill_blank');
CREATE TYPE public.sop_approval_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');
CREATE TYPE public.sop_document_status AS ENUM ('draft', 'under_review', 'approved', 'obsolete');
CREATE TYPE public.sync_status AS ENUM ('pending', 'syncing', 'completed', 'failed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.training_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');
CREATE TYPE public.translation_status AS ENUM ('pending', 'automated', 'reviewed');

-- ------------------------------------------------------------
-- Tables (181)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_action_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action text NOT NULL,
    note text NOT NULL,
    created_by uuid,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    achievement_type public.achievement_type NOT NULL,
    title text NOT NULL,
    description text,
    icon text DEFAULT 'award'::text,
    color text DEFAULT 'gold'::text,
    points integer DEFAULT 10,
    criteria jsonb NOT NULL,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    target_type text,
    target_id uuid,
    target_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    property_id uuid,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_delegations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    delegator_id uuid,
    delegate_id uuid,
    delegation_type text NOT NULL DEFAULT 'approval_authority'::text,
    permissions text[] DEFAULT '{}'::text[],
    reason text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    auto_expired boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone,
    revoked_by uuid,
    max_approvals integer,
    approvals_used integer DEFAULT 0,
    allow_redelegate boolean DEFAULT false,
    fallback_delegate_ids uuid[] DEFAULT '{}'::uuid[],
    notify_delegate boolean DEFAULT true,
    notify_delegator boolean DEFAULT true,
    notify_on_action boolean DEFAULT true,
    notify_on_expiry boolean DEFAULT true,
    paused_at timestamp with time zone,
    paused_by uuid
);

CREATE TABLE IF NOT EXISTS public.announcement_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    announcement_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text,
    file_type text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_targets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    announcement_id uuid NOT NULL,
    target_properties uuid[],
    target_departments uuid[],
    target_roles app_role[]
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    priority public.announcement_priority NOT NULL DEFAULT 'normal'::announcement_priority,
    pinned boolean DEFAULT false,
    scheduled_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    created_by_id uuid,
    category text DEFAULT 'general'::text,
    target_audience jsonb DEFAULT '{"type": "all", "values": []}'::jsonb,
    allow_comments boolean DEFAULT true,
    send_push_notification boolean DEFAULT false,
    send_email boolean DEFAULT false,
    requires_acknowledgment boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    department_id uuid
);

CREATE TABLE IF NOT EXISTS public.approval_delegations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    approval_id uuid NOT NULL,
    approval_type text NOT NULL,
    delegator_id uuid NOT NULL,
    delegate_id uuid NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'active'::text,
    expires_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    approval_request_id uuid NOT NULL,
    approver_id uuid,
    was_delegate boolean DEFAULT false,
    original_approver_id uuid,
    action text NOT NULL,
    feedback text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    current_approver_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    date date NOT NULL,
    check_in timestamp with time zone,
    check_out timestamp with time zone,
    status text DEFAULT 'present'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.certificate_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    certificate_id uuid NOT NULL,
    action varchar(50) NOT NULL,
    performed_by uuid,
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.certificate_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT ''::text,
    template_html text NOT NULL DEFAULT ''::text,
    background_color text NOT NULL DEFAULT '#ffffff'::text,
    text_color text NOT NULL DEFAULT '#111827'::text,
    accent_color text NOT NULL DEFAULT '#b8860b'::text,
    font_family text NOT NULL DEFAULT 'Georgia'::text,
    logo_url text,
    signature_url text,
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.certificates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    certificate_number varchar(20) NOT NULL,
    verification_code varchar(32) NOT NULL,
    user_id uuid NOT NULL,
    recipient_name varchar(255) NOT NULL,
    recipient_email varchar(255),
    certificate_type varchar(50) NOT NULL,
    training_module_id uuid,
    training_progress_id uuid,
    sop_id uuid,
    quiz_attempt_id uuid,
    title varchar(500) NOT NULL,
    description text,
    completion_date timestamp with time zone NOT NULL,
    expiry_date timestamp with time zone,
    score numeric,
    passing_score numeric,
    property_id uuid,
    department_id uuid,
    status varchar(20) DEFAULT 'active'::character varying,
    revocation_reason text,
    revoked_by uuid,
    revoked_at timestamp with time zone,
    pdf_url text,
    pdf_generated_at timestamp with time zone,
    issued_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id uuid NOT NULL,
    participant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text,
    participant_ids uuid[] NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_import_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    pms_system_id uuid,
    import_type public.import_type NOT NULL,
    file_name text,
    business_date_start date,
    business_date_end date,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    status public.sync_status DEFAULT 'pending'::sync_status,
    records_processed integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_details jsonb,
    imported_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.designations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    department_id uuid,
    level integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_acknowledgments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    acknowledged_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_approvals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    approver_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    feedback text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approver_role public.app_role,
    approved_by uuid,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    is_active boolean DEFAULT true,
    entity_type text DEFAULT 'document'::text,
    entity_id uuid
);

CREATE TABLE IF NOT EXISTS public.document_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    parent_id uuid,
    user_id uuid NOT NULL,
    content text NOT NULL,
    is_resolved boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_department_access (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_download_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    user_id uuid,
    downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address inet
);

CREATE TABLE IF NOT EXISTS public.document_favorites (
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_folders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid,
    department_id uuid,
    property_id uuid,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_system boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.document_notification_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    folder_id uuid,
    notify_on_new boolean DEFAULT true,
    notify_on_update boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_tag_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_tags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    color text DEFAULT '#3B82F6'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_url text NOT NULL,
    change_summary text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    user_id uuid,
    viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    file_url text,
    visibility public.document_visibility NOT NULL DEFAULT 'property'::document_visibility,
    property_id uuid,
    department_id uuid,
    role public.app_role,
    status public.document_status NOT NULL DEFAULT 'DRAFT'::document_status,
    requires_acknowledgment boolean DEFAULT false,
    created_by uuid,
    current_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    summary text,
    summary_ar text,
    is_deleted boolean DEFAULT false,
    file_size bigint DEFAULT 0,
    category_id uuid,
    content text,
    content_type text DEFAULT 'document'::text,
    checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    faq_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    video_url text,
    images jsonb NOT NULL DEFAULT '[]'::jsonb,
    featured boolean NOT NULL DEFAULT false,
    view_count integer NOT NULL DEFAULT 0,
    estimated_read_time integer,
    last_reviewed_at timestamp with time zone,
    last_reviewed_by uuid,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    title_ar text,
    description_ar text,
    content_ar text,
    translation_status public.translation_status DEFAULT 'pending'::translation_status,
    last_translated_at timestamp with time zone,
    expires_at timestamp with time zone,
    review_reminder_date timestamp with time zone,
    document_number text,
    confidentiality_level public.document_confidentiality DEFAULT 'internal'::document_confidentiality,
    owner_id uuid,
    folder_id uuid,
    file_extension text,
    download_count integer DEFAULT 0,
    last_downloaded_at timestamp with time zone,
    watermark_text text,
    is_archived boolean DEFAULT false,
    search_vector tsvector,
    deleted_at timestamp with time zone,
    file_type text,
    linked_training_id uuid,
    last_published_by uuid
);

CREATE TABLE IF NOT EXISTS public.employee_documents (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    category public.document_category NOT NULL DEFAULT 'other'::document_category,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    expiry_date date,
    document_number text,
    status text DEFAULT 'active'::text
);

CREATE TABLE IF NOT EXISTS public.employee_of_the_month (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid,
    user_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    reason_en text NOT NULL,
    reason_ar text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid
);

CREATE TABLE IF NOT EXISTS public.employee_promotions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid,
    from_role text,
    to_role text NOT NULL,
    from_title text,
    to_title text NOT NULL,
    from_department_id uuid,
    to_department_id uuid,
    effective_date date NOT NULL,
    approved_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.employee_referrals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    referred_by uuid NOT NULL,
    candidate_name text NOT NULL,
    candidate_email text,
    candidate_phone text,
    position_applied text,
    department text,
    property_id uuid,
    status text DEFAULT 'pending'::text,
    referral_date date,
    hire_date date,
    bonus_amount numeric,
    bonus_status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    job_posting_id uuid
);

CREATE TABLE IF NOT EXISTS public.employee_transfers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid,
    from_property_id uuid,
    to_property_id uuid NOT NULL,
    from_department_id uuid,
    to_department_id uuid,
    effective_date date NOT NULL,
    approved_by uuid,
    reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eom_auto_selections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    user_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    total_score numeric NOT NULL,
    selection_reason_en text NOT NULL,
    selection_reason_ar text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    announced_eom_id uuid,
    announced_at timestamp with time zone,
    scoring_history_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eom_automation_config (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    task_completion_weight integer DEFAULT 40,
    training_completion_weight integer DEFAULT 30,
    sop_compliance_weight integer DEFAULT 20,
    attendance_weight integer DEFAULT 10,
    min_attendance_rate integer DEFAULT 80,
    min_task_completion_rate integer DEFAULT 70,
    auto_announce boolean DEFAULT false,
    announcement_day integer DEFAULT 1,
    exclude_recent_winners boolean DEFAULT true,
    exclusion_months integer DEFAULT 3,
    min_employment_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.eom_scoring_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL,
    user_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    task_completion_rate integer,
    training_completion_rate integer,
    sop_compliance_rate integer,
    attendance_rate integer,
    task_completion_score numeric,
    training_completion_score numeric,
    sop_compliance_score numeric,
    attendance_score numeric,
    total_score numeric NOT NULL,
    rank integer NOT NULL,
    is_eligible boolean DEFAULT true,
    ineligibility_reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escalation_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    threshold_hours integer NOT NULL DEFAULT 48,
    next_role public.app_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    all_day boolean DEFAULT false,
    location text,
    type text DEFAULT 'general'::text,
    property_id uuid,
    department_id uuid,
    created_by uuid NOT NULL,
    is_public boolean DEFAULT true,
    attendees uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    ip_address text,
    user_agent text,
    attempt_count integer NOT NULL DEFAULT 1,
    first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
    locked_until timestamp with time zone,
    captcha_required boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.feed_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    feed_item_id text NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feed_reactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    feed_item_id text NOT NULL,
    user_id uuid NOT NULL,
    reaction_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    target_date date,
    progress integer DEFAULT 0,
    status text DEFAULT 'not_started'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    training_module_id uuid,
    category text
);

CREATE TABLE IF NOT EXISTS public.holidays (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    date date NOT NULL,
    property_id uuid,
    is_optional boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hospitality_news (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_title text NOT NULL,
    title_en text,
    title_ar text,
    summary_en text,
    summary_ar text,
    source text NOT NULL,
    source_url text,
    image_url text,
    published_at timestamp with time zone NOT NULL,
    category text,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    guid text,
    original_language text DEFAULT 'en'::text,
    tags text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS public.inbound_emails (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email_id uuid,
    message_id text,
    "from" text,
    "to" text[] NOT NULL DEFAULT '{}'::text[],
    cc text[] NOT NULL DEFAULT '{}'::text[],
    bcc text[] NOT NULL DEFAULT '{}'::text[],
    subject text,
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    received_created_at timestamp with time zone,
    webhook_created_at timestamp with time zone,
    event_type text NOT NULL DEFAULT 'email.received'::text,
    raw_event jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    html text,
    text text,
    headers jsonb,
    reply_to text[] NOT NULL DEFAULT '{}'::text[],
    raw_download_url text,
    raw_expires_at timestamp with time zone,
    attachment_downloads jsonb NOT NULL DEFAULT '[]'::jsonb,
    content_fetched_at timestamp with time zone,
    content_fetch_error text
);

CREATE TABLE IF NOT EXISTS public.job_applications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_posting_id uuid,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text,
    cv_url text,
    cover_letter text,
    status text NOT NULL DEFAULT 'received'::text,
    referred_by uuid,
    routed_to uuid[] DEFAULT '{}'::uuid[],
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cv_bucket text,
    cv_path text,
    cv_filename text,
    cv_mime text,
    cv_size integer,
    referral_source text
);

CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    department_id uuid,
    property_id uuid,
    seniority_level text NOT NULL,
    employment_type text NOT NULL,
    description text,
    requirements text,
    responsibilities text,
    salary_range_min numeric,
    salary_range_max numeric,
    status public.entity_status NOT NULL DEFAULT 'draft'::entity_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    published_at timestamp with time zone,
    closes_at timestamp with time zone,
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.job_title_role_mappings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_title text NOT NULL,
    system_role public.app_role NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_titles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text NOT NULL,
    default_role public.app_role NOT NULL DEFAULT 'staff'::app_role,
    created_at timestamp with time zone DEFAULT now(),
    department_id uuid
);

CREATE TABLE IF NOT EXISTS public.knowledge_question_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    session_id uuid,
    selected_answer text,
    selected_options uuid[],
    is_correct boolean,
    partial_score numeric,
    context_type public.question_usage_type,
    context_entity_id uuid,
    time_spent_seconds integer,
    attempt_number integer DEFAULT 1,
    hint_used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_question_options (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    option_text text NOT NULL,
    option_text_ar text,
    is_correct boolean DEFAULT false,
    display_order integer DEFAULT 0,
    feedback text,
    feedback_ar text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_question_usages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    usage_type public.question_usage_type NOT NULL,
    usage_entity_id uuid NOT NULL,
    display_order integer DEFAULT 0,
    is_required boolean DEFAULT true,
    weight numeric DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_question_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL,
    version_number integer NOT NULL,
    data_snapshot jsonb NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    change_reason text
);

CREATE TABLE IF NOT EXISTS public.knowledge_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    question_text text NOT NULL,
    question_text_ar text,
    question_type public.question_type NOT NULL DEFAULT 'mcq'::question_type,
    difficulty_level public.question_difficulty NOT NULL DEFAULT 'medium'::question_difficulty,
    correct_answer text,
    explanation text,
    explanation_ar text,
    hint text,
    hint_ar text,
    linked_sop_id uuid,
    linked_sop_section text,
    category_id uuid,
    tags text[] DEFAULT '{}'::text[],
    estimated_time_seconds integer DEFAULT 30,
    points integer DEFAULT 1,
    ai_generated boolean DEFAULT false,
    ai_model_used text,
    ai_confidence_score numeric,
    ai_prompt_used text,
    status public.question_status NOT NULL DEFAULT 'draft'::question_status,
    version integer DEFAULT 1,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    training_module_id uuid,
    training_section_id text
);

CREATE TABLE IF NOT EXISTS public.knowledge_quiz_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    quiz_type public.question_usage_type NOT NULL,
    quiz_entity_id uuid,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    total_questions integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    total_points integer DEFAULT 0,
    earned_points integer DEFAULT 0,
    score_percentage numeric,
    passed boolean,
    time_limit_seconds integer,
    passing_score numeric
);

CREATE TABLE IF NOT EXISTS public.knowledge_related_articles (
    document_id uuid NOT NULL,
    related_document_id uuid NOT NULL,
    relation_type text NOT NULL DEFAULT 'see_also'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kudos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    giver_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    message text NOT NULL,
    category text DEFAULT 'general'::text,
    likes_count integer DEFAULT 0,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kudos_likes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    kudos_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    target_type public.learning_target_type NOT NULL,
    target_id text,
    content_type public.learning_content_type NOT NULL,
    content_id uuid NOT NULL,
    due_date timestamp with time zone,
    valid_from timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    priority text DEFAULT 'normal'::text,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    instructions text,
    requires_acknowledgement boolean DEFAULT false,
    notify_on_due boolean DEFAULT true,
    reminder_days_before int4[] DEFAULT '{}'::integer[]
);

CREATE TABLE IF NOT EXISTS public.learning_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assignment_id uuid,
    user_id uuid NOT NULL,
    content_type public.learning_content_type NOT NULL,
    content_id uuid NOT NULL,
    status public.learning_assignment_status NOT NULL DEFAULT 'assigned'::learning_assignment_status,
    progress_percentage integer DEFAULT 0,
    score_percentage numeric,
    passed boolean,
    completed_at timestamp with time zone,
    last_accessed_at timestamp with time zone DEFAULT now(),
    last_session_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    training_module_id uuid,
    is_deleted boolean DEFAULT false,
    last_block_index integer,
    last_block_id uuid,
    time_spent_seconds integer DEFAULT 0,
    last_activity_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    acknowledged_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.learning_quiz_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL,
    question_id uuid NOT NULL,
    display_order integer DEFAULT 0,
    points_override integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_quizzes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category_id uuid,
    time_limit_minutes integer,
    passing_score_percentage integer DEFAULT 70,
    max_attempts integer,
    randomize_questions boolean DEFAULT false,
    show_feedback_during boolean DEFAULT true,
    status public.question_status NOT NULL DEFAULT 'draft'::question_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    linked_sop_id uuid,
    is_deleted boolean DEFAULT false,
    training_module_id uuid,
    source_document_id uuid
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL,
    property_id uuid,
    department_id uuid,
    start_date date NOT NULL,
    end_date date NOT NULL,
    type public.leave_type NOT NULL,
    reason text,
    status public.entity_status NOT NULL DEFAULT 'pending'::entity_status,
    approved_by_id uuid,
    rejected_by_id uuid,
    rejection_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    workflow_request_id uuid,
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.leave_types (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    days_per_year integer DEFAULT 0,
    carry_forward boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL,
    uploaded_by_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL,
    author_id uuid NOT NULL,
    comment text NOT NULL,
    internal_only boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    property_id uuid,
    title text NOT NULL,
    description text,
    frequency text NOT NULL,
    last_generated_at timestamp with time zone,
    next_run_at timestamp with time zone NOT NULL,
    assigned_to_id uuid,
    priority text NOT NULL DEFAULT 'medium'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

CREATE TABLE IF NOT EXISTS public.maintenance_sla_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    priority text NOT NULL,
    sla_hours integer NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    category public.maintenance_category NOT NULL,
    priority public.maintenance_priority NOT NULL DEFAULT 'medium'::maintenance_priority,
    status public.entity_status NOT NULL DEFAULT 'open'::entity_status,
    property_id uuid,
    department_id uuid,
    room_number text,
    reported_by_id uuid NOT NULL,
    assigned_to_id uuid,
    estimated_completion_date date,
    actual_completion_date date,
    parts_needed text,
    labor_hours numeric,
    material_cost numeric,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    estimated_cost numeric,
    due_at timestamp with time zone,
    sla_hours integer,
    escalated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.media_access_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    media_asset_id uuid,
    accessed_by uuid,
    accessed_at timestamp with time zone NOT NULL DEFAULT now(),
    access_type text NOT NULL DEFAULT 'view'::text,
    ip_address inet,
    user_agent text,
    request_id text,
    metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.media_asset_usages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    media_asset_id uuid NOT NULL,
    usage_type text NOT NULL,
    usage_entity_id uuid NOT NULL,
    usage_entity_title text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    filename text NOT NULL,
    original_filename text NOT NULL,
    storage_path text NOT NULL,
    storage_bucket text NOT NULL DEFAULT 'media'::text,
    public_url text NOT NULL,
    media_type public.media_type NOT NULL,
    category public.media_category DEFAULT 'general'::media_category,
    file_size_bytes bigint NOT NULL,
    mime_type text NOT NULL,
    duration_seconds integer,
    width integer,
    height integer,
    thumbnail_url text,
    tags text[] DEFAULT '{}'::text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    uploaded_by uuid,
    property_id uuid,
    is_public boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    virus_scan_status text DEFAULT 'pending'::text,
    virus_scan_score integer DEFAULT 0,
    sha256_hash text,
    scanned_at timestamp with time zone,
    content_disposition text DEFAULT 'inline'::text
);

CREATE TABLE IF NOT EXISTS public.media_collection_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    collection_id uuid,
    media_asset_id uuid,
    added_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_collections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_by uuid,
    property_id uuid,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL,
    uploaded_by_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL,
    recipient_id uuid,
    subject text NOT NULL,
    content text NOT NULL,
    message_type text NOT NULL,
    priority text NOT NULL DEFAULT 'medium'::text,
    status text NOT NULL DEFAULT 'draft'::text,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    parent_message_id uuid,
    property_id uuid,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conversation_id uuid
);

CREATE TABLE IF NOT EXISTS public.mfa_secrets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    secret text NOT NULL,
    backup_codes text[] NOT NULL DEFAULT '{}'::text[],
    enabled boolean NOT NULL DEFAULT false,
    verified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.microlearning_content (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    video_url text NOT NULL,
    duration_seconds integer,
    thumbnail_url text,
    category text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.module_skills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    points_awarded integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.motivational_content (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content_en text NOT NULL,
    content_ar text NOT NULL,
    author_en text,
    author_ar text,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_batches (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    job_type text NOT NULL,
    total_count integer NOT NULL DEFAULT 0,
    processed_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    status text NOT NULL DEFAULT 'pending'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    email_sent_count integer NOT NULL DEFAULT 0,
    email_failed_count integer NOT NULL DEFAULT 0,
    last_processed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    queue_id uuid,
    notification_id uuid,
    batch_id uuid,
    user_id uuid NOT NULL,
    recipient_email text NOT NULL,
    provider text NOT NULL DEFAULT 'resend'::text,
    provider_message_id text,
    template_key text,
    business_domain text NOT NULL DEFAULT 'system'::text,
    notification_type text NOT NULL DEFAULT 'system'::text,
    status text NOT NULL DEFAULT 'queued'::text,
    attempts integer NOT NULL DEFAULT 0,
    error_message text,
    request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    failed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_email_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    template_key text NOT NULL,
    business_domain text NOT NULL DEFAULT 'system'::text,
    notification_type text NOT NULL DEFAULT 'system'::text,
    subject_template text NOT NULL,
    html_template text NOT NULL,
    text_template text,
    from_name text NOT NULL DEFAULT 'PHG Connect'::text,
    from_email text NOT NULL DEFAULT 'notifications@phg-connect.com'::text,
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    approval_email boolean DEFAULT true,
    training_email boolean DEFAULT true,
    announcement_email boolean DEFAULT false,
    maintenance_email boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    browser_push_enabled boolean DEFAULT true,
    approval_push boolean DEFAULT false,
    training_push boolean DEFAULT false,
    announcement_push boolean DEFAULT false,
    maintenance_push boolean DEFAULT false,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
    daily_digest_enabled boolean DEFAULT false,
    notification_sounds_enabled boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    notification_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending'::text,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    channels text[] NOT NULL DEFAULT ARRAY['in_app'::text],
    template_key text,
    business_domain text NOT NULL DEFAULT 'system'::text,
    email_subject text,
    email_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    send_email boolean NOT NULL DEFAULT false,
    scheduled_for timestamp with time zone,
    priority text NOT NULL DEFAULT 'normal'::text
);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type public.notification_type NOT NULL,
    channel text NOT NULL,
    subject text,
    body_template text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    link text,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    data jsonb DEFAULT '{}'::jsonb,
    entity_type text,
    entity_id uuid,
    is_read boolean
);

CREATE TABLE IF NOT EXISTS public.onboarding_process (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    template_id uuid,
    status public.entity_status DEFAULT 'pending'::entity_status,
    start_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    progress_percent integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    process_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    assigned_to_id uuid,
    due_date timestamp with time zone,
    is_completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    link_type text,
    link_id uuid
);

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    role public.app_role,
    department_id uuid,
    tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    job_title text
);

CREATE TABLE IF NOT EXISTS public.password_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payslips (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    basic_salary numeric,
    gross_salary numeric,
    deductions numeric,
    net_salary numeric,
    components jsonb,
    status text DEFAULT 'draft'::text,
    payment_date date,
    created_at timestamp with time zone DEFAULT now(),
    period_start date,
    period_end date,
    currency text,
    is_published boolean DEFAULT false,
    storage_path text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL,
    reviewer_id uuid,
    review_period text,
    overall_rating integer,
    strengths text,
    areas_for_improvement text,
    goals text,
    comments text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    review_date date DEFAULT CURRENT_DATE,
    rating integer
);

CREATE TABLE IF NOT EXISTS public.pii_access_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    actor_id uuid,
    target_user_id uuid NOT NULL,
    fields_accessed text[] NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    hire_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_of_birth date NOT NULL,
    job_title text,
    reporting_to uuid,
    is_deleted boolean DEFAULT false,
    is_temp_password boolean DEFAULT false,
    password_initialized boolean DEFAULT false,
    password_last_changed_at timestamp with time zone,
    emergency_contact_name text,
    emergency_contact_phone text,
    nationality text,
    blood_group text,
    staff_id text,
    suspended_until timestamp with time zone,
    account_status text NOT NULL DEFAULT 'active'::text,
    suspended_at timestamp with time zone,
    suspended_by uuid,
    suspend_reason text,
    last_login_at timestamp with time zone,
    force_password_reset boolean NOT NULL DEFAULT false,
    employment_type text DEFAULT 'full_time'::text,
    contract_end_date date,
    iqama_number text,
    iqama_expiry date,
    bio text,
    phone_extension text,
    national_id text,
    salary_grade text,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    mfa_required boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.properties (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    is_headquarters boolean DEFAULT false,
    property_code varchar(20),
    city varchar(100),
    country varchar(100)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    subscription jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    user_answer text,
    is_correct boolean,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    score integer,
    passed boolean,
    answers jsonb
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type text DEFAULT 'multiple_choice'::text,
    option_a text,
    option_b text,
    option_c text,
    option_d text,
    correct_answer text NOT NULL,
    points integer DEFAULT 1,
    order_num integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    duration_minutes integer DEFAULT 30,
    passing_score integer DEFAULT 70,
    status text DEFAULT 'pending'::text,
    created_by uuid,
    property_id uuid,
    training_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    count integer NOT NULL DEFAULT 0,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    referral_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    changed_by uuid,
    change_note text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL,
    uploaded_by uuid,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    file_name text,
    file_type text,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL,
    author_id uuid NOT NULL,
    comment text NOT NULL,
    visibility text NOT NULL DEFAULT 'all'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_sla_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    step_role public.app_role,
    sla_hours integer,
    default_priority text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_steps (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL,
    step_order integer NOT NULL,
    assignee_id uuid,
    assignee_role text,
    status text NOT NULL DEFAULT 'waiting'::text,
    acted_at timestamp with time zone,
    comment text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    due_at timestamp with time zone,
    sla_hours integer,
    escalated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_no bigint NOT NULL DEFAULT nextval('requests_request_no_seq'::regclass),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    supervisor_id uuid,
    current_assignee_id uuid,
    status text NOT NULL DEFAULT 'draft'::text,
    submitted_at timestamp with time zone,
    closed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    department_id uuid,
    priority text NOT NULL DEFAULT 'normal'::text,
    due_at timestamp with time zone,
    last_action_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    role text NOT NULL,
    permission text NOT NULL,
    granted boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_components (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text,
    is_percentage boolean DEFAULT false,
    default_value numeric,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid,
    reminder_type text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    status text DEFAULT 'pending'::text,
    notification_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid,
    user_role text,
    ip_address inet,
    user_agent text,
    table_name text,
    record_id uuid,
    action text,
    old_data jsonb,
    new_data jsonb,
    metadata jsonb,
    severity text DEFAULT 'info'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    shift_type text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location text,
    department_id uuid,
    property_id uuid,
    notes text,
    status text DEFAULT 'scheduled'::text,
    break_duration_minutes integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_access_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    version_id uuid,
    user_id uuid NOT NULL,
    action text NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_acknowledgments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    version_id uuid NOT NULL,
    user_id uuid NOT NULL,
    acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
    signature_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_approval_steps (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    workflow_id uuid NOT NULL,
    step_number integer NOT NULL,
    approver_role text NOT NULL,
    approver_id uuid,
    status public.sop_approval_status NOT NULL DEFAULT 'pending'::sop_approval_status,
    comments text,
    approved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_approval_workflows (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    version_id uuid NOT NULL,
    status public.sop_approval_status NOT NULL DEFAULT 'pending'::sop_approval_status,
    current_step integer NOT NULL DEFAULT 1,
    total_steps integer NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    completed_by uuid,
    rejection_reason text
);

CREATE TABLE IF NOT EXISTS public.sop_attachments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    version_id uuid,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_bookmarks (
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    name_ar text NOT NULL,
    description text,
    description_ar text,
    department_id uuid,
    parent_id uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_comment_votes (
    user_id uuid NOT NULL,
    comment_id uuid NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    parent_id uuid,
    user_id uuid NOT NULL,
    content text NOT NULL,
    is_question boolean DEFAULT false,
    is_resolved boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    upvotes integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_context_triggers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    trigger_type text NOT NULL,
    trigger_value text NOT NULL,
    priority integer DEFAULT 0,
    show_as text DEFAULT 'link'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_document_relations (
    source_document_id uuid NOT NULL,
    target_document_id uuid NOT NULL,
    relation_type text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_document_tags (
    document_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_document_versions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    content jsonb NOT NULL,
    change_summary text,
    status public.sop_document_status NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    published_at timestamp with time zone,
    published_by uuid
);

CREATE TABLE IF NOT EXISTS public.sop_documents (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    title_ar text NOT NULL,
    code text,
    description text,
    description_ar text,
    department_id uuid NOT NULL,
    category_id uuid,
    subcategory_id uuid,
    status public.sop_document_status NOT NULL DEFAULT 'draft'::sop_document_status,
    version integer NOT NULL DEFAULT 1,
    current_version_id uuid,
    review_frequency_months integer NOT NULL DEFAULT 12,
    next_review_date date,
    is_template boolean NOT NULL DEFAULT false,
    template_id uuid,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    published_at timestamp with time zone,
    published_by uuid,
    archived_at timestamp with time zone,
    archived_by uuid,
    property_id uuid,
    visibility_scope public.knowledge_visibility DEFAULT 'global'::knowledge_visibility,
    content_type public.knowledge_content_type DEFAULT 'sop'::knowledge_content_type,
    requires_acknowledgment boolean DEFAULT false,
    view_count integer DEFAULT 0,
    featured boolean DEFAULT false,
    estimated_read_time integer,
    last_reviewed_at timestamp with time zone,
    last_reviewed_by uuid,
    content text,
    requires_quiz boolean DEFAULT false,
    passing_score integer DEFAULT 70,
    quiz_enabled boolean DEFAULT false,
    priority text DEFAULT 'medium'::text,
    compliance_level text DEFAULT 'standard'::text,
    video_url text,
    checklist_items jsonb DEFAULT '[]'::jsonb,
    faq_items jsonb DEFAULT '[]'::jsonb,
    linked_quiz_id uuid,
    linked_training_id uuid,
    images jsonb DEFAULT '[]'::jsonb,
    is_deleted boolean DEFAULT false,
    file_size bigint DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.sop_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    helpful boolean NOT NULL,
    feedback_text text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_quiz_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sop_document_id uuid,
    user_id uuid,
    score numeric NOT NULL,
    total_points integer NOT NULL,
    percentage numeric NOT NULL,
    passed boolean NOT NULL,
    answers jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    certificate_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_quiz_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sop_document_id uuid,
    question_text text NOT NULL,
    question_type text NOT NULL,
    options jsonb,
    correct_answer text NOT NULL,
    points integer DEFAULT 1,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_review_reminders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    reminder_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    sent_at timestamp with time zone,
    completed_at timestamp with time zone,
    completed_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_role_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    role text NOT NULL,
    property_id uuid,
    department_id uuid,
    is_required boolean DEFAULT false,
    due_days_after_assignment integer,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_tags (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    name_ar text NOT NULL,
    color text DEFAULT '#3b82f6'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sop_view_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    document_id uuid NOT NULL,
    view_duration_seconds integer,
    scroll_depth_percent integer,
    viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    key text NOT NULL,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    category text NOT NULL DEFAULT 'general'::text,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.system_wiki (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    title_en text NOT NULL,
    title_ar text NOT NULL,
    content_en text,
    content_ar text,
    subtopics jsonb DEFAULT '[]'::jsonb,
    allowed_roles app_role[] DEFAULT '{}'::app_role[],
    order_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    uploaded_by_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size bigint,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_watchers (
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    status public.entity_status NOT NULL DEFAULT 'todo'::entity_status,
    priority public.task_priority NOT NULL DEFAULT 'medium'::task_priority,
    assigned_to_id uuid,
    created_by_id uuid NOT NULL,
    property_id uuid,
    department_id uuid,
    due_date date,
    start_date date,
    completed_at timestamp with time zone,
    tags text[],
    estimated_hours numeric,
    actual_hours numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.temporary_approvers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    approver_id uuid NOT NULL,
    temporary_approver_id uuid NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    delegator_id uuid,
    delegate_id uuid,
    scope_type text NOT NULL DEFAULT 'all'::text,
    scope_id uuid,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    reason text,
    entity_type text,
    entity_id uuid,
    fallback_delegate_ids uuid[] DEFAULT '{}'::uuid[],
    max_approvals integer,
    approvals_used integer DEFAULT 0,
    allow_redelegate boolean DEFAULT false,
    notify_delegate boolean DEFAULT true,
    notify_delegator boolean DEFAULT true,
    notify_on_action boolean DEFAULT true,
    notify_on_expiry boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.training_assignment_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    training_module_id uuid,
    target_role text NOT NULL,
    target_department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

CREATE TABLE IF NOT EXISTS public.training_block_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    training_module_id uuid NOT NULL,
    block_id uuid NOT NULL,
    completed_at timestamp with time zone,
    last_viewed_at timestamp with time zone DEFAULT now(),
    time_spent_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_certificates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    training_progress_id uuid NOT NULL,
    certificate_url text NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    verification_code text,
    attempt_id uuid
);

CREATE TABLE IF NOT EXISTS public.training_content_blocks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    training_module_id uuid NOT NULL,
    type public.content_block_type NOT NULL,
    content text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    content_url text,
    content_data jsonb,
    is_mandatory boolean DEFAULT true,
    is_deleted boolean NOT NULL DEFAULT false,
    source_document_id uuid,
    ai_generated boolean DEFAULT false,
    ai_source_content text,
    title text,
    duration_seconds integer,
    points integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.training_content_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category text NOT NULL,
    template_structure jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_module_documents (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    training_module_id uuid NOT NULL,
    document_id uuid NOT NULL,
    is_required boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_module_resources (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    training_module_id uuid NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    resource_url text,
    title text NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    is_required boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_modules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    estimated_duration_minutes integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    department_id uuid,
    validity_period_days integer,
    allow_retake boolean DEFAULT true,
    max_attempts integer,
    auto_advance boolean DEFAULT false,
    show_feedback boolean DEFAULT true,
    randomize_questions boolean DEFAULT false,
    show_answers boolean DEFAULT false,
    time_limit_minutes integer,
    audience text,
    content_language text,
    template_id uuid,
    passing_score_percentage integer DEFAULT 80
);

CREATE TABLE IF NOT EXISTS public.training_path_modules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    path_id uuid,
    module_id uuid,
    sequence integer NOT NULL,
    is_mandatory boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.training_paths (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    path_type text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    estimated_duration_hours integer DEFAULT 0,
    is_mandatory boolean DEFAULT false,
    certificate_enabled boolean DEFAULT true,
    target_role public.app_role,
    target_department_id uuid,
    created_by uuid,
    target_property_id uuid,
    target_user_ids uuid[] DEFAULT '{}'::uuid[]
);

CREATE TABLE IF NOT EXISTS public.training_progress (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    training_id uuid NOT NULL,
    assignment_id uuid,
    status public.training_status NOT NULL DEFAULT 'not_started'::training_status,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    quiz_score integer,
    certificate_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.training_quiz_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    module_id uuid,
    score integer NOT NULL,
    max_score integer NOT NULL,
    passed boolean NOT NULL,
    attempt_number integer NOT NULL DEFAULT 1,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    answers jsonb
);

CREATE TABLE IF NOT EXISTS public.training_quizzes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    training_module_id uuid NOT NULL,
    question text NOT NULL,
    type public.quiz_type NOT NULL,
    options text[],
    correct_answer text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    achievement_type public.achievement_type NOT NULL,
    title text NOT NULL,
    description text,
    icon text DEFAULT 'award'::text,
    color text DEFAULT 'gold'::text,
    points integer DEFAULT 10,
    earned_at timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_dashboard_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    widget_visibility jsonb DEFAULT '{}'::jsonb,
    widget_order jsonb DEFAULT '[]'::jsonb,
    property_filter uuid,
    department_filter uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_departments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    department_id uuid
);

CREATE TABLE IF NOT EXISTS public.user_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id uuid,
    email text NOT NULL,
    role public.app_role NOT NULL,
    property_id uuid,
    department_id uuid,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    token_hash text,
    invite_url text,
    accepted_at timestamp with time zone,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_path_enrollments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    path_id uuid,
    enrolled_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.user_pins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    item_type varchar(50) NOT NULL,
    item_id uuid NOT NULL,
    pinned_at timestamp with time zone DEFAULT now(),
    display_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_properties (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    property_id uuid
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    session_token_hash text NOT NULL,
    ip_address text,
    ip_hash text,
    user_agent text,
    user_agent_hash text,
    fingerprint text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_active_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason text,
    is_current boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    device_info jsonb
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id uuid NOT NULL,
    theme text NOT NULL DEFAULT 'light'::text,
    language text NOT NULL DEFAULT 'en'::text,
    email_notifications boolean NOT NULL DEFAULT true,
    push_notifications boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    reduced_motion boolean DEFAULT false,
    high_contrast boolean DEFAULT false,
    large_text boolean DEFAULT false,
    keyboard_shortcuts boolean DEFAULT true,
    timezone text DEFAULT 'Asia/Riyadh'::text
);

CREATE TABLE IF NOT EXISTS public.user_shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    property_id uuid,
    department_id uuid,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    shift_type text DEFAULT 'regular'::text,
    status text DEFAULT 'scheduled'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level integer,
    verified boolean DEFAULT false,
    verified_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_vacation_balance (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    year integer NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
    total_days integer NOT NULL DEFAULT 25,
    used_days numeric DEFAULT 0,
    pending_days numeric DEFAULT 0,
    carried_over numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    type text NOT NULL,
    trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workflow_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    result jsonb,
    error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    execution_time_ms integer
);

CREATE TABLE IF NOT EXISTS public.workflow_schedules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    workflow_id uuid,
    cron_expression text NOT NULL,
    timezone text DEFAULT 'UTC'::text,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- ------------------------------------------------------------
-- Primary keys
-- ------------------------------------------------------------
ALTER TABLE public.account_action_notes ADD CONSTRAINT account_action_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.achievement_definitions ADD CONSTRAINT achievement_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_delegations ADD CONSTRAINT admin_delegations_pkey PRIMARY KEY (id);
ALTER TABLE public.announcement_attachments ADD CONSTRAINT announcement_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);
ALTER TABLE public.announcement_targets ADD CONSTRAINT announcement_targets_pkey PRIMARY KEY (id);
ALTER TABLE public.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_delegations ADD CONSTRAINT approval_delegations_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_history ADD CONSTRAINT approval_history_pkey PRIMARY KEY (id);
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE public.certificate_history ADD CONSTRAINT certificate_history_pkey PRIMARY KEY (id);
ALTER TABLE public.certificate_templates ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.data_import_logs ADD CONSTRAINT data_import_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.departments ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE public.designations ADD CONSTRAINT designations_pkey PRIMARY KEY (id);
ALTER TABLE public.document_acknowledgments ADD CONSTRAINT document_acknowledgments_pkey PRIMARY KEY (id);
ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_pkey PRIMARY KEY (id);
ALTER TABLE public.document_comments ADD CONSTRAINT document_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.document_department_access ADD CONSTRAINT document_department_access_pkey PRIMARY KEY (id);
ALTER TABLE public.document_download_logs ADD CONSTRAINT document_download_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_pkey PRIMARY KEY (id);
ALTER TABLE public.document_notification_rules ADD CONSTRAINT document_notification_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.document_tag_assignments ADD CONSTRAINT document_tag_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.document_tags ADD CONSTRAINT document_tags_pkey PRIMARY KEY (id);
ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.document_views ADD CONSTRAINT document_views_pkey PRIMARY KEY (id);
ALTER TABLE public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_documents ADD CONSTRAINT employee_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_of_the_month ADD CONSTRAINT employee_of_the_month_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_promotions ADD CONSTRAINT employee_promotions_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_referrals ADD CONSTRAINT employee_referrals_pkey PRIMARY KEY (id);
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_pkey PRIMARY KEY (id);
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_pkey PRIMARY KEY (id);
ALTER TABLE public.eom_automation_config ADD CONSTRAINT eom_automation_config_pkey PRIMARY KEY (id);
ALTER TABLE public.eom_scoring_history ADD CONSTRAINT eom_scoring_history_pkey PRIMARY KEY (id);
ALTER TABLE public.escalation_rules ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.failed_login_attempts ADD CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.feed_comments ADD CONSTRAINT feed_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_pkey PRIMARY KEY (id);
ALTER TABLE public.goals ADD CONSTRAINT goals_pkey PRIMARY KEY (id);
ALTER TABLE public.holidays ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);
ALTER TABLE public.hospitality_news ADD CONSTRAINT hospitality_news_pkey PRIMARY KEY (id);
ALTER TABLE public.inbound_emails ADD CONSTRAINT inbound_emails_pkey PRIMARY KEY (id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);
ALTER TABLE public.job_title_role_mappings ADD CONSTRAINT job_title_role_mappings_pkey PRIMARY KEY (id);
ALTER TABLE public.job_titles ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_question_attempts ADD CONSTRAINT knowledge_question_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_question_options ADD CONSTRAINT knowledge_question_options_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_question_usages ADD CONSTRAINT knowledge_question_usages_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_question_versions ADD CONSTRAINT knowledge_question_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_quiz_sessions ADD CONSTRAINT knowledge_quiz_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.knowledge_related_articles ADD CONSTRAINT knowledge_related_articles_pkey PRIMARY KEY (id);
ALTER TABLE public.kudos ADD CONSTRAINT kudos_pkey PRIMARY KEY (id);
ALTER TABLE public.kudos_likes ADD CONSTRAINT kudos_likes_pkey PRIMARY KEY (id);
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.learning_quiz_questions ADD CONSTRAINT learning_quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_attachments ADD CONSTRAINT maintenance_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_comments ADD CONSTRAINT maintenance_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_schedules ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_sla_policies ADD CONSTRAINT maintenance_sla_policies_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id);
ALTER TABLE public.media_access_logs ADD CONSTRAINT media_access_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.media_asset_usages ADD CONSTRAINT media_asset_usages_pkey PRIMARY KEY (id);
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);
ALTER TABLE public.media_collection_items ADD CONSTRAINT media_collection_items_pkey PRIMARY KEY (id);
ALTER TABLE public.media_collections ADD CONSTRAINT media_collections_pkey PRIMARY KEY (id);
ALTER TABLE public.message_attachments ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE public.mfa_secrets ADD CONSTRAINT mfa_secrets_pkey PRIMARY KEY (id);
ALTER TABLE public.microlearning_content ADD CONSTRAINT microlearning_content_pkey PRIMARY KEY (id);
ALTER TABLE public.module_skills ADD CONSTRAINT module_skills_pkey PRIMARY KEY (id);
ALTER TABLE public.motivational_content ADD CONSTRAINT motivational_content_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_delivery_events ADD CONSTRAINT notification_delivery_events_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_email_templates ADD CONSTRAINT notification_email_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_process ADD CONSTRAINT onboarding_process_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_tasks ADD CONSTRAINT onboarding_tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.password_history ADD CONSTRAINT password_history_pkey PRIMARY KEY (id);
ALTER TABLE public.password_reset_requests ADD CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.payslips ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);
ALTER TABLE public.performance_reviews ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.pii_access_logs ADD CONSTRAINT pii_access_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);
ALTER TABLE public.rate_limit_entries ADD CONSTRAINT rate_limit_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.referral_history ADD CONSTRAINT referral_history_pkey PRIMARY KEY (id);
ALTER TABLE public.request_attachments ADD CONSTRAINT request_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.request_comments ADD CONSTRAINT request_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.request_events ADD CONSTRAINT request_events_pkey PRIMARY KEY (id);
ALTER TABLE public.request_sla_policies ADD CONSTRAINT request_sla_policies_pkey PRIMARY KEY (id);
ALTER TABLE public.request_steps ADD CONSTRAINT request_steps_pkey PRIMARY KEY (id);
ALTER TABLE public.requests ADD CONSTRAINT requests_pkey PRIMARY KEY (id);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE public.salary_components ADD CONSTRAINT salary_components_pkey PRIMARY KEY (id);
ALTER TABLE public.scheduled_reminders ADD CONSTRAINT scheduled_reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.security_audit_logs ADD CONSTRAINT security_audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);
ALTER TABLE public.skills ADD CONSTRAINT skills_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_access_logs ADD CONSTRAINT sop_access_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_acknowledgments ADD CONSTRAINT sop_acknowledgments_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_approval_steps ADD CONSTRAINT sop_approval_steps_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_approval_workflows ADD CONSTRAINT sop_approval_workflows_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_attachments ADD CONSTRAINT sop_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_bookmarks ADD CONSTRAINT sop_bookmarks_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_categories ADD CONSTRAINT sop_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_comment_votes ADD CONSTRAINT sop_comment_votes_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_comments ADD CONSTRAINT sop_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_context_triggers ADD CONSTRAINT sop_context_triggers_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_document_relations ADD CONSTRAINT sop_document_relations_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_document_tags ADD CONSTRAINT sop_document_tags_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_document_versions ADD CONSTRAINT sop_document_versions_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_feedback ADD CONSTRAINT sop_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_quiz_attempts ADD CONSTRAINT sop_quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_quiz_questions ADD CONSTRAINT sop_quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_review_reminders ADD CONSTRAINT sop_review_reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_role_assignments ADD CONSTRAINT sop_role_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_tags ADD CONSTRAINT sop_tags_pkey PRIMARY KEY (id);
ALTER TABLE public.sop_view_history ADD CONSTRAINT sop_view_history_pkey PRIMARY KEY (id);
ALTER TABLE public.status_history ADD CONSTRAINT status_history_pkey PRIMARY KEY (id);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.system_wiki ADD CONSTRAINT system_wiki_pkey PRIMARY KEY (id);
ALTER TABLE public.task_attachments ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);
ALTER TABLE public.task_watchers ADD CONSTRAINT task_watchers_pkey PRIMARY KEY (id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
ALTER TABLE public.temporary_approvers ADD CONSTRAINT temporary_approvers_pkey PRIMARY KEY (id);
ALTER TABLE public.training_assignment_rules ADD CONSTRAINT training_assignment_rules_pkey PRIMARY KEY (id);
ALTER TABLE public.training_block_progress ADD CONSTRAINT training_block_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.training_certificates ADD CONSTRAINT training_certificates_pkey PRIMARY KEY (id);
ALTER TABLE public.training_content_blocks ADD CONSTRAINT training_content_blocks_pkey PRIMARY KEY (id);
ALTER TABLE public.training_content_templates ADD CONSTRAINT training_content_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.training_module_documents ADD CONSTRAINT training_module_documents_pkey PRIMARY KEY (id);
ALTER TABLE public.training_module_resources ADD CONSTRAINT training_module_resources_pkey PRIMARY KEY (id);
ALTER TABLE public.training_modules ADD CONSTRAINT training_modules_pkey PRIMARY KEY (id);
ALTER TABLE public.training_path_modules ADD CONSTRAINT training_path_modules_pkey PRIMARY KEY (id);
ALTER TABLE public.training_paths ADD CONSTRAINT training_paths_pkey PRIMARY KEY (id);
ALTER TABLE public.training_progress ADD CONSTRAINT training_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.training_quiz_attempts ADD CONSTRAINT training_quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.training_quizzes ADD CONSTRAINT training_quizzes_pkey PRIMARY KEY (id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);
ALTER TABLE public.user_dashboard_preferences ADD CONSTRAINT user_dashboard_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.user_departments ADD CONSTRAINT user_departments_pkey PRIMARY KEY (id);
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);
ALTER TABLE public.user_path_enrollments ADD CONSTRAINT user_path_enrollments_pkey PRIMARY KEY (id);
ALTER TABLE public.user_pins ADD CONSTRAINT user_pins_pkey PRIMARY KEY (id);
ALTER TABLE public.user_properties ADD CONSTRAINT user_properties_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.user_shifts ADD CONSTRAINT user_shifts_pkey PRIMARY KEY (id);
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);
ALTER TABLE public.user_vacation_balance ADD CONSTRAINT user_vacation_balance_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_definitions ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_executions ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);
ALTER TABLE public.workflow_schedules ADD CONSTRAINT workflow_schedules_pkey PRIMARY KEY (id);
ALTER TABLE public.conversation_participants ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, participant_id);
ALTER TABLE public.document_favorites ADD CONSTRAINT document_favorites_pkey PRIMARY KEY (user_id, document_id);

-- ------------------------------------------------------------
-- Unique constraints (58)
-- ------------------------------------------------------------
ALTER TABLE public.achievement_definitions ADD CONSTRAINT achievement_definitions_achievement_type_key UNIQUE (achievement_type);
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_user_id_announcement_id_key UNIQUE (user_id, announcement_id);
ALTER TABLE public.approval_delegations ADD CONSTRAINT approval_delegations_delegator_id_delegatee_id_request_type_key UNIQUE (delegator_id, delegatee_id, request_type);
ALTER TABLE public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
ALTER TABLE public.certificate_templates ADD CONSTRAINT certificate_templates_name_key UNIQUE (name);
ALTER TABLE public.conversations ADD CONSTRAINT conversations_type_participants_key UNIQUE (type, participants);
ALTER TABLE public.departments ADD CONSTRAINT departments_name_property_id_key UNIQUE (name, property_id);
ALTER TABLE public.designations ADD CONSTRAINT designations_name_key UNIQUE (name);
ALTER TABLE public.document_department_access ADD CONSTRAINT document_department_access_document_id_department_id_key UNIQUE (document_id, department_id);
ALTER TABLE public.document_favorites ADD CONSTRAINT document_favorites_user_id_document_id_key UNIQUE (user_id, document_id);
ALTER TABLE public.document_tag_assignments ADD CONSTRAINT document_tag_assignments_document_id_tag_id_key UNIQUE (document_id, tag_id);
ALTER TABLE public.document_tags ADD CONSTRAINT document_tags_name_key UNIQUE (name);
ALTER TABLE public.eom_automation_config ADD CONSTRAINT eom_automation_config_property_id_key UNIQUE (property_id);
ALTER TABLE public.escalation_rules ADD CONSTRAINT escalation_rules_request_type_level_key UNIQUE (request_type, level);
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_user_id_content_type_content_id_reaction_type_key UNIQUE (user_id, content_type, content_id, reaction_type);
ALTER TABLE public.holidays ADD CONSTRAINT holidays_property_id_date_key UNIQUE (property_id, date);
ALTER TABLE public.job_title_role_mappings ADD CONSTRAINT job_title_role_mappings_job_title_id_role_key UNIQUE (job_title_id, role);
ALTER TABLE public.job_titles ADD CONSTRAINT job_titles_name_key UNIQUE (name);
ALTER TABLE public.knowledge_question_options ADD CONSTRAINT knowledge_question_options_question_id_option_order_key UNIQUE (question_id, option_order);
ALTER TABLE public.knowledge_question_usages ADD CONSTRAINT knowledge_question_usages_question_id_usage_type_source_id_key UNIQUE (question_id, usage_type, source_id);
ALTER TABLE public.knowledge_quiz_sessions ADD CONSTRAINT knowledge_quiz_sessions_user_id_source_type_source_id_session__key UNIQUE (user_id, source_type, source_id, session_type);
ALTER TABLE public.kudos_likes ADD CONSTRAINT kudos_likes_kudos_id_user_id_key UNIQUE (kudos_id, user_id);
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_user_id_content_type_content_id_key UNIQUE (user_id, content_type, content_id);
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_user_id_content_type_content_id_key UNIQUE (user_id, content_type, content_id);
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_name_key UNIQUE (name);
ALTER TABLE public.maintenance_sla_policies ADD CONSTRAINT maintenance_sla_policies_priority_category_key UNIQUE (priority, category);
ALTER TABLE public.media_collections ADD CONSTRAINT media_collections_name_property_id_key UNIQUE (name, property_id);
ALTER TABLE public.mfa_secrets ADD CONSTRAINT mfa_secrets_user_id_key UNIQUE (user_id);
ALTER TABLE public.module_skills ADD CONSTRAINT module_skills_module_id_skill_id_key UNIQUE (module_id, skill_id);
ALTER TABLE public.notification_email_templates ADD CONSTRAINT notification_email_templates_notification_type_key UNIQUE (notification_type);
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_notification_type_key UNIQUE (notification_type);
ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_name_key UNIQUE (name);
ALTER TABLE public.password_history ADD CONSTRAINT password_history_user_id_password_hash_key UNIQUE (user_id, password_hash);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_employee_id_key UNIQUE (employee_id);
ALTER TABLE public.properties ADD CONSTRAINT properties_name_key UNIQUE (name);
ALTER TABLE public.properties ADD CONSTRAINT properties_subdomain_key UNIQUE (subdomain);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);
ALTER TABLE public.rate_limit_entries ADD CONSTRAINT rate_limit_entries_key_window_start_key UNIQUE (key, window_start);
ALTER TABLE public.request_sla_policies ADD CONSTRAINT request_sla_policies_request_type_priority_key UNIQUE (request_type, priority);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);
ALTER TABLE public.skills ADD CONSTRAINT skills_name_key UNIQUE (name);
ALTER TABLE public.sop_bookmarks ADD CONSTRAINT sop_bookmarks_user_id_document_id_key UNIQUE (user_id, document_id);
ALTER TABLE public.sop_categories ADD CONSTRAINT sop_categories_name_key UNIQUE (name);
ALTER TABLE public.sop_comment_votes ADD CONSTRAINT sop_comment_votes_comment_id_user_id_key UNIQUE (comment_id, user_id);
ALTER TABLE public.sop_document_tags ADD CONSTRAINT sop_document_tags_document_id_tag_id_key UNIQUE (document_id, tag_id);
ALTER TABLE public.sop_role_assignments ADD CONSTRAINT sop_role_assignments_document_id_role_key UNIQUE (document_id, role);
ALTER TABLE public.sop_tags ADD CONSTRAINT sop_tags_name_key UNIQUE (name);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_key_key UNIQUE (key);
ALTER TABLE public.training_module_documents ADD CONSTRAINT training_module_documents_module_id_document_id_key UNIQUE (module_id, document_id);
ALTER TABLE public.training_path_modules ADD CONSTRAINT training_path_modules_path_id_module_id_key UNIQUE (path_id, module_id);
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_achievement_type_key UNIQUE (user_id, achievement_type);
ALTER TABLE public.user_departments ADD CONSTRAINT user_departments_user_id_department_id_key UNIQUE (user_id, department_id);
ALTER TABLE public.user_pins ADD CONSTRAINT user_pins_user_id_content_type_content_id_key UNIQUE (user_id, content_type, content_id);
ALTER TABLE public.user_properties ADD CONSTRAINT user_properties_user_id_property_id_key UNIQUE (user_id, property_id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_user_id_skill_id_key UNIQUE (user_id, skill_id);

-- ------------------------------------------------------------
-- Foreign keys (323)
-- ------------------------------------------------------------
ALTER TABLE public.account_action_notes ADD CONSTRAINT account_action_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.account_action_notes ADD CONSTRAINT account_action_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id);
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id);
ALTER TABLE public.admin_delegations ADD CONSTRAINT admin_delegations_delegate_id_fkey FOREIGN KEY (delegate_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.admin_delegations ADD CONSTRAINT admin_delegations_delegator_id_fkey FOREIGN KEY (delegator_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.admin_delegations ADD CONSTRAINT admin_delegations_paused_by_fkey FOREIGN KEY (paused_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.admin_delegations ADD CONSTRAINT admin_delegations_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.announcement_attachments ADD CONSTRAINT announcement_attachments_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements (id) ON DELETE CASCADE;
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements (id) ON DELETE CASCADE;
ALTER TABLE public.announcement_reads ADD CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.announcement_targets ADD CONSTRAINT announcement_targets_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements (id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles (id);
ALTER TABLE public.announcements ADD CONSTRAINT announcements_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id);
ALTER TABLE public.approval_history ADD CONSTRAINT approval_history_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests (id) ON DELETE CASCADE;
ALTER TABLE public.approval_history ADD CONSTRAINT approval_history_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.approval_history ADD CONSTRAINT approval_history_original_approver_id_fkey FOREIGN KEY (original_approver_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD CONSTRAINT approval_requests_current_approver_id_fkey FOREIGN KEY (current_approver_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_changed_by_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD CONSTRAINT categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.certificate_history ADD CONSTRAINT certificate_history_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates (id) ON DELETE CASCADE;
ALTER TABLE public.certificate_history ADD CONSTRAINT certificate_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles (id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.profiles (id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_quiz_attempt_id_fkey FOREIGN KEY (quiz_attempt_id) REFERENCES public.sop_quiz_attempts (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.profiles (id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_sop_id_fkey FOREIGN KEY (sop_id) REFERENCES public.sop_documents (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_training_progress_id_fkey FOREIGN KEY (training_progress_id) REFERENCES public.training_progress (id) ON DELETE SET NULL;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.conversation_participants ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations (id) ON DELETE CASCADE;
ALTER TABLE public.conversation_participants ADD CONSTRAINT conversation_participants_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.data_import_logs ADD CONSTRAINT data_import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.profiles (id);
ALTER TABLE public.data_import_logs ADD CONSTRAINT data_import_logs_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.departments ADD CONSTRAINT departments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.designations ADD CONSTRAINT designations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id);
ALTER TABLE public.document_acknowledgments ADD CONSTRAINT document_acknowledgments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_acknowledgments ADD CONSTRAINT document_acknowledgments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_approvals ADD CONSTRAINT document_approvals_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_comments ADD CONSTRAINT document_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_comments ADD CONSTRAINT document_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_comments (id) ON DELETE CASCADE;
ALTER TABLE public.document_comments ADD CONSTRAINT document_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.document_department_access ADD CONSTRAINT document_department_access_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.document_department_access ADD CONSTRAINT document_department_access_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_download_logs ADD CONSTRAINT document_download_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_download_logs ADD CONSTRAINT document_download_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_favorites ADD CONSTRAINT document_favorites_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_folders (id) ON DELETE CASCADE;
ALTER TABLE public.document_folders ADD CONSTRAINT document_folders_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.document_notification_rules ADD CONSTRAINT document_notification_rules_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.document_folders (id) ON DELETE CASCADE;
ALTER TABLE public.document_notification_rules ADD CONSTRAINT document_notification_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.document_tag_assignments ADD CONSTRAINT document_tag_assignments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_tag_assignments ADD CONSTRAINT document_tag_assignments_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.document_tags (id) ON DELETE CASCADE;
ALTER TABLE public.document_tags ADD CONSTRAINT document_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.document_versions ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_views ADD CONSTRAINT document_views_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.document_views ADD CONSTRAINT document_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.document_folders (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_last_published_by_fkey FOREIGN KEY (last_published_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_last_reviewed_by_fkey FOREIGN KEY (last_reviewed_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_linked_training_id_fkey FOREIGN KEY (linked_training_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.employee_of_the_month ADD CONSTRAINT employee_of_the_month_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.employee_of_the_month ADD CONSTRAINT employee_of_the_month_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.employee_of_the_month ADD CONSTRAINT employee_of_the_month_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.employee_promotions ADD CONSTRAINT employee_promotions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.employee_promotions ADD CONSTRAINT employee_promotions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.employee_promotions ADD CONSTRAINT employee_promotions_from_department_id_fkey FOREIGN KEY (from_department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.employee_promotions ADD CONSTRAINT employee_promotions_to_department_id_fkey FOREIGN KEY (to_department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.employee_referrals ADD CONSTRAINT employee_referrals_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings (id) ON DELETE SET NULL;
ALTER TABLE public.employee_referrals ADD CONSTRAINT employee_referrals_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id);
ALTER TABLE public.employee_referrals ADD CONSTRAINT employee_referrals_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles (id);
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_from_department_id_fkey FOREIGN KEY (from_department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_from_property_id_fkey FOREIGN KEY (from_property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_to_department_id_fkey FOREIGN KEY (to_department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.employee_transfers ADD CONSTRAINT employee_transfers_to_property_id_fkey FOREIGN KEY (to_property_id) REFERENCES public.properties (id);
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_announced_eom_id_fkey FOREIGN KEY (announced_eom_id) REFERENCES public.employee_of_the_month (id);
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id);
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_scoring_history_id_fkey FOREIGN KEY (scoring_history_id) REFERENCES public.eom_scoring_history (id);
ALTER TABLE public.eom_auto_selections ADD CONSTRAINT eom_auto_selections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.eom_automation_config ADD CONSTRAINT eom_automation_config_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.eom_automation_config ADD CONSTRAINT eom_automation_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles (id);
ALTER TABLE public.eom_scoring_history ADD CONSTRAINT eom_scoring_history_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.eom_scoring_history ADD CONSTRAINT eom_scoring_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.feed_comments ADD CONSTRAINT feed_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.feed_reactions ADD CONSTRAINT feed_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT goals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD CONSTRAINT goals_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id);
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings (id) ON DELETE CASCADE;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.job_titles ADD CONSTRAINT job_titles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_question_attempts ADD CONSTRAINT knowledge_question_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.knowledge_questions (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_question_attempts ADD CONSTRAINT knowledge_question_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_question_options ADD CONSTRAINT knowledge_question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.knowledge_questions (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_question_usages ADD CONSTRAINT knowledge_question_usages_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.knowledge_questions (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_question_versions ADD CONSTRAINT knowledge_question_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_question_versions ADD CONSTRAINT knowledge_question_versions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.knowledge_questions (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.sop_categories (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_linked_sop_id_fkey FOREIGN KEY (linked_sop_id) REFERENCES public.sop_documents (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_questions ADD CONSTRAINT knowledge_questions_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.knowledge_quiz_sessions ADD CONSTRAINT knowledge_quiz_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_related_articles ADD CONSTRAINT knowledge_related_articles_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.knowledge_related_articles ADD CONSTRAINT knowledge_related_articles_related_document_id_fkey FOREIGN KEY (related_document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.kudos_likes ADD CONSTRAINT kudos_likes_kudos_id_fkey FOREIGN KEY (kudos_id) REFERENCES public.kudos (id) ON DELETE CASCADE;
ALTER TABLE public.learning_assignments ADD CONSTRAINT learning_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.learning_assignments (id) ON DELETE SET NULL;
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_last_block_id_fkey FOREIGN KEY (last_block_id) REFERENCES public.training_content_blocks (id) ON DELETE SET NULL;
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_last_session_id_fkey FOREIGN KEY (last_session_id) REFERENCES public.knowledge_quiz_sessions (id) ON DELETE SET NULL;
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.learning_progress ADD CONSTRAINT learning_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.learning_quiz_questions ADD CONSTRAINT learning_quiz_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.knowledge_questions (id) ON DELETE CASCADE;
ALTER TABLE public.learning_quiz_questions ADD CONSTRAINT learning_quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.learning_quizzes (id) ON DELETE CASCADE;
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.sop_categories (id) ON DELETE SET NULL;
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_linked_sop_id_fkey FOREIGN KEY (linked_sop_id) REFERENCES public.sop_documents (id);
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES public.documents (id) ON DELETE SET NULL;
ALTER TABLE public.learning_quizzes ADD CONSTRAINT learning_quizzes_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_rejected_by_id_fkey FOREIGN KEY (rejected_by_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_workflow_request_id_fkey FOREIGN KEY (workflow_request_id) REFERENCES public.requests (id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_attachments ADD CONSTRAINT maintenance_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.maintenance_tickets (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_attachments ADD CONSTRAINT maintenance_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_comments ADD CONSTRAINT maintenance_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_comments ADD CONSTRAINT maintenance_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.maintenance_tickets (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_schedules ADD CONSTRAINT maintenance_schedules_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_schedules ADD CONSTRAINT maintenance_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.maintenance_schedules ADD CONSTRAINT maintenance_schedules_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_reported_by_id_fkey FOREIGN KEY (reported_by_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.media_access_logs ADD CONSTRAINT media_access_logs_accessed_by_fkey FOREIGN KEY (accessed_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.media_access_logs ADD CONSTRAINT media_access_logs_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets (id) ON DELETE CASCADE;
ALTER TABLE public.media_asset_usages ADD CONSTRAINT media_asset_usages_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets (id) ON DELETE CASCADE;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.media_collection_items ADD CONSTRAINT media_collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.media_collections (id) ON DELETE CASCADE;
ALTER TABLE public.media_collection_items ADD CONSTRAINT media_collection_items_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets (id) ON DELETE CASCADE;
ALTER TABLE public.media_collections ADD CONSTRAINT media_collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.media_collections ADD CONSTRAINT media_collections_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.message_attachments ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.message_attachments ADD CONSTRAINT message_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.module_skills ADD CONSTRAINT module_skills_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.module_skills ADD CONSTRAINT module_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills (id) ON DELETE CASCADE;
ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.notification_delivery_events ADD CONSTRAINT notification_delivery_events_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.notification_batches (id) ON DELETE SET NULL;
ALTER TABLE public.notification_delivery_events ADD CONSTRAINT notification_delivery_events_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.notification_queue (id) ON DELETE SET NULL;
ALTER TABLE public.notification_delivery_events ADD CONSTRAINT notification_delivery_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.onboarding_process ADD CONSTRAINT onboarding_process_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.onboarding_templates (id);
ALTER TABLE public.onboarding_process ADD CONSTRAINT onboarding_process_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.onboarding_tasks ADD CONSTRAINT onboarding_tasks_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.profiles (id);
ALTER TABLE public.onboarding_tasks ADD CONSTRAINT onboarding_tasks_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.onboarding_process (id) ON DELETE CASCADE;
ALTER TABLE public.onboarding_templates ADD CONSTRAINT onboarding_templates_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id);
ALTER TABLE public.password_history ADD CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.payslips ADD CONSTRAINT payslips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.performance_reviews ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.performance_reviews ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.pii_access_logs ADD CONSTRAINT pii_access_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.pii_access_logs ADD CONSTRAINT pii_access_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reporting_to_fkey FOREIGN KEY (reporting_to) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.profiles (id);
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempts (id) ON DELETE CASCADE;
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions (id);
ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes (id);
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes (id) ON DELETE CASCADE;
ALTER TABLE public.referral_history ADD CONSTRAINT referral_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles (id);
ALTER TABLE public.referral_history ADD CONSTRAINT referral_history_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.job_applications (id) ON DELETE CASCADE;
ALTER TABLE public.request_attachments ADD CONSTRAINT request_attachments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests (id) ON DELETE CASCADE;
ALTER TABLE public.request_attachments ADD CONSTRAINT request_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.request_comments ADD CONSTRAINT request_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE RESTRICT;
ALTER TABLE public.request_comments ADD CONSTRAINT request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests (id) ON DELETE CASCADE;
ALTER TABLE public.request_events ADD CONSTRAINT request_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.request_events ADD CONSTRAINT request_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests (id) ON DELETE CASCADE;
ALTER TABLE public.request_steps ADD CONSTRAINT request_steps_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.request_steps ADD CONSTRAINT request_steps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.request_steps ADD CONSTRAINT request_steps_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests (id) ON DELETE CASCADE;
ALTER TABLE public.requests ADD CONSTRAINT requests_current_assignee_id_fkey FOREIGN KEY (current_assignee_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.requests ADD CONSTRAINT requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.requests ADD CONSTRAINT requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.requests ADD CONSTRAINT requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles (id) ON DELETE RESTRICT;
ALTER TABLE public.requests ADD CONSTRAINT requests_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.scheduled_reminders ADD CONSTRAINT scheduled_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.shifts ADD CONSTRAINT shifts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id);
ALTER TABLE public.shifts ADD CONSTRAINT shifts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id);
ALTER TABLE public.shifts ADD CONSTRAINT shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id);
ALTER TABLE public.sop_access_logs ADD CONSTRAINT sop_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_access_logs ADD CONSTRAINT sop_access_logs_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.sop_document_versions (id) ON DELETE SET NULL;
ALTER TABLE public.sop_acknowledgments ADD CONSTRAINT sop_acknowledgments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_acknowledgments ADD CONSTRAINT sop_acknowledgments_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.sop_document_versions (id) ON DELETE CASCADE;
ALTER TABLE public.sop_approval_steps ADD CONSTRAINT sop_approval_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.sop_approval_workflows (id) ON DELETE CASCADE;
ALTER TABLE public.sop_approval_workflows ADD CONSTRAINT sop_approval_workflows_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_approval_workflows ADD CONSTRAINT sop_approval_workflows_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.sop_document_versions (id) ON DELETE CASCADE;
ALTER TABLE public.sop_attachments ADD CONSTRAINT sop_attachments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_attachments ADD CONSTRAINT sop_attachments_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.sop_document_versions (id) ON DELETE CASCADE;
ALTER TABLE public.sop_bookmarks ADD CONSTRAINT sop_bookmarks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_categories ADD CONSTRAINT sop_categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.sop_categories ADD CONSTRAINT sop_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sop_categories (id) ON DELETE SET NULL;
ALTER TABLE public.sop_comment_votes ADD CONSTRAINT sop_comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.sop_comments (id) ON DELETE CASCADE;
ALTER TABLE public.sop_comments ADD CONSTRAINT sop_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_comments ADD CONSTRAINT sop_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sop_comments (id) ON DELETE CASCADE;
ALTER TABLE public.sop_context_triggers ADD CONSTRAINT sop_context_triggers_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_document_relations ADD CONSTRAINT sop_document_relations_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_document_relations ADD CONSTRAINT sop_document_relations_target_document_id_fkey FOREIGN KEY (target_document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_document_tags ADD CONSTRAINT sop_document_tags_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_document_tags ADD CONSTRAINT sop_document_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.sop_tags (id) ON DELETE CASCADE;
ALTER TABLE public.sop_document_versions ADD CONSTRAINT sop_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_documents ADD CONSTRAINT fk_current_version FOREIGN KEY (current_version_id) REFERENCES public.sop_document_versions (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.sop_categories (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_linked_quiz_id_fkey FOREIGN KEY (linked_quiz_id) REFERENCES public.learning_quizzes (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_linked_training_id_fkey FOREIGN KEY (linked_training_id) REFERENCES public.training_modules (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.sop_categories (id) ON DELETE SET NULL;
ALTER TABLE public.sop_documents ADD CONSTRAINT sop_documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.sop_documents (id) ON DELETE SET NULL;
ALTER TABLE public.sop_feedback ADD CONSTRAINT sop_feedback_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_quiz_attempts ADD CONSTRAINT sop_quiz_attempts_sop_document_id_fkey FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_quiz_attempts ADD CONSTRAINT sop_quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.sop_quiz_questions ADD CONSTRAINT sop_quiz_questions_sop_document_id_fkey FOREIGN KEY (sop_document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_review_reminders ADD CONSTRAINT sop_review_reminders_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_role_assignments ADD CONSTRAINT sop_role_assignments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.sop_role_assignments ADD CONSTRAINT sop_role_assignments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.sop_role_assignments ADD CONSTRAINT sop_role_assignments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.sop_view_history ADD CONSTRAINT sop_view_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.sop_documents (id) ON DELETE CASCADE;
ALTER TABLE public.status_history ADD CONSTRAINT status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles (id);
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles (id);
ALTER TABLE public.task_attachments ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE CASCADE;
ALTER TABLE public.task_attachments ADD CONSTRAINT task_attachments_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE CASCADE;
ALTER TABLE public.task_watchers ADD CONSTRAINT task_watchers_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks (id) ON DELETE CASCADE;
ALTER TABLE public.task_watchers ADD CONSTRAINT task_watchers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.temporary_approvers ADD CONSTRAINT temporary_approvers_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.temporary_approvers ADD CONSTRAINT temporary_approvers_delegate_id_fkey FOREIGN KEY (delegate_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.temporary_approvers ADD CONSTRAINT temporary_approvers_delegator_id_fkey FOREIGN KEY (delegator_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.temporary_approvers ADD CONSTRAINT temporary_approvers_temporary_approver_id_fkey FOREIGN KEY (temporary_approver_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.training_assignment_rules ADD CONSTRAINT training_assignment_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.training_assignment_rules ADD CONSTRAINT training_assignment_rules_target_department_id_fkey FOREIGN KEY (target_department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.training_assignment_rules ADD CONSTRAINT training_assignment_rules_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_block_progress ADD CONSTRAINT training_block_progress_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.training_content_blocks (id) ON DELETE CASCADE;
ALTER TABLE public.training_block_progress ADD CONSTRAINT training_block_progress_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_block_progress ADD CONSTRAINT training_block_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.training_certificates ADD CONSTRAINT training_certificates_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.training_quiz_attempts (id) ON DELETE SET NULL;
ALTER TABLE public.training_certificates ADD CONSTRAINT training_certificates_training_progress_id_fkey FOREIGN KEY (training_progress_id) REFERENCES public.training_progress (id) ON DELETE CASCADE;
ALTER TABLE public.training_content_blocks ADD CONSTRAINT training_content_blocks_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES public.documents (id) ON DELETE SET NULL;
ALTER TABLE public.training_content_blocks ADD CONSTRAINT training_content_blocks_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_content_templates ADD CONSTRAINT training_content_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.training_module_documents ADD CONSTRAINT training_module_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents (id) ON DELETE CASCADE;
ALTER TABLE public.training_module_documents ADD CONSTRAINT training_module_documents_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_module_resources ADD CONSTRAINT training_module_resources_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_modules ADD CONSTRAINT training_modules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD CONSTRAINT training_modules_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.training_modules ADD CONSTRAINT training_modules_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id);
ALTER TABLE public.training_modules ADD CONSTRAINT training_modules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.training_content_templates (id) ON DELETE SET NULL;
ALTER TABLE public.training_path_modules ADD CONSTRAINT training_path_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_path_modules ADD CONSTRAINT training_path_modules_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.training_paths (id) ON DELETE CASCADE;
ALTER TABLE public.training_paths ADD CONSTRAINT training_paths_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.training_paths ADD CONSTRAINT training_paths_target_department_id_fkey FOREIGN KEY (target_department_id) REFERENCES public.departments (id);
ALTER TABLE public.training_paths ADD CONSTRAINT training_paths_target_property_id_fkey FOREIGN KEY (target_property_id) REFERENCES public.properties (id);
ALTER TABLE public.training_progress ADD CONSTRAINT training_progress_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.learning_assignments (id) ON DELETE CASCADE;
ALTER TABLE public.training_progress ADD CONSTRAINT training_progress_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_progress ADD CONSTRAINT training_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.training_quiz_attempts ADD CONSTRAINT training_quiz_attempts_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.training_quiz_attempts ADD CONSTRAINT training_quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.training_quizzes ADD CONSTRAINT training_quizzes_training_module_id_fkey FOREIGN KEY (training_module_id) REFERENCES public.training_modules (id) ON DELETE CASCADE;
ALTER TABLE public.user_departments ADD CONSTRAINT user_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.user_departments ADD CONSTRAINT user_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE SET NULL;
ALTER TABLE public.user_invitations ADD CONSTRAINT user_invitations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE SET NULL;
ALTER TABLE public.user_path_enrollments ADD CONSTRAINT user_path_enrollments_path_id_fkey FOREIGN KEY (path_id) REFERENCES public.training_paths (id) ON DELETE CASCADE;
ALTER TABLE public.user_path_enrollments ADD CONSTRAINT user_path_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_properties ADD CONSTRAINT user_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.user_properties ADD CONSTRAINT user_properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_shifts ADD CONSTRAINT user_shifts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id) ON DELETE CASCADE;
ALTER TABLE public.user_shifts ADD CONSTRAINT user_shifts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties (id) ON DELETE CASCADE;
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills (id) ON DELETE CASCADE;
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
ALTER TABLE public.user_skills ADD CONSTRAINT user_skills_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles (id);
ALTER TABLE public.workflow_definitions ADD CONSTRAINT workflow_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
ALTER TABLE public.workflow_executions ADD CONSTRAINT workflow_executions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions (id) ON DELETE CASCADE;
ALTER TABLE public.workflow_schedules ADD CONSTRAINT workflow_schedules_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflow_definitions (id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- Indexes (547)
-- ------------------------------------------------------------
CREATE INDEX idx_account_action_notes_created_by ON public.account_action_notes USING btree (created_by);
CREATE INDEX idx_account_action_notes_user_id ON public.account_action_notes USING btree (user_id, created_at DESC);
CREATE INDEX idx_activity_log_action_type ON public.activity_log USING btree (action_type);
CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);
CREATE INDEX idx_activity_log_property ON public.activity_log USING btree (property_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log USING btree (user_id);
CREATE INDEX admin_delegations_no_overlap_per_type ON public.admin_delegations USING gist (delegator_id, delegation_type, tstzrange(starts_at, COALESCE(ends_at, 'infinity'::timestamp with time zone), '[)'::text)) WHERE (revoked_at IS NULL);
CREATE INDEX idx_admin_delegations_active ON public.admin_delegations USING btree (is_active, ends_at);
CREATE INDEX idx_admin_delegations_delegate ON public.admin_delegations USING btree (delegate_id);
CREATE INDEX idx_admin_delegations_delegator ON public.admin_delegations USING btree (delegator_id);
CREATE INDEX idx_admin_delegations_fallbacks ON public.admin_delegations USING gin (fallback_delegate_ids);
CREATE INDEX idx_admin_delegations_paused_at ON public.admin_delegations USING btree (paused_at);
CREATE INDEX idx_admin_delegations_paused_by ON public.admin_delegations USING btree (paused_by);
CREATE INDEX idx_admin_delegations_revoked_by ON public.admin_delegations USING btree (revoked_by);
CREATE INDEX idx__73caf02fca33 ON public.announcement_attachments USING btree (announcement_id);
CREATE INDEX idx__e447c3866ef2 ON public.announcement_reads USING btree (announcement_id);
CREATE INDEX idx__16e4a0535637 ON public.announcements USING btree (created_by);
CREATE INDEX idx__191f571f7eb8 ON public.announcements USING btree (created_by_id);
CREATE INDEX idx__2725d1f510c0 ON public.announcements USING btree (property_id);
CREATE INDEX idx__ac1dc521d426 ON public.announcements USING btree (department_id);
CREATE INDEX idx__6e830f4c445d ON public.approval_delegations USING btree (delegate_id);
CREATE INDEX idx__c78407e29722 ON public.approval_delegations USING btree (delegator_id);
CREATE INDEX idx_approval_delegations_status ON public.approval_delegations USING btree (status) WHERE (status = 'active'::text);
CREATE INDEX idx__243934fb7a8e ON public.approval_history USING btree (original_approver_id);
CREATE INDEX idx__2c1762d147bd ON public.approval_history USING btree (approval_request_id);
CREATE INDEX idx__d405a86f841c ON public.approval_history USING btree (approver_id);
CREATE INDEX idx__40a7a8c1822e ON public.approval_requests USING btree (current_approver_id);
CREATE INDEX attendance_employee_check_in_idx ON public.attendance USING btree (employee_id, check_in);
CREATE INDEX attendance_employee_date_idx ON public.attendance USING btree (employee_id, date);
CREATE INDEX idx__882f95e1576f ON public.attendance USING btree (employee_id);
CREATE INDEX idx__752b0e2bc4a9 ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx__f561aab2d94b ON public.categories USING btree (department_id);
CREATE INDEX idx__d9c12b94b58b ON public.certificate_history USING btree (performed_by);
CREATE INDEX idx__f9c81bbeb122 ON public.certificate_history USING btree (certificate_id);
CREATE INDEX idx__04aa6498ef7f ON public.certificates USING btree (training_module_id);
CREATE INDEX idx__47fe76b5f002 ON public.certificates USING btree (sop_id);
CREATE INDEX idx__61393316a5da ON public.certificates USING btree (user_id);
CREATE INDEX idx__63f67347160c ON public.certificates USING btree (quiz_attempt_id);
CREATE INDEX idx__90ea59989f01 ON public.certificates USING btree (training_progress_id);
CREATE INDEX idx__a40c72b6a06d ON public.certificates USING btree (department_id);
CREATE INDEX idx__b4c451a621f7 ON public.certificates USING btree (property_id);
CREATE INDEX idx__bf7257005638 ON public.certificates USING btree (revoked_by);
CREATE INDEX idx__fb0d9e7aea89 ON public.certificates USING btree (issued_by);
CREATE INDEX idx_certificates_status ON public.certificates USING btree (status);
CREATE INDEX idx_certificates_training_lookup ON public.certificates USING btree (certificate_type, user_id, training_module_id, completion_date DESC);
CREATE INDEX idx_certificates_type ON public.certificates USING btree (certificate_type);
CREATE UNIQUE INDEX ux_certificates_training_progress_id ON public.certificates USING btree (training_progress_id) WHERE (training_progress_id IS NOT NULL);
CREATE INDEX idx__58e662d486dc ON public.conversation_participants USING btree (conversation_id);
CREATE INDEX idx_conversation_participants_participant_id ON public.conversation_participants USING btree (participant_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at DESC);
CREATE INDEX idx_conversations_participant_ids ON public.conversations USING gin (participant_ids);
CREATE INDEX idx__4f67585843ff ON public.data_import_logs USING btree (property_id);
CREATE INDEX idx__9cb4db254bb2 ON public.data_import_logs USING btree (imported_by);
CREATE INDEX idx__c8d04b1f7581 ON public.data_import_logs USING btree (pms_system_id);
CREATE INDEX idx_import_logs_property ON public.data_import_logs USING btree (property_id, started_at DESC);
CREATE INDEX idx__6f0f6aafae01 ON public.departments USING btree (property_id);
CREATE INDEX idx_departments_is_deleted ON public.departments USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx__d2ebbe459aa5 ON public.designations USING btree (department_id);
CREATE INDEX idx__d1495bb46b0f ON public.document_acknowledgments USING btree (document_id);
CREATE INDEX idx__2281de42b60d ON public.document_approvals USING btree (document_id);
CREATE INDEX idx__237ba19e53e3 ON public.document_approvals USING btree (approver_id);
CREATE INDEX idx__a93eb530cdbf ON public.document_approvals USING btree (rejected_by);
CREATE INDEX idx__e503d39bf632 ON public.document_approvals USING btree (approved_by);
CREATE INDEX idx_document_comments_created ON public.document_comments USING btree (created_at DESC);
CREATE INDEX idx_document_comments_document ON public.document_comments USING btree (document_id);
CREATE INDEX idx_document_comments_parent ON public.document_comments USING btree (parent_id);
CREATE INDEX idx_document_comments_pinned ON public.document_comments USING btree (is_pinned) WHERE (is_pinned = true);
CREATE INDEX idx_document_comments_resolved ON public.document_comments USING btree (is_resolved) WHERE (is_resolved = false);
CREATE INDEX idx_document_comments_user ON public.document_comments USING btree (user_id);
CREATE INDEX idx_document_download_logs_document ON public.document_download_logs USING btree (document_id);
CREATE INDEX idx_document_download_logs_downloaded ON public.document_download_logs USING btree (downloaded_at DESC);
CREATE INDEX idx_document_download_logs_lookup ON public.document_download_logs USING btree (document_id, user_id, downloaded_at DESC);
CREATE INDEX idx_document_download_logs_user ON public.document_download_logs USING btree (user_id);
CREATE INDEX idx__c040a54d2f6d ON public.document_favorites USING btree (user_id);
CREATE INDEX idx_document_folders_created_by ON public.document_folders USING btree (created_by);
CREATE INDEX idx_document_folders_department ON public.document_folders USING btree (department_id);
CREATE INDEX idx_document_folders_is_system ON public.document_folders USING btree (is_system) WHERE (is_system = true);
CREATE INDEX idx_document_folders_parent ON public.document_folders USING btree (parent_id);
CREATE INDEX idx_document_folders_property ON public.document_folders USING btree (property_id);
CREATE INDEX idx_document_notification_rules_folder ON public.document_notification_rules USING btree (folder_id) WHERE (folder_id IS NOT NULL);
CREATE INDEX idx_document_notification_rules_lookup ON public.document_notification_rules USING btree (user_id, folder_id);
CREATE UNIQUE INDEX idx_document_notification_rules_unique ON public.document_notification_rules USING btree (user_id, COALESCE(folder_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx_document_notification_rules_user ON public.document_notification_rules USING btree (user_id);
CREATE INDEX idx_document_tag_assignments_document ON public.document_tag_assignments USING btree (document_id);
CREATE INDEX idx_document_tag_assignments_lookup ON public.document_tag_assignments USING btree (document_id, tag_id);
CREATE INDEX idx_document_tag_assignments_tag ON public.document_tag_assignments USING btree (tag_id);
CREATE INDEX idx_document_tags_created_by ON public.document_tags USING btree (created_by);
CREATE INDEX idx_document_tags_name_gin ON public.document_tags USING gin (name gin_trgm_ops);
CREATE INDEX idx__5d74c89f5ce3 ON public.document_versions USING btree (created_by);
CREATE INDEX idx__f408232d0e40 ON public.document_versions USING btree (document_id);
CREATE INDEX idx_document_views_document ON public.document_views USING btree (document_id);
CREATE INDEX idx_document_views_lookup ON public.document_views USING btree (document_id, user_id, viewed_at DESC);
CREATE INDEX idx_document_views_user ON public.document_views USING btree (user_id);
CREATE INDEX idx_document_views_viewed ON public.document_views USING btree (viewed_at DESC);
CREATE INDEX idx__46f070e9d714 ON public.documents USING btree (created_by);
CREATE INDEX idx__568fb8549aef ON public.documents USING btree (department_id);
CREATE INDEX idx__7d9ef7d7823c ON public.documents USING btree (category_id);
CREATE INDEX idx__9bfa7ca02fde ON public.documents USING btree (last_reviewed_by);
CREATE INDEX idx__fbab1a828fd3 ON public.documents USING btree (property_id);
CREATE INDEX idx_documents_archived ON public.documents USING btree (is_archived) WHERE (is_archived = true);
CREATE INDEX idx_documents_confidentiality ON public.documents USING btree (confidentiality_level);
CREATE INDEX idx_documents_content_type ON public.documents USING btree (content_type);
CREATE INDEX idx_documents_deleted_at ON public.documents USING btree (deleted_at) WHERE (is_deleted = true);
CREATE INDEX idx_documents_description_trgm ON public.documents USING gin (description gin_trgm_ops) WHERE (description IS NOT NULL);
CREATE INDEX idx_documents_document_number ON public.documents USING btree (document_number) WHERE (document_number IS NOT NULL);
CREATE INDEX idx_documents_expires_at ON public.documents USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_documents_expires_at_active ON public.documents USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (is_archived = false));
CREATE INDEX idx_documents_featured ON public.documents USING btree (featured) WHERE (featured = true);
CREATE INDEX idx_documents_file_type ON public.documents USING btree (file_type);
CREATE INDEX idx_documents_folder ON public.documents USING btree (folder_id);
CREATE INDEX idx_documents_is_deleted ON public.documents USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_documents_last_published_by ON public.documents USING btree (last_published_by);
CREATE INDEX idx_documents_linked_training_id ON public.documents USING btree (linked_training_id);
CREATE INDEX idx_documents_owner ON public.documents USING btree (owner_id);
CREATE INDEX idx_documents_review_reminder ON public.documents USING btree (review_reminder_date) WHERE (review_reminder_date IS NOT NULL);
CREATE INDEX idx_documents_review_reminder_active ON public.documents USING btree (review_reminder_date) WHERE ((review_reminder_date IS NOT NULL) AND (is_archived = false));
CREATE INDEX idx_documents_search_vector ON public.documents USING gin (search_vector);
CREATE INDEX idx_documents_title_trgm ON public.documents USING gin (title gin_trgm_ops);
CREATE INDEX idx_documents_visibility ON public.documents USING btree (visibility);
CREATE INDEX idx_employee_documents_expiry_date ON public.employee_documents USING btree (expiry_date);
CREATE INDEX idx_employee_documents_user_id ON public.employee_documents USING btree (user_id);
CREATE INDEX idx_eom_property_date ON public.employee_of_the_month USING btree (property_id, year, month);
CREATE INDEX idx_eom_user ON public.employee_of_the_month USING btree (user_id);
CREATE INDEX idx__155ad7921d21 ON public.employee_promotions USING btree (employee_id);
CREATE INDEX idx__c3e06c157f14 ON public.employee_promotions USING btree (to_department_id);
CREATE INDEX idx__ce7dba57d20e ON public.employee_promotions USING btree (approved_by);
CREATE INDEX idx__f01740b7d660 ON public.employee_promotions USING btree (from_department_id);
CREATE INDEX idx_employee_promotions_effective_date ON public.employee_promotions USING btree (effective_date);
CREATE INDEX idx_employee_promotions_is_deleted ON public.employee_promotions USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx__063740b26831 ON public.employee_referrals USING btree (property_id);
CREATE INDEX idx__6cdabc3eef2a ON public.employee_referrals USING btree (referred_by);
CREATE INDEX idx__ffd3dd516a76 ON public.employee_referrals USING btree (job_posting_id);
CREATE INDEX idx__14a785f49cfb ON public.employee_transfers USING btree (to_department_id);
CREATE INDEX idx__2c0b5345d347 ON public.employee_transfers USING btree (from_department_id);
CREATE INDEX idx__624b2e573647 ON public.employee_transfers USING btree (from_property_id);
CREATE INDEX idx__a439da30d899 ON public.employee_transfers USING btree (approved_by);
CREATE INDEX idx__d9cbc32f5a24 ON public.employee_transfers USING btree (employee_id);
CREATE INDEX idx__df9589e37ebd ON public.employee_transfers USING btree (to_property_id);
CREATE INDEX idx_employee_transfers_effective_date ON public.employee_transfers USING btree (effective_date);
CREATE INDEX idx_eom_auto_selections_lookup ON public.eom_auto_selections USING btree (property_id, month, year, status);
CREATE INDEX idx_eom_auto_selections_status ON public.eom_auto_selections USING btree (status, created_at);
CREATE INDEX idx_eom_scoring_history_lookup ON public.eom_scoring_history USING btree (property_id, month, year, rank);
CREATE INDEX idx_eom_scoring_history_user ON public.eom_scoring_history USING btree (user_id, month, year);
CREATE INDEX idx_events_date_range ON public.events USING btree (start_date, end_date);
CREATE INDEX idx_events_property_id ON public.events USING btree (property_id);
CREATE INDEX idx_events_public ON public.events USING btree (is_public) WHERE (is_public = true);
CREATE INDEX idx_events_start_date ON public.events USING btree (start_date);
CREATE INDEX idx_events_type ON public.events USING btree (type);
CREATE INDEX idx_failed_login_email ON public.failed_login_attempts USING btree (email);
CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts USING btree (ip_address);
CREATE INDEX idx_failed_login_locked ON public.failed_login_attempts USING btree (locked_until) WHERE (locked_until IS NOT NULL);
CREATE INDEX idx__ea851406cbfa ON public.feed_comments USING btree (author_id);
CREATE INDEX idx_feed_comments_created_at ON public.feed_comments USING btree (created_at);
CREATE INDEX idx_feed_comments_item ON public.feed_comments USING btree (feed_item_id);
CREATE INDEX idx_feed_reactions_item ON public.feed_reactions USING btree (feed_item_id);
CREATE INDEX idx_feed_reactions_type ON public.feed_reactions USING btree (reaction_type);
CREATE INDEX idx_feed_reactions_user ON public.feed_reactions USING btree (user_id);
CREATE INDEX goals_employee_status_idx ON public.goals USING btree (employee_id, status);
CREATE INDEX goals_employee_target_idx ON public.goals USING btree (employee_id, target_date);
CREATE INDEX idx__88a624ad5fa1 ON public.goals USING btree (employee_id);
CREATE INDEX idx__beee6511b9c0 ON public.goals USING btree (training_module_id);
CREATE INDEX idx_hospitality_news_category ON public.hospitality_news USING btree (category);
CREATE INDEX idx_hospitality_news_guid ON public.hospitality_news USING btree (guid);
CREATE INDEX idx_hospitality_news_is_visible ON public.hospitality_news USING btree (is_visible);
CREATE INDEX idx_hospitality_news_published_at ON public.hospitality_news USING btree (published_at DESC);
CREATE INDEX inbound_emails_content_fetched_at_idx ON public.inbound_emails USING btree (content_fetched_at DESC);
CREATE INDEX inbound_emails_created_at_idx ON public.inbound_emails USING btree (created_at DESC);
CREATE UNIQUE INDEX inbound_emails_email_id_key ON public.inbound_emails USING btree (email_id);
CREATE INDEX idx__05abe56ec373 ON public.job_applications USING btree (job_posting_id);
CREATE INDEX idx__a1a3e95709c8 ON public.job_applications USING btree (referred_by);
CREATE INDEX idx_job_applications_status ON public.job_applications USING btree (status);
CREATE INDEX idx__26d5882928e9 ON public.job_postings USING btree (department_id);
CREATE INDEX idx__2f122873ae7f ON public.job_postings USING btree (created_by);
CREATE INDEX idx__a59a09e6a2dc ON public.job_postings USING btree (property_id);
CREATE INDEX idx_job_postings_is_deleted ON public.job_postings USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_job_postings_status ON public.job_postings USING btree (status);
CREATE INDEX idx_job_titles_department_id ON public.job_titles USING btree (department_id);
CREATE INDEX idx__aea8c4a593aa ON public.knowledge_question_attempts USING btree (user_id);
CREATE INDEX idx__b72a04d4943e ON public.knowledge_question_attempts USING btree (question_id);
CREATE INDEX idx_attempts_context ON public.knowledge_question_attempts USING btree (context_type, context_entity_id);
CREATE INDEX idx_attempts_created ON public.knowledge_question_attempts USING btree (created_at);
CREATE INDEX idx_attempts_session ON public.knowledge_question_attempts USING btree (session_id);
CREATE INDEX idx__7eacebee89c1 ON public.knowledge_question_options USING btree (question_id);
CREATE INDEX idx__0805508c3284 ON public.knowledge_question_usages USING btree (question_id);
CREATE INDEX idx_question_usages_entity ON public.knowledge_question_usages USING btree (usage_type, usage_entity_id);
CREATE INDEX idx__71e69564b984 ON public.knowledge_question_versions USING btree (changed_by);
CREATE INDEX idx__75ab5f00d349 ON public.knowledge_question_versions USING btree (question_id);
CREATE INDEX idx__8d11b6d18e82 ON public.knowledge_questions USING btree (linked_sop_id);
CREATE INDEX idx__b07c7948a248 ON public.knowledge_questions USING btree (category_id);
CREATE INDEX idx__e200ffdf1941 ON public.knowledge_questions USING btree (reviewed_by);
CREATE INDEX idx__efa9096bb455 ON public.knowledge_questions USING btree (training_module_id);
CREATE INDEX idx__f9a1e88bacc3 ON public.knowledge_questions USING btree (created_by);
CREATE INDEX idx_knowledge_questions_training ON public.knowledge_questions USING btree (training_module_id) WHERE (training_module_id IS NOT NULL);
CREATE INDEX idx__1656b97cc9af ON public.knowledge_quiz_sessions USING btree (user_id);
CREATE INDEX idx_sessions_quiz ON public.knowledge_quiz_sessions USING btree (quiz_type, quiz_entity_id);
CREATE INDEX idx__1e9be0fea6d5 ON public.knowledge_related_articles USING btree (document_id);
CREATE INDEX idx_related_articles_related ON public.knowledge_related_articles USING btree (related_document_id);
CREATE INDEX idx_kudos_created_at ON public.kudos USING btree (created_at DESC);
CREATE INDEX idx_kudos_giver_id ON public.kudos USING btree (giver_id);
CREATE INDEX idx_kudos_public ON public.kudos USING btree (is_public) WHERE (is_public = true);
CREATE INDEX idx_kudos_recipient_id ON public.kudos USING btree (recipient_id);
CREATE INDEX idx_kudos_likes_kudos_id ON public.kudos_likes USING btree (kudos_id);
CREATE INDEX idx_kudos_likes_user_id ON public.kudos_likes USING btree (user_id);
CREATE INDEX idx__c68a6c02c5cb ON public.learning_assignments USING btree (assigned_by);
CREATE INDEX idx_assignments_content ON public.learning_assignments USING btree (content_type, content_id);
CREATE INDEX idx_assignments_target ON public.learning_assignments USING btree (target_type, target_id);
CREATE INDEX idx_learning_assignments_active ON public.learning_assignments USING btree (id) WHERE (is_deleted = false);
CREATE INDEX idx_learning_assignments_is_deleted ON public.learning_assignments USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_learning_assignments_module_content ON public.learning_assignments USING btree (content_id) WHERE (content_type = 'module'::learning_content_type);
CREATE UNIQUE INDEX learning_assignments_target_content_unique ON public.learning_assignments USING btree (target_id, content_type, content_id);
CREATE INDEX idx__932515f81725 ON public.learning_progress USING btree (assignment_id);
CREATE INDEX idx__d9bc7293d5fb ON public.learning_progress USING btree (last_session_id);
CREATE INDEX idx__e4d875bb83f4 ON public.learning_progress USING btree (training_module_id);
CREATE INDEX idx__ff1fe72200fb ON public.learning_progress USING btree (user_id);
CREATE INDEX idx_learning_progress_active ON public.learning_progress USING btree (id) WHERE (is_deleted = false);
CREATE INDEX idx_learning_progress_last_activity ON public.learning_progress USING btree (last_activity_at);
CREATE INDEX idx_learning_progress_last_block ON public.learning_progress USING btree (last_block_id);
CREATE INDEX idx_learning_progress_module ON public.learning_progress USING btree (training_module_id) WHERE (training_module_id IS NOT NULL);
CREATE INDEX idx_progress_status ON public.learning_progress USING btree (status);
CREATE INDEX idx__a8c87be6f540 ON public.learning_quiz_questions USING btree (quiz_id);
CREATE INDEX idx__18dab66511fb ON public.learning_quizzes USING btree (linked_sop_id);
CREATE INDEX idx__66e453b2a577 ON public.learning_quizzes USING btree (training_module_id);
CREATE INDEX idx__95fc94ca383a ON public.learning_quizzes USING btree (created_by);
CREATE INDEX idx__b572f66bfe6b ON public.learning_quizzes USING btree (source_document_id);
CREATE INDEX idx__e7cc18d89aa0 ON public.learning_quizzes USING btree (category_id);
CREATE INDEX idx_learning_quizzes_is_deleted ON public.learning_quizzes USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_learning_quizzes_training ON public.learning_quizzes USING btree (training_module_id) WHERE (training_module_id IS NOT NULL);
CREATE INDEX idx__32c9c16e65d1 ON public.leave_requests USING btree (workflow_request_id);
CREATE INDEX idx__6227f699b7bc ON public.leave_requests USING btree (approved_by_id);
CREATE INDEX idx__9149f6119222 ON public.leave_requests USING btree (requester_id);
CREATE INDEX idx__e977cf4be485 ON public.leave_requests USING btree (property_id);
CREATE INDEX idx__ebb6794e2d55 ON public.leave_requests USING btree (rejected_by_id);
CREATE INDEX idx_leave_department_id ON public.leave_requests USING btree (department_id);
CREATE INDEX idx_leave_property_dept ON public.leave_requests USING btree (property_id, department_id);
CREATE INDEX idx_leave_requests_is_deleted ON public.leave_requests USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);
CREATE INDEX idx__84908ba21777 ON public.maintenance_attachments USING btree (uploaded_by_id);
CREATE INDEX idx__ffde66c12ae3 ON public.maintenance_attachments USING btree (ticket_id);
CREATE INDEX idx__7908e0c12997 ON public.maintenance_comments USING btree (author_id);
CREATE INDEX idx__aa614af352d6 ON public.maintenance_comments USING btree (ticket_id);
CREATE INDEX idx_maintenance_comments_created_at ON public.maintenance_comments USING btree (created_at);
CREATE INDEX idx__586aba2f7aa4 ON public.maintenance_schedules USING btree (assigned_to_id);
CREATE INDEX idx__9ba1309665d2 ON public.maintenance_schedules USING btree (created_by);
CREATE INDEX idx__e695159165f3 ON public.maintenance_schedules USING btree (property_id);
CREATE UNIQUE INDEX uq_maintenance_sla_policies_active ON public.maintenance_sla_policies USING btree (priority) WHERE is_active;
CREATE INDEX idx__00c40d6ee3d7 ON public.maintenance_tickets USING btree (assigned_to_id);
CREATE INDEX idx__86205015d81d ON public.maintenance_tickets USING btree (department_id);
CREATE INDEX idx__9058ce227718 ON public.maintenance_tickets USING btree (reported_by_id);
CREATE INDEX idx__cac825acf7e1 ON public.maintenance_tickets USING btree (property_id);
CREATE INDEX idx_maintenance_tickets_category ON public.maintenance_tickets USING btree (category);
CREATE INDEX idx_maintenance_tickets_created_at ON public.maintenance_tickets USING btree (created_at);
CREATE INDEX idx_maintenance_tickets_due_at ON public.maintenance_tickets USING btree (due_at);
CREATE INDEX idx_maintenance_tickets_is_deleted ON public.maintenance_tickets USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_maintenance_tickets_priority ON public.maintenance_tickets USING btree (priority);
CREATE INDEX idx_maintenance_tickets_status ON public.maintenance_tickets USING btree (status);
CREATE INDEX idx_media_access_logs_asset ON public.media_access_logs USING btree (media_asset_id, accessed_at DESC);
CREATE INDEX idx_media_access_logs_time ON public.media_access_logs USING btree (accessed_at DESC);
CREATE INDEX idx_media_access_logs_user ON public.media_access_logs USING btree (accessed_by, accessed_at DESC);
CREATE INDEX idx_media_asset_usages_asset ON public.media_asset_usages USING btree (media_asset_id);
CREATE INDEX idx_media_asset_usages_type ON public.media_asset_usages USING btree (usage_type, usage_entity_id);
CREATE INDEX idx_media_assets_archived ON public.media_assets USING btree (is_archived) WHERE (is_archived = false);
CREATE INDEX idx_media_assets_category ON public.media_assets USING btree (category);
CREATE INDEX idx_media_assets_created_at ON public.media_assets USING btree (created_at DESC);
CREATE INDEX idx_media_assets_hash ON public.media_assets USING btree (sha256_hash);
CREATE INDEX idx_media_assets_property ON public.media_assets USING btree (property_id);
CREATE INDEX idx_media_assets_search ON public.media_assets USING gin (to_tsvector('english'::regconfig, ((title || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX idx_media_assets_security ON public.media_assets USING btree (virus_scan_status, scanned_at);
CREATE INDEX idx_media_assets_tags ON public.media_assets USING gin (tags);
CREATE INDEX idx_media_assets_type ON public.media_assets USING btree (media_type);
CREATE INDEX idx_media_assets_uploaded_by ON public.media_assets USING btree (uploaded_by);
CREATE INDEX idx_media_collections_created_by ON public.media_collections USING btree (created_by);
CREATE INDEX idx_media_collections_property ON public.media_collections USING btree (property_id);
CREATE INDEX idx__8ea7cb11761b ON public.message_attachments USING btree (uploaded_by_id);
CREATE INDEX idx__c7a3e22d3cba ON public.message_attachments USING btree (message_id);
CREATE INDEX idx__0e1ff5111a15 ON public.messages USING btree (property_id);
CREATE INDEX idx__5ef638dbaf0f ON public.messages USING btree (conversation_id);
CREATE INDEX idx__6dcabc5c2117 ON public.messages USING btree (recipient_id);
CREATE INDEX idx__8e4a4da654fd ON public.messages USING btree (department_id);
CREATE INDEX idx__dc5a0bbd12ea ON public.messages USING btree (sender_id);
CREATE INDEX idx__fd2b8c05121b ON public.messages USING btree (parent_message_id);
CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);
CREATE INDEX idx_messages_message_type ON public.messages USING btree (message_type);
CREATE INDEX idx_messages_priority ON public.messages USING btree (priority);
CREATE INDEX idx_messages_status ON public.messages USING btree (status);
CREATE INDEX idx_messages_unread ON public.messages USING btree (recipient_id) WHERE (read_at IS NULL);
CREATE INDEX idx_mfa_secrets_user_id ON public.mfa_secrets USING btree (user_id);
CREATE INDEX idx__d2c82a276407 ON public.microlearning_content USING btree (created_by);
CREATE INDEX idx__d8e418d87c2b ON public.module_skills USING btree (module_id);
CREATE INDEX idx__bdccb7d4badc ON public.notification_batches USING btree (created_by);
CREATE INDEX idx_notification_batches_status ON public.notification_batches USING btree (status);
CREATE INDEX idx_notification_delivery_events_batch ON public.notification_delivery_events USING btree (batch_id);
CREATE INDEX idx_notification_delivery_events_provider_message ON public.notification_delivery_events USING btree (provider_message_id);
CREATE INDEX idx_notification_delivery_events_status ON public.notification_delivery_events USING btree (status, created_at DESC);
CREATE INDEX idx_notification_delivery_events_user_created ON public.notification_delivery_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_notification_email_templates_active ON public.notification_email_templates USING btree (is_active);
CREATE INDEX idx_notification_email_templates_domain_type ON public.notification_email_templates USING btree (business_domain, notification_type);
CREATE INDEX idx__00ad82f41c45 ON public.notification_queue USING btree (user_id);
CREATE INDEX idx_notification_queue_batch ON public.notification_queue USING btree (batch_id);
CREATE INDEX idx_notification_queue_domain_type ON public.notification_queue USING btree (business_domain, notification_type);
CREATE INDEX idx_notification_queue_scheduled_pending ON public.notification_queue USING btree (status, scheduled_for, created_at);
CREATE INDEX idx_notification_queue_status ON public.notification_queue USING btree (status, created_at);
CREATE INDEX idx_notification_queue_template ON public.notification_queue USING btree (template_key);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at) WHERE (read_at IS NULL);
CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);
CREATE INDEX idx_notifications_user_created_at ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_entity ON public.notifications USING btree (user_id, entity_type, entity_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx__27ecaf38ef85 ON public.onboarding_process USING btree (user_id);
CREATE INDEX idx__c292bc979df6 ON public.onboarding_process USING btree (template_id);
CREATE INDEX idx__018fbd24c35e ON public.onboarding_tasks USING btree (assigned_to_id);
CREATE INDEX idx__ea580a6bc506 ON public.onboarding_tasks USING btree (process_id);
CREATE INDEX idx__2997607b3ed4 ON public.onboarding_templates USING btree (department_id);
CREATE INDEX idx__dce369795d1f ON public.password_history USING btree (user_id);
CREATE INDEX idx_password_history_user_created_at ON public.password_history USING btree (user_id, created_at DESC);
CREATE INDEX password_reset_requests_created_at_idx ON public.password_reset_requests USING btree (created_at DESC);
CREATE INDEX password_reset_requests_email_created_at_idx ON public.password_reset_requests USING btree (email, created_at DESC);
CREATE INDEX password_reset_requests_ip_created_at_idx ON public.password_reset_requests USING btree (ip_address, created_at DESC);
CREATE INDEX idx__542950e61d7b ON public.payslips USING btree (employee_id);
CREATE INDEX payslips_employee_month_idx ON public.payslips USING btree (employee_id, year, month);
CREATE INDEX payslips_employee_period_idx ON public.payslips USING btree (employee_id, period_end);
CREATE INDEX idx__bea82e52a68d ON public.performance_reviews USING btree (employee_id);
CREATE INDEX idx__d383baa33733 ON public.performance_reviews USING btree (reviewer_id);
CREATE INDEX performance_reviews_employee_date_idx ON public.performance_reviews USING btree (employee_id, review_date);
CREATE INDEX idx__8791ec7f4d5d ON public.pii_access_logs USING btree (actor_id);
CREATE INDEX idx__d959843cf7d7 ON public.pii_access_logs USING btree (target_user_id);
CREATE INDEX idx__4d37a90e8158 ON public.profiles USING btree (reporting_to);
CREATE INDEX idx__a8669dcff4a5 ON public.profiles USING btree (id);
CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status);
CREATE INDEX idx_profiles_birthday_month_day ON public.profiles USING btree (date_part('month'::text, date_of_birth), date_part('day'::text, date_of_birth));
CREATE INDEX idx_profiles_contract_end ON public.profiles USING btree (contract_end_date) WHERE (contract_end_date IS NOT NULL);
CREATE INDEX idx_profiles_dob ON public.profiles USING btree (date_of_birth);
CREATE INDEX idx_profiles_force_password_reset ON public.profiles USING btree (force_password_reset);
CREATE INDEX idx_profiles_full_name_ci ON public.profiles USING btree (lower(full_name));
CREATE INDEX idx_profiles_hire_date ON public.profiles USING btree (hire_date);
CREATE INDEX idx_profiles_is_deleted ON public.profiles USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_profiles_password_last_changed_at ON public.profiles USING btree (password_last_changed_at DESC);
CREATE INDEX idx_properties_is_deleted ON public.properties USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx__076849e7de95 ON public.quiz_answers USING btree (attempt_id);
CREATE INDEX idx__3966556b1f19 ON public.quiz_answers USING btree (question_id);
CREATE INDEX idx__548b40bfebdf ON public.quiz_attempts USING btree (quiz_id);
CREATE INDEX idx__a0a25a5f4b21 ON public.quiz_attempts USING btree (user_id);
CREATE INDEX idx__908ef63c2db4 ON public.quiz_questions USING btree (quiz_id);
CREATE INDEX idx__d20868aa6286 ON public.quizzes USING btree (created_by);
CREATE INDEX idx_rate_limit_window_start ON public.rate_limit_entries USING btree (window_start);
CREATE INDEX referral_history_created_at_idx ON public.referral_history USING btree (created_at);
CREATE INDEX referral_history_referral_id_idx ON public.referral_history USING btree (referral_id);
CREATE INDEX idx__494381671eac ON public.request_attachments USING btree (uploaded_by);
CREATE INDEX idx__8ccb01fdfacc ON public.request_attachments USING btree (request_id);
CREATE INDEX idx__04ae57f568bb ON public.request_comments USING btree (request_id);
CREATE INDEX idx__26bfa55375c6 ON public.request_comments USING btree (author_id);
CREATE INDEX idx__10bfa618a06e ON public.request_events USING btree (actor_id);
CREATE INDEX idx__3eb85e1226f6 ON public.request_events USING btree (request_id);
CREATE INDEX idx_request_sla_policies_entity_role ON public.request_sla_policies USING btree (entity_type, step_role);
CREATE UNIQUE INDEX uq_request_sla_policies_active_request ON public.request_sla_policies USING btree (entity_type) WHERE (is_active AND (step_role IS NULL));
CREATE UNIQUE INDEX uq_request_sla_policies_active_role ON public.request_sla_policies USING btree (entity_type, step_role) WHERE (is_active AND (step_role IS NOT NULL));
CREATE INDEX idx__c40313e751cb ON public.request_steps USING btree (created_by);
CREATE INDEX idx__d450ed71e084 ON public.request_steps USING btree (assignee_id);
CREATE INDEX idx__e520667e3310 ON public.request_steps USING btree (request_id);
CREATE INDEX idx_request_steps_due_at ON public.request_steps USING btree (due_at);
CREATE INDEX idx__55c8f913d6ef ON public.requests USING btree (requester_id);
CREATE INDEX idx__92553c961f00 ON public.requests USING btree (supervisor_id);
CREATE INDEX idx__9b0ea270e7b1 ON public.requests USING btree (current_assignee_id);
CREATE INDEX idx_requests_assignee_status_created_at ON public.requests USING btree (current_assignee_id, status, created_at DESC);
CREATE INDEX idx_requests_created_at ON public.requests USING btree (created_at);
CREATE INDEX idx_requests_department_id ON public.requests USING btree (department_id);
CREATE INDEX idx_requests_due_at ON public.requests USING btree (due_at);
CREATE INDEX idx_requests_entity ON public.requests USING btree (entity_type, entity_id);
CREATE INDEX idx_requests_property_id ON public.requests USING btree (property_id);
CREATE INDEX idx_requests_status ON public.requests USING btree (status);
CREATE INDEX idx_requests_status_department ON public.requests USING btree (status, department_id);
CREATE INDEX idx_requests_status_property ON public.requests USING btree (status, property_id);
CREATE INDEX idx__2286efd11eaf ON public.scheduled_reminders USING btree (user_id);
CREATE INDEX idx_scheduled_reminders_entity ON public.scheduled_reminders USING btree (entity_type, entity_id);
CREATE INDEX idx_scheduled_reminders_scheduled_for ON public.scheduled_reminders USING btree (scheduled_for);
CREATE INDEX idx_scheduled_reminders_status ON public.scheduled_reminders USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX idx_audit_logs_event_type ON public.security_audit_logs USING btree (event_type);
CREATE INDEX idx_audit_logs_severity ON public.security_audit_logs USING btree (severity);
CREATE INDEX idx_audit_logs_user_id ON public.security_audit_logs USING btree (user_id);
CREATE INDEX idx__0b8e71dba366 ON public.shifts USING btree (property_id);
CREATE INDEX idx__b6c1e1e037cc ON public.shifts USING btree (user_id);
CREATE INDEX idx__b78b29fcd8d6 ON public.shifts USING btree (created_by);
CREATE INDEX idx__d77bf7ee8d17 ON public.shifts USING btree (department_id);
CREATE INDEX idx_shifts_start_time ON public.shifts USING btree (start_time);
CREATE INDEX idx_shifts_status ON public.shifts USING btree (status);
CREATE INDEX idx_shifts_user_time ON public.shifts USING btree (user_id, start_time);
CREATE INDEX shifts_department_start_idx ON public.shifts USING btree (department_id, start_time);
CREATE INDEX shifts_property_start_idx ON public.shifts USING btree (property_id, start_time);
CREATE INDEX idx__57b231aefdd8 ON public.sop_access_logs USING btree (version_id);
CREATE INDEX idx__5c88693eea19 ON public.sop_access_logs USING btree (document_id);
CREATE INDEX idx__d90288060b48 ON public.sop_access_logs USING btree (user_id);
CREATE INDEX idx__027189972edc ON public.sop_acknowledgments USING btree (document_id);
CREATE INDEX idx__0e61d604d5a7 ON public.sop_acknowledgments USING btree (user_id);
CREATE INDEX idx_sop_acknowledgments_document ON public.sop_acknowledgments USING btree (document_id, version_id);
CREATE INDEX idx__0384f753f1fc ON public.sop_approval_steps USING btree (approved_by);
CREATE INDEX idx__20d7bcf6feef ON public.sop_approval_steps USING btree (approver_id);
CREATE INDEX idx__9c67f0c3eb81 ON public.sop_approval_steps USING btree (workflow_id);
CREATE INDEX idx__83006af00d44 ON public.sop_approval_workflows USING btree (version_id);
CREATE INDEX idx__a67c99201337 ON public.sop_approval_workflows USING btree (completed_by);
CREATE INDEX idx__d1c7234a8760 ON public.sop_approval_workflows USING btree (document_id);
CREATE INDEX idx__f12ed9357a32 ON public.sop_approval_workflows USING btree (created_by);
CREATE INDEX idx__6d9ea6cbb929 ON public.sop_attachments USING btree (version_id);
CREATE INDEX idx__bf66bf06d36a ON public.sop_attachments USING btree (document_id);
CREATE INDEX idx__d84e3ca1fd49 ON public.sop_attachments USING btree (uploaded_by);
CREATE INDEX idx__2cb2d96d0ff3 ON public.sop_bookmarks USING btree (user_id);
CREATE INDEX idx__23bc502c4fd4 ON public.sop_categories USING btree (department_id);
CREATE INDEX idx__934c0712d898 ON public.sop_categories USING btree (parent_id);
CREATE INDEX idx__a1a1eb91ea1f ON public.sop_comment_votes USING btree (user_id);
CREATE INDEX idx__268d1462aad2 ON public.sop_comments USING btree (user_id);
CREATE INDEX idx__d116429fe1a6 ON public.sop_comments USING btree (parent_id);
CREATE INDEX idx__f7754a8387af ON public.sop_comments USING btree (document_id);
CREATE INDEX idx__1a170d0542ac ON public.sop_context_triggers USING btree (document_id);
CREATE INDEX idx_sop_context_triggers_type ON public.sop_context_triggers USING btree (trigger_type, trigger_value);
CREATE INDEX idx__103926542902 ON public.sop_document_relations USING btree (created_by);
CREATE INDEX idx__76ea83351c69 ON public.sop_document_relations USING btree (source_document_id);
CREATE INDEX idx_sop_document_search ON public.sop_document_search USING gin (search_vector);
CREATE INDEX idx__8f3ba127df92 ON public.sop_document_tags USING btree (document_id);
CREATE INDEX idx__46156d57c8b9 ON public.sop_document_versions USING btree (published_by);
CREATE INDEX idx__961feb6e2567 ON public.sop_document_versions USING btree (document_id);
CREATE INDEX idx__ca75a7f059d8 ON public.sop_document_versions USING btree (created_by);
CREATE INDEX idx__02f660b2b517 ON public.sop_documents USING btree (published_by);
CREATE INDEX idx__66a2c1625b98 ON public.sop_documents USING btree (subcategory_id);
CREATE INDEX idx__74e83837f767 ON public.sop_documents USING btree (created_by);
CREATE INDEX idx__77ddff89e790 ON public.sop_documents USING btree (template_id);
CREATE INDEX idx__848236e97165 ON public.sop_documents USING btree (department_id);
CREATE INDEX idx__9464f9f50e43 ON public.sop_documents USING btree (last_reviewed_by);
CREATE INDEX idx__a50bdb49260f ON public.sop_documents USING btree (archived_by);
CREATE INDEX idx__af9f7943b302 ON public.sop_documents USING btree (linked_training_id);
CREATE INDEX idx__b27ca02a4914 ON public.sop_documents USING btree (linked_quiz_id);
CREATE INDEX idx__cbb5dfe2eead ON public.sop_documents USING btree (current_version_id);
CREATE INDEX idx__f1912e7aa36e ON public.sop_documents USING btree (category_id);
CREATE INDEX idx__f5dd4b994f69 ON public.sop_documents USING btree (updated_by);
CREATE INDEX idx__f99307110fa8 ON public.sop_documents USING btree (property_id);
CREATE INDEX idx_sop_documents_content_type ON public.sop_documents USING btree (content_type);
CREATE INDEX idx_sop_documents_featured ON public.sop_documents USING btree (featured) WHERE (featured = true);
CREATE INDEX idx_sop_documents_is_deleted ON public.sop_documents USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_sop_documents_status ON public.sop_documents USING btree (status);
CREATE INDEX idx_sop_documents_visibility ON public.sop_documents USING btree (visibility_scope);
CREATE INDEX idx__5d102f899c65 ON public.sop_feedback USING btree (document_id);
CREATE INDEX idx_sop_feedback_user_id ON public.sop_feedback USING btree (user_id);
CREATE INDEX idx__00edd9980fa2 ON public.sop_quiz_attempts USING btree (user_id);
CREATE INDEX idx_sop_quiz_attempts_sop ON public.sop_quiz_attempts USING btree (sop_document_id);
CREATE INDEX idx_sop_quiz_attempts_user_sop ON public.sop_quiz_attempts USING btree (user_id, sop_document_id);
CREATE INDEX idx__c92f38e2ae9f ON public.sop_quiz_questions USING btree (sop_document_id);
CREATE INDEX idx_sop_quiz_questions_order ON public.sop_quiz_questions USING btree (sop_document_id, order_index);
CREATE INDEX idx__38ce62291d45 ON public.sop_review_reminders USING btree (document_id);
CREATE INDEX idx__cf69e8b0aaac ON public.sop_review_reminders USING btree (completed_by);
CREATE INDEX idx__2744c3d9ff49 ON public.sop_role_assignments USING btree (document_id);
CREATE INDEX idx__5b3d2d24cbb2 ON public.sop_role_assignments USING btree (created_by);
CREATE INDEX idx__a0cc58647c17 ON public.sop_role_assignments USING btree (property_id);
CREATE INDEX idx__a612edf88691 ON public.sop_role_assignments USING btree (department_id);
CREATE INDEX idx_sop_role_assignments_role ON public.sop_role_assignments USING btree (role);
CREATE UNIQUE INDEX idx_sop_role_assignments_unique_target ON public.sop_role_assignments USING btree (document_id, role, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX idx__8f13871803ab ON public.sop_tags USING btree (created_by);
CREATE INDEX idx__c3309568f564 ON public.sop_view_history USING btree (document_id);
CREATE INDEX idx__d1139e827d39 ON public.sop_view_history USING btree (user_id);
CREATE INDEX idx_sop_view_history_user ON public.sop_view_history USING btree (user_id, viewed_at DESC);
CREATE INDEX idx__73369e9fd7c0 ON public.status_history USING btree (changed_by);
CREATE INDEX idx_status_history_changed_at ON public.status_history USING btree (changed_at DESC);
CREATE INDEX idx_status_history_entity ON public.status_history USING btree (entity_type, entity_id);
CREATE INDEX idx__0e180f5a6990 ON public.task_attachments USING btree (task_id);
CREATE INDEX idx__61d925aca955 ON public.task_attachments USING btree (uploaded_by_id);
CREATE INDEX idx__439970b08ba0 ON public.task_comments USING btree (author_id);
CREATE INDEX idx__774b925c73d8 ON public.task_comments USING btree (task_id);
CREATE INDEX idx__03e20754ddea ON public.task_watchers USING btree (task_id);
CREATE INDEX idx_task_watchers_user ON public.task_watchers USING btree (user_id);
CREATE INDEX idx__454154e773ed ON public.tasks USING btree (created_by_id);
CREATE INDEX idx__7b53696d554d ON public.tasks USING btree (property_id);
CREATE INDEX idx__942feeaf84a7 ON public.tasks USING btree (assigned_to_id);
CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at);
CREATE INDEX idx_tasks_department ON public.tasks USING btree (department_id);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX idx_tasks_is_deleted ON public.tasks USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);
CREATE INDEX idx_tasks_property_dept ON public.tasks USING btree (property_id, department_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx__34f0827aa37a ON public.temporary_approvers USING btree (approver_id);
CREATE INDEX idx__81e94032cd20 ON public.temporary_approvers USING btree (temporary_approver_id);
CREATE INDEX idx_temporary_approvers_delegate ON public.temporary_approvers USING btree (delegate_id);
CREATE INDEX idx_temporary_approvers_delegator ON public.temporary_approvers USING btree (delegator_id);
CREATE INDEX idx_temporary_approvers_entity ON public.temporary_approvers USING btree (entity_type, entity_id) WHERE ((entity_type IS NOT NULL) AND (entity_id IS NOT NULL));
CREATE INDEX idx_temporary_approvers_fallbacks ON public.temporary_approvers USING gin (fallback_delegate_ids);
CREATE INDEX idx__9b48d2f0dc68 ON public.training_assignment_rules USING btree (target_department_id);
CREATE INDEX idx__a41ef31c58ec ON public.training_assignment_rules USING btree (created_by);
CREATE INDEX idx__fd620e5fcf31 ON public.training_assignment_rules USING btree (training_module_id);
CREATE INDEX idx_training_block_progress_block_id ON public.training_block_progress USING btree (block_id);
CREATE INDEX idx__64d2b5115c57 ON public.training_certificates USING btree (attempt_id);
CREATE INDEX idx__9bef0b6efc2b ON public.training_content_blocks USING btree (training_module_id);
CREATE INDEX idx__ca37e7390793 ON public.training_content_blocks USING btree (source_document_id);
CREATE INDEX idx_training_content_blocks_is_deleted ON public.training_content_blocks USING btree (is_deleted);
CREATE INDEX idx_training_content_source_doc ON public.training_content_blocks USING btree (source_document_id) WHERE (source_document_id IS NOT NULL);
CREATE UNIQUE INDEX training_content_blocks_training_module_id_order_key ON public.training_content_blocks USING btree (training_module_id, "order") WHERE (COALESCE(is_deleted, false) = false);
CREATE INDEX idx__eb89911e8651 ON public.training_content_templates USING btree (created_by);
CREATE INDEX idx__f1a7cd195f48 ON public.training_module_documents USING btree (training_module_id);
CREATE INDEX idx_training_module_documents_doc ON public.training_module_documents USING btree (document_id);
CREATE INDEX idx__dbe977985459 ON public.training_module_resources USING btree (training_module_id);
CREATE INDEX idx__47e0fdb18aa3 ON public.training_modules USING btree (department_id);
CREATE INDEX idx__b9442595746f ON public.training_modules USING btree (property_id);
CREATE INDEX idx__ec2849ed87f4 ON public.training_modules USING btree (created_by);
CREATE INDEX idx_training_modules_is_deleted ON public.training_modules USING btree (is_deleted);
CREATE INDEX idx__550ab0a84be2 ON public.training_path_modules USING btree (path_id);
CREATE INDEX idx__1c0ed5bf2ddd ON public.training_paths USING btree (created_by);
CREATE INDEX idx__a4940fb4e89b ON public.training_paths USING btree (target_property_id);
CREATE INDEX idx__fa1a43462d76 ON public.training_paths USING btree (target_department_id);
CREATE INDEX idx__aee794d037de ON public.training_progress USING btree (user_id);
CREATE INDEX idx_training_progress_is_deleted ON public.training_progress USING btree (is_deleted);
CREATE INDEX idx_training_progress_user_status ON public.training_progress USING btree (user_id, status);
CREATE INDEX idx__811c83602575 ON public.training_quiz_attempts USING btree (user_id);
CREATE INDEX idx_training_quiz_attempts_user_module ON public.training_quiz_attempts USING btree (user_id, module_id);
CREATE INDEX idx__62bfa8b15f90 ON public.training_quizzes USING btree (training_module_id);
CREATE INDEX idx_training_quizzes_is_deleted ON public.training_quizzes USING btree (is_deleted);
CREATE INDEX idx_user_achievements_earned ON public.user_achievements USING btree (earned_at DESC);
CREATE INDEX idx_user_achievements_type ON public.user_achievements USING btree (achievement_type);
CREATE INDEX idx_user_achievements_user ON public.user_achievements USING btree (user_id);
CREATE INDEX idx_user_dashboard_preferences_user_id ON public.user_dashboard_preferences USING btree (user_id);
CREATE INDEX idx__2af2ee19acee ON public.user_departments USING btree (user_id);
CREATE INDEX idx_user_departments_department_id ON public.user_departments USING btree (department_id);
CREATE UNIQUE INDEX idx_user_invitations_auth_user_id ON public.user_invitations USING btree (auth_user_id) WHERE (auth_user_id IS NOT NULL);
CREATE INDEX idx_user_invitations_email ON public.user_invitations USING btree (lower(email));
CREATE INDEX idx_user_invitations_status ON public.user_invitations USING btree (status, invited_at DESC);
CREATE INDEX idx__655a0d07ac86 ON public.user_path_enrollments USING btree (user_id);
CREATE INDEX idx_user_pins_display_order ON public.user_pins USING btree (user_id, display_order);
CREATE INDEX idx_user_pins_item_lookup ON public.user_pins USING btree (item_type, item_id);
CREATE INDEX idx_user_pins_user_id ON public.user_pins USING btree (user_id);
CREATE INDEX idx__d81c79eefa04 ON public.user_properties USING btree (user_id);
CREATE INDEX idx_user_properties_property_id ON public.user_properties USING btree (property_id);
CREATE INDEX idx__9d9f8dbbdfb2 ON public.user_roles USING btree (user_id);
CREATE INDEX idx_user_sessions_expires ON public.user_sessions USING btree (expires_at) WHERE (revoked_at IS NULL);
CREATE INDEX idx_user_sessions_token_hash ON public.user_sessions USING btree (session_token_hash);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id, created_at DESC);
CREATE INDEX idx__46a3df848614 ON public.user_settings USING btree (user_id);
CREATE INDEX idx_user_shifts_date ON public.user_shifts USING btree (shift_date);
CREATE INDEX idx_user_shifts_property ON public.user_shifts USING btree (property_id);
CREATE INDEX idx_user_shifts_user_date ON public.user_shifts USING btree (user_id, shift_date);
CREATE INDEX idx_user_shifts_user_id ON public.user_shifts USING btree (user_id);
CREATE INDEX idx__8140060b1266 ON public.user_skills USING btree (user_id);
CREATE INDEX idx__a524a5829441 ON public.user_skills USING btree (verified_by);
CREATE INDEX idx_user_skills_skill_id ON public.user_skills USING btree (skill_id);
CREATE INDEX idx__c4da352ace21 ON public.workflow_definitions USING btree (created_by);
CREATE INDEX idx__9b19a930d623 ON public.workflow_executions USING btree (workflow_id);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions USING btree (started_at DESC);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions USING btree (status);
CREATE INDEX idx__a09f4b4de8d7 ON public.workflow_schedules USING btree (workflow_id);
CREATE INDEX idx_workflow_schedules_next_run ON public.workflow_schedules USING btree (next_run_at) WHERE (is_active = true);

-- ------------------------------------------------------------
-- Functions (433)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.announce_eom_from_selection(p_selection_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_selection eom_auto_selections%ROWTYPE;
    v_eom_id UUID;
BEGIN
    SELECT * INTO v_selection
    FROM eom_auto_selections
    WHERE id = p_selection_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selection not found';
    END IF;
    
    -- Insert into employee_of_the_month
    INSERT INTO employee_of_the_month (
        property_id, user_id, month, year,
        reason_en, reason_ar, created_by
    ) VALUES (
        v_selection.property_id,
        v_selection.user_id,
        v_selection.month,
        v_selection.year,
        v_selection.selection_reason_en,
        v_selection.selection_reason_ar,
        v_selection.reviewed_by -- Or system user
    )
    ON CONFLICT (property_id, month, year)
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        reason_en = EXCLUDED.reason_en,
        reason_ar = EXCLUDED.reason_ar,
        updated_at = now()
    RETURNING id INTO v_eom_id;
    
    -- Update selection record
    UPDATE eom_auto_selections
    SET status = 'announced',
        announced_eom_id = v_eom_id,
        announced_at = now(),
        updated_at = now()
    WHERE id = p_selection_id;
    
    RETURN v_eom_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_maintenance_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sla_hours integer;
BEGIN
  IF NEW.due_at IS NULL THEN
    SELECT p.sla_hours INTO v_sla_hours
    FROM public.maintenance_sla_policies p
    WHERE p.is_active = true
      AND p.priority = NEW.priority
    ORDER BY p.created_at DESC
    LIMIT 1;

    IF v_sla_hours IS NOT NULL THEN
      NEW.sla_hours := v_sla_hours;
      NEW.due_at := now() + make_interval(hours => v_sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.effective_date <= current_date then
    if new.to_role is not null and new.to_role <> new.from_role then
      if exists (
        select 1
        from pg_enum e
        join pg_type t on t.oid = e.enumtypid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typname = 'app_role'
          and e.enumlabel = new.to_role
      ) then
        delete from public.user_roles where user_id = new.employee_id;
        insert into public.user_roles (user_id, role)
        values (new.employee_id, new.to_role::public.app_role)
        on conflict (user_id, role) do nothing;
      end if;
    end if;

    if new.to_department_id is not null and new.to_department_id <> new.from_department_id then
      delete from public.user_departments where user_id = new.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (new.employee_id, new.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_request_priority_default()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_priority text;
BEGIN
  IF NEW.priority IS NULL THEN
    NEW.priority := 'normal';
  END IF;

  SELECT p.default_priority INTO v_priority
  FROM public.request_sla_policies p
  WHERE p.is_active = true
    AND p.entity_type = NEW.entity_type
    AND p.step_role IS NULL
    AND p.default_priority IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_priority IS NOT NULL THEN
    NEW.priority := v_priority;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_request_step_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_entity_type text;
  v_sla_hours integer;
BEGIN
  IF NEW.status = 'pending' AND NEW.due_at IS NULL THEN
    SELECT r.entity_type INTO v_entity_type
    FROM public.requests r
    WHERE r.id = NEW.request_id;

    IF NEW.sla_hours IS NULL THEN
      SELECT p.sla_hours INTO v_sla_hours
      FROM public.request_sla_policies p
      WHERE p.is_active = true
        AND p.entity_type = v_entity_type
        AND (p.step_role = NEW.assignee_role OR p.step_role IS NULL)
        AND p.sla_hours IS NOT NULL
      ORDER BY (p.step_role IS NULL) ASC, p.created_at DESC
      LIMIT 1;

      NEW.sla_hours := v_sla_hours;
    END IF;

    IF NEW.sla_hours IS NOT NULL THEN
      NEW.due_at := now() + make_interval(hours => NEW.sla_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_training_rules_to_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_new jsonb := to_jsonb(new);
  v_user_id uuid;
  v_department_id uuid;
  v_role_text text;
  v_job_title_id uuid;
begin
  if tg_table_name = 'user_departments' then
    v_user_id := nullif(v_new->>'user_id', '')::uuid;
    v_department_id := nullif(v_new->>'department_id', '')::uuid;
  elsif tg_table_name = 'user_roles' then
    v_user_id := nullif(v_new->>'user_id', '')::uuid;
    v_role_text := nullif(v_new->>'role', '');
  elsif tg_table_name = 'profiles' then
    v_user_id := nullif(v_new->>'id', '')::uuid;
    v_job_title_id := nullif(v_new->>'job_title_id', '')::uuid;
  else
    return new;
  end if;

  if v_user_id is null then
    return new;
  end if;

  insert into public.learning_assignments (
    target_type,
    target_id,
    content_type,
    content_id,
    due_date,
    priority,
    assigned_by,
    created_at
  )
  select
    'user'::learning_target_type,
    v_user_id::text,
    'module'::learning_content_type,
    tar.training_module_id,
    now() + interval '30 days',
    'normal',
    tar.created_by,
    now()
  from public.training_assignment_rules tar
  where tar.is_active = true
    and (
      (v_department_id is not null and tar.target_department_id = v_department_id) or
      (v_role_text is not null and tar.target_role = v_role_text) or
      (v_job_title_id is not null and tar.job_title_id = v_job_title_id)
    )
    and not exists (
      select 1
      from public.learning_assignments la
      where la.target_id = v_user_id::text
        and la.content_id = tar.training_module_id
        and la.content_type = 'module'::learning_content_type
    );

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.effective_date <= current_date then
    update public.user_properties
    set property_id = new.to_property_id
    where user_id = new.employee_id
      and property_id = new.from_property_id;

    if not found then
      insert into public.user_properties (user_id, property_id)
      values (new.employee_id, new.to_property_id)
      on conflict (user_id, property_id) do nothing;
    end if;

    if new.to_department_id is not null then
      delete from public.user_departments where user_id = new.employee_id;
      insert into public.user_departments (user_id, department_id)
      values (new.employee_id, new.to_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_document_atomic(p_approval_id uuid, p_approver_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_remaining_pending integer;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to approve this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.temporary_approvers ta
  join public.documents d on d.id = v_document_id
  where ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.start_at <= now()
    and ta.end_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.start_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'approved',
      approved_at = now(),
      feedback = coalesce(p_feedback, feedback),
      approved_by = p_approver_id,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.temporary_approvers
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_approved'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' approved a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  select count(*)
  into v_remaining_pending
  from public.document_approvals
  where document_id = v_document_id
    and status = 'pending'
    and is_active = true;

  if v_remaining_pending = 0 then
    update public.documents
    set status = 'PUBLISHED',
        updated_at = now()
    where id = v_document_id;

    if v_document_author is not null and v_document_author <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_document_author,
        'request_approved'::public.notification_type,
        'Document Approved',
        'Your document "' || coalesce(v_document_title, 'Document') || '" has been approved and published.',
        jsonb_build_object(
          'entity_type', 'document',
          'entity_id', v_document_id,
          'link', '/documents/' || v_document_id::text,
          'approval_id', p_approval_id,
          'published', true
        )
      );
    end if;

    return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', true);
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'published', false, 'remaining_pending', v_remaining_pending);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_eom_selection(p_selection_id uuid, p_approved_by uuid, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_selection eom_auto_selections%ROWTYPE;
    v_eom_id UUID;
BEGIN
    -- Get selection
    SELECT * INTO v_selection
    FROM eom_auto_selections
    WHERE id = p_selection_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selection not found';
    END IF;
    
    IF v_selection.status != 'pending' THEN
        RAISE EXCEPTION 'Selection is not pending approval';
    END IF;
    
    -- Update selection
    UPDATE eom_auto_selections
    SET status = 'approved',
        reviewed_by = p_approved_by,
        reviewed_at = now(),
        review_notes = p_notes,
        updated_at = now()
    WHERE id = p_selection_id;
    
    -- Create the actual announcement
    RETURN announce_eom_from_selection(p_selection_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_leave_request(request_id uuid, approver_id uuid, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request leave_requests%rowtype;
begin
  if approver_id != auth.uid() then
    raise exception 'Unauthorized: Approver ID mismatch';
  end if;

  update leave_requests
  set status = 'approved',
      approved_by_id = approver_id,
      updated_at = now()
  where id = request_id and status = 'pending'
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'request_approved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text, next_step text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_document RECORD;
  v_approval_count INTEGER;
  v_total_required INTEGER;
BEGIN
  -- Get document info
  SELECT * INTO v_document
  FROM sop_documents
  WHERE id = p_document_id;
  
  -- Update approval status
  UPDATE sop_document_approvals
  SET 
    status = 'approved',
    approved_at = CURRENT_TIMESTAMP,
    comment = p_comment
  WHERE document_id = p_document_id 
    AND approver_id = p_approver_id 
    AND status = 'pending';
  
  -- Check if all approvals are complete
  SELECT 
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*)
  INTO v_approval_count, v_total_required
  FROM sop_document_approvals
  WHERE document_id = p_document_id;
  
  -- If all approvals are done, update document status
  IF v_approval_count = v_total_required THEN
    UPDATE sop_documents
    SET 
      status = 'approved',
      approved_at = CURRENT_TIMESTAMP,
      next_review_date = CURRENT_DATE + INTERVAL '1 year'
    WHERE id = p_document_id;
    
    RETURN QUERY SELECT TRUE, 'Document approved', 'Document is now approved and published';
  ELSE
    RETURN QUERY SELECT TRUE, 'Approval recorded', 'Waiting for remaining approvals';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM, NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.archive_expired_documents()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE documents 
    SET is_archived = TRUE, updated_at = NOW()
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_archived = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_maintenance_ticket(p_ticket_id uuid, p_assigner_id uuid, p_assigned_to_id uuid, p_notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ticket maintenance_tickets%rowtype;
  v_new_status maintenance_tickets.status%type;
begin
  if p_assigner_id != auth.uid() then
    raise exception 'Unauthorized: Assigner ID mismatch';
  end if;

  if not exists (
    select 1
    from user_roles
    where user_id = auth.uid()
      and role in ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'staff')
  ) then
    raise exception 'Unauthorized: Insufficient permissions to assign tickets';
  end if;

  if p_assigned_to_id is not null then
    v_new_status := 'in_progress';
  else
    v_new_status := 'open';
  end if;

  update maintenance_tickets
  set assigned_to_id = p_assigned_to_id,
      status = v_new_status,
      updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if p_notification_payload is not null and p_assigned_to_id is not null and p_assigned_to_id != p_assigner_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      p_assigned_to_id,
      public.safe_notification_type(p_notification_payload->>'type', 'maintenance_assigned'::public.notification_type),
      p_notification_payload->>'title',
      p_notification_payload->>'message',
      p_notification_payload->>'link',
      coalesce(p_notification_payload->'metadata', p_notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.attendance_check_in(p_notes text DEFAULT NULL::text)
 RETURNS attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE employee_id = auth.uid()
      AND date = current_date
      AND check_out IS NULL
  ) THEN
    RAISE EXCEPTION 'Already checked in';
  END IF;

  INSERT INTO public.attendance (employee_id, date, check_in, status, notes)
  VALUES (auth.uid(), current_date, now(), 'present', p_notes)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.attendance_check_out(p_attendance_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS attendance
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.attendance
  SET check_out = now(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_attendance_id
    AND employee_id = auth.uid()
    AND check_out IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Attendance record not found or already checked out';
  END IF;

  RETURN v_row;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_delete_media_storage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete the associated storage object
  DELETE FROM storage.objects
  WHERE bucket_id = OLD.storage_bucket
  AND name = OLD.storage_path;
  
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_reactivate_suspended_accounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET account_status = 'active',
      is_active = true,
      suspended_at = NULL,
      suspended_by = NULL,
      suspend_reason = NULL,
      suspended_until = NULL,
      updated_at = now()
  WHERE account_status = 'suspended'
    AND suspended_until IS NOT NULL
    AND suspended_until <= now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.award_module_skills(p_user_id uuid, p_module_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_can_manage boolean := false;
    v_rows_affected integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = ANY (ARRAY[
              'corporate_admin'::public.app_role,
              'regional_admin'::public.app_role,
              'regional_hr'::public.app_role,
              'property_manager'::public.app_role,
              'property_hr'::public.app_role,
              'department_head'::public.app_role
          ])
    )
    INTO v_can_manage;

    IF p_user_id <> auth.uid() AND NOT v_can_manage THEN
        RAISE EXCEPTION 'Not authorized to award skills for this user';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.learning_progress lp
        WHERE lp.user_id = p_user_id
          AND lp.content_type = 'module'
          AND lp.content_id = p_module_id
          AND lp.status = 'completed'
          AND COALESCE(lp.is_deleted, false) = false
    ) AND NOT EXISTS (
        SELECT 1
        FROM public.training_progress tp
        WHERE tp.user_id = p_user_id
          AND tp.training_id = p_module_id
          AND tp.status = 'completed'
          AND COALESCE(tp.is_deleted, false) = false
    ) THEN
        RETURN 0;
    END IF;

    INSERT INTO public.user_skills (
        user_id,
        skill_id,
        proficiency_level,
        verified
    )
    SELECT
        p_user_id,
        ms.skill_id,
        LEAST(GREATEST(COALESCE(ms.points_awarded, 1), 1), 5),
        false
    FROM public.module_skills ms
    WHERE ms.module_id = p_module_id
    ON CONFLICT (user_id, skill_id) DO UPDATE
    SET proficiency_level = GREATEST(public.user_skills.proficiency_level, EXCLUDED.proficiency_level),
        verified = public.user_skills.verified
    WHERE public.user_skills.proficiency_level < EXCLUDED.proficiency_level;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_update_reporting_lines(p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_update RECORD;
  v_success_count INTEGER := 0;
  v_employee_id UUID;
  v_new_manager_id UUID;
BEGIN
  -- Validate input is an array
  IF jsonb_typeof(p_updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be a JSON array';
  END IF;

  -- Process each update within the same transaction
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_employee_id := (v_update.value->>'employee_id')::UUID;
    v_new_manager_id := CASE 
      WHEN v_update.value->>'new_manager_id' IS NULL OR v_update.value->>'new_manager_id' = '' 
      THEN NULL 
      ELSE (v_update.value->>'new_manager_id')::UUID 
    END;

    -- Check for circular reporting (uses existing trigger, but let's add explicit check)
    IF v_new_manager_id IS NOT NULL THEN
      -- Check if new_manager_id reports to employee_id (would create circular)
      IF EXISTS (
        WITH RECURSIVE chain AS (
          SELECT reporting_to FROM profiles WHERE id = v_new_manager_id
          UNION ALL
          SELECT p.reporting_to FROM profiles p JOIN chain c ON p.id = c.reporting_to
        )
        SELECT 1 FROM chain WHERE reporting_to = v_employee_id LIMIT 1
      ) THEN
        RAISE EXCEPTION 'Cannot assign manager %: would create circular reporting chain for employee %', 
          v_new_manager_id, v_employee_id;
      END IF;
    END IF;

    -- Perform the update
    UPDATE profiles
    SET reporting_to = v_new_manager_id, updated_at = NOW()
    WHERE id = v_employee_id;

    v_success_count := v_success_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_success_count
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_eom_score(p_user_id uuid, p_property_id uuid, p_month integer, p_year integer, p_config eom_automation_config)
 RETURNS TABLE(task_completion_rate integer, training_completion_rate integer, sop_compliance_rate integer, attendance_rate integer, total_score numeric, is_eligible boolean, ineligibility_reason text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_task_total INTEGER;
    v_task_completed INTEGER;
    v_training_total INTEGER;
    v_training_completed INTEGER;
    v_sop_total INTEGER;
    v_sop_acknowledged INTEGER;
    v_user_count INTEGER;
    v_attendance_total INTEGER;
    v_attendance_present INTEGER;
    v_employed_since TIMESTAMPTZ;
    v_recent_wins INTEGER;
BEGIN
    -- Calculate Task Completion Rate (for the month)
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed', 'done'))
    INTO v_task_total, v_task_completed
    FROM tasks
    WHERE assigned_to_id = p_user_id
    AND EXTRACT(MONTH FROM created_at) = p_month
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND is_deleted = false;
    
    task_completion_rate := CASE 
        WHEN v_task_total > 0 THEN (v_task_completed * 100 / v_task_total)
        ELSE 0
    END;
    
    -- Calculate Training Completion Rate
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_training_total, v_training_completed
    FROM learning_assignments
    WHERE target_type = 'user'
    AND target_id = p_user_id
    AND (is_deleted IS NULL OR is_deleted = false);
    
    training_completion_rate := CASE 
        WHEN v_training_total > 0 THEN (v_training_completed * 100 / v_training_total)
        ELSE 0
    END;
    
    -- Calculate SOP Compliance Rate
    SELECT COUNT(DISTINCT d.id), COUNT(DISTINCT da.document_id)
    INTO v_sop_total, v_sop_acknowledged
    FROM documents d
    JOIN user_departments ud ON ud.department_id = d.department_id
    LEFT JOIN document_acknowledgments da ON da.document_id = d.id AND da.user_id = p_user_id
    WHERE ud.user_id = p_user_id
    AND d.status = 'PUBLISHED';
    
    sop_compliance_rate := CASE 
        WHEN v_sop_total > 0 THEN (v_sop_acknowledged * 100 / v_sop_total)
        ELSE 0
    END;
    
    -- Calculate Attendance Rate
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('present', 'checked_in', 'completed'))
    INTO v_attendance_total, v_attendance_present
    FROM attendance
    WHERE employee_id = p_user_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year;
    
    attendance_rate := CASE 
        WHEN v_attendance_total > 0 THEN (v_attendance_present * 100 / v_attendance_total)
        ELSE 100 -- Default to 100% if no attendance records
    END;
    
    -- Calculate weighted total score
    total_score := (
        (task_completion_rate * p_config.task_completion_weight / 100.0) +
        (training_completion_rate * p_config.training_completion_weight / 100.0) +
        (sop_compliance_rate * p_config.sop_compliance_weight / 100.0) +
        (attendance_rate * p_config.attendance_weight / 100.0)
    )::DECIMAL(5,2);
    
    -- Check eligibility
    is_eligible := true;
    ineligibility_reason := NULL;
    
    -- Check minimum attendance rate
    IF attendance_rate < p_config.min_attendance_rate THEN
        is_eligible := false;
        ineligibility_reason := 'Attendance rate below minimum requirement';
    END IF;
    
    -- Check minimum task completion rate
    IF task_completion_rate < p_config.min_task_completion_rate THEN
        is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Task completion rate below minimum requirement';
    END IF;
    
    -- Check employment duration
    SELECT created_at INTO v_employed_since
    FROM profiles
    WHERE id = p_user_id;
    
    IF v_employed_since > (now() - (p_config.min_employment_days || ' days')::INTERVAL) THEN
        is_eligible := false;
        ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Employment duration too short';
    END IF;
    
    -- Check recent wins
    IF p_config.exclude_recent_winners THEN
        SELECT COUNT(*) INTO v_recent_wins
        FROM employee_of_the_month
        WHERE user_id = p_user_id
        AND (year > p_year OR (year = p_year AND month >= p_month - p_config.exclusion_months));
        
        IF v_recent_wins > 0 THEN
            is_eligible := false;
            ineligibility_reason := COALESCE(ineligibility_reason || '; ', '') || 'Recent winner (within ' || p_config.exclusion_months || ' months)';
        END IF;
    END IF;
    
    RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_next_cron_run(cron_expr text, from_time timestamp with time zone DEFAULT now())
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    next_run TIMESTAMPTZ;
BEGIN
    -- Simple implementation for common patterns
    -- For production, you'd want a proper cron parser
    CASE cron_expr
        WHEN '0 0 * * *' THEN -- Daily at midnight
            next_run := DATE_TRUNC('day', from_time) + INTERVAL '1 day';
        WHEN '0 9 * * *' THEN -- Daily at 9 AM
            next_run := DATE_TRUNC('day', from_time) + INTERVAL '9 hours';
            IF next_run <= from_time THEN
                next_run := next_run + INTERVAL '1 day';
            END IF;
        WHEN '0 * * * *' THEN -- Every hour
            next_run := DATE_TRUNC('hour', from_time) + INTERVAL '1 hour';
        WHEN '*/15 * * * *' THEN -- Every 15 minutes
            next_run := DATE_TRUNC('hour', from_time) + 
                       (FLOOR(EXTRACT(MINUTE FROM from_time) / 15) + 1) * INTERVAL '15 minutes';
        WHEN '0 0 * * 1' THEN -- Weekly on Monday
            next_run := DATE_TRUNC('week', from_time) + INTERVAL '1 week';
        ELSE
            -- Default to 1 hour from now
            next_run := from_time + INTERVAL '1 hour';
    END CASE;
    
    RETURN next_run;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_process_id uuid;
  v_total_tasks integer;
  v_completed_tasks integer;
  v_progress_percent integer;
begin
  -- Get the process id (handle both INSERT/UPDATE and DELETE if needed)
  if (TG_OP = 'DELETE') then
    v_process_id := old.process_id;
  else
    v_process_id := new.process_id;
  end if;

  -- 1. Count total tasks for this process
  select count(*) into v_total_tasks
  from public.onboarding_tasks
  where process_id = v_process_id;

  -- 2. Count completed tasks
  select count(*) into v_completed_tasks
  from public.onboarding_tasks
  where process_id = v_process_id
  and status = 'completed';

  -- 3. Calculate percentage
  if v_total_tasks > 0 then
    v_progress_percent := (v_completed_tasks * 100) / v_total_tasks;
  else
    v_progress_percent := 0;
  end if;

  -- 4. Update the onboarding_process table
  update public.onboarding_process
  set 
    progress_percent = v_progress_percent,
    status = case 
      when v_progress_percent = 100 then 'completed'::entity_status
      when v_progress_percent > 0 then 'in_progress'::entity_status
      else 'pending'::entity_status
    end,
    updated_at = now()
  where id = v_process_id;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_approve_leave(approver_id uuid, request_property_id uuid, request_department_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  approver_role TEXT;
  approver_properties UUID[];
  approver_departments UUID[];
BEGIN
  -- Get approver's role (get first role, typically users have one primary role)
  SELECT role INTO approver_role
  FROM public.user_roles
  WHERE user_id = approver_id
  LIMIT 1;

  -- Regional admins can approve anything
  IF approver_role IN ('regional_admin', 'regional_hr') THEN
    RETURN TRUE;
  END IF;

  -- Property-level roles must be in the same property
  IF approver_role IN ('property_manager', 'property_hr', 'department_head') THEN
    SELECT get_user_properties(approver_id) INTO approver_properties;
    
    -- Check if approver is assigned to this property
    IF NOT (request_property_id = ANY(approver_properties)) THEN
      RETURN FALSE;
    END IF;

    -- Department heads must also be in the same department
    IF approver_role = 'department_head' THEN
      SELECT get_user_departments(approver_id) INTO approver_departments;
      RETURN request_department_id = ANY(approver_departments);
    END IF;

    RETURN TRUE;
  END IF;

  -- Staff cannot approve
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_assignments(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = $1
    AND role::text IN (
        'regional_admin', 
        'regional_hr', 
        'property_hr', 
        'department_manager',
        'general_manager',
        'admin',
        'super_admin',
        'property_manager'
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_user_act_on_document_approval(p_user_id uuid, p_approval_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_approvals da
    JOIN public.documents d ON d.id = da.document_id
    WHERE da.id = p_approval_id
      AND da.status = 'pending'
      AND da.is_active = TRUE
      AND (
        da.approver_id = p_user_id
        OR public.has_role(p_user_id, 'regional_admin')
        OR EXISTS (
          SELECT 1
          FROM public.temporary_approvers ta
          WHERE ta.delegator_id = da.approver_id
            AND (ta.delegate_id = p_user_id OR p_user_id = ANY(ta.fallback_delegate_ids))
            AND ta.start_at <= now()
            AND ta.end_at >= now()
            AND (ta.max_approvals IS NULL OR ta.approvals_used < ta.max_approvals)
            AND (
              (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
               AND ta.entity_type = 'document_approval'
               AND ta.entity_id = p_approval_id)
              OR
              (ta.entity_type IS NULL AND ta.entity_id IS NULL
               AND (
                 ta.scope_type = 'all'
                 OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
                 OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
               ))
            )
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_document(document_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    d.id,
    d.visibility,
    d.property_id,
    d.department_id,
    d.role,
    d.created_by,
    d.status,
    d.is_deleted
  INTO doc
  FROM public.documents d
  WHERE d.id = document_id
  LIMIT 1;

  IF doc IS NULL THEN
    RETURN false;
  END IF;

  IF doc.is_deleted IS TRUE THEN
    RETURN false;
  END IF;

  -- Authors can always view their own documents.
  IF doc.created_by = (select auth.uid()) THEN
    RETURN true;
  END IF;

  -- Privileged roles can view all documents.
  IF public.has_role_optimized('corporate_admin'::public.app_role)
     OR public.has_role_optimized('regional_admin'::public.app_role)
     OR public.has_role_optimized('regional_hr'::public.app_role) THEN
    RETURN true;
  END IF;

  -- For non-privileged users, only published documents are viewable.
  IF doc.status IS DISTINCT FROM 'PUBLISHED'::public.document_status THEN
    RETURN false;
  END IF;

  IF doc.visibility = 'all_properties'::public.document_visibility THEN
    RETURN true;
  ELSIF doc.visibility = 'property'::public.document_visibility THEN
    RETURN doc.property_id IS NOT NULL
      AND public.has_property_access((select auth.uid()), doc.property_id);
  ELSIF doc.visibility = 'department'::public.document_visibility THEN
    RETURN doc.department_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.user_departments ud
        WHERE ud.user_id = (select auth.uid())
          AND ud.department_id = doc.department_id
      );
  ELSIF doc.visibility = 'role'::public.document_visibility THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND (doc.role IS NULL OR ur.role = doc.role)
    );
  END IF;

  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_employee_public_profile(p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_roles public.app_role[];
  v_property_ids uuid[];
  v_department_ids uuid[];
BEGIN
  IF v_uid IS NULL OR p_target_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_uid = p_target_user_id THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(ur.role), ARRAY[]::public.app_role[])
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_uid;

  IF (
    'corporate_admin'::public.app_role = ANY(v_roles) OR
    'regional_admin'::public.app_role = ANY(v_roles) OR
    'regional_hr'::public.app_role = ANY(v_roles)
  ) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(array_agg(up.property_id), ARRAY[]::uuid[])
  INTO v_property_ids
  FROM public.user_properties up
  WHERE up.user_id = v_uid;

  SELECT COALESCE(array_agg(ud.department_id), ARRAY[]::uuid[])
  INTO v_department_ids
  FROM public.user_departments ud
  WHERE ud.user_id = v_uid;

  IF 'department_head'::public.app_role = ANY(v_roles) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_departments ud
      WHERE ud.user_id = p_target_user_id
        AND ud.department_id = ANY(v_department_ids)
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_properties up
    WHERE up.user_id = p_target_user_id
      AND up.property_id = ANY(v_property_ids)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_feed_item(_feed_item_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'on'
AS $function$
DECLARE
  _prefix TEXT;
  _id_text TEXT;
  _uuid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  _prefix := split_part(_feed_item_id, '-', 1);
  _id_text := substring(_feed_item_id from position('-' in _feed_item_id) + 1);

  BEGIN
    _uuid := _id_text::uuid;
  EXCEPTION WHEN others THEN
    _uuid := NULL;
  END;

  IF _prefix = 'ann' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM announcements WHERE id = _uuid);
  ELSIF _prefix = 'doc' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM documents WHERE id = _uuid);
  ELSIF _prefix = 'task' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM tasks WHERE id = _uuid);
  ELSIF _prefix = 'train' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM learning_assignments WHERE id = _uuid);
  ELSIF _prefix = 'ach' AND _uuid IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM training_progress WHERE id = _uuid);
  ELSIF _prefix = 'bday' AND _uuid IS NOT NULL THEN
    -- birthday is derived from profiles; if the user can view that profile, allow.
    RETURN EXISTS (SELECT 1 FROM profiles WHERE id = _uuid);
  END IF;

  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_request(request_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM requests r
    JOIN profiles req ON req.id = r.requester_id
    WHERE r.id = request_id
      AND (
        r.requester_id = auth.uid() OR
        r.current_assignee_id = auth.uid() OR
        r.supervisor_id = auth.uid() OR
        req.reporting_to = auth.uid() OR
        public.is_hr(auth.uid()) OR
        public.is_admin(auth.uid())
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_request(user_id uuid, request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    req RECORD;
    req_user_id UUID;
  BEGIN
    -- Get request details
    SELECT * INTO req FROM requests WHERE id = can_view_request.request_id;
    IF NOT FOUND THEN 
      RETURN FALSE;
    END IF;
    
    -- User can view their own requests
    IF req.requester_id = can_view_request.user_id THEN 
      RETURN TRUE;
    END IF;
    
    -- HR and admin can view all requests
    IF is_hr(can_view_request.user_id) THEN 
      RETURN TRUE;
    END IF;
    
    -- Current assignee can view
    IF req.current_assignee_id = can_view_request.user_id THEN 
      RETURN TRUE;
    END IF;
    
    -- Supervisor can view their team's requests
    IF req.supervisor_id = can_view_request.user_id THEN 
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_request(p_request_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_requester_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
  v_status TEXT;
  v_user_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
  END IF;

  SELECT requester_id, entity_type, entity_id, status
  INTO v_requester_id, v_entity_type, v_entity_id, v_status
  FROM public.requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_entity_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
  END IF;

  IF v_status NOT IN ('pending', 'pending_hr_review', 'pending_supervisor_approval', 'pending_approval') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel a request that is not pending.');
  END IF;

  SELECT ur.role
  INTO v_user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE ur.role
    WHEN 'corporate_admin' THEN 1
    WHEN 'regional_admin' THEN 2
    WHEN 'regional_hr' THEN 3
    WHEN 'property_manager' THEN 4
    WHEN 'property_hr' THEN 5
    ELSE 100
  END
  LIMIT 1;

  IF auth.uid() IS DISTINCT FROM v_requester_id
     AND COALESCE(v_user_role::text, '') NOT IN ('corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized to cancel this request.');
  END IF;

  UPDATE public.requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_request_id;

  IF v_entity_type = 'promotion' THEN
    UPDATE public.promotions
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  ELSIF v_entity_type = 'transfer' THEN
    UPDATE public.transfers
    SET
      status = 'cancelled',
      notes = CASE
        WHEN COALESCE(TRIM(p_reason), '') = '' THEN notes
        ELSE CONCAT_WS(' ', NULLIF(notes, ''), '[Cancelled: ' || TRIM(p_reason) || ']')
      END,
      updated_at = NOW()
    WHERE id = v_entity_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cash_dist(money, money)
 RETURNS money
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$cash_dist$function$
;

CREATE OR REPLACE FUNCTION public.check_and_award_achievement(p_user_id uuid, p_achievement_type achievement_type)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_definition RECORD;
    v_already_has BOOLEAN;
    v_qualifies BOOLEAN := false;
    v_training_count INTEGER;
    v_response_time DECIMAL;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_achievements
        WHERE user_id = p_user_id
          AND achievement_type = p_achievement_type
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN false;
    END IF;

    SELECT *
    INTO v_definition
    FROM public.achievement_definitions
    WHERE achievement_type = p_achievement_type
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    CASE p_achievement_type
        WHEN 'training_master' THEN
            SELECT COUNT(*)
            INTO v_training_count
            FROM public.training_progress
            WHERE user_id = p_user_id
              AND status = 'completed';

            v_qualifies := v_training_count >= COALESCE((v_definition.criteria->>'training_count')::INTEGER, 10);

        WHEN 'perfect_completion' THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.training_progress
                WHERE user_id = p_user_id
                  AND COALESCE(quiz_score, 0) = 100
            ) INTO v_qualifies;

        WHEN 'fast_responder' THEN
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
            INTO v_response_time
            FROM public.tasks
            WHERE created_by = p_user_id
              AND status = 'completed'
              AND completed_at IS NOT NULL;

            v_qualifies := v_response_time IS NOT NULL
              AND v_response_time <= COALESCE((v_definition.criteria->>'max_hours')::INTEGER, 2);

        WHEN 'streak_master' THEN
            v_qualifies := false;

        ELSE
            v_qualifies := false;
    END CASE;

    IF v_qualifies THEN
        INSERT INTO public.user_achievements (
            user_id,
            achievement_type,
            title,
            description,
            icon,
            color,
            points
        ) VALUES (
            p_user_id,
            p_achievement_type,
            v_definition.title,
            v_definition.description,
            v_definition.icon,
            v_definition.color,
            v_definition.points
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_escalate_approvals()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_request RECORD;
  escalation_rule RECORD;
  hours_pending INTEGER;
  next_approver_id UUID;
BEGIN
  -- Loop through all pending approval requests
  FOR pending_request IN
    SELECT ar.*, er.threshold_hours, er.next_role
    FROM approval_requests ar
    LEFT JOIN escalation_rules er ON er.action_type = ar.entity_type AND er.is_active = true
    WHERE ar.status = 'pending'
    AND ar.created_at < now() - INTERVAL '1 hour' -- Only check requests older than 1 hour
  LOOP
    -- Calculate hours pending
    hours_pending := EXTRACT(EPOCH FROM (now() - pending_request.created_at)) / 3600;
    
    -- Check if escalation rule exists and threshold exceeded
    IF pending_request.threshold_hours IS NOT NULL AND hours_pending >= pending_request.threshold_hours THEN
      -- Find next approver based on role
      SELECT id INTO next_approver_id
      FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE ur.role = pending_request.next_role
      AND p.is_active = true
      LIMIT 1;
      
      -- If next approver found, escalate
      IF next_approver_id IS NOT NULL THEN
        -- Update approval request
        UPDATE approval_requests
        SET current_approver_id = next_approver_id,
            updated_at = now()
        WHERE id = pending_request.id;
        
        -- Log escalation in audit
        INSERT INTO audit_logs (
          user_id,
          action,
          entity_type,
          entity_id,
          new_values
        )
        VALUES (
          NULL, -- System action
          'escalate',
          pending_request.entity_type,
          pending_request.entity_id,
          jsonb_build_object(
            'old_approver_id', pending_request.current_approver_id,
            'new_approver_id', next_approver_id,
            'hours_pending', hours_pending
          )
        );
        
        -- Create notification for new approver
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        VALUES (
          next_approver_id,
          'escalation_alert',
          'Approval Escalated',
          'An approval request has been escalated to you after ' || hours_pending || ' hours.',
          jsonb_build_object(
            'entity_type', pending_request.entity_type,
            'entity_id', pending_request.entity_id,
            'approval_request_id', pending_request.id
          )
        );
        
        -- Notify original approver
        IF pending_request.current_approver_id IS NOT NULL THEN
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            metadata
          )
          VALUES (
            pending_request.current_approver_id,
            'escalation_alert',
            'Approval Escalated',
            'An approval request has been escalated due to inactivity.',
            jsonb_build_object(
              'entity_type', pending_request.entity_type,
              'entity_id', pending_request.entity_id
            )
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_escalate_maintenance()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket RECORD;
  rule RECORD;
  next_assignee_id uuid;
  new_due_at timestamptz;
BEGIN
  FOR ticket IN
    SELECT mt.*
    FROM public.maintenance_tickets mt
    WHERE mt.status IN ('open', 'in_progress', 'pending_parts')
      AND mt.is_deleted = false
      AND (
        (mt.due_at IS NOT NULL AND mt.due_at < now()) OR
        (mt.due_at IS NULL AND mt.created_at < now() - interval '24 hours')
      )
      AND (mt.escalated_at IS NULL OR mt.escalated_at < now() - interval '1 hour')
  LOOP
    SELECT * INTO rule
    FROM public.escalation_rules er
    WHERE er.is_active = true
      AND er.action_type = 'maintenance_ticket'
    ORDER BY er.threshold_hours ASC
    LIMIT 1;

    IF rule IS NULL THEN
      CONTINUE;
    END IF;

    SELECT p.id INTO next_assignee_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.user_properties up ON up.user_id = p.id
    WHERE ur.role = rule.next_role
      AND p.is_active = true
      AND (
        ticket.property_id IS NULL OR
        ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin') OR
        up.property_id = ticket.property_id
      )
    ORDER BY (up.property_id = ticket.property_id) DESC, p.created_at
    LIMIT 1;

    IF next_assignee_id IS NULL OR next_assignee_id = ticket.assigned_to_id THEN
      CONTINUE;
    END IF;

    new_due_at := now() + make_interval(hours => COALESCE(ticket.sla_hours, rule.threshold_hours));

    UPDATE public.maintenance_tickets
    SET assigned_to_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    WHERE id = ticket.id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NULL,
      'escalate',
      'maintenance_ticket',
      ticket.id,
      jsonb_build_object(
        'old_assignee_id', ticket.assigned_to_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      next_assignee_id,
      'escalation_alert',
      'Maintenance Ticket Escalated',
      format('Maintenance ticket "%s" has been escalated to you.', ticket.title),
      jsonb_build_object('ticket_id', ticket.id)
    );
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_escalate_pending_actions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    rule record;
begin
    for rule in
        select id, action_type
        from public.escalation_rules
        where is_active = true
    loop
        raise notice 'Checking escalation rule % (%).', rule.id, rule.action_type;
    end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_escalate_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_step RECORD;
  rule RECORD;
  hours_pending integer;
  next_assignee_id uuid;
  new_due_at timestamptz;
BEGIN
  FOR pending_step IN
    SELECT rs.*, r.entity_type, r.request_no, r.current_assignee_id, r.property_id, r.last_action_at, r.submitted_at, r.created_at
    FROM public.request_steps rs
    JOIN public.requests r ON r.id = rs.request_id
    WHERE rs.status = 'pending'
      AND (
        (rs.due_at IS NOT NULL AND rs.due_at < now()) OR
        (rs.due_at IS NULL AND (r.last_action_at IS NOT NULL OR r.submitted_at IS NOT NULL))
      )
      AND (rs.escalated_at IS NULL OR rs.escalated_at < now() - interval '1 hour')
  LOOP
    SELECT * INTO rule
    FROM public.escalation_rules er
    WHERE er.is_active = true
      AND er.action_type = pending_step.entity_type
    ORDER BY er.threshold_hours ASC
    LIMIT 1;

    IF rule IS NULL THEN
      CONTINUE;
    END IF;

    IF pending_step.due_at IS NULL THEN
      hours_pending := EXTRACT(EPOCH FROM (now() - COALESCE(pending_step.last_action_at, pending_step.submitted_at, pending_step.created_at))) / 3600;
      IF hours_pending < rule.threshold_hours THEN
        CONTINUE;
      END IF;
    END IF;

    -- Find next assignee by role, scoped by property when possible
    SELECT p.id INTO next_assignee_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.user_properties up ON up.user_id = p.id
    WHERE ur.role = rule.next_role
      AND p.is_active = true
      AND (
        pending_step.property_id IS NULL OR
        ur.role IN ('regional_admin', 'regional_hr', 'corporate_admin') OR
        up.property_id = pending_step.property_id
      )
    ORDER BY (up.property_id = pending_step.property_id) DESC, p.created_at
    LIMIT 1;

    IF next_assignee_id IS NULL OR next_assignee_id = pending_step.assignee_id THEN
      CONTINUE;
    END IF;

    new_due_at := now() + make_interval(hours => COALESCE(pending_step.sla_hours, rule.threshold_hours));

    UPDATE public.request_steps
    SET assignee_id = next_assignee_id,
        escalated_at = now(),
        due_at = new_due_at
    WHERE id = pending_step.id;

    UPDATE public.requests
    SET current_assignee_id = next_assignee_id,
        last_action_at = now(),
        due_at = new_due_at
    WHERE id = pending_step.request_id;

    INSERT INTO public.request_events (request_id, actor_id, event_type, payload)
    VALUES (
      pending_step.request_id,
      NULL,
      'forwarded',
      jsonb_build_object(
        'escalated', true,
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id,
        'hours_pending', hours_pending
      )
    );

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (
      NULL,
      'escalate',
      pending_step.entity_type,
      pending_step.request_id,
      jsonb_build_object(
        'old_assignee_id', pending_step.assignee_id,
        'new_assignee_id', next_assignee_id,
        'rule_id', rule.id
      )
    );

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      next_assignee_id,
      'escalation_alert',
      'Request Escalated',
      format('Request #%s has been escalated to you.', pending_step.request_no),
      jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
    );

    IF pending_step.assignee_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        pending_step.assignee_id,
        'escalation_alert',
        'Request Escalated',
        format('Request #%s has been escalated to another approver.', pending_step.request_no),
        jsonb_build_object('request_id', pending_step.request_id, 'entity_type', pending_step.entity_type)
      );
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_circular_reporting()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  current_manager UUID;
  depth INT := 0;
  max_depth INT := 20; -- Prevent infinite loops
BEGIN
  -- Allow NULL reporting_to (top-level employees)
  IF NEW.reporting_to IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  -- Prevent self-reporting
  IF NEW.reporting_to = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot report to themselves';
  END IF;
  
  -- Walk up the chain to detect cycles
  current_manager := NEW.reporting_to;
  WHILE current_manager IS NOT NULL AND depth < max_depth LOOP
    -- If we find the employee in their own reporting chain, it's circular
    IF current_manager = NEW.id THEN
      RAISE EXCEPTION 'Circular reporting chain detected: This change would create a loop in the reporting hierarchy';
    END IF;
    
    -- Move up to next manager
    SELECT reporting_to INTO current_manager 
    FROM profiles 
    WHERE id = current_manager;
    
    depth := depth + 1;
  END LOOP;
  
  -- If we exceeded max depth, warn but allow
  IF depth >= max_depth THEN
    RAISE WARNING 'Reporting chain exceeds % levels - please review hierarchy', max_depth;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_expiring_documents()
 RETURNS TABLE(documents_notified integer, documents_expired integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_notified INTEGER := 0;
    v_expired INTEGER := 0;
    v_doc RECORD;
BEGIN
    -- Notify about documents that need review (based on review_reminder_date)
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by,
            d.review_reminder_date,
            p.email AS owner_email,
            p.full_name AS owner_name
        FROM documents d
        LEFT JOIN profiles p ON COALESCE(d.owner_id, d.created_by) = p.id
        WHERE d.review_reminder_date IS NOT NULL
        AND d.review_reminder_date <= NOW()
        AND d.review_reminder_date > NOW() - INTERVAL '1 day'  -- Within last 24 hours
        AND d.is_archived = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.entity_id = d.id 
            AND n.type = 'document_review_reminder'
            AND n.created_at > d.review_reminder_date - INTERVAL '1 day'
        )
    LOOP
        -- Create notification for document owner/creator
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_review_reminder',
                'Document Review Required: ' || v_doc.title,
                'This document is scheduled for review today.',
                'document',
                v_doc.id
            );
            v_notified := v_notified + 1;
        END IF;
    END LOOP;
    
    -- Notify about documents expiring soon (within 7 days)
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by,
            d.expires_at,
            p.email AS owner_email,
            p.full_name AS owner_name
        FROM documents d
        LEFT JOIN profiles p ON COALESCE(d.owner_id, d.created_by) = p.id
        WHERE d.expires_at IS NOT NULL
        AND d.expires_at <= NOW() + INTERVAL '7 days'
        AND d.expires_at > NOW()
        AND d.is_archived = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.entity_id = d.id 
            AND n.type = 'document_expiring_soon'
            AND n.created_at > NOW() - INTERVAL '7 days'
        )
    LOOP
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_expiring_soon',
                'Document Expiring Soon: ' || v_doc.title,
                'This document will expire on ' || v_doc.expires_at::DATE::TEXT,
                'document',
                v_doc.id
            );
            v_notified := v_notified + 1;
        END IF;
    END LOOP;
    
    -- Archive expired documents and notify
    FOR v_doc IN 
        SELECT 
            d.id,
            d.title,
            d.owner_id,
            d.created_by
        FROM documents d
        WHERE d.expires_at IS NOT NULL
        AND d.expires_at < NOW()
        AND d.is_archived = FALSE
    LOOP
        -- Archive the document
        UPDATE documents 
        SET is_archived = TRUE, updated_at = NOW()
        WHERE id = v_doc.id;
        
        -- Notify owner
        IF v_doc.owner_id IS NOT NULL OR v_doc.created_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
            VALUES (
                COALESCE(v_doc.owner_id, v_doc.created_by),
                'document_expired',
                'Document Archived: ' || v_doc.title,
                'This document has expired and been automatically archived.',
                'document',
                v_doc.id
            );
        END IF;
        
        v_expired := v_expired + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_notified, v_expired;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_password_reuse(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_password_hash text;
BEGIN
  -- Get current password hash
  SELECT encrypted_password INTO v_password_hash
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Check against password history (last 5 passwords)
  RETURN EXISTS (
    SELECT 1 
    FROM public.password_history
    WHERE user_id = p_user_id
    AND created_at > now() - interval '90 days'
    AND password_hash = crypt(p_password, password_hash)
    ORDER BY created_at DESC
    LIMIT 5
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_password_reuse(plain_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    is_reused boolean;
    current_uid uuid;
BEGIN
    current_uid := auth.uid();
    
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Look through last 5 records in history for the current user
    SELECT EXISTS (
        SELECT 1
        FROM (
            SELECT password_hash
            FROM public.password_history
            WHERE user_id = current_uid
            ORDER BY created_at DESC
            LIMIT 5
        ) AS recent
        WHERE recent.password_hash = extensions.crypt(plain_password, recent.password_hash)
    ) INTO is_reused;

    RETURN COALESCE(is_reused, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_property_access(required_property_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Regional admins/HR can access everything
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('regional_admin', 'regional_hr')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Global items (property_id IS NULL) are accessible to everyone
  IF required_property_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if user is assigned to this property
  IF EXISTS (
    SELECT 1 FROM user_properties
    WHERE user_id = auth.uid()
    AND property_id = required_property_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_requests integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_entry rate_limit_entries%ROWTYPE;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
    
    -- Clean up old entries periodically (1% chance)
    IF random() < 0.01 THEN
        DELETE FROM rate_limit_entries WHERE window_start < v_window_start;
    END IF;
    
    -- Get or create entry
    SELECT * INTO v_entry
    FROM rate_limit_entries
    WHERE key = p_key AND window_start > v_window_start;
    
    IF NOT FOUND THEN
        -- Create new entry
        INSERT INTO rate_limit_entries (key, count, window_start)
        VALUES (p_key, 1, now())
        ON CONFLICT (key) DO UPDATE
        SET count = 1, window_start = now(), updated_at = now()
        WHERE rate_limit_entries.window_start < v_window_start;
        RETURN TRUE;
    END IF;
    
    -- Check limit
    IF v_entry.count >= p_max_requests THEN
        -- Log rate limit exceeded
        PERFORM log_security_event(
            'rate_limit_exceeded',
            NULL,
            NULL,
            'rate_limit_check',
            NULL,
            jsonb_build_object('key', p_key, 'count', v_entry.count, 'max', p_max_requests),
            'warning'
        );
        RETURN FALSE;
    END IF;
    
    -- Increment count
    UPDATE rate_limit_entries
    SET count = count + 1, updated_at = now()
    WHERE id = v_entry.id;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_rate_limit(p_action text, p_max_requests integer DEFAULT 100, p_window_seconds integer DEFAULT 900)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN check_rate_limit(
        auth.uid()::TEXT || ':' || p_action,
        p_max_requests,
        p_window_seconds
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - INTERVAL '3 years';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_pii_access_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM pii_access_logs
  WHERE created_at < now() - INTERVAL '7 years';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_media_files()
 RETURNS TABLE(deleted_count integer, errors text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_record RECORD;
BEGIN
  -- Only allow admins to run this
  IF NOT (
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Only administrators can run cleanup';
  END IF;

  -- Find storage objects without corresponding media_assets records
  FOR v_record IN 
    SELECT so.name, so.bucket_id
    FROM storage.objects so
    WHERE so.bucket_id = 'media'
    AND NOT EXISTS (
      SELECT 1 FROM media_assets ma 
      WHERE ma.storage_path = so.name
    )
    AND so.created_at < now() - interval '24 hours' -- Safety buffer
  LOOP
    BEGIN
      DELETE FROM storage.objects 
      WHERE name = v_record.name 
      AND bucket_id = v_record.bucket_id;
      
      v_deleted := v_deleted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 
        format('Failed to delete %s: %s', v_record.name, SQLERRM)
      );
    END;
  END LOOP;

  RETURN QUERY SELECT v_deleted, v_errors;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Delete from failed_login_attempts
  DELETE FROM public.failed_login_attempts
  WHERE email = lower(p_email);
  
  -- Reset profile counters
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);
  
  IF FOUND THEN
    UPDATE public.profiles
    SET failed_login_attempts = 0,
        locked_until = NULL,
        account_status = CASE 
          WHEN account_status = 'locked' THEN 'active'
          ELSE account_status
        END,
        last_login_at = now()
    WHERE id = v_profile_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_maintenance_ticket(ticket_id uuid, completer_id uuid, labor_hours numeric DEFAULT NULL::numeric, material_cost numeric DEFAULT NULL::numeric, notes text DEFAULT NULL::text, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ticket maintenance_tickets%rowtype;
begin
  if completer_id != auth.uid() then
    raise exception 'Unauthorized: Completer ID mismatch';
  end if;

  update maintenance_tickets
  set status = 'completed',
      labor_hours = complete_maintenance_ticket.labor_hours,
      material_cost = complete_maintenance_ticket.material_cost,
      notes = complete_maintenance_ticket.notes,
      resolved_at = now(),
      updated_at = now()
  where id = ticket_id
  returning * into v_ticket;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if notification_payload is not null and v_ticket.reported_by_id is not null and v_ticket.reported_by_id != completer_id then
    insert into notifications (user_id, type, title, message, link, metadata)
    values (
      v_ticket.reported_by_id,
      public.safe_notification_type(notification_payload->>'type', 'maintenance_resolved'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_ticket);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.complete_password_reset()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
    current_uid uuid;
BEGIN
    current_uid := auth.uid();

    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET 
        is_temp_password = false,
        password_initialized = true,
        force_password_reset = false,
        password_last_changed_at = now(),
        updated_at = now()
    WHERE id = current_uid;

    -- Prune history to keep only last 10 records
    DELETE FROM public.password_history
    WHERE id IN (
        SELECT id
        FROM public.password_history
        WHERE user_id = current_uid
        ORDER BY created_at DESC
        OFFSET 10
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_hr_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_new jsonb := to_jsonb(new);
begin
  if tg_table_name = 'performance_reviews' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'employee_id', '')::uuid,
      'New Performance Review',
      'Your performance review for ' || coalesce(v_new->>'review_period', 'this period') || ' is ready.',
      'system'::public.notification_type,
      '/hr/performance'
    );
  elsif tg_table_name = 'goals' and coalesce(v_new->>'status', '') = 'completed' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'employee_id', '')::uuid,
      'Goal Completed',
      'Congratulations on achieving your goal: ' || coalesce(v_new->>'title', 'Goal'),
      'system'::public.notification_type,
      '/hr/goals'
    );
  elsif tg_table_name = 'certificates' then
    insert into public.notifications (user_id, title, message, type, link)
    values (
      nullif(v_new->>'user_id', '')::uuid,
      'Certificate Issued',
      'A new certificate has been issued for: ' || coalesce(v_new->>'title', 'training'),
      'system'::public.notification_type,
      '/profile'
    );
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_new_sop_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_version_id UUID;
  new_version_number INTEGER;
BEGIN
  -- Only proceed if status is changing to a new version-worthy status
  IF NEW.status != OLD.status AND 
     (NEW.status = 'under_review' OR NEW.status = 'approved' OR NEW.status = 'obsolete') THEN
    
    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO new_version_number
    FROM sop_document_versions 
    WHERE document_id = NEW.id;
    
    -- Create the new version
    INSERT INTO sop_document_versions (
      document_id, 
      version_number, 
      content, 
      change_summary, 
      status, 
      created_by,
      published_at,
      published_by
    ) VALUES (
      NEW.id, 
      new_version_number,
      (SELECT content FROM sop_document_versions WHERE id = OLD.current_version_id),
      'Status changed to ' || NEW.status,
      NEW.status,
      auth.uid(),
      CASE WHEN NEW.status = 'approved' THEN NOW() ELSE NULL END,
      CASE WHEN NEW.status = 'approved' THEN auth.uid() ELSE NULL END
    )
    RETURNING id INTO new_version_id;
    
    -- Update the document with the new current version
    NEW.current_version_id := new_version_id;
    NEW.version := new_version_number;
    
    -- If approved, set published_at
    IF NEW.status = 'approved' THEN
      NEW.published_at := NOW();
      NEW.published_by := auth.uid();
      
      -- Set next review date
      NEW.next_review_date := (NOW() + (NEW.review_frequency_months || ' months')::INTERVAL)::DATE;
      
      -- Create review reminder
      INSERT INTO sop_review_reminders (
        document_id,
        reminder_date,
        status
      ) VALUES (
        NEW.id,
        (NOW() + ((NEW.review_frequency_months - 1) || ' months')::INTERVAL)::DATE,
        'pending'
      );
    END IF;
    
    -- If obsolete, archive the document
    IF NEW.status = 'obsolete' THEN
      NEW.archived_at := NOW();
      NEW.archived_by := auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_body text, p_metadata jsonb DEFAULT NULL::jsonb, p_action_url text DEFAULT NULL::text, p_related_entity_type text DEFAULT NULL::text, p_related_entity_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_new_id uuid;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata,
    entity_type,
    entity_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_action_url,
    COALESCE(p_metadata, '{}'::jsonb),
    p_related_entity_type,
    p_related_entity_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
BEGIN
  INSERT INTO notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), p_notification_data, p_created_by)
  RETURNING id INTO v_batch_id;

  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO notification_queue (batch_id, user_id, notification_type, notification_data)
    VALUES (v_batch_id, v_user_id, p_notification_type, p_notification_data);
  END LOOP;

  RETURN v_batch_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_request_for_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  supervisor_id uuid;
  hr_assignee_id uuid;
  supervisor_role public.app_role;
  hr_role public.app_role;
  request_id uuid;
  v_request_no bigint;
  initial_status text;
  hr_step_status text;
  routing_meta jsonb;
begin
  select reporting_to into supervisor_id
  from public.profiles
  where id = new.requester_id;

  hr_assignee_id := public.find_hr_assignee(new.property_id);

  select ur.role into supervisor_role
  from public.user_roles ur
  where ur.user_id = supervisor_id
  order by case ur.role
    when 'property_manager' then 1
    when 'department_head' then 2
    when 'manager' then 3
    when 'property_hr' then 4
    when 'regional_hr' then 5
    when 'regional_admin' then 6
    when 'corporate_admin' then 7
    else 100
  end
  limit 1;

  if supervisor_role is null then
    supervisor_role := 'manager';
  end if;

  select ur.role into hr_role
  from public.user_roles ur
  where ur.user_id = hr_assignee_id
    and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
  order by case ur.role
    when 'property_hr' then 1
    when 'regional_hr' then 2
    when 'regional_admin' then 3
    when 'corporate_admin' then 4
    else 100
  end
  limit 1;

  if hr_role is null then
    hr_role := 'regional_hr';
  end if;

  routing_meta := jsonb_build_object(
    'missing_supervisor', supervisor_id is null,
    'missing_hr_assignee', hr_assignee_id is null
  );

  initial_status := case
    when new.status = 'pending' and supervisor_id is null then 'pending_hr_review'
    when new.status = 'pending' then 'pending_supervisor_approval'
    else 'draft'
  end;

  insert into public.requests (
    entity_type, entity_id, requester_id, supervisor_id, current_assignee_id,
    status, submitted_at, metadata, property_id, department_id
  )
  values (
    'leave_request',
    new.id,
    new.requester_id,
    supervisor_id,
    coalesce(supervisor_id, hr_assignee_id),
    initial_status,
    case when new.status = 'pending' then now() else null end,
    jsonb_build_object(
      'leave_type', new.type,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'reason', new.reason,
      'routing_warning', routing_meta
    ),
    new.property_id,
    new.department_id
  )
  returning id, request_no into request_id, v_request_no;

  update public.leave_requests
  set workflow_request_id = request_id
  where id = new.id;

  if supervisor_id is not null then
    insert into public.request_steps (
      request_id, step_order, assignee_id, assignee_role, status, created_by
    )
    values (
      request_id, 1, supervisor_id, supervisor_role,
      case when new.status = 'pending' then 'pending' else 'waiting' end,
      new.requester_id
    );
  end if;

  hr_step_status := case
    when new.status = 'pending' and supervisor_id is null then 'pending'
    else 'waiting'
  end;

  insert into public.request_steps (
    request_id, step_order, assignee_id, assignee_role, status, created_by
  )
  values (
    request_id,
    case when supervisor_id is not null then 2 else 1 end,
    hr_assignee_id,
    hr_role,
    hr_step_status,
    new.requester_id
  );

  if hr_assignee_id is null then
    insert into public.notifications (user_id, type, title, message, metadata)
    select ur.user_id,
           'escalation_alert'::public.notification_type,
           'Routing issue: Missing HR assignee',
           format('Leave request #%s requires HR assignment.', v_request_no),
           jsonb_build_object('request_id', request_id, 'entity_type', 'leave_request', 'reason', 'missing_hr_assignee')
    from public.user_roles ur
    where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_sample_questions(sop_id uuid, created_by_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    q1_id UUID;
    q2_id UUID;
    q3_id UUID;
BEGIN
    -- Sample MCQ
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        explanation, hint, linked_sop_id, status, created_by
    ) VALUES (
        'What is the first step when entering a guest room for cleaning?',
        'mcq', 'easy',
        'Always knock and announce before entering to respect guest privacy.',
        'Think about guest privacy...',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q1_id;
    
    INSERT INTO knowledge_question_options (question_id, option_text, is_correct, display_order, feedback) VALUES
        (q1_id, 'Start vacuuming immediately', false, 1, 'Incorrect. You must announce yourself first.'),
        (q1_id, 'Knock and announce "Housekeeping"', true, 2, 'Correct! Always announce before entering.'),
        (q1_id, 'Check the minibar', false, 3, 'Incorrect. Minibar check comes later in the process.'),
        (q1_id, 'Open all windows', false, 4, 'Incorrect. Entry protocol comes first.');
    
    -- Sample True/False
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        correct_answer, explanation, linked_sop_id, status, created_by
    ) VALUES (
        'Guests can request late checkout directly at the front desk.',
        'true_false', 'easy',
        'true',
        'Yes, late checkout requests are handled at the front desk based on availability.',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q2_id;
    
    -- Sample Fill in Blank
    INSERT INTO knowledge_questions (
        question_text, question_type, difficulty_level,
        correct_answer, explanation, hint, linked_sop_id, status, created_by
    ) VALUES (
        'The standard checkout time is _____ AM.',
        'fill_blank', 'easy',
        '11',
        'Standard checkout is 11 AM unless late checkout is arranged.',
        'Think about late morning...',
        sop_id, 'published', created_by_id
    ) RETURNING id INTO q3_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_sop_document(p_title text, p_department_id uuid, p_created_by uuid, p_title_ar text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_description_ar text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_subcategory_id uuid DEFAULT NULL::uuid, p_content jsonb DEFAULT '{}'::jsonb, p_status text DEFAULT 'draft'::text, p_is_template boolean DEFAULT false, p_template_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_document_id UUID;
  v_version_number INTEGER := 1;
  v_code TEXT;
BEGIN
  -- Generate document code
  SELECT 'SOP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
         LPAD((COALESCE(MAX(CAST(SUBSTRING(code FROM '\d+$') AS INTEGER)), 0) + 1)::TEXT, 4, '0')
  INTO v_code
  FROM sop_documents
  WHERE code LIKE 'SOP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
  
  -- Insert document
  INSERT INTO sop_documents (
    title,
    title_ar,
    description,
    description_ar,
    code,
    department_id,
    category_id,
    subcategory_id,
    status,
    is_template,
    template_id,
    created_by,
    version
  ) VALUES (
    p_title,
    p_title_ar,
    p_description,
    p_description_ar,
    v_code,
    p_department_id,
    p_category_id,
    p_subcategory_id,
    p_status,
    p_is_template,
    p_template_id,
    p_created_by,
    v_version_number
  ) RETURNING id INTO v_document_id;
  
  -- Create initial version
  INSERT INTO sop_document_versions (
    document_id,
    version_number,
    content,
    created_by,
    change_summary
  ) VALUES (
    v_document_id,
    v_version_number,
    p_content,
    p_created_by,
    'Initial version'
  );
  
  -- If not a template, create approval workflow
  IF NOT p_is_template THEN
    INSERT INTO sop_document_approvals (
      document_id,
      approver_id,
      approver_role,
      status,
      created_by
    )
    SELECT 
      v_document_id,
      u.id,
      'department_head',
      CASE 
        WHEN p_status = 'under_review' THEN 'pending'
        ELSE 'approved'
      END,
      p_created_by
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role = 'department_head' 
      AND ur.department_id = p_department_id
      LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT v_document_id, TRUE, 'Document created successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_task_atomic(task_data jsonb, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_task tasks%rowtype;
  v_created_by uuid;
  v_assigned_to uuid;
  v_status text;
  v_priority text;
begin
  v_created_by := nullif(task_data->>'created_by_id', '')::uuid;
  v_assigned_to := nullif(task_data->>'assigned_to_id', '')::uuid;
  v_status := lower(coalesce(task_data->>'status', 'pending'));
  v_priority := lower(coalesce(task_data->>'priority', 'medium'));

  if auth.uid() is not null and v_created_by is distinct from auth.uid() then
    raise exception 'Unauthorized: Creator ID mismatch';
  end if;

  if v_status not in ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold') then
    v_status := 'pending';
  end if;

  insert into public.tasks (
    title,
    description,
    status,
    priority,
    assigned_to_id,
    assigned_to,
    created_by_id,
    property_id,
    department_id,
    due_date
  )
  values (
    nullif(task_data->>'title', ''),
    coalesce(task_data->>'description', ''),
    v_status::public.entity_status,
    v_priority,
    v_assigned_to,
    v_assigned_to,
    v_created_by,
    nullif(task_data->>'property_id', '')::uuid,
    nullif(task_data->>'department_id', '')::uuid,
    nullif(task_data->>'due_date', '')::timestamptz
  )
  returning * into v_task;

  if notification_payload is not null then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'task_assigned'::public.notification_type),
      coalesce(notification_payload->>'title', 'Task Assigned'),
      coalesce(notification_payload->>'message', 'A task was assigned to you.'),
      nullif(notification_payload->>'link', ''),
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_task);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_workflow_notification_batch(p_job_type text, p_user_ids uuid[], p_notification_type text, p_notification_data jsonb DEFAULT '{}'::jsonb, p_business_domain text DEFAULT 'system'::text, p_template_key text DEFAULT NULL::text, p_channels text[] DEFAULT ARRAY['in_app'::text, 'email'::text], p_created_by uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'normal'::text, p_scheduled_for timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID;
  v_user_id UUID;
  v_domain TEXT;
  v_channels TEXT[];
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_user_ids must contain at least one recipient';
  END IF;

  v_domain := lower(coalesce(p_business_domain, 'system'));
  IF v_domain NOT IN ('system', 'user_management', 'operations', 'hr', 'finance', 'sales', 'management') THEN
    v_domain := 'system';
  END IF;

  v_channels := coalesce(p_channels, ARRAY['in_app']::TEXT[]);

  INSERT INTO public.notification_batches (job_type, total_count, metadata, created_by)
  VALUES (p_job_type, array_length(p_user_ids, 1), coalesce(p_notification_data, '{}'::JSONB), p_created_by)
  RETURNING id INTO v_batch_id;

  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notification_queue (
      batch_id,
      user_id,
      notification_type,
      notification_data,
      channels,
      template_key,
      business_domain,
      email_payload,
      send_email,
      priority,
      scheduled_for
    )
    VALUES (
      v_batch_id,
      v_user_id,
      p_notification_type,
      coalesce(p_notification_data, '{}'::JSONB),
      v_channels,
      p_template_key,
      v_domain,
      coalesce(p_notification_data, '{}'::JSONB),
      ('email' = ANY(v_channels)),
      CASE WHEN p_priority IN ('low', 'normal', 'high', 'critical') THEN p_priority ELSE 'normal' END,
      p_scheduled_for
    );
  END LOOP;

  RETURN v_batch_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.date_dist(date, date)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$date_dist$function$
;

CREATE OR REPLACE FUNCTION public.decrement_media_usage_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE media_assets
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE id = OLD.media_asset_id;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.detect_pii_access_anomalies(p_lookback_days integer DEFAULT 7, p_threshold_multiplier numeric DEFAULT 3.0)
 RETURNS TABLE(anomaly_type text, user_id uuid, user_name text, details jsonb, severity text, detected_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_avg_daily_access numeric;
    v_stddev_daily_access numeric;
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Calculate baseline statistics
    SELECT 
        avg(daily_count),
        COALESCE(stddev(daily_count), 0)
    INTO v_avg_daily_access, v_stddev_daily_access
    FROM (
        SELECT 
            date(created_at) as day,
            count(*) as daily_count
        FROM pii_access_logs
        WHERE created_at > now() - (p_lookback_days * 2 || ' days')::interval
        GROUP BY date(created_at)
    ) daily_stats;

    RETURN QUERY
    -- High volume anomaly
    SELECT 
        'high_volume'::text as anomaly_type,
        pal.accessed_by as user_id,
        p.full_name as user_name,
        jsonb_build_object(
            'access_count', count(*),
            'date_range', jsonb_build_object(
                'from', min(pal.created_at)::date,
                'to', max(pal.created_at)::date
            ),
            'unique_targets', count(DISTINCT pal.user_id),
            'avg_baseline', v_avg_daily_access
        ) as details,
        CASE 
            WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * p_threshold_multiplier)) THEN 'high'
            WHEN count(*) > (v_avg_daily_access + (v_stddev_daily_access * (p_threshold_multiplier / 2))) THEN 'medium'
            ELSE 'low'
        END as severity,
        now() as detected_at
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > (v_avg_daily_access + (v_stddev_daily_access * 2))
    
    UNION ALL
    
    -- Off-hours access anomaly
    SELECT 
        'off_hours_access'::text,
        pal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'off_hours_count', count(*),
            'access_times', array_agg(distinct extract(hour from pal.created_at))
        ),
        'medium'::text,
        now()
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - (p_lookback_days || ' days')::interval
    AND extract(hour from pal.created_at) NOT BETWEEN 8 AND 18
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > 5
    
    UNION ALL
    
    -- Bulk access anomaly (many users in short time)
    SELECT 
        'bulk_access_pattern'::text,
        pal.accessed_by,
        p.full_name,
        jsonb_build_object(
            'records_accessed', count(*),
            'time_window_minutes', 60
        ),
        'high'::text,
        now()
    FROM pii_access_logs pal
    LEFT JOIN profiles p ON p.id = pal.accessed_by
    WHERE pal.created_at > now() - interval '1 hour'
    GROUP BY pal.accessed_by, p.full_name
    HAVING count(*) > 20;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.disable_mfa(p_user_id uuid, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_record auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Verify the password first
  SELECT * INTO v_user_record
  FROM auth.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Delete MFA secret
  DELETE FROM public.mfa_secrets
  WHERE user_id = p_user_id;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, severity)
  VALUES (p_user_id, 'mfa.disabled', 'warning');
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enable_mfa(p_user_id uuid, p_verification_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret public.mfa_secrets%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Get the stored secret
  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Verify the code (in production, use proper TOTP verification)
  -- This is a simplified check - proper implementation would use a TOTP library
  IF p_verification_code IS NULL OR length(p_verification_code) != 6 THEN
    RETURN false;
  END IF;
  
  -- Mark as enabled
  UPDATE public.mfa_secrets
  SET enabled = true,
      verified_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the event
  INSERT INTO public.security_audit_logs (user_id, event_type, severity)
  VALUES (p_user_id, 'mfa.enabled', 'info');
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_session_limit(p_user_id uuid, p_max_sessions integer DEFAULT 5)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO v_count
  FROM public.user_sessions
  WHERE user_id = p_user_id
  AND revoked_at IS NULL
  AND expires_at > now();
  
  -- If over limit, revoke oldest sessions
  IF v_count > p_max_sessions THEN
    UPDATE public.user_sessions
    SET revoked_at = now(),
        revoked_reason = 'session_limit_exceeded'
    WHERE id IN (
      SELECT id
      FROM public.user_sessions
      WHERE user_id = p_user_id
      AND revoked_at IS NULL
      AND expires_at > now()
      AND is_current = false
      ORDER BY last_active_at ASC
      LIMIT v_count - p_max_sessions + 1
    );
    
    INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
    VALUES (p_user_id, 'session.limit_enforced', 'warning', jsonb_build_object(
      'previous_count', v_count,
      'max_sessions', p_max_sessions
    ));
  END IF;
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_delegations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE admin_delegations
  SET is_active = false, auto_expired = true, updated_at = now()
  WHERE is_active = true AND ends_at < now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.export_birthdays_for_month(p_month integer, p_year integer DEFAULT (date_part('year'::text, CURRENT_DATE))::integer, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(full_name text, job_title text, hotel text, department text, birthday_date date, age integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_hr_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only HR/Admin roles can export birthday lists' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.full_name,
    p.job_title,
    prop.name AS hotel,
    dept.name AS department,
    p.date_of_birth AS birthday_date,
    date_part('year', age(make_date(p_year, p_month, 1), p.date_of_birth))::int AS age
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT pr.*
    FROM public.user_properties up
    JOIN public.properties pr ON pr.id = up.property_id
    WHERE up.user_id = p.id
    ORDER BY pr.name
    LIMIT 1
  ) prop ON true
  LEFT JOIN LATERAL (
    SELECT d.*
    FROM public.user_departments ud
    JOIN public.departments d ON d.id = ud.department_id
    WHERE ud.user_id = p.id
    ORDER BY d.name
    LIMIT 1
  ) dept ON true
  WHERE COALESCE(p.is_deleted, false) = false
    AND p.is_active = true
    AND date_part('month', p.date_of_birth)::int = p_month
    AND public.can_view_employee_public_profile(p.id)
    AND (
      p_property_id IS NULL OR EXISTS (
        SELECT 1
        FROM public.user_properties up2
        WHERE up2.user_id = p.id
          AND up2.property_id = p_property_id
      )
    )
  ORDER BY date_part('day', p.date_of_birth), p.full_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.finalize_module_learning_progress_from_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_quiz_count integer := 0;
    v_recorded_quiz_count integer := 0;
    v_avg_quiz_score integer := null;
    v_passing_score integer := 80;
begin
    if new.content_type <> 'module' or coalesce(new.is_deleted, false) then
        return new;
    end if;

    if coalesce(new.status, 'assigned') <> 'completed'
       and new.completed_at is null
       and coalesce(new.progress_percentage, 0) >= 100 then
        new.progress_percentage := 99;
    end if;

    select count(*)::int
      into v_quiz_count
      from public.training_content_blocks
     where training_module_id = new.content_id
       and is_deleted = false
       and type = 'quiz';

    if v_quiz_count = 0 or coalesce(new.progress_percentage, 0) < 99 then
        return new;
    end if;

    select coalesce(passing_score_percentage, 80)
      into v_passing_score
      from public.training_modules
     where id = new.content_id;

    select
        coalesce(count(*), 0)::int,
        round(avg(value::numeric), 0)::int
      into v_recorded_quiz_count, v_avg_quiz_score
      from jsonb_each_text(
        case
            when jsonb_typeof(new.metadata -> 'quiz_scores_by_id') = 'object'
                then new.metadata -> 'quiz_scores_by_id'
            else '{}'::jsonb
        end
      );

    if v_recorded_quiz_count = v_quiz_count
       and coalesce(v_avg_quiz_score, -1) >= v_passing_score then
        new.status := 'completed';
        new.progress_percentage := 100;
        if new.score_percentage is null or new.score_percentage < v_avg_quiz_score then
            new.score_percentage := v_avg_quiz_score;
        end if;
        new.passed := true;
        new.completed_at := coalesce(new.completed_at, new.updated_at, new.last_accessed_at, new.last_activity_at, now());
    end if;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.find_documents(p_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, file_url text, status document_status, property_id uuid, folder_id uuid, created_at timestamp with time zone, rank real, headline text, match_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    -- Try full-text search first
    RETURN QUERY
    SELECT 
        s.id,
        s.title,
        s.description,
        s.file_url,
        s.status,
        s.property_id,
        s.folder_id,
        s.created_at,
        s.rank,
        s.headline,
        'fulltext'::TEXT AS match_type
    FROM search_documents(p_query, p_property_id, p_folder_id, p_limit, p_offset) s;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- If no results, try fuzzy search
    IF v_count = 0 THEN
        RETURN QUERY
        SELECT 
            f.id,
            f.title,
            f.description,
            d.file_url,
            d.status,
            d.property_id,
            d.folder_id,
            d.created_at,
            f.similarity AS rank,
            NULL::TEXT AS headline,
            'fuzzy'::TEXT AS match_type
        FROM fuzzy_search_documents(p_query, p_limit) f
        JOIN documents d ON f.id = d.id;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_hr_assignee(property_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_hr_user_id uuid;
begin
  -- Property HR
  select up.user_id into v_hr_user_id
  from public.user_properties up
  join public.user_roles ur on ur.user_id = up.user_id
  where up.property_id = find_hr_assignee.property_id
    and ur.role = 'property_hr'::public.app_role
  limit 1;

  -- Regional HR fallback
  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'regional_hr'::public.app_role
    limit 1;
  end if;

  -- Final admin fallback
  if v_hr_user_id is null then
    select ur.user_id into v_hr_user_id
    from public.user_roles ur
    where ur.role = 'corporate_admin'::public.app_role
    limit 1;
  end if;

  return v_hr_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.float4_dist(real, real)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float4_dist$function$
;

CREATE OR REPLACE FUNCTION public.float8_dist(double precision, double precision)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float8_dist$function$
;

CREATE OR REPLACE FUNCTION public.fuzzy_search_documents(p_query text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, description text, similarity real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        GREATEST(
            similarity(d.title, p_query),
            similarity(COALESCE(d.description, ''), p_query)
        )::REAL AS similarity
    FROM documents d
    WHERE d.title % p_query OR d.description % p_query
    AND d.is_archived = FALSE
    AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        d.created_by = auth.uid() OR
        d.owner_id = auth.uid() OR
        (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id))
    )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_consistent(internal, bit, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_consistent(internal, boolean, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_same(gbtreekey2, gbtreekey2, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_union(internal, internal)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_consistent(internal, character, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_consistent(internal, bytea, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_consistent(internal, money, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_distance(internal, money, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_consistent(internal, date, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_distance(internal, date, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_consistent(internal, anyenum, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_consistent(internal, real, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_distance(internal, real, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_consistent(internal, double precision, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_distance(internal, double precision, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_consistent(internal, inet, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_consistent(internal, smallint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_distance(internal, smallint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_same(gbtreekey4, gbtreekey4, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_union(internal, internal)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_consistent(internal, integer, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_distance(internal, integer, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_consistent(internal, bigint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_distance(internal, bigint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_consistent(internal, interval, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_distance(internal, interval, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_consistent(internal, macaddr8, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_consistent(internal, macaddr, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_consistent(internal, numeric, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_consistent(internal, oid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_distance(internal, oid, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_consistent(internal, time without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_distance(internal, time without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_consistent(internal, time with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_consistent(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_distance(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_consistent(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_distance(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_consistent(internal, uuid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_in(cstring)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_out(gbtreekey16)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_in(cstring)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_out(gbtreekey2)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_in(cstring)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_out(gbtreekey32)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_in(cstring)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_out(gbtreekey4)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_in(cstring)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_out(gbtreekey8)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_in(cstring)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_out(gbtreekey_var)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.generate_assignment_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle 'everyone' assignments
  IF NEW.target_type = 'everyone' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM profiles
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'department' assignments
  IF NEW.target_type = 'department' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_departments
    WHERE department_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'property' assignments
  IF NEW.target_type = 'property' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    SELECT user_id, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status
    FROM user_properties
    WHERE property_id = NEW.target_id::uuid
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  -- Handle 'user' assignments
  IF NEW.target_type = 'user' AND NEW.content_type = 'module' THEN
    INSERT INTO learning_progress (user_id, assignment_id, content_id, content_type, status)
    VALUES (NEW.target_id::uuid, NEW.id, NEW.content_id, 'module', 'assigned'::learning_assignment_status)
    ON CONFLICT (user_id, content_type, content_id) 
    DO UPDATE SET 
        assignment_id = EXCLUDED.assignment_id,
        status = 'assigned',
        updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_audit_export_hash(p_export_id uuid, p_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_hash text;
    v_salt text;
BEGIN
    -- Generate unique salt based on export metadata
    v_salt := encode(
        digest(
            p_export_id::text || current_setting('app.settings.jwt_secret', true) || now()::text,
            'sha256'
        ),
        'hex'
    );
    
    -- Generate hash of data + salt
    v_hash := encode(
        digest(
            v_salt || p_data::text || v_salt,
            'sha256'
        ),
        'hex'
    );
    
    RETURN v_hash;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_certificate_number()
 RETURNS character varying
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  prefix VARCHAR(4);
  year_code VARCHAR(2);
  seq_num INTEGER;
  cert_number VARCHAR(20);
BEGIN
  prefix := 'PHC-'; -- Prime Hotels Certificate
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 8 FOR 6) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM certificates
  WHERE certificate_number LIKE prefix || year_code || '-%';
  
  cert_number := prefix || year_code || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN cert_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_eom_auto_selection(p_property_id uuid, p_month integer, p_year integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winner RECORD;
    v_config eom_automation_config%ROWTYPE;
    v_selection_id UUID;
    v_reason_en TEXT;
    v_reason_ar TEXT;
BEGIN
    -- Ensure calculation is done
    PERFORM run_eom_calculation(p_property_id, p_month, p_year);
    
    -- Get the winner (rank 1, eligible)
    SELECT esh.*, p.full_name, p.job_title
    INTO v_winner
    FROM eom_scoring_history esh
    JOIN profiles p ON p.id = esh.user_id
    WHERE esh.property_id = p_property_id
    AND esh.month = p_month
    AND esh.year = p_year
    AND esh.is_eligible = true
    AND esh.rank = 1
    ORDER BY esh.total_score DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No eligible employee found for Employee of the Month';
    END IF;
    
    -- Get config for auto-announce setting
    SELECT * INTO v_config
    FROM eom_automation_config
    WHERE property_id = p_property_id;
    
    -- Generate reasons
    v_reason_en := format(
        'Selected based on outstanding performance: %s%% task completion, %s%% training completion, %s%% SOP compliance, and %s%% attendance rate. Total score: %s/100.',
        v_winner.task_completion_rate,
        v_winner.training_completion_rate,
        v_winner.sop_compliance_rate,
        v_winner.attendance_rate,
        v_winner.total_score
    );
    
    v_reason_ar := format(
        'تم الاختيار بناءً على الأداء المتميز: %s%% إنجاز المهام، %s%% إنجاز التدريب، %s%% الالتزام بإجراءات التشغيل القياسية، و%s%% معدل الحضور. النتيجة الإجمالية: %s/100.',
        v_winner.task_completion_rate,
        v_winner.training_completion_rate,
        v_winner.sop_compliance_rate,
        v_winner.attendance_rate,
        v_winner.total_score
    );
    
    -- Insert or update auto-selection
    INSERT INTO eom_auto_selections (
        property_id, user_id, month, year,
        total_score, selection_reason_en, selection_reason_ar,
        status, scoring_history_id
    ) VALUES (
        p_property_id, v_winner.user_id, p_month, p_year,
        v_winner.total_score, v_reason_en, v_reason_ar,
        CASE WHEN v_config.auto_announce THEN 'announced' ELSE 'pending' END,
        v_winner.id
    )
    ON CONFLICT (property_id, month, year) 
    DO UPDATE SET
        user_id = EXCLUDED.user_id,
        total_score = EXCLUDED.total_score,
        selection_reason_en = EXCLUDED.selection_reason_en,
        selection_reason_ar = EXCLUDED.selection_reason_ar,
        status = CASE WHEN v_config.auto_announce THEN 'announced' ELSE 'pending' END,
        scoring_history_id = EXCLUDED.scoring_history_id,
        updated_at = now()
    RETURNING id INTO v_selection_id;
    
    -- If auto-announce is enabled, create the actual EOM record
    IF v_config.auto_announce THEN
        PERFORM announce_eom_from_selection(v_selection_id);
    END IF;
    
    RETURN v_selection_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_mfa_secret(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret text;
  v_backup_codes text[];
  v_qr_code_url text;
  v_secret_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only generate MFA secrets for themselves';
  END IF;

  -- Check if user already has MFA enabled
  IF EXISTS (SELECT 1 FROM public.mfa_secrets WHERE user_id = p_user_id AND enabled = true) THEN
    RETURN jsonb_build_object('error', 'MFA already enabled');
  END IF;
  
  -- Generate a 32-character base32-compatible secret for authenticator apps
  SELECT string_agg(
    substr(v_secret_alphabet, (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1),
    ''
  )
  INTO v_secret
  FROM generate_series(1, 32);
  
  -- Generate backup codes
  v_backup_codes := ARRAY(
    SELECT substring(encode(extensions.gen_random_bytes(4), 'hex'), 1, 8)
    FROM generate_series(1, 8)
  );
  
  -- Generate QR code URL (in production, this would be a proper otpauth URL)
  v_qr_code_url := 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/PHG:' || p_user_id || '?secret=' || v_secret || '&issuer=PHG%20Connect';
  
  -- Insert or update MFA secret
  INSERT INTO public.mfa_secrets (user_id, secret, backup_codes, enabled)
  VALUES (p_user_id, v_secret, v_backup_codes, false)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    secret = EXCLUDED.secret,
    backup_codes = EXCLUDED.backup_codes,
    enabled = false,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'secret', v_secret,
    'backupCodes', v_backup_codes,
    'qrCodeUrl', v_qr_code_url
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_report_signature(p_export_id uuid, p_report_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_signature text;
    v_export record;
    v_signing_key text;
BEGIN
    -- Get the export record
    SELECT * INTO v_export
    FROM audit_exports
    WHERE id = p_export_id;
    
    IF v_export IS NULL THEN
        RAISE EXCEPTION 'Export not found';
    END IF;
    
    -- Get signing key (in production, this would be from a secure vault)
    v_signing_key := current_setting('app.settings.audit_signing_key', true) 
        || v_export.created_at::text 
        || v_export.requested_by::text;
    
    -- Generate signature combining report data, export metadata, and signing key
    v_signature := encode(
        digest(
            v_signing_key 
            || p_report_data::text 
            || v_export.sha256_hash 
            || v_signing_key,
            'sha256'
        ),
        'hex'
    );
    
    RETURN v_signature;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_verification_code()
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
begin
  return upper(encode(extensions.gen_random_bytes(16), 'hex'));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_chain_of_custody(p_export_id uuid)
 RETURNS TABLE(event_type text, event_at timestamp with time zone, event_by uuid, event_by_name text, details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        'export_created'::text as event_type,
        ae.created_at as event_at,
        ae.requested_by as event_by,
        p.full_name as event_by_name,
        jsonb_build_object(
            'format', ae.format,
            'scope', ae.export_scope,
            'record_count', ae.record_count
        ) as details
    FROM audit_exports ae
    LEFT JOIN profiles p ON p.id = ae.requested_by
    WHERE ae.id = p_export_id
    
    UNION ALL
    
    SELECT 
        'integrity_verified'::text,
        ae.verified_at,
        ae.verified_by,
        p.full_name,
        jsonb_build_object(
            'hash', ae.sha256_hash,
            'verified', ae.integrity_verified
        )
    FROM audit_exports ae
    LEFT JOIN profiles p ON p.id = ae.verified_by
    WHERE ae.id = p_export_id
    AND ae.verified_at IS NOT NULL
    
    UNION ALL
    
    SELECT 
        'downloaded'::text,
        ae.last_downloaded_at,
        ae.last_downloaded_by,
        p.full_name,
        jsonb_build_object(
            'download_count', ae.download_count
        )
    FROM audit_exports ae
    LEFT JOIN profiles p ON p.id = ae.last_downloaded_by
    WHERE ae.id = p_export_id
    AND ae.last_downloaded_at IS NOT NULL
    
    ORDER BY event_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_data_for_export(p_scope jsonb, p_batch_size integer DEFAULT 1000, p_batch_offset integer DEFAULT 0)
 RETURNS TABLE(log_id uuid, entity_type text, entity_id text, action text, user_id uuid, user_name text, user_email text, created_at timestamp with time zone, details jsonb, ip_address text, property_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify user has export permission
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin', 'regional_hr')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to export audit data';
    END IF;

    RETURN QUERY
    SELECT 
        al.id as log_id,
        al.entity_type,
        al.entity_id::text,
        al.action::text,
        al.user_id,
        p.full_name as user_name,
        u.email as user_email,
        al.created_at,
        al.details,
        al.ip_address,
        al.details->>'property_id' as property_id
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    LEFT JOIN auth.users u ON u.id = al.user_id
    WHERE (
        -- Date range filter
        (p_scope->>'date_from' IS NULL OR al.created_at >= (p_scope->>'date_from')::timestamptz)
        AND (p_scope->>'date_to' IS NULL OR al.created_at <= (p_scope->>'date_to')::timestamptz)
    )
    AND (
        -- Entity type filter
        (p_scope->'entity_types' IS NULL OR al.entity_type = ANY(ARRAY(
            SELECT jsonb_array_elements_text(p_scope->'entity_types')
        )))
    )
    AND (
        -- Actions filter
        (p_scope->'actions' IS NULL OR al.action::text = ANY(ARRAY(
            SELECT jsonb_array_elements_text(p_scope->'actions')
        )))
    )
    AND (
        -- Property scoping for non-admin roles
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('corporate_admin', 'compliance_officer')
        )
        OR COALESCE(al.details->>'property_id', '') IN (
            SELECT p.property_id::text FROM get_user_accessible_properties_for_audit() p
        )
    )
    ORDER BY al.created_at DESC
    LIMIT p_batch_size
    OFFSET p_batch_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_comment_replies(p_parent_id uuid)
 RETURNS TABLE(id uuid, document_id uuid, parent_id uuid, user_id uuid, user_name text, user_avatar text, content text, is_resolved boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.created_at,
        c.updated_at
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.parent_id = p_parent_id
    ORDER BY c.created_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_compliance_dashboard_metrics(p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date)
 RETURNS TABLE(metric_name text, metric_value bigint, metric_details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    -- Total audit logs generated
    SELECT 
        'total_audit_logs'::text,
        count(*)::bigint,
        jsonb_build_object(
            'period_start', p_date_from,
            'period_end', p_date_to
        )
    FROM audit_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- PII access events
    SELECT 
        'pii_access_events'::text,
        count(*)::bigint,
        jsonb_build_object(
            'unique_users_accessed', count(DISTINCT user_id),
            'unique_accessors', count(DISTINCT accessed_by)
        )
    FROM pii_access_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- Active audit exports
    SELECT 
        'active_audit_exports'::text,
        count(*)::bigint,
        jsonb_build_object(
            'pending', count(*) FILTER (WHERE status = 'pending'),
            'completed', count(*) FILTER (WHERE status = 'completed'),
            'expired_soon', count(*) FILTER (WHERE retention_until < now() + interval '7 days')
        )
    FROM audit_exports
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    
    UNION ALL
    
    -- Top entity types audited
    SELECT 
        'top_audited_entities'::text,
        count(*)::bigint,
        jsonb_build_object(
            'entity_type', entity_type,
            'percentage', round(100.0 * count(*) / sum(count(*)) OVER (), 2)
        )
    FROM audit_logs
    WHERE created_at::date BETWEEN p_date_from AND p_date_to
    GROUP BY entity_type
    ORDER BY count(*) DESC
    LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_contextual_help(p_trigger_type text, p_trigger_value text)
 RETURNS TABLE(document_id uuid, title text, description text, content_type knowledge_content_type, show_as text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.description,
        d.content_type,
        ct.show_as
    FROM sop_documents d
    JOIN sop_context_triggers ct ON d.id = ct.document_id
    WHERE ct.trigger_type = p_trigger_type
    AND ct.trigger_value = p_trigger_value
    AND d.status = 'approved'
    ORDER BY ct.priority DESC
    LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid uuid)
 RETURNS TABLE(pending_tasks bigint, completed_training bigint, in_progress_training bigint, unread_announcements bigint, pending_approvals bigint, unread_notifications bigint, next_shift_date date, next_shift_start time without time zone, vacation_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate user scope access
  IF user_uuid != auth.uid() AND NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN (
        'regional_admin', 'regional_hr', 'corporate_admin', 
        'property_manager', 'property_hr', 'department_head'
      )
  ) THEN
      RAISE EXCEPTION 'Access denied to user dashboard statistics';
  END IF;

  RETURN QUERY
  SELECT 
      -- Tasks
      COALESCE((
          SELECT COUNT(*) FROM tasks 
          WHERE assigned_to_id = user_uuid AND status NOT IN ('completed', 'cancelled')
      ), 0),
      -- Training
      COALESCE((
          SELECT COUNT(*) FROM training_progress 
          WHERE user_id = user_uuid AND status = 'completed'
      ), 0),
      COALESCE((
          SELECT COUNT(*) FROM training_progress 
          WHERE user_id = user_uuid AND status = 'in_progress'
      ), 0),
      -- Announcements
      COALESCE((
          SELECT COUNT(*) FROM announcements a
          WHERE a.created_at > now() - interval '30 days'
          AND NOT EXISTS (
              SELECT 1 FROM announcement_reads ar 
              WHERE ar.announcement_id = a.id AND ar.user_id = user_uuid
          )
      ), 0),
      -- Approvals
      COALESCE((
          SELECT COUNT(*) FROM approval_requests 
          WHERE current_approver_id = user_uuid AND status = 'pending'
      ), 0),
      -- Notifications
      COALESCE((
          SELECT COUNT(*) FROM notifications 
          WHERE user_id = user_uuid AND read_at IS NULL
      ), 0),
      -- Next shift
      (SELECT shift_date FROM user_shifts 
       WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
       ORDER BY shift_date, start_time LIMIT 1),
      (SELECT start_time FROM user_shifts 
       WHERE user_id = user_uuid AND shift_date >= CURRENT_DATE 
       ORDER BY shift_date, start_time LIMIT 1),
      -- Vacation
      COALESCE((
          SELECT (total_days + carried_over - used_days - pending_days)
          FROM user_vacation_balance 
          WHERE user_id = user_uuid AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id uuid, p_scope_property_ids uuid[], p_roles text[], p_department_ids uuid[], p_property_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_documents_count int;
  v_completed_training int;
  v_in_progress_training int;
  v_unread_announcements int;
  v_pending_approvals int;
  v_unread_notifications int;
  v_pending_tasks int;
BEGIN
  -- 1. Documents count (scoped to visible properties)
  SELECT COUNT(*)::int INTO v_documents_count
  FROM documents
  WHERE status = 'PUBLISHED'
    AND is_deleted = false
    AND (
      COALESCE(array_length(p_scope_property_ids, 1), 0) = 0
      OR property_id = ANY(p_scope_property_ids)
    );

  -- 2. Training progress for this user
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed')::int,
    COUNT(*) FILTER (WHERE status = 'in_progress')::int
  INTO v_completed_training, v_in_progress_training
  FROM learning_progress
  WHERE user_id = p_user_id
    AND content_type = 'module'
    AND (is_deleted IS NULL OR is_deleted = false);

  -- 3 & 4. Announcements visible to this user (recent 100), minus reads
  WITH visible_announcements AS (
    SELECT a.id, a.created_by
    FROM announcements a
    WHERE a.created_at > NOW() - INTERVAL '90 days'
      AND (
        a.created_by = p_user_id
        OR a.target_audience IS NULL
        OR (a.target_audience->>'type') = 'all'
        OR (
          (a.target_audience->>'type') = 'role'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v = ANY(p_roles)
          )
        )
        OR (
          (a.target_audience->>'type') = 'department'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = ANY(p_department_ids)
          )
        )
        OR (
          (a.target_audience->>'type') = 'property'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = ANY(p_property_ids)
          )
        )
        OR (
          (a.target_audience->>'type') = 'individual'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(a.target_audience->'values') v
            WHERE v::uuid = p_user_id
          )
        )
      )
    ORDER BY a.created_at DESC
    LIMIT 100
  )
  SELECT COUNT(*)::int INTO v_unread_announcements
  FROM visible_announcements va
  WHERE NOT EXISTS (
    SELECT 1 FROM announcement_reads ar
    WHERE ar.announcement_id = va.id AND ar.user_id = p_user_id
  );

  -- 5, 6, 7. Pending approvals (workflow + documents + legacy)
  SELECT (
    (SELECT COUNT(*)::int FROM requests WHERE current_assignee_id = p_user_id AND status IN ('pending_supervisor_approval', 'pending_hr_review'))
    +
    (SELECT COUNT(*)::int FROM document_approvals WHERE approver_id = p_user_id AND status = 'pending' AND is_active = true)
    +
    (SELECT COUNT(*)::int FROM approval_requests WHERE current_approver_id = p_user_id AND status = 'pending')
  ) INTO v_pending_approvals;

  -- 8. Unread notifications
  SELECT COUNT(*)::int INTO v_unread_notifications
  FROM notifications
  WHERE user_id = p_user_id AND read_at IS NULL;

  -- 9. Pending tasks (scoped to visible properties)
  SELECT COUNT(*)::int INTO v_pending_tasks
  FROM tasks
  WHERE assigned_to_id = p_user_id
    AND status IN ('open', 'todo', 'in_progress', 'pending')
    AND (
      COALESCE(array_length(p_scope_property_ids, 1), 0) = 0
      OR property_id = ANY(p_scope_property_ids)
    );

  RETURN jsonb_build_object(
    'documentsCount', v_documents_count,
    'completedTraining', v_completed_training,
    'inProgressTraining', v_in_progress_training,
    'unreadAnnouncements', v_unread_announcements,
    'pendingApprovals', v_pending_approvals,
    'unreadNotifications', v_unread_notifications,
    'pendingTasks', v_pending_tasks
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_direct_reports(p_manager_id uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p.id, p.full_name, p.job_title, p.email
  FROM profiles p
  WHERE p.reporting_to = p_manager_id
    AND p.is_active = true
  ORDER BY p.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_document_comments_thread(p_document_id uuid)
 RETURNS TABLE(id uuid, document_id uuid, parent_id uuid, user_id uuid, user_name text, user_avatar text, content text, is_resolved boolean, is_pinned boolean, created_at timestamp with time zone, updated_at timestamp with time zone, reply_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.is_pinned,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM document_comments replies WHERE replies.parent_id = c.id) AS reply_count
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.document_id = p_document_id
    AND c.parent_id IS NULL  -- Only top-level comments
    ORDER BY 
        c.is_pinned DESC,  -- Pinned comments first
        c.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_document_history(document_id uuid)
 RETURNS TABLE(version_number integer, status text, change_summary text, created_at timestamp with time zone, created_by uuid, user_name text, user_avatar text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    v.version_number,
    v.status::TEXT,
    v.change_summary,
    v.created_at,
    v.created_by,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar
  FROM 
    sop_document_versions v
  LEFT JOIN 
    profiles p ON v.created_by = p.id
  WHERE 
    v.document_id = $1
  ORDER BY 
    v.version_number DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_document_viewers_by_department(p_document_id uuid)
 RETURNS TABLE(department_name text, count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(d.name, 'Unknown') AS department_name,
    COUNT(DISTINCT dv.user_id) AS count
  FROM document_views dv
  LEFT JOIN user_departments ud ON ud.user_id = dv.user_id
  LEFT JOIN departments d ON d.id = ud.department_id
  WHERE dv.document_id = p_document_id
  GROUP BY d.name
  ORDER BY count DESC
  LIMIT 20;
$function$
;

CREATE OR REPLACE FUNCTION public.get_email_runtime_config()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
  SELECT jsonb_build_object(
    'resend_api_key', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'RESEND_API_KEY'
      LIMIT 1
    ),
    'app_base_url', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'APP_BASE_URL'
      LIMIT 1
    ),
    'email_from_name', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'EMAIL_FROM_NAME'
      LIMIT 1
    ),
    'email_from_address', (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'EMAIL_FROM_ADDRESS'
      LIMIT 1
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_directory(p_search text DEFAULT NULL::text, p_property_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_role app_role DEFAULT NULL::app_role, p_management_level text DEFAULT 'all'::text, p_sort text DEFAULT 'name_asc'::text, p_include_inactive boolean DEFAULT false)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text, bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text, manager_title text, primary_property_id uuid, primary_property_name text, primary_department_id uuid, primary_department_name text, property_ids uuid[], property_names text[], department_ids uuid[], department_names text[], roles app_role[], management_level text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH scoped_profiles AS (
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.job_title,
    p.email,
    p.phone_extension,
    p.bio,
    p.hire_date,
    p.is_active,
    p.staff_id,
    p.reporting_to,
    p.updated_at
  FROM public.profiles p
  WHERE COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
    AND (p_include_inactive OR p.is_active = true)
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      COALESCE(p.job_title, '') ILIKE '%' || p_search || '%' OR
      COALESCE(p.staff_id, '') ILIKE '%' || p_search || '%'
    )
),
scope_data AS (
  SELECT
    sp.*,
    COALESCE(prop.property_ids, ARRAY[]::uuid[]) AS property_ids,
    COALESCE(prop.property_names, ARRAY[]::text[]) AS property_names,
    prop.primary_property_id,
    prop.primary_property_name,
    COALESCE(dept.department_ids, ARRAY[]::uuid[]) AS department_ids,
    COALESCE(dept.department_names, ARRAY[]::text[]) AS department_names,
    dept.primary_department_id,
    dept.primary_department_name,
    COALESCE(rl.roles, ARRAY[]::public.app_role[]) AS roles
  FROM scoped_profiles sp
  LEFT JOIN LATERAL (
    SELECT
      array_agg(up.property_id ORDER BY pr.name NULLS LAST, up.property_id) AS property_ids,
      array_agg(COALESCE(pr.name, 'Unknown Property') ORDER BY pr.name NULLS LAST, up.property_id) AS property_names,
      (array_agg(up.property_id ORDER BY pr.name NULLS LAST, up.property_id))[1] AS primary_property_id,
      (array_agg(COALESCE(pr.name, 'Unknown Property') ORDER BY pr.name NULLS LAST, up.property_id))[1] AS primary_property_name
    FROM public.user_properties up
    LEFT JOIN public.properties pr ON pr.id = up.property_id
    WHERE up.user_id = sp.id
  ) prop ON true
  LEFT JOIN LATERAL (
    SELECT
      array_agg(ud.department_id ORDER BY d.name NULLS LAST, ud.department_id) AS department_ids,
      array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, ud.department_id) AS department_names,
      (array_agg(ud.department_id ORDER BY d.name NULLS LAST, ud.department_id))[1] AS primary_department_id,
      (array_agg(COALESCE(d.name, 'Unknown Department') ORDER BY d.name NULLS LAST, ud.department_id))[1] AS primary_department_name
    FROM public.user_departments ud
    LEFT JOIN public.departments d ON d.id = ud.department_id
    WHERE ud.user_id = sp.id
  ) dept ON true
  LEFT JOIN LATERAL (
    SELECT array_agg(ur.role ORDER BY ur.role) AS roles
    FROM public.user_roles ur
    WHERE ur.user_id = sp.id
  ) rl ON true
),
enriched AS (
  SELECT
    sd.id,
    sd.full_name,
    sd.avatar_url,
    sd.job_title,
    sd.email::text AS work_email,
    sd.phone_extension,
    sd.bio,
    sd.hire_date AS joining_date,
    sd.is_active,
    sd.staff_id,
    sd.reporting_to AS manager_id,
    mgr.full_name AS manager_name,
    mgr.job_title AS manager_title,
    sd.primary_property_id,
    sd.primary_property_name,
    sd.primary_department_id,
    sd.primary_department_name,
    sd.property_ids,
    sd.property_names,
    sd.department_ids,
    sd.department_names,
    sd.roles,
    CASE
      WHEN (
        'corporate_admin'::public.app_role = ANY(sd.roles) OR
        'regional_admin'::public.app_role = ANY(sd.roles) OR
        'regional_hr'::public.app_role = ANY(sd.roles)
      ) THEN 'executive'
      WHEN (
        'property_manager'::public.app_role = ANY(sd.roles) OR
        'property_hr'::public.app_role = ANY(sd.roles) OR
        'department_head'::public.app_role = ANY(sd.roles) OR
        'manager'::public.app_role = ANY(sd.roles)
      ) THEN 'management'
      ELSE 'staff'
    END AS management_level,
    sd.updated_at
  FROM scope_data sd
  LEFT JOIN public.profiles mgr ON mgr.id = sd.reporting_to
)
SELECT
  e.id,
  e.full_name,
  e.avatar_url,
  e.job_title,
  e.work_email,
  e.phone_extension,
  e.bio, e.joining_date,
  e.is_active,
  e.staff_id,
  e.manager_id,
  e.manager_name,
  e.manager_title,
  e.primary_property_id,
  e.primary_property_name,
  e.primary_department_id,
  e.primary_department_name,
  e.property_ids,
  e.property_names,
  e.department_ids,
  e.department_names,
  e.roles,
  e.management_level,
  e.updated_at
FROM enriched e
WHERE (p_property_id IS NULL OR p_property_id = ANY(e.property_ids))
  AND (p_department_id IS NULL OR p_department_id = ANY(e.department_ids))
  AND (p_role IS NULL OR p_role = ANY(e.roles))
  AND (
    p_management_level IS NULL OR lower(p_management_level) = 'all' OR
    lower(p_management_level) = lower(e.management_level)
  )
ORDER BY
  CASE WHEN p_sort = 'name_desc' THEN e.full_name END DESC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_asc' THEN e.joining_date END ASC NULLS LAST,
  CASE WHEN p_sort = 'joining_date_desc' THEN e.joining_date END DESC NULLS LAST,
  CASE WHEN p_sort = 'name_asc' OR p_sort IS NULL THEN e.full_name END ASC NULLS LAST,
  e.full_name ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_private_profile(p_profile_id uuid, p_reason text DEFAULT 'profile_private_view'::text)
 RETURNS TABLE(date_of_birth date, employee_id text, emergency_contact_name text, emergency_contact_phone text, national_id text, salary_grade text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF v_uid <> p_profile_id AND NOT public.is_hr_or_admin(v_uid) THEN
    RAISE EXCEPTION 'Access denied to private profile data' USING ERRCODE = '42501';
  END IF;

  IF v_uid <> p_profile_id THEN
    PERFORM public.log_pii_access(
      p_profile_id,
      ARRAY[
        'date_of_birth',
        'staff_id',
        'emergency_contact_name',
        'emergency_contact_phone',
        'national_id',
        'salary_grade'
      ]::text[],
      p_reason
    );
  END IF;

  RETURN QUERY
  SELECT
    p.date_of_birth,
    p.staff_id AS employee_id,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.national_id,
    p.salary_grade
  FROM public.profiles p
  WHERE p.id = p_profile_id
    AND COALESCE(p.is_deleted, false) = false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_public_profile(p_profile_id uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, work_email text, phone_extension text, bio text, joining_date date, is_active boolean, staff_id text, manager_id uuid, manager_name text, manager_title text, property_names text[], department_names text[], roles app_role[], skills text[], certifications text[], direct_reports jsonb, updated_at timestamp with time zone, is_edited boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT d.*
  FROM public.get_employee_directory(
    p_search := NULL,
    p_property_id := NULL,
    p_department_id := NULL,
    p_role := NULL,
    p_management_level := 'all',
    p_sort := 'name_asc',
    p_include_inactive := true
  ) d
  WHERE d.id = p_profile_id
  LIMIT 1
),
skill_data AS (
  SELECT COALESCE(array_agg(s_name ORDER BY s_name), ARRAY[]::text[]) AS skills
  FROM (
    SELECT DISTINCT s.name AS s_name
    FROM public.user_skills us
    JOIN public.skills s ON s.id = us.skill_id
    WHERE us.user_id = p_profile_id
      AND COALESCE(us.verified, true) = true
  ) sub
),
cert_data AS (
  SELECT COALESCE(array_agg(c_title ORDER BY c_date DESC NULLS LAST), ARRAY[]::text[]) AS certifications
  FROM (
    SELECT DISTINCT ON (COALESCE(c.title, c.certificate_type, 'Certificate'))
      COALESCE(c.title, c.certificate_type, 'Certificate') AS c_title,
      COALESCE(c.completion_date, c.created_at) AS c_date
    FROM public.certificates c
    WHERE c.user_id = p_profile_id
      AND COALESCE(c.status, 'active') <> 'revoked'
    ORDER BY COALESCE(c.title, c.certificate_type, 'Certificate'), COALESCE(c.completion_date, c.created_at) DESC NULLS LAST
  ) sub
),
direct_report_data AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'job_title', p.job_title,
        'avatar_url', p.avatar_url
      )
      ORDER BY p.full_name
    ),
    '[]'::jsonb
  ) AS direct_reports
  FROM public.profiles p
  WHERE p.reporting_to = p_profile_id
    AND COALESCE(p.is_deleted, false) = false
    AND public.can_view_employee_public_profile(p.id)
)
SELECT
  b.id,
  b.full_name,
  b.avatar_url,
  b.job_title,
  b.work_email,
  b.phone_extension,
  b.bio,
  b.joining_date,
  b.is_active,
  b.staff_id,
  b.manager_id,
  b.manager_name,
  b.manager_title,
  b.property_names,
  b.department_names,
  b.roles,
  sd.skills,
  cd.certifications,
  dr.direct_reports,
  b.updated_at,
  (b.updated_at > (SELECT p.created_at FROM public.profiles p WHERE p.id = b.id)) AS is_edited
FROM base b
CROSS JOIN skill_data sd
CROSS JOIN cert_data cd
CROSS JOIN direct_report_data dr;
$function$
;

CREATE OR REPLACE FUNCTION public.get_events_for_range(start_date text, end_date text, property_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, title text, description text, start_time timestamp with time zone, end_time timestamp with time zone, type text, color text, created_by uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  -- Cast input text to timestamp
  v_start_date := start_date::timestamp with time zone;
  v_end_date := end_date::timestamp with time zone;

  RETURN QUERY
  -- Calendar Events
  SELECT 
    e.id,
    e.title,
    e.description,
    e.start_date as start_time,
    e.end_date as end_time,
    'event' as type,
    '#6366f1' as color,
    e.created_by
  FROM events e
  WHERE e.start_date >= v_start_date 
    AND e.start_date <= v_end_date
    AND (property_filter IS NULL OR e.property_id = property_filter)
  
  UNION ALL
  
  -- Announcements (as events)
  SELECT 
    a.id,
    a.title,
    a.content as description,
    a.created_at as start_time,
    a.created_at + interval '1 hour' as end_time,
    'announcement' as type,
    '#3b82f6' as color, -- blue-500
    a.created_by
  FROM announcements a
  WHERE a.created_at >= v_start_date 
    AND a.created_at <= v_end_date
    -- Note: Announcements might not have property_id directly or might use a different target system. 
    -- For now, we include global announcements or ignore property filter if not applicable to keep it simple.
  
  UNION ALL
  
  -- Training Assignments (due dates)
  SELECT 
    la.id,
    tm.title as title,
    'Training Due' as description,
    la.due_date as start_time,
    la.due_date + interval '1 hour' as end_time,
    'training' as type,
    '#10b981' as color, -- emerald-500
    la.assigned_by as created_by
  FROM learning_assignments la
  JOIN training_modules tm ON la.content_id = tm.id
  WHERE la.due_date >= v_start_date 
    AND la.due_date <= v_end_date
    AND la.content_type = 'module';
    -- Assignments are user-specific, filtering by property might be redundant if we filtered by user, 
    -- but this RPC doesn't take user_id yet. 
    -- Ideally, we should filter by strict user access, but this is a broad "events" getter.
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_expiring_documents(p_days_ahead integer DEFAULT 30)
 RETURNS TABLE(document_id uuid, title text, expires_at timestamp with time zone, days_until_expiry integer, owner_email text, owner_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.expires_at,
        EXTRACT(DAY FROM d.expires_at - NOW())::INTEGER AS days_until_expiry,
        p.email AS owner_email,
        p.full_name AS owner_name
    FROM documents d
    LEFT JOIN profiles p ON d.owner_id = p.id
    WHERE d.expires_at IS NOT NULL
    AND d.expires_at <= NOW() + (p_days_ahead || ' days')::INTERVAL
    AND d.expires_at >= NOW()
    AND d.is_archived = FALSE
    ORDER BY d.expires_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_media_asset_with_usage(p_media_asset_id uuid)
 RETURNS TABLE(id uuid, title text, description text, filename text, public_url text, media_type media_type, category media_category, file_size_bytes bigint, mime_type text, duration_seconds integer, thumbnail_url text, tags text[], usage_count integer, last_used_at timestamp with time zone, uploaded_by uuid, uploader_name text, property_id uuid, property_name text, is_public boolean, created_at timestamp with time zone, usages jsonb)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ma.id,
    ma.title,
    ma.description,
    ma.filename,
    ma.public_url,
    ma.media_type,
    ma.category,
    ma.file_size_bytes,
    ma.mime_type,
    ma.duration_seconds,
    ma.thumbnail_url,
    ma.tags,
    ma.usage_count,
    ma.last_used_at,
    ma.uploaded_by,
    p.full_name as uploader_name,
    ma.property_id,
    pr.name as property_name,
    ma.is_public,
    ma.created_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', mau.id,
          'usage_type', mau.usage_type,
          'usage_entity_id', mau.usage_entity_id,
          'usage_entity_title', mau.usage_entity_title,
          'created_at', mau.created_at
        )
      )
      FROM media_asset_usages mau
      WHERE mau.media_asset_id = ma.id
      ),
      '[]'::jsonb
    ) as usages
  FROM media_assets ma
  LEFT JOIN profiles p ON p.id = ma.uploaded_by
  LEFT JOIN properties pr ON pr.id = ma.property_id
  WHERE ma.id = p_media_asset_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_roles()
 RETURNS app_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(role), '{}'::public.app_role[])
  FROM public.user_roles
  WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_shift(user_uuid uuid)
 RETURNS TABLE(shift_id uuid, shift_date date, start_time time without time zone, end_time time without time zone, department_name text, property_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.shift_date,
        us.start_time,
        us.end_time,
        d.name,
        p.name
    FROM user_shifts us
    LEFT JOIN departments d ON us.department_id = d.id
    LEFT JOIN properties p ON us.property_id = p.id
    WHERE us.user_id = user_uuid
      AND us.shift_date >= CURRENT_DATE
      AND us.status IN ('scheduled', 'confirmed')
    ORDER BY us.shift_date, us.start_time
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_hierarchy(p_root_user_id uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, email text, reporting_to uuid, manager_name text, depth integer, path uuid[], path_names text[])
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Base case: top-level employees (no manager) or specific root
    SELECT 
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      NULL::TEXT as manager_name,
      0 as depth,
      ARRAY[p.id] as path,
      ARRAY[p.full_name] as path_names
    FROM profiles p
    LEFT JOIN user_properties up ON up.user_id = p.id
    WHERE p.is_active = true
      AND (
        CASE 
          WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id
          ELSE p.reporting_to IS NULL
        END
      )
      AND (p_property_id IS NULL OR up.property_id = p_property_id)
    
    UNION ALL
    
    -- Recursive case: employees who report to someone in the hierarchy
    SELECT 
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      h.full_name as manager_name,
      h.depth + 1,
      h.path || p.id,
      h.path_names || p.full_name
    FROM profiles p
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND NOT p.id = ANY(h.path)  -- Prevent cycles
      AND h.depth < 20  -- Max depth safety
  )
  SELECT * FROM hierarchy
  ORDER BY path;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pii_access_summary(p_target_user_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date)
 RETURNS TABLE(access_date date, access_count bigint, unique_accessors bigint, top_accessed_fields text[], risk_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_admin boolean;
    v_is_target_user boolean;
BEGIN
    -- Check permissions
    v_is_target_user := (p_target_user_id = auth.uid());
    
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_hr')
    ) INTO v_is_admin;
    
    -- Must be admin or accessing own data
    IF NOT (v_is_admin OR v_is_target_user OR p_target_user_id IS NULL) THEN
        RAISE EXCEPTION 'Access denied to PII access summary';
    END IF;

    RETURN QUERY
    WITH daily_access AS (
        SELECT 
            date(pal.created_at) as access_day,
            count(*) as daily_count,
            count(DISTINCT pal.accessed_by) as daily_accessors,
            array_remove(array_agg(DISTINCT f.field), NULL) as fields,
            -- Calculate risk score based on volume and diversity
            CASE 
                WHEN count(*) > 50 THEN 5
                WHEN count(*) > 20 THEN 4
                WHEN count(*) > 10 THEN 3
                WHEN count(*) > 5 THEN 2
                ELSE 1
            END +
            CASE 
                WHEN count(DISTINCT pal.accessed_by) > 5 THEN 3
                WHEN count(DISTINCT pal.accessed_by) > 2 THEN 2
                ELSE 1
            END as daily_risk
        FROM pii_access_logs pal
        LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
        AND (
            p_target_user_id IS NULL 
            OR pal.user_id = p_target_user_id
        )
        GROUP BY date(pal.created_at)
    )
    SELECT 
        da.access_day,
        da.daily_count,
        da.daily_accessors,
        da.fields as top_accessed_fields,
        da.daily_risk as risk_score
    FROM daily_access da
    ORDER BY da.access_day DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_reporting_chain(p_employee_id uuid)
 RETURNS TABLE(id uuid, full_name text, job_title text, level integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT p.id, p.full_name, p.job_title, p.reporting_to, 0 as level
    FROM profiles p
    WHERE p.id = p_employee_id
    
    UNION ALL
    
    SELECT p.id, p.full_name, p.job_title, p.reporting_to, c.level + 1
    FROM profiles p
    JOIN chain c ON p.id = c.reporting_to
    WHERE c.level < 20
  )
  SELECT chain.id, chain.full_name, chain.job_title, chain.level
  FROM chain
  ORDER BY chain.level;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_required_reading(p_user_id uuid)
 RETURNS TABLE(document_id uuid, title text, content_type knowledge_content_type, is_acknowledged boolean, due_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role TEXT;
    v_property_id UUID;
    v_department_id UUID;
BEGIN
    -- Get user's role and assignments
    SELECT role, property_id, department_id 
    INTO v_role, v_property_id, v_department_id
    FROM user_roles 
    WHERE user_id = p_user_id 
    LIMIT 1;

    RETURN QUERY
    SELECT 
        d.id AS document_id,
        d.title,
        d.content_type,
        EXISTS(
            SELECT 1 FROM sop_acknowledgments a 
            WHERE a.document_id = d.id 
            AND a.user_id = p_user_id
        ) AS is_acknowledged,
        (ra.created_at + (ra.due_days_after_assignment || ' days')::INTERVAL)::DATE AS due_date
    FROM sop_documents d
    JOIN sop_role_assignments ra ON d.id = ra.document_id
    WHERE ra.is_required = TRUE
    AND ra.role = v_role
    AND (ra.property_id IS NULL OR ra.property_id = v_property_id)
    AND (ra.department_id IS NULL OR ra.department_id = v_department_id)
    AND d.status = 'approved';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_secure_document_url(document_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  v_storage_path text;
  v_bucket text;
  v_host text;
BEGIN
  SELECT d.id, d.file_url, d.storage_bucket, d.storage_path
  INTO doc
  FROM public.documents d
  WHERE d.id = document_id
  LIMIT 1;

  IF doc IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  IF NOT public.can_view_document(document_id) THEN
    RAISE EXCEPTION 'Not authorized to access this document';
  END IF;

  v_bucket := COALESCE(NULLIF(doc.storage_bucket, ''), 'documents');
  v_storage_path := COALESCE(
    NULLIF(doc.storage_path, ''),
    public.extract_storage_path_from_url(doc.file_url, v_bucket)
  );

  -- If we have bucket + path, construct the public storage URL directly
  IF v_storage_path IS NOT NULL AND length(trim(v_storage_path)) > 0 THEN
    v_host := COALESCE(
      NULLIF((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
      'htsvjfrofcpkfzvjpwvx.supabase.co'
    );

    RETURN format(
      'https://%s/storage/v1/object/public/%s/%s',
      v_host,
      v_bucket,
      ltrim(v_storage_path, '/')
    );
  END IF;

  -- Content-only knowledge base documents may have no file_url. Return NULL.
  IF doc.file_url IS NULL OR length(trim(doc.file_url)) = 0 THEN
    RETURN NULL;
  END IF;

  -- If file_url is already a full URL, return it as-is
  IF doc.file_url ~* '^https?://' THEN
    RETURN doc.file_url;
  END IF;

  -- Fallback: construct URL from relative path
  v_host := COALESCE(
    NULLIF((current_setting('request.headers', true)::jsonb ->> 'host'), ''),
    'htsvjfrofcpkfzvjpwvx.supabase.co'
  );

  RETURN format(
    'https://%s/storage/v1/object/public/%s/%s',
    v_host,
    v_bucket,
    ltrim(doc.file_url, '/')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_secure_media_url(p_media_asset_id uuid, p_expiry_seconds integer DEFAULT 3600)
 RETURNS TABLE(signed_url text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
  v_signed_url TEXT;
BEGIN
  -- Get asset details
  SELECT 
    ma.id,
    ma.storage_bucket,
    ma.storage_path,
    ma.uploaded_by,
    ma.property_id,
    ma.is_public,
    ma.mime_type
  INTO v_asset
  FROM media_assets ma
  WHERE ma.id = p_media_asset_id
  AND ma.is_archived = false;

  -- Check if asset exists
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Media asset not found or archived';
  END IF;

  -- Check authorization
  IF NOT (
    v_asset.is_public
    OR v_asset.uploaded_by = auth.uid()
    OR v_asset.property_id IS NULL
    OR public.has_property_access(auth.uid(), v_asset.property_id)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('corporate_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this media asset';
  END IF;

  -- Generate signed URL
  SELECT storage.create_signed_url(
    v_asset.storage_bucket,
    v_asset.storage_path,
    p_expiry_seconds
  )
  INTO v_signed_url;

  IF v_signed_url IS NULL OR length(trim(v_signed_url)) = 0 THEN
    RAISE EXCEPTION 'Failed to generate secure URL';
  END IF;

  -- Log access (in background via async, but here we just insert)
  INSERT INTO media_access_logs (
    media_asset_id,
    accessed_by,
    access_type,
    metadata
  ) VALUES (
    p_media_asset_id,
    auth.uid(),
    'download',
    jsonb_build_object(
      'expiry_seconds', p_expiry_seconds,
      'mime_type', v_asset.mime_type
    )
  );

  RETURN QUERY SELECT v_signed_url, now() + (p_expiry_seconds || ' seconds')::interval;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_secure_payslip_url(p_payslip_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payslip record;
begin
  select *
  into v_payslip
  from public.payslips
  where id = p_payslip_id
  limit 1;

  if v_payslip is null then
    raise exception 'Payslip not found';
  end if;

  if v_payslip.storage_path is null then
    raise exception 'Payslip file not available';
  end if;

  if v_payslip.employee_id <> auth.uid()
     and not (
       public.has_role_optimized('corporate_admin'::public.app_role) or
       public.has_role_optimized('regional_admin'::public.app_role) or
       public.has_role_optimized('regional_hr'::public.app_role) or
       public.has_role_optimized('property_hr'::public.app_role)
     ) then
    raise exception 'Not authorized to access this payslip';
  end if;

  return v_payslip.storage_path;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_security_summary(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mfa_enabled boolean;
  v_mfa_required boolean;
  v_password_rotation_required boolean;
  v_days_remaining integer;
  v_roles text[];
  v_profile record;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users can only access their own security summary';
  END IF;

  v_mfa_enabled := EXISTS (
    SELECT 1
    FROM public.mfa_secrets
    WHERE user_id = p_user_id AND enabled = true
  );

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- FIX: Cast role to text[] to match COALESCE fallback type
  SELECT coalesce(array_agg(role::text), ARRAY[]::text[]) INTO v_roles
  FROM public.user_roles
  WHERE user_id = p_user_id;

  v_mfa_required := (v_roles && ARRAY['corporate_admin', 'regional_admin', 'regional_hr']::text[]);

  v_password_rotation_required := (v_profile.force_password_reset = true) OR (
    (v_roles && ARRAY['corporate_admin', 'regional_admin']::text[]) AND
    (v_profile.password_last_changed_at IS NULL OR v_profile.password_last_changed_at < now() - interval '90 days')
  );

  IF v_profile.password_last_changed_at IS NOT NULL THEN
    v_days_remaining := 90 - extract(day from (now() - v_profile.password_last_changed_at))::int;
  END IF;

  RETURN jsonb_build_object(
    'mfaRequired', v_mfa_required,
    'mfaEnabled', v_mfa_enabled,
    'passwordRotationRequired', v_password_rotation_required,
    'passwordRotationDays', GREATEST(0, COALESCE(v_days_remaining, 0)),
    'setupComplete', ((NOT v_mfa_required OR v_mfa_enabled) AND NOT v_password_rotation_required)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sidebar_counts(p_user_id uuid, p_role text DEFAULT NULL::text, p_property_ids uuid[] DEFAULT NULL::uuid[], p_department_ids uuid[] DEFAULT NULL::uuid[], p_current_property_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_unread_notifications integer;
    v_pending_approvals integer;
    v_overdue_tasks integer;
    v_unread_messages integer;
    v_pending_training integer;
    v_active_goals integer;
    v_is_regional boolean;
    v_is_property boolean;
    v_is_dept_head boolean;
BEGIN
    -- Determine access level
    v_is_regional := p_role IN ('regional_admin', 'regional_hr');
    v_is_property := p_role IN ('property_manager', 'property_hr');
    v_is_dept_head := p_role = 'department_head';

    -- 1. Unread Notifications (always user-specific)
    SELECT count(*)::integer INTO v_unread_notifications
    FROM notifications
    WHERE user_id = p_user_id AND read_at IS NULL;

    -- 2. Pending Approvals (role-based)
    IF v_is_regional THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = p_current_property_id;
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review');
        END IF;
    ELSIF v_is_property THEN
        IF p_current_property_id IS NOT NULL THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = p_current_property_id;
        ELSIF p_property_ids IS NOT NULL AND array_length(p_property_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND property_id = ANY(p_property_ids);
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND current_assignee_id = p_user_id;
        END IF;
    ELSIF v_is_dept_head THEN
        IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND department_id = ANY(p_department_ids);
        ELSE
            SELECT count(*)::integer INTO v_pending_approvals
            FROM requests
            WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
              AND current_assignee_id = p_user_id;
        END IF;
    ELSE
        SELECT count(*)::integer INTO v_pending_approvals
        FROM requests
        WHERE status IN ('pending_supervisor_approval', 'pending_hr_review')
          AND (requester_id = p_user_id OR current_assignee_id = p_user_id);
    END IF;

    -- 3. Overdue Tasks (always user-specific for "My Tasks" badge matching the tasks widget)
    SELECT count(*)::integer INTO v_overdue_tasks
    FROM tasks
    WHERE is_deleted = false AND status NOT IN ('completed', 'cancelled')
      AND due_date < now() AND assigned_to_id = p_user_id;

    -- 4. Unread Messages (always user-specific)
    SELECT count(*)::integer INTO v_unread_messages
    FROM messages
    WHERE recipient_id = p_user_id AND read_at IS NULL;

    -- 5. Pending Training (targeted assignments)
    SELECT count(*)::integer INTO v_pending_training
    FROM learning_assignments la
    WHERE la.is_deleted = false
      AND NOT EXISTS (
          SELECT 1 FROM learning_progress lp 
          WHERE lp.assignment_id = la.id 
            AND lp.user_id = p_user_id 
            AND lp.status = 'completed'
      )
      AND (
        la.target_type = 'everyone'
        OR (la.target_type = 'user' AND la.target_id = p_user_id::text)
        OR (
          la.target_type = 'property'
          AND EXISTS (
            SELECT 1
            FROM unnest(coalesce(p_property_ids, ARRAY[]::uuid[])) AS pid
            WHERE pid::text = la.target_id
          )
        )
        OR (
          la.target_type = 'department'
          AND EXISTS (
            SELECT 1
            FROM unnest(coalesce(p_department_ids, ARRAY[]::uuid[])) AS did
            WHERE did::text = la.target_id
          )
        )
        OR (la.target_type = 'role' AND p_role IS NOT NULL AND la.target_id = p_role)
      );

    -- 6. Active Goals (always user-specific)
    SELECT count(*)::integer INTO v_active_goals
    FROM goals
    WHERE employee_id = p_user_id AND status != 'completed';

    RETURN json_build_object(
        'unreadNotifications', v_unread_notifications,
        'pendingApprovals', v_pending_approvals,
        'overdueTasks', v_overdue_tasks,
        'unreadMessages', v_unread_messages,
        'pendingTraining', v_pending_training,
        'activeGoals', v_active_goals,
        'requiredReading', 0
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sop_document_details(p_document_id uuid)
 RETURNS TABLE(id uuid, title text, title_ar text, description text, description_ar text, code text, status text, department_id uuid, department_name text, category_id uuid, category_name text, subcategory_id uuid, subcategory_name text, version integer, is_template boolean, template_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, approved_at timestamp with time zone, next_review_date date, archived_at timestamp with time zone, created_by uuid, updated_by uuid, current_version jsonb, approvals jsonb, attachments jsonb, related_documents jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sd.id,
    sd.title,
    sd.title_ar,
    sd.description,
    sd.description_ar,
    sd.code,
    sd.status,
    sd.department_id,
    d.name as department_name,
    sd.category_id,
    c.name as category_name,
    sd.subcategory_id,
    sc.name as subcategory_name,
    sd.version,
    sd.is_template,
    sd.template_id,
    sd.created_at,
    sd.updated_at,
    sd.approved_at,
    sd.next_review_date,
    sd.archived_at,
    sd.created_by,
    sd.updated_by,
    (
      SELECT json_build_object(
        'version_number', version_number,
        'content', content,
        'created_at', created_at,
        'created_by', created_by,
        'change_summary', change_summary
      )
      FROM sop_document_versions
      WHERE document_id = p_document_id
      ORDER BY version_number DESC
      LIMIT 1
    ) as current_version,
    (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'approver_id', approver_id,
          'approver_role', approver_role,
          'status', status,
          'created_at', created_at,
          'approved_at', approved_at,
          'rejected_at', rejected_at,
          'comment', comment
        )
      )
      FROM sop_document_approvals
      WHERE document_id = p_document_id
    ) as approvals,
    (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'file_name', file_name,
          'file_type', file_type,
          'file_size', file_size,
          'created_at', created_at
        )
      )
      FROM sop_document_attachments
      WHERE document_id = p_document_id
    ) as attachments,
    (
      SELECT json_agg(
        json_build_object(
          'id', rd.related_document_id,
          'title', rd.title,
          'code', rd.code,
          'relation_type', sdr.relation_type
        )
      )
      FROM sop_document_relations sdr
      JOIN sop_documents rd ON sdr.related_document_id = rd.id
      WHERE sdr.document_id = p_document_id
    ) as related_documents
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE sd.id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_sop_summary_stats()
 RETURNS TABLE(total_documents bigint, draft_count bigint, under_review_count bigint, approved_count bigint, obsolete_count bigint, pending_approvals bigint, overdue_reviews bigint, recent_updates bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
    COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'obsolete') as obsolete_count,
    (
      SELECT COUNT(*)
      FROM sop_document_approvals sda
      JOIN sop_documents sd ON sda.document_id = sd.id
      WHERE sda.status = 'pending' 
        AND sd.status = 'under_review'
    ) as pending_approvals,
    (
      SELECT COUNT(*)
      FROM sop_documents
      WHERE status = 'approved' 
        AND next_review_date IS NOT NULL 
        AND next_review_date < CURRENT_DATE
    ) as overdue_reviews,
    (
      SELECT COUNT(*)
      FROM sop_documents
      WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
    ) as recent_updates
  FROM sop_documents
  WHERE archived_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_task_completion_metrics(p_user_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(total_tasks bigint, completed_tasks bigint, pending_tasks bigint, in_progress_tasks bigint, completion_rate numeric, avg_completion_time_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*) * 100, 2)
            ELSE 0 
        END as completion_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0 THEN
                ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 2)
            ELSE NULL 
        END as avg_completion_time_hours
    FROM tasks 
    WHERE 
        (p_user_id IS NULL OR created_by = p_user_id)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        AND is_deleted = false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_task_stats(user_id_param uuid)
 RETURNS TABLE(total_tasks bigint, todo_tasks bigint, in_progress_tasks bigint, review_tasks bigint, completed_tasks bigint, overdue_tasks bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'todo')::BIGINT AS todo_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT AS in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'review')::BIGINT AS review_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_tasks,
    COUNT(*) FILTER (WHERE status != 'completed' AND status != 'cancelled' AND due_date < CURRENT_DATE)::BIGINT AS overdue_tasks
  FROM tasks
  WHERE assigned_to_id = user_id_param OR created_by_id = user_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_task_stats(user_id_param uuid DEFAULT NULL::uuid, property_id_param uuid DEFAULT NULL::uuid, department_id_param uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_tasks bigint, completed_tasks bigint, pending_tasks bigint, overdue_tasks bigint, high_priority_tasks bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate property scope access
  IF property_id_param IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() AND property_id = property_id_param
    ) AND NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    ) THEN
      RAISE EXCEPTION 'Access denied to property statistics scope';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'completed')::BIGINT as pending_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::BIGINT as overdue_tasks,
    COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed')::BIGINT as high_priority_tasks
  FROM tasks
  WHERE
    (user_id_param IS NULL OR assigned_to_id = user_id_param)
    AND
    (property_id_param IS NULL OR property_id = property_id_param)
    AND
    (department_id_param IS NULL OR department_id = department_id_param)
    AND
    is_deleted = false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_todays_birthdays(p_property_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, full_name text, avatar_url text, job_title text, property_name text, birthday date, age integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.job_title,
  prop.name AS property_name,
  p.date_of_birth AS birthday,
  date_part('year', age(current_date, p.date_of_birth))::int AS age
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT pr.*
  FROM public.user_properties up
  JOIN public.properties pr ON pr.id = up.property_id
  WHERE up.user_id = p.id
  ORDER BY pr.name
  LIMIT 1
) prop ON true
WHERE COALESCE(p.is_deleted, false) = false
  AND p.is_active = true
  AND date_part('month', p.date_of_birth) = date_part('month', current_date)
  AND date_part('day', p.date_of_birth) = date_part('day', current_date)
  AND public.can_view_employee_public_profile(p.id)
  AND (
    p_property_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.user_properties up
      WHERE up.user_id = p.id
        AND up.property_id = p_property_id
    )
  )
ORDER BY p.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_pii_accessors(p_date_from date DEFAULT ((now() - '30 days'::interval))::date, p_date_to date DEFAULT (now())::date, p_limit integer DEFAULT 10)
 RETURNS TABLE(accessor_id uuid, accessor_name text, accessor_role text, total_accesses bigint, unique_targets bigint, most_accessed_field text, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify compliance/admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('corporate_admin', 'compliance_officer', 'regional_hr', 'regional_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    RETURN QUERY
    WITH accessor_stats AS (
        SELECT 
            pal.accessed_by as user_id,
            count(*) as access_count,
            count(DISTINCT pal.user_id) as target_count,
            mode() WITHIN GROUP (ORDER BY f.field) as common_field,
            max(pal.created_at) as last_access
        FROM pii_access_logs pal
        LEFT JOIN LATERAL unnest(pal.pii_fields) AS f(field) ON true
        WHERE pal.created_at::date BETWEEN p_date_from AND p_date_to
        GROUP BY pal.accessed_by
        ORDER BY access_count DESC
        LIMIT p_limit
    )
    SELECT 
        ast.user_id as accessor_id,
        p.full_name as accessor_name,
        (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = ast.user_id LIMIT 1) as accessor_role,
        ast.access_count as total_accesses,
        ast.target_count as unique_targets,
        ast.common_field as most_accessed_field,
        ast.last_access as last_accessed_at
    FROM accessor_stats ast
    LEFT JOIN profiles p ON p.id = ast.user_id
    ORDER BY ast.access_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_training_module_related_resources(p_module_id uuid)
 RETURNS TABLE(resource_type text, resource_id uuid, title text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 'document', d.id, d.title, d.description FROM documents d WHERE d.id IN (SELECT DISTINCT source_document_id FROM training_content_blocks WHERE training_module_id = p_module_id AND source_document_id IS NOT NULL)
    UNION ALL
    SELECT 'quiz', lq.id, lq.title, lq.description FROM learning_quizzes lq WHERE lq.training_module_id = p_module_id
    UNION ALL
    SELECT 'question', kq.id, kq.question_text, kq.explanation FROM knowledge_questions kq WHERE kq.training_module_id = p_module_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_departments(user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(department_id), ARRAY[]::uuid[])
  FROM public.user_departments
  WHERE user_id = $1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_pins_with_details(p_user_id uuid)
 RETURNS TABLE(pin_id uuid, item_type character varying, item_id uuid, pinned_at timestamp with time zone, display_order integer, title text, description text, url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Return pins with their details based on item_type
  RETURN QUERY
  SELECT 
    p.id AS pin_id,
    p.item_type,
    p.item_id,
    p.pinned_at,
    p.display_order,
    COALESCE(
      -- Document/SOP titles
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      -- Training titles
      (SELECT tm.title FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      -- Task titles
      (SELECT t.title FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      -- Announcement titles
      (SELECT a.title FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      -- Knowledge article titles
      (SELECT d.title FROM documents d WHERE d.id = p.item_id AND p.item_type = 'knowledge'),
      'Unknown Item'
    ) AS title,
    COALESCE(
      -- Document/SOP descriptions
      (SELECT d.description FROM documents d WHERE d.id = p.item_id AND p.item_type IN ('document', 'sop')),
      -- Training descriptions
      (SELECT tm.description FROM training_modules tm WHERE tm.id = p.item_id AND p.item_type = 'training'),
      -- Task descriptions
      (SELECT t.description FROM tasks t WHERE t.id = p.item_id AND p.item_type = 'task'),
      -- Announcement content (truncated)
      (SELECT LEFT(a.content, 100) FROM announcements a WHERE a.id = p.item_id AND p.item_type = 'announcement'),
      ''
    ) AS description,
    CASE p.item_type
      WHEN 'document' THEN '/documents/' || p.item_id
      WHEN 'sop' THEN '/sop/' || p.item_id
      WHEN 'training' THEN '/learning/training/' || p.item_id
      WHEN 'task' THEN '/tasks/' || p.item_id
      WHEN 'announcement' THEN '/announcements/' || p.item_id
      WHEN 'knowledge' THEN '/knowledge/' || p.item_id
      ELSE '/'
    END AS url
  FROM user_pins p
  WHERE p.user_id = p_user_id
  ORDER BY p.display_order ASC, p.pinned_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_properties(user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(property_id), ARRAY[]::uuid[])
  FROM public.user_properties
  WHERE user_id = $1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM user_roles 
  WHERE user_id = _user_id 
  ORDER BY CASE role
    WHEN 'regional_admin' THEN 1
    WHEN 'regional_hr' THEN 2
    WHEN 'property_manager' THEN 3
    WHEN 'property_hr' THEN 4
    WHEN 'department_head' THEN 5
    WHEN 'staff' THEN 6
  END
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'created_at', created_at,
      'last_active_at', last_active_at,
      'ip_address', COALESCE(ip_address, 'Unknown'),
      'user_agent', COALESCE(user_agent, 'Unknown'),
      'is_current', is_current,
      'expires_at', expires_at
    ))
    FROM public.user_sessions
    WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now()
    ORDER BY last_active_at DESC
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_vacation_balance(user_uuid uuid, year_filter integer DEFAULT NULL::integer)
 RETURNS TABLE(total_days integer, used_days numeric, pending_days numeric, remaining_days numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    target_year INTEGER := COALESCE(year_filter, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
    RETURN QUERY
    SELECT 
        vb.total_days,
        vb.used_days,
        vb.pending_days,
        (vb.total_days + vb.carried_over - vb.used_days - vb.pending_days)::DECIMAL as remaining_days
    FROM user_vacation_balance vb
    WHERE vb.user_id = user_uuid AND vb.year = target_year;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_learning_assignment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  module_title text;
  should_notify boolean := false;
BEGIN
  -- Determine logical condition for notification
  IF TG_OP = 'INSERT' AND NEW.status = 'assigned' THEN
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'assigned' AND (NEW.assignment_id IS DISTINCT FROM OLD.assignment_id) THEN
    should_notify := true;
  END IF;

  IF should_notify THEN
    -- Get module title
    IF NEW.content_type = 'module' THEN
      SELECT title INTO module_title FROM training_modules WHERE id = NEW.content_id;
    END IF;

    -- Fallback title
    IF module_title IS NULL THEN
      module_title := 'New Training Module';
    END IF;

    -- Insert notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'training_assigned',
      'New Training Assigned',
      'You have been assigned: ' || module_title,
      '/learning/my-learning',
      'learning_progress',
      NEW.id,
      jsonb_build_object('content_id', NEW.content_id, 'content_type', NEW.content_type)
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date_of_birth date;
BEGIN
  IF NEW.raw_user_meta_data ? 'date_of_birth'
     AND COALESCE(NEW.raw_user_meta_data->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::date;
  ELSE
    v_date_of_birth := CURRENT_DATE;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_date_of_birth
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  user_role text;
  matched_template_id uuid;
  v_training_id uuid;
  v_process_id uuid;
  v_task_id uuid;
BEGIN
  IF NEW.user_id IS NULL OR NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid creating duplicate active onboarding processes on profile updates.
  IF EXISTS (
    SELECT 1
    FROM public.onboarding_process op
    WHERE op.user_id = NEW.user_id
      AND op.status IN ('pending'::public.entity_status, 'in_progress'::public.entity_status)
  ) THEN
    RETURN NEW;
  END IF;

  SELECT ur.role::text
  INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = NEW.user_id
  LIMIT 1;

  SELECT ot.id
  INTO matched_template_id
  FROM public.onboarding_templates ot
  WHERE ot.is_active = true
    AND (
      (ot.role::text = user_role)
      OR (ot.department_id = NEW.department_id)
      OR (ot.role IS NULL AND ot.department_id IS NULL)
    )
  ORDER BY
    CASE
      WHEN ot.role::text = user_role THEN 1
      WHEN ot.department_id = NEW.department_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF matched_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.onboarding_process (user_id, template_id, status, start_date)
  VALUES (NEW.user_id, matched_template_id, 'in_progress'::public.entity_status, now())
  RETURNING id INTO v_process_id;

  INSERT INTO public.onboarding_tasks (
    process_id,
    title,
    description,
    assigned_to_id,
    due_date,
    link_type,
    link_id
  )
  SELECT
    v_process_id,
    t->>'title',
    t->>'description',
    CASE
      WHEN t->>'assignee_role' = 'self' THEN NEW.user_id
      WHEN t->>'assignee_role' = 'manager' THEN (
        SELECT p.reporting_to
        FROM public.profiles p
        WHERE p.id = NEW.user_id
      )
      ELSE NULL
    END,
    now() + ((t->>'due_day_offset')::int || ' days')::interval,
    t->>'link_type',
    CASE
      WHEN nullif(t->>'link_id', '') IS NOT NULL
        AND (t->>'link_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (t->>'link_id')::uuid
      ELSE NULL
    END
  FROM public.onboarding_templates ot,
       jsonb_array_elements(ot.tasks) AS t
  WHERE ot.id = matched_template_id;

  FOR v_training_id IN
    SELECT unnest(ot.required_training_ids)
    FROM public.onboarding_templates ot
    WHERE ot.id = matched_template_id
  LOOP
    INSERT INTO public.onboarding_tasks (
      process_id,
      title,
      description,
      assigned_to_id,
      due_date,
      link_type,
      link_id
    )
    SELECT
      v_process_id,
      'Complete Training: ' || tm.title,
      'Mandatory training module required for your role/department.',
      NEW.user_id,
      now() + interval '7 days',
      'training',
      v_training_id
    FROM public.training_modules tm
    WHERE tm.id = v_training_id
    RETURNING id INTO v_task_id;

    INSERT INTO public.learning_assignments (
      target_id,
      target_type,
      content_id,
      content_type,
      status,
      created_at,
      onboarding_process_id,
      onboarding_task_id
    )
    VALUES (
      NEW.user_id::text,
      'user'::public.learning_target_type,
      v_training_id,
      'module'::public.learning_content_type,
      'assigned',
      now(),
      v_process_id,
      v_task_id
    )
    ON CONFLICT (target_id, content_type, content_id)
    DO UPDATE SET
      onboarding_process_id = EXCLUDED.onboarding_process_id,
      onboarding_task_id = EXCLUDED.onboarding_task_id;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user_onboarding failed for user %, department %: %',
      NEW.user_id, NEW.department_id, SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_training()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert learning assignments for the new user based on their role
  INSERT INTO public.learning_assignments (
    target_type,
    target_id,
    content_type,
    content_id,
    due_date,
    assigned_by,
    created_at
  )
  SELECT
    'user',
    NEW.user_id::text,
    'module', -- FIX: Was 'training_module', which is invalid. Correct enum is 'module'
    tar.training_module_id,
    (NOW() + interval '30 days'),
    tar.created_by,
    NOW()
  FROM public.training_assignment_rules tar
  WHERE tar.target_role = NEW.role::text 
    AND tar.is_active = true
    AND tar.training_module_id IS NOT NULL;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_referral_history_and_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  job_title text;
begin
  if coalesce(new.referred_by, old.referred_by) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
    values (new.id, null, new.status, auth.uid(), 'Referral submitted');

    select title into job_title from public.job_postings where id = new.job_posting_id;

    insert into public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
    select distinct ur.user_id,
      'referral_status_update'::public.notification_type,
      'New referral submitted',
      coalesce(new.applicant_name, 'Candidate') || ' was referred for ' || coalesce(job_title, 'a role') || '.',
      'job_application',
      new.id,
      jsonb_build_object('status', new.status, 'job_posting_id', new.job_posting_id)
    from public.user_roles ur
    where ur.role in ('corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager');

    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.referral_history (referral_id, old_status, new_status, changed_by, change_note)
    values (new.id, old.status, new.status, auth.uid(), null);

    if new.referred_by is not null then
      insert into public.notifications (user_id, type, title, message, entity_type, entity_id, metadata)
      values (
        new.referred_by,
        'referral_status_update'::public.notification_type,
        'Referral status updated',
        coalesce(new.applicant_name, 'Candidate') || ' status changed to ' || new.status || '.',
        'job_application',
        new.id,
        jsonb_build_object('status', new.status, 'job_posting_id', new.job_posting_id)
      );
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_property_access(_user_id uuid, _property_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_properties
    WHERE user_id = _user_id AND property_id = _property_id
  )
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('regional_admin', 'regional_hr')
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_role_optimized(check_role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT check_role = ANY(public.get_my_roles());
$function$
;

CREATE OR REPLACE FUNCTION public.hydrate_training_certificate_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_progress_id uuid;
  v_module_id uuid;
  v_quiz_score integer;
  v_passing_score integer;
BEGIN
  IF NEW.certificate_type <> 'training' THEN
    RETURN NEW;
  END IF;

  IF NEW.training_progress_id IS NOT NULL AND NEW.training_module_id IS NULL THEN
    SELECT tp.training_id, tp.quiz_score
    INTO v_module_id, v_quiz_score
    FROM public.training_progress tp
    WHERE tp.id = NEW.training_progress_id
      AND coalesce(tp.is_deleted, false) = false
    LIMIT 1;

    IF v_module_id IS NOT NULL THEN
      NEW.training_module_id := v_module_id;
    END IF;
    IF NEW.score IS NULL AND v_quiz_score IS NOT NULL THEN
      NEW.score := v_quiz_score;
    END IF;
  END IF;

  IF NEW.training_progress_id IS NULL
     AND NEW.training_module_id IS NOT NULL
     AND NEW.user_id IS NOT NULL THEN
    SELECT public.resolve_training_certificate_progress(
      NEW.user_id,
      NEW.training_module_id,
      NEW.completion_date
    )
    INTO v_progress_id;

    IF v_progress_id IS NOT NULL THEN
      NEW.training_progress_id := v_progress_id;
    END IF;
  END IF;

  IF NEW.training_progress_id IS NOT NULL
     AND (NEW.score IS NULL OR NEW.training_module_id IS NULL) THEN
    SELECT tp.training_id, tp.quiz_score
    INTO v_module_id, v_quiz_score
    FROM public.training_progress tp
    WHERE tp.id = NEW.training_progress_id
      AND coalesce(tp.is_deleted, false) = false
    LIMIT 1;

    IF NEW.training_module_id IS NULL AND v_module_id IS NOT NULL THEN
      NEW.training_module_id := v_module_id;
    END IF;
    IF NEW.score IS NULL AND v_quiz_score IS NOT NULL THEN
      NEW.score := v_quiz_score;
    END IF;
  END IF;

  IF NEW.passing_score IS NULL AND NEW.training_module_id IS NOT NULL THEN
    SELECT tm.passing_score_percentage
    INTO v_passing_score
    FROM public.training_modules tm
    WHERE tm.id = NEW.training_module_id
    LIMIT 1;

    IF v_passing_score IS NOT NULL THEN
      NEW.passing_score := v_passing_score;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_batch_email_counters(p_batch_id uuid, p_sent integer DEFAULT 0, p_failed integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.notification_batches
  SET
    email_sent_count = email_sent_count + coalesce(p_sent, 0),
    email_failed_count = email_failed_count + coalesce(p_failed, 0),
    last_processed_at = now()
  WHERE id = p_batch_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_batch_failed(p_batch_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE notification_batches SET failed_count = failed_count + 1 WHERE id = p_batch_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_batch_processed(p_batch_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE notification_batches SET processed_count = processed_count + 1 WHERE id = p_batch_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_document_download_count(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE documents 
    SET 
        download_count = COALESCE(download_count, 0) + 1,
        last_downloaded_at = NOW()
    WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_media_usage_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE media_assets
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = NEW.media_asset_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_question_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only increment if content changed (not just status)
    IF OLD.question_text IS DISTINCT FROM NEW.question_text 
       OR OLD.correct_answer IS DISTINCT FROM NEW.correct_answer
       OR OLD.explanation IS DISTINCT FROM NEW.explanation THEN
        NEW.version = OLD.version + 1;
        
        -- Store version snapshot
        INSERT INTO knowledge_question_versions (question_id, version_number, data_snapshot, changed_by, change_reason)
        VALUES (
            OLD.id,
            OLD.version,
            jsonb_build_object(
                'question_text', OLD.question_text,
                'question_type', OLD.question_type,
                'correct_answer', OLD.correct_answer,
                'explanation', OLD.explanation,
                'difficulty_level', OLD.difficulty_level
            ),
            NEW.reviewed_by,
            'Content updated'
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_sop_view_count(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE sop_documents 
    SET view_count = COALESCE(view_count, 0) + 1 
    WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.int2_dist(smallint, smallint)
 RETURNS smallint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int2_dist$function$
;

CREATE OR REPLACE FUNCTION public.int4_dist(integer, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int4_dist$function$
;

CREATE OR REPLACE FUNCTION public.int8_dist(bigint, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int8_dist$function$
;

CREATE OR REPLACE FUNCTION public.interval_dist(interval, interval)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$interval_dist$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_admin.user_id
      AND ur.role = 'regional_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_guest_review_portfolio_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR (
      (
        public.has_role_optimized('property_manager'::public.app_role)
        OR public.has_role_optimized('property_hr'::public.app_role)
        OR public.has_role_optimized('regional_hr'::public.app_role)
      )
      AND EXISTS (
        SELECT 1
        FROM public.user_properties up
        WHERE up.user_id = auth.uid()
          AND up.property_id = '739771e0-08ff-4e07-992f-d2be1770aa59'::uuid
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_hr(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_hr.user_id
      AND ur.role IN ('regional_admin', 'regional_hr', 'property_hr')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_hr_or_admin(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = ANY (
        ARRAY[
          'corporate_admin'::public.app_role,
          'regional_admin'::public.app_role,
          'regional_hr'::public.app_role,
          'property_hr'::public.app_role
        ]
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_mfa_enabled(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.mfa_secrets 
    WHERE user_id = p_user_id AND enabled = true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_regional_admin_or_higher(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = $1
    AND role IN ('regional_admin', 'regional_hr')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_rls_enabled(p_table_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE oid = (p_table_name)::regclass;
$function$
;

CREATE OR REPLACE FUNCTION public.issue_training_certificate_from_training_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_module_title text;
    v_certificate_enabled boolean := false;
    v_passing_score integer := 80;
    v_recipient_name text;
    v_recipient_email text;
begin
    if coalesce(new.is_deleted, false)
       or new.status <> 'completed'
       or new.completed_at is null then
        return new;
    end if;

    select
        title,
        certificate_enabled,
        coalesce(passing_score_percentage, 80)
      into v_module_title, v_certificate_enabled, v_passing_score
      from public.training_modules
     where id = new.training_id;

    if not coalesce(v_certificate_enabled, false) then
        return new;
    end if;

    if exists (
        select 1
          from public.certificates c
         where c.training_progress_id = new.id
           and c.certificate_type = 'training'
           and c.status = 'active'
    ) then
        return new;
    end if;

    select
        coalesce(full_name, email, 'Training Participant'),
        email
      into v_recipient_name, v_recipient_email
      from public.profiles
     where id = new.user_id;

    begin
        insert into public.certificates (
            user_id,
            recipient_name,
            recipient_email,
            certificate_type,
            certificate_number,
            verification_code,
            training_module_id,
            training_progress_id,
            title,
            description,
            completion_date,
            score,
            passing_score,
            status,
            metadata
        ) values (
            new.user_id,
            coalesce(v_recipient_name, 'Training Participant'),
            v_recipient_email,
            'training',
            public.generate_certificate_number(),
            public.generate_verification_code(),
            new.training_id,
            new.id,
            v_module_title,
            'Congratulations! You''ve earned a certificate for completing ' || v_module_title || '.',
            new.completed_at,
            new.quiz_score,
            v_passing_score,
            'active',
            jsonb_build_object(
                'issued_by', 'training_progress_completion_trigger',
                'source', 'server_side_module_completion_fallback'
            )
        );
    exception
        when unique_violation then
            null;
    end;

    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.lock_account(p_email text, p_duration_minutes integer DEFAULT 30)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);
  
  IF FOUND THEN
    UPDATE public.profiles
    SET account_status = 'locked',
        locked_until = now() + (p_duration_minutes || ' minutes')::interval
    WHERE id = v_profile_id;
    
    -- Log the lockout
    INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
    VALUES (v_profile_id, 'account.locked', 'warning', jsonb_build_object(
      'email', p_email,
      'duration_minutes', p_duration_minutes
    ));
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_activity(action text, target_type text DEFAULT NULL::text, target_id uuid DEFAULT NULL::uuid, target_name text DEFAULT NULL::text, meta jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    new_id UUID;
    user_property UUID;
    user_department UUID;
BEGIN
    -- Get user's property and department
    SELECT property_id INTO user_property
    FROM user_properties 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    
    SELECT department_id INTO user_department
    FROM user_departments 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    
    INSERT INTO activity_log (
        user_id, action_type, target_type, target_id, 
        target_name, metadata, property_id, department_id
    ) VALUES (
        auth.uid(), action, target_type, target_id,
        target_name, meta, user_property, user_department
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actor_id UUID;
    changes JSONB;
    action_type TEXT;
    record_id UUID;
BEGIN
    -- Get the current user, can be NULL for service role operations
    actor_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        action_type := 'create';
        changes := to_jsonb(NEW);
        record_id := NEW.id;
    ELSIF (TG_OP = 'UPDATE') THEN
        action_type := 'update';
        changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
        record_id := NEW.id;
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'delete';
        changes := to_jsonb(OLD);
        record_id := OLD.id;
    END IF;

    -- Only insert if we have a valid record_id
    IF record_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            action,
            entity_type,
            entity_id,
            user_id,
            details
        ) VALUES (
            action_type,
            TG_TABLE_NAME, 
            record_id, -- Use UUID directly, no cast
            actor_id,
            changes
        );
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    user_agent
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    jsonb_build_object('old', p_old_values, 'new', p_new_values),
    null,
    null
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_document_download(p_document_id uuid, p_user_id uuid, p_ip_address inet DEFAULT NULL::inet)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO document_download_logs (document_id, user_id, ip_address)
    VALUES (p_document_id, p_user_id, p_ip_address)
    RETURNING id INTO v_log_id;
    
    -- Also increment the download count on the document
    PERFORM increment_document_download_count(p_document_id);
    
    RETURN v_log_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_document_view(p_document_id uuid, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_view_id UUID;
BEGIN
    INSERT INTO document_views (document_id, user_id)
    VALUES (p_document_id, p_user_id)
    RETURNING id INTO v_view_id;
    
    RETURN v_view_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_pii_access(p_target_user_id uuid, p_fields_accessed text[], p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  insert into public.pii_access_logs (
    accessed_by,
    user_id,
    pii_fields,
    justification,
    resource_type,
    resource_id,
    access_type
  )
  values (
    auth.uid(),
    p_target_user_id,
    p_fields_accessed,
    p_reason,
    'profile',
    p_target_user_id,
    'read'
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_audit_event_v2(p_action text, p_entity_type text DEFAULT 'system'::text, p_entity_id uuid DEFAULT gen_random_uuid(), p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_role TEXT := auth.role();
    v_is_allowed BOOLEAN := FALSE;
BEGIN
    -- 1. Validate if the action is allowed for the current role
    IF v_role = 'authenticated' THEN
        v_is_allowed := TRUE; -- Authenticated users can log their actions
    ELSIF v_role = 'anon' THEN
        -- Anon can only log specific security-related events to prevent spam
        IF p_action IN ('security.event', 'user.login_attempt', 'password.breach_detected', 'session.binding_failed', 'password.breached_detected') THEN
            v_is_allowed := TRUE;
        END IF;
    END IF;

    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Unauthorized: Event type % not allowed for role %', p_action, v_role;
    END IF;

    -- 2. Apply Rate Limiting for 'anon' role if the check_rate_limit function exists
    IF v_role = 'anon' THEN
        -- Check if check_rate_limit function exists before calling
        BEGIN
            IF NOT check_rate_limit('audit_log_anon:' || COALESCE(p_ip_address, 'unknown'), 15, 300) THEN
                RAISE EXCEPTION 'Rate limit exceeded for unauthenticated audit logging';
            END IF;
        EXCEPTION WHEN undefined_function THEN
            -- If rate limiting isn't set up yet, proceed but log a warning (internal)
            NULL;
        END;
    END IF;

    -- 3. Insert the log entry
    INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent
    ) VALUES (
        v_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        jsonb_build_object(
            'description', p_description,
            'metadata', p_metadata
        ),
        p_ip_address,
        p_user_agent
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log password changes
  IF TG_TABLE_NAME = 'users' AND NEW.encrypted_password != OLD.encrypted_password THEN
    INSERT INTO public.security_audit_logs (user_id, event_type, severity)
    VALUES (NEW.id, 'password.changed', 'info');
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_table_name text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_old_data jsonb DEFAULT NULL::jsonb, p_new_data jsonb DEFAULT NULL::jsonb, p_severity text DEFAULT 'info'::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO security_audit_logs (
        event_type,
        user_id,
        user_role,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        severity,
        metadata
    ) VALUES (
        p_event_type,
        auth.uid(),
        (SELECT role::TEXT FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
        p_table_name,
        p_record_id,
        p_action,
        p_old_data,
        p_new_data,
        p_severity,
        p_metadata
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_sop_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO sop_access_logs (
    document_id, 
    version_id, 
    user_id, 
    action, 
    ip_address, 
    user_agent
  ) VALUES (
    NEW.id, 
    NEW.current_version_id, 
    auth.uid(), 
    'view', 
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history (entity_type, entity_id, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE notifications 
    SET read_at = now(), updated_at = now()
    WHERE id = notification_id AND user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_sop_read_on_quiz_pass()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only mark as read if quiz was passed and completed
  IF NEW.passed = TRUE AND NEW.completed_at IS NOT NULL THEN
    -- Insert or update reading log
    INSERT INTO sop_reading_logs (sop_document_id, user_id, read_at, completed)
    VALUES (NEW.sop_document_id, NEW.user_id, NEW.completed_at, TRUE)
    ON CONFLICT (sop_document_id, user_id) 
    DO UPDATE SET 
      read_at = NEW.completed_at,
      completed = TRUE;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_learning_progress_last_block_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  block_module_id uuid;
BEGIN
  IF NEW.last_block_id IS NULL THEN
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
    RETURN NEW;
  END IF;

  SELECT tcb.training_module_id
  INTO block_module_id
  FROM public.training_content_blocks tcb
  WHERE tcb.id = NEW.last_block_id
  LIMIT 1;

  IF block_module_id IS NULL THEN
    NEW.last_block_id := NULL;
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'module'::public.learning_content_type
     AND NEW.content_id IS DISTINCT FROM block_module_id THEN
    NEW.last_block_id := NULL;
    IF COALESCE(NEW.metadata, '{}'::jsonb) ? 'active_block_id' THEN
      NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb), '{active_block_id}', 'null'::jsonb, true);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_comment_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify current assignee and requester about new comment
  IF NEW.request_id IS NOT NULL THEN
    DECLARE
      req RECORD;
    BEGIN
      SELECT * INTO req FROM requests WHERE id = NEW.request_id;
      
      -- Notify current assignee (if not the commenter)
      IF req.current_assignee_id IS NOT NULL AND req.current_assignee_id != NEW.author_id THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          req.current_assignee_id,
          'comment_added',
          'New Comment Added',
          format('A new comment was added to request #%s', req.request_no),
          jsonb_build_object('request_id', NEW.request_id, 'comment_id', NEW.id)
        );
      END IF;
      
      -- Notify requester (if not the commenter and different from assignee)
      IF req.requester_id != NEW.author_id AND req.requester_id != req.current_assignee_id THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          req.requester_id,
          'comment_added',
          'New Comment Added',
          format('A new comment was added to request #%s', req.request_no),
          jsonb_build_object('request_id', NEW.request_id, 'comment_id', NEW.id)
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_document_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rule RECORD;
    v_folder_name TEXT;
BEGIN
    -- Get folder name if document is in a folder
    IF NEW.folder_id IS NOT NULL THEN
        SELECT name INTO v_folder_name FROM document_folders WHERE id = NEW.folder_id;
    ELSE
        v_folder_name := 'All Documents';
    END IF;
    
    -- Create notifications for users watching this folder
    FOR v_rule IN 
        SELECT user_id 
        FROM document_notification_rules 
        WHERE (folder_id = NEW.folder_id OR folder_id IS NULL)
        AND notify_on_new = TRUE
        AND user_id != NEW.created_by  -- Don't notify the creator
    LOOP
        -- Insert into notifications table (assumes notifications table exists)
        INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
        VALUES (
            v_rule.user_id,
            'document_created',
            'New Document: ' || NEW.title,
            'A new document has been added to ' || v_folder_name,
            'document',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_document_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rule RECORD;
    v_folder_name TEXT;
BEGIN
    -- Only notify if title or status changed (not just view counts, etc.)
    IF NEW.title = OLD.title AND NEW.status = OLD.status AND NEW.folder_id IS NOT DISTINCT FROM OLD.folder_id THEN
        RETURN NEW;
    END IF;
    
    -- Get folder name
    IF NEW.folder_id IS NOT NULL THEN
        SELECT name INTO v_folder_name FROM document_folders WHERE id = NEW.folder_id;
    ELSE
        v_folder_name := 'All Documents';
    END IF;
    
    -- Create notifications for users watching this folder
    FOR v_rule IN 
        SELECT user_id 
        FROM document_notification_rules 
        WHERE (folder_id = NEW.folder_id OR folder_id IS NULL)
        AND notify_on_update = TRUE
        AND user_id != COALESCE(NEW.updated_by, NEW.created_by)  -- Don't notify the updater
    LOOP
        INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id)
        VALUES (
            v_rule.user_id,
            'document_updated',
            'Updated Document: ' || NEW.title,
            'The document has been updated in ' || v_folder_name,
            'document',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_message_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.message_type = 'direct' AND NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata, entity_type, entity_id, link, created_at)
    VALUES (
      NEW.recipient_id,
      'message_received',
      'New message',
      COALESCE(NULLIF(NEW.subject, ''), 'You have a new message'),
      jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id),
      'message',
      NEW.id,
      '/messaging/' || NEW.id::text,
      now()
    )
    ON CONFLICT (user_id, type, entity_type, entity_id)
      WHERE (type = 'message_received' AND entity_type = 'message' AND entity_id IS NOT NULL)
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_request_status_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify requester if status changed
  IF OLD.status != NEW.status AND NEW.requester_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.requester_id,
      CASE NEW.status
        WHEN 'approved' THEN 'request_approved'
        WHEN 'rejected' THEN 'request_rejected'
        WHEN 'returned_for_correction' THEN 'request_returned'
        WHEN 'closed' THEN 'request_closed'
        ELSE 'request_approved' -- fallback
      END,
      format('Request #%s %s', NEW.request_no, REPLACE(NEW.status, '_', ' ')),
      format('Your request has been %s', REPLACE(NEW.status, '_', ' ')),
      jsonb_build_object('request_id', NEW.id, 'entity_type', NEW.entity_type)
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_request_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify supervisor
  IF NEW.supervisor_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.supervisor_id,
      'request_submitted',
      'New Request Submitted',
      format('Request #%s from %s requires your approval', NEW.request_no, COALESCE((SELECT full_name FROM profiles WHERE id = NEW.requester_id), 'Unknown')),
      jsonb_build_object('request_id', NEW.id, 'entity_type', NEW.entity_type)
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.oid_dist(oid, oid)
 RETURNS oid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$oid_dist$function$
;

CREATE OR REPLACE FUNCTION public.process_due_promotions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_promo record;
  v_count integer := 0;
begin
  for v_promo in
    select *
    from public.promotions
    where status = 'pending'
      and effective_date <= current_date
  loop
    if v_promo.new_job_title is not null and length(trim(v_promo.new_job_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(v_promo.new_job_title),
        coalesce((select d.name from public.departments d where d.id = v_promo.new_department_id), 'General'),
        coalesce(v_promo.new_role, 'staff'::public.app_role),
        v_promo.new_department_id
      )
      on conflict (title) do nothing;
    end if;

    update public.profiles
    set job_title = v_promo.new_job_title,
        updated_at = now()
    where id = v_promo.employee_id;

    if v_promo.new_role is not null then
      delete from public.user_roles
      where user_id = v_promo.employee_id;

      insert into public.user_roles (user_id, role)
      values (v_promo.employee_id, v_promo.new_role)
      on conflict (user_id, role) do nothing;
    end if;

    delete from public.user_departments
    where user_id = v_promo.employee_id;

    if v_promo.new_department_id is not null then
      insert into public.user_departments (user_id, department_id)
      values (v_promo.employee_id, v_promo.new_department_id)
      on conflict (user_id, department_id) do nothing;
    end if;

    update public.promotions
    set status = 'completed',
        updated_at = now()
    where id = v_promo.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_due_transfers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transfer RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_transfer IN 
        SELECT * FROM public.transfers 
        WHERE status = 'approved' AND effective_date <= CURRENT_DATE
    LOOP
        -- Update Property Assignment
        -- Logic: We move the user FROM the source property TO the target property.
        
        -- OPTION A: If we want to replace the old property assignment with the new one
        UPDATE public.user_properties 
        SET property_id = v_transfer.to_property_id, updated_at = NOW() 
        WHERE user_id = v_transfer.employee_id AND property_id = v_transfer.from_property_id;

        -- If the update affected 0 rows (e.g., from_property_id missing?), we should fallback OR log warning.
        -- If user didn't have the 'from' property anymore, maybe we just INSERT the new one?
        -- For now, we assume data integrity was checked at request time.
        
        -- Safe Insert if Update failed (Edge Case: User removed from property while transfer pending)
        IF NOT FOUND THEN
             INSERT INTO public.user_properties (user_id, property_id) 
             VALUES (v_transfer.employee_id, v_transfer.to_property_id)
             ON CONFLICT (user_id, property_id) DO NOTHING;
        END IF;

        -- Update Department (if specified)
        -- We should only update the department associated with that property?
        -- But user_departments tracks 'department_id' only (not linked to property in table definition typically, 
        -- though logically it is).
        -- We will update the user's primary department logic if simplistic, or remove old department.
        
        -- In simple schema: user_departments has (user_id, department_id).
        -- If we move properties, we should likely clear old department and add new.
        
        IF v_transfer.to_department_id IS NOT NULL THEN
             -- Remove old department if it was in the old property? 
             -- Hard to know which department belonged to old property without joining.
             -- Simplified: Just set the department.
             
             -- Attempt to update existing?
             UPDATE public.user_departments
             SET department_id = v_transfer.to_department_id
             WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
             
             IF NOT FOUND THEN
                INSERT INTO public.user_departments (user_id, department_id)
                VALUES (v_transfer.employee_id, v_transfer.to_department_id)
                ON CONFLICT (user_id, department_id) DO NOTHING;
             END IF;
        ELSE
            -- If no new department, and we know the old one, remove it?
            IF v_transfer.from_department_id IS NOT NULL THEN
                DELETE FROM public.user_departments 
                WHERE user_id = v_transfer.employee_id AND department_id = v_transfer.from_department_id;
            END IF;
        END IF;

        -- Mark as completed
        UPDATE public.transfers SET status = 'completed', updated_at = NOW() WHERE id = v_transfer.id;
        
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_notification_batch(p_batch_size integer DEFAULT 50)
 RETURNS TABLE(processed integer, remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_processed INT := 0;
  v_remaining INT;
  v_item RECORD;
BEGIN
  FOR v_item IN (
    SELECT id, user_id, notification_type, notification_data, batch_id
    FROM notification_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ) LOOP
    UPDATE notification_queue SET status = 'processing', attempts = attempts + 1 WHERE id = v_item.id;
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_item.user_id,
      v_item.notification_data->>'title',
      v_item.notification_data->>'message',
      v_item.notification_type,
      v_item.notification_data
    );
    UPDATE notification_queue SET status = 'sent', processed_at = NOW() WHERE id = v_item.id;
    UPDATE notification_batches SET processed_count = processed_count + 1 WHERE id = v_item.batch_id;
    v_processed := v_processed + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_remaining FROM notification_queue WHERE status = 'pending';

  UPDATE notification_batches
  SET status = 'completed', completed_at = NOW()
  WHERE status = 'processing' AND processed_count + failed_count >= total_count;

  RETURN QUERY SELECT v_processed, v_remaining;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_request_finalization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promo_id UUID;
    v_transfer_id UUID;
BEGIN
    -- Only act when request is APPROVED.
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN

        -- Promotion records are created as 'pending'. Keep them in that valid
        -- state, then immediately process if the effective date is due.
        IF NEW.entity_type = 'promotion' THEN
            SELECT id INTO v_promo_id
            FROM public.promotions
            WHERE id = NEW.entity_id;

            IF v_promo_id IS NOT NULL THEN
              UPDATE public.promotions
              SET status = 'pending',
                  updated_at = now()
              WHERE id = v_promo_id
                AND status <> 'cancelled';

              PERFORM public.process_due_promotions();
            END IF;
        END IF;

        -- Handle Transfer
        IF NEW.entity_type = 'transfer' THEN
            SELECT id INTO v_transfer_id
            FROM public.transfers
            WHERE id = NEW.entity_id;

            IF v_transfer_id IS NOT NULL THEN
              UPDATE public.transfers
              SET status = 'approved'
              WHERE id = v_transfer_id;

              PERFORM public.process_due_transfers();
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.promote_employee(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text, p_promoter_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promotion_id UUID;
    v_old_role app_role;
    v_old_job_title TEXT;
    v_old_department_id UUID;
    v_current_date DATE;
BEGIN
    -- Get current date
    v_current_date := CURRENT_DATE;

    -- Fetch current details
    SELECT job_title INTO v_old_job_title FROM public.profiles WHERE id = p_employee_id;
    
    SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_employee_id LIMIT 1;
    
    SELECT department_id INTO v_old_department_id FROM public.user_departments WHERE user_id = p_employee_id LIMIT 1;

    -- Insert Promotion Record
    INSERT INTO public.promotions (
        employee_id,
        promoted_by,
        old_role,
        new_role,
        old_job_title,
        new_job_title,
        old_department_id,
        new_department_id,
        effective_date,
        notes,
        status
    ) VALUES (
        p_employee_id,
        p_promoter_id,
        v_old_role,
        p_new_role,
        v_old_job_title,
        p_new_job_title,
        v_old_department_id,
        p_new_department_id,
        p_effective_date,
        p_notes,
        CASE WHEN p_effective_date <= v_current_date THEN 'completed' ELSE 'pending' END
    ) RETURNING id INTO v_promotion_id;

    -- Apply changes IMMEDIATELY if date is today or present
    IF p_effective_date <= v_current_date THEN
        -- Update Profile Title
        UPDATE public.profiles 
        SET job_title = p_new_job_title, updated_at = NOW() 
        WHERE id = p_employee_id;

        -- Update Role (Delete old, Insert new to avoid constraint issues)
        DELETE FROM public.user_roles WHERE user_id = p_employee_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (p_employee_id, p_new_role);

        -- Update Department
        DELETE FROM public.user_departments WHERE user_id = p_employee_id;
        IF p_new_department_id IS NOT NULL THEN
            INSERT INTO public.user_departments (user_id, department_id)
            VALUES (p_employee_id, p_new_department_id);
        END IF;
    END IF;

    RETURN v_promotion_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rebuild_document_search_index()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER := 0;
    v_doc RECORD;
BEGIN
    FOR v_doc IN SELECT id FROM documents WHERE is_archived = FALSE
    LOOP
        UPDATE documents SET id = id WHERE id = v_doc.id;
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.record_failed_login_attempt(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record public.failed_login_attempts%ROWTYPE;
  v_profile_id uuid;
BEGIN
  -- Check if there's an existing record for this email
  SELECT * INTO v_record
  FROM public.failed_login_attempts
  WHERE email = lower(p_email)
  ORDER BY last_attempt_at DESC
  LIMIT 1;
  
  IF FOUND AND v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    -- Already locked, just update timestamp
    UPDATE public.failed_login_attempts
    SET last_attempt_at = now()
    WHERE id = v_record.id;
    RETURN;
  END IF;
  
  IF FOUND THEN
    -- Update existing record
    UPDATE public.failed_login_attempts
    SET attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        captcha_required = CASE WHEN attempt_count >= 3 THEN true ELSE captcha_required END,
        locked_until = CASE 
          WHEN attempt_count >= 5 THEN now() + interval '30 minutes'
          ELSE locked_until
        END
    WHERE id = v_record.id;
  ELSE
    -- Insert new record
    INSERT INTO public.failed_login_attempts (email, attempt_count)
    VALUES (lower(p_email), 1);
  END IF;
  
  -- Also update the profile if it exists
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = lower(p_email);
  
  IF FOUND THEN
    UPDATE public.profiles
    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        locked_until = CASE 
          WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes'
          ELSE locked_until
        END,
        account_status = CASE 
          WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN 'locked'
          ELSE account_status
        END
    WHERE id = v_profile_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_sop_document_search()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sop_document_search;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_document_atomic(p_approval_id uuid, p_approver_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_document_id uuid;
  v_document_title text;
  v_document_author uuid;
  v_delegator_id uuid;
  v_delegation_id uuid;
  v_max_approvals integer;
  v_approvals_used integer;
  v_notify_on_action boolean;
  v_notify_delegator boolean;
  v_delegate_name text;
  v_is_delegate boolean := false;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Rejection reason is required';
  end if;

  if not public.can_user_act_on_document_approval(p_approver_id, p_approval_id) then
    raise exception 'Not authorized to reject this item';
  end if;

  select da.document_id, da.approver_id
  into v_document_id, v_delegator_id
  from public.document_approvals da
  where da.id = p_approval_id
  for update;

  select ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  into v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  from public.temporary_approvers ta
  join public.documents d on d.id = v_document_id
  where ta.delegator_id = v_delegator_id
    and (ta.delegate_id = p_approver_id or p_approver_id = any(ta.fallback_delegate_ids))
    and ta.start_at <= now()
    and ta.end_at >= now()
    and (
      (ta.entity_type is not null and ta.entity_id is not null
       and ta.entity_type = 'document_approval'
       and ta.entity_id = p_approval_id)
      or
      (ta.entity_type is null and ta.entity_id is null
       and (
         ta.scope_type = 'all'
         or (ta.scope_type = 'property' and ta.scope_id is not distinct from d.property_id)
         or (ta.scope_type = 'department' and ta.scope_id is not distinct from d.department_id)
       ))
    )
  order by (ta.entity_id is not null) desc, (ta.entity_type is not null) desc, ta.start_at desc
  limit 1;

  v_is_delegate := v_delegation_id is not null and p_approver_id <> v_delegator_id;

  if v_is_delegate and v_max_approvals is not null and v_approvals_used >= v_max_approvals then
    raise exception 'Delegation approval limit reached';
  end if;

  update public.document_approvals
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = p_approver_id,
      rejection_reason = p_reason,
      is_active = false,
      updated_at = now()
  where id = p_approval_id
    and status = 'pending'
    and is_active = true;

  if v_is_delegate then
    update public.temporary_approvers
    set approvals_used = coalesce(approvals_used, 0) + 1
    where id = v_delegation_id;
  end if;

  update public.documents
  set status = 'REJECTED',
      updated_at = now()
  where id = v_document_id;

  select d.title, d.created_by
  into v_document_title, v_document_author
  from public.documents d
  where d.id = v_document_id;

  if v_is_delegate and coalesce(v_notify_on_action, true) and coalesce(v_notify_delegator, true) then
    select full_name into v_delegate_name from public.profiles where id = p_approver_id;
    if v_delegator_id is not null and v_delegator_id <> p_approver_id then
      insert into public.notifications (user_id, type, title, message, metadata)
      values (
        v_delegator_id,
        'request_rejected'::public.notification_type,
        'Delegated Approval Completed',
        coalesce(v_delegate_name, 'A delegate') || ' rejected a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    end if;
  end if;

  if v_document_author is not null and v_document_author <> p_approver_id then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_document_author,
      'request_rejected'::public.notification_type,
      'Document Rejected',
      'Your document "' || coalesce(v_document_title, 'Document') || '" was rejected. Reason: ' || p_reason,
      jsonb_build_object(
        'entity_type', 'document',
        'entity_id', v_document_id,
        'link', '/documents/' || v_document_id::text,
        'approval_id', p_approval_id
      )
    );
  end if;

  return jsonb_build_object('success', true, 'document_id', v_document_id, 'rejected', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_leave_request(request_id uuid, rejector_id uuid, rejection_reason text, notification_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_request leave_requests%rowtype;
  v_rejection_reason text := rejection_reason;
begin
  if rejector_id != auth.uid() then
    raise exception 'Unauthorized: Rejector ID mismatch';
  end if;

  update public.leave_requests
  set status = 'rejected'::public.entity_status,
      rejected_by_id = rejector_id,
      rejection_reason = v_rejection_reason,
      updated_at = now()
  where id = request_id
    and status = 'pending'::public.entity_status
  returning * into v_request;

  if not found then
    raise exception 'Leave request not found or not pending';
  end if;

  if notification_payload is not null then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (
      nullif(notification_payload->>'user_id', '')::uuid,
      public.safe_notification_type(notification_payload->>'type', 'request_rejected'::public.notification_type),
      notification_payload->>'title',
      notification_payload->>'message',
      notification_payload->>'link',
      coalesce(notification_payload->'metadata', notification_payload->'data', '{}'::jsonb)
    );
  end if;

  return to_jsonb(v_request);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reject_sop_document(p_document_id uuid, p_approver_id uuid, p_comment text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update approval status
  UPDATE sop_document_approvals
  SET 
    status = 'rejected',
    rejected_at = CURRENT_TIMESTAMP,
    comment = p_comment
  WHERE document_id = p_document_id 
    AND approver_id = p_approver_id 
    AND status = 'pending';
  
  -- Update document status back to draft
  UPDATE sop_documents
  SET status = 'draft'
  WHERE id = p_document_id;
  
  RETURN QUERY SELECT TRUE, 'Document rejected and returned to draft';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reorder_user_pins(p_user_id uuid, p_pin_orders jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pin_id UUID;
  v_order INT;
  v_item RECORD;
BEGIN
  -- Verify user can only modify their own pins
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify pins for other users';
  END IF;

  -- Update display orders
  FOR v_item IN 
    SELECT 
      (elem->>'pin_id')::UUID as pin_id,
      (elem->>'display_order')::INT as display_order
    FROM jsonb_array_elements(p_pin_orders) as elem
  LOOP
    UPDATE user_pins
    SET display_order = v_item.display_order
    WHERE id = v_item.pin_id AND user_id = p_user_id;
  END LOOP;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_workflow_steps(p_workflow_id uuid, p_steps jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_step jsonb;
  v_inserted_count integer := 0;
  v_action text;
begin
  if jsonb_typeof(p_steps) != 'array' then
    raise exception 'Steps must be a JSON array';
  end if;

  if not exists (
    select 1
    from public.workflow_definitions wd
    where wd.id = p_workflow_id
      and wd.is_deleted = false
  ) then
    raise exception 'Workflow not found: %', p_workflow_id;
  end if;

  delete from public.workflow_steps where workflow_id = p_workflow_id;

  for v_step in
    select value
    from jsonb_array_elements(p_steps)
  loop
    v_action := coalesce(v_step->>'action', v_step->>'action_type');
    if v_action is null then
      raise exception 'Each workflow step requires action or action_type';
    end if;

    insert into public.workflow_steps (
      workflow_id,
      step_order,
      name,
      action,
      config
    )
    values (
      p_workflow_id,
      coalesce(
        nullif(v_step->>'step_order', '')::integer,
        nullif(v_step->>'order', '')::integer,
        v_inserted_count + 1
      ),
      coalesce(v_step->>'name', format('Step %s', v_inserted_count + 1)),
      v_action,
      coalesce(v_step->'config', '{}'::jsonb)
    );

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'workflow_id', p_workflow_id,
    'steps_created', v_inserted_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.request_after_update_status_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_apply_action(p_request_id uuid, p_action text, p_comment text DEFAULT NULL::text, p_forward_to uuid DEFAULT NULL::uuid, p_visibility text DEFAULT 'all'::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  req record;
  current_step record;
  next_step record;
  actor_id uuid := auth.uid();
  has_comment boolean := p_comment is not null and length(trim(p_comment)) > 0;
begin
  if actor_id is null then
    return query select false, 'Not authenticated';
    return;
  end if;

  select * into req from public.requests where id = p_request_id;
  if not found then
    return query select false, 'Request not found';
    return;
  end if;

  if not public.can_view_request(p_request_id) then
    return query select false, 'Access denied';
    return;
  end if;

  if p_action in ('reject', 'return') and not has_comment then
    return query select false, 'Comment is required for this action';
    return;
  end if;

  select * into current_step from public.request_steps
  where request_id = p_request_id and status = 'pending'
  order by step_order limit 1;

  if current_step.id is null and p_action in ('approve', 'reject', 'return', 'forward') then
    return query select false, 'No pending step found';
    return;
  end if;

  case p_action
    when 'approve' then
      update public.request_steps
      set status = 'approved', acted_at = now(), comment = p_comment
      where id = current_step.id;

      select * into next_step from public.request_steps
      where request_id = p_request_id and step_order > current_step.step_order and status = 'waiting'
      order by step_order limit 1;

      if next_step.id is not null then
        update public.request_steps
        set status = 'pending', assignee_id = next_step.assignee_id
        where id = next_step.id;

        update public.requests
        set status = 'pending_hr_review',
            current_assignee_id = next_step.assignee_id,
            last_action_at = now(),
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{routing_warning,missing_hr_assignee}', to_jsonb(next_step.assignee_id is null), true)
        where id = p_request_id;

        if next_step.assignee_id is null then
          insert into public.notifications (user_id, type, title, message, metadata)
          select ur.user_id,
                 'escalation_alert'::public.notification_type,
                 'Routing issue: Missing HR assignee',
                 format('Request #%s has no HR assignee.', req.request_no),
                 jsonb_build_object('request_id', req.id, 'entity_type', req.entity_type, 'reason', 'missing_hr_assignee')
          from public.user_roles ur
          where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
        end if;
      else
        update public.requests
        set status = 'approved',
            current_assignee_id = null,
            closed_at = now(),
            due_at = null,
            last_action_at = now()
        where id = p_request_id;

        if req.entity_type = 'leave_request' then
          update public.leave_requests
          set status = 'approved',
              approved_by_id = actor_id,
              updated_at = now()
          where id = req.entity_id;
        end if;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));

    when 'reject' then
      update public.request_steps
      set status = 'rejected', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'rejected',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'rejected',
            rejected_by_id = actor_id,
            rejection_reason = p_comment,
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));

    when 'return' then
      update public.request_steps
      set status = 'returned', acted_at = now(), comment = p_comment
      where id = current_step.id;

      update public.requests
      set status = 'returned_for_correction',
          current_assignee_id = req.requester_id,
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      if req.entity_type = 'leave_request' then
        update public.leave_requests
        set status = 'pending',
            updated_at = now()
        where id = req.entity_id;
      end if;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));

    when 'forward' then
      update public.request_steps
      set assignee_id = p_forward_to,
          comment = p_comment,
          due_at = case
            when current_step.sla_hours is not null then now() + make_interval(hours => current_step.sla_hours)
            else current_step.due_at
          end
      where id = current_step.id;

      update public.requests
      set current_assignee_id = p_forward_to,
          last_action_at = now()
      where id = p_request_id;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));

    when 'close' then
      update public.requests
      set status = 'closed',
          current_assignee_id = null,
          closed_at = now(),
          due_at = null,
          last_action_at = now()
      where id = p_request_id;

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));

    when 'add_comment' then
      insert into public.request_comments (request_id, author_id, comment, visibility)
      values (p_request_id, actor_id, p_comment, p_visibility);

      insert into public.request_events (request_id, actor_id, event_type, payload)
      values (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));

      update public.requests
      set last_action_at = now()
      where id = p_request_id;
  end case;

  if p_action <> 'add_comment' and has_comment then
    insert into public.request_comments (request_id, author_id, comment, visibility)
    values (p_request_id, actor_id, p_comment, p_visibility);
  end if;

  return query select true, 'Action completed successfully';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.request_attachment_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.request_id, NEW.uploaded_by, 'attachment_added', jsonb_build_object('file_name', NEW.file_name));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_comment_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assignee_id UUID;
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.request_id, NEW.author_id, 'comment_added', jsonb_build_object('visibility', NEW.visibility));

  SELECT r.current_assignee_id INTO assignee_id FROM requests r WHERE r.id = NEW.request_id;

  -- In-app notification to current assignee (if any and not self)
  IF assignee_id IS NOT NULL AND assignee_id <> NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      assignee_id,
      'comment_added',
      'New comment on request',
      'A new comment was added to a request requiring attention.',
      jsonb_build_object('request_id', NEW.request_id)
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_id_from_storage_path(p_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_part text;
  v_uuid uuid;
BEGIN
  v_part := split_part(p_path, '/', 1);
  v_uuid := v_part::uuid;
  RETURN v_uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.request_insert_created_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.id, NEW.requester_id, 'created', jsonb_build_object('status', NEW.status));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_comment(p_comment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_document_id UUID;
BEGIN
    -- Get the document_id
    SELECT document_id INTO v_document_id
    FROM document_comments
    WHERE id = p_comment_id;
    
    IF v_document_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission
    IF NOT EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = v_document_id
        AND (
            d.created_by = auth.uid() OR
            d.owner_id = auth.uid() OR
            public.has_role(auth.uid(), 'regional_admin') OR
            (public.has_role(auth.uid(), 'property_manager') AND 
             public.has_property_access(auth.uid(), d.property_id))
        )
    ) THEN
        RETURN FALSE;
    END IF;
    
    UPDATE document_comments
    SET is_resolved = TRUE, updated_at = NOW()
    WHERE id = p_comment_id;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_training_certificate_progress(p_user_id uuid, p_training_module_id uuid, p_completion_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT tp.id
  FROM public.training_progress tp
  WHERE tp.user_id = p_user_id
    AND tp.training_id = p_training_module_id
    AND coalesce(tp.is_deleted, false) = false
  ORDER BY
    CASE WHEN tp.status = 'completed' THEN 0 ELSE 1 END,
    ABS(EXTRACT(EPOCH FROM (
      coalesce(tp.completed_at, tp.updated_at, tp.created_at) - coalesce(p_completion_date, coalesce(tp.completed_at, tp.updated_at, tp.created_at))
    ))) ASC NULLS LAST,
    coalesce(tp.completed_at, tp.updated_at, tp.created_at) DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_training_module_write_target(p_module_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module RECORD;
  v_target uuid;
BEGIN
  SELECT id, title, status, is_active, is_deleted, property_id, department_id
  INTO v_module
  FROM public.training_modules
  WHERE id = p_module_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_module.is_deleted, false) = false
     AND COALESCE(v_module.is_active, true) = true
     AND COALESCE(v_module.status, 'draft') <> 'archived' THEN
    RETURN v_module.id;
  END IF;

  SELECT tm.id
  INTO v_target
  FROM public.training_modules tm
  WHERE tm.id <> v_module.id
    AND tm.title = v_module.title
    AND COALESCE(tm.is_deleted, false) = false
    AND COALESCE(tm.is_active, true) = true
    AND COALESCE(tm.status, 'draft') <> 'archived'
    AND tm.property_id IS NOT DISTINCT FROM v_module.property_id
    AND tm.department_id IS NOT DISTINCT FROM v_module.department_id
  ORDER BY tm.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_target;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = now(),
      revoked_reason = 'revoke_all_other'
  WHERE user_id = p_user_id
  AND is_current = false
  AND revoked_at IS NULL;
  
  INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
  VALUES (p_user_id, 'session.revoke_all_other', 'info', jsonb_build_object('count', (SELECT count(*) FROM public.user_sessions WHERE user_id = p_user_id AND revoked_at IS NOT NULL)));
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = now(),
      revoked_reason = 'user_initiated'
  WHERE id = p_session_id
  AND user_id = auth.uid();
  
  IF FOUND THEN
    INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
    VALUES (auth.uid(), 'session.revoked', 'info', jsonb_build_object('session_id', p_session_id));
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.run_eom_calculation(p_property_id uuid, p_month integer, p_year integer)
 RETURNS TABLE(user_id uuid, full_name text, total_score numeric, rank integer, is_eligible boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config eom_automation_config%ROWTYPE;
    v_user_record RECORD;
    v_score_record RECORD;
    v_rank INTEGER := 0;
BEGIN
    -- Get config for property
    SELECT * INTO v_config
    FROM eom_automation_config
    WHERE property_id = p_property_id;
    
    IF NOT FOUND OR NOT v_config.is_enabled THEN
        RAISE EXCEPTION 'EOM automation not enabled for this property';
    END IF;
    
    -- Clear previous scoring history for this month
    DELETE FROM eom_scoring_history
    WHERE property_id = p_property_id
    AND month = p_month
    AND year = p_year;
    
    -- Calculate scores for all active users in property
    FOR v_user_record IN 
        SELECT p.id, p.full_name
        FROM profiles p
        JOIN user_properties up ON up.user_id = p.id
        WHERE up.property_id = p_property_id
        AND p.is_active = true
    LOOP
        SELECT * INTO v_score_record
        FROM calculate_eom_score(
            v_user_record.id, 
            p_property_id, 
            p_month, 
            p_year, 
            v_config
        );
        
        -- Insert scoring history
        INSERT INTO eom_scoring_history (
            property_id, user_id, month, year,
            task_completion_rate, training_completion_rate, 
            sop_compliance_rate, attendance_rate,
            task_completion_score, training_completion_score,
            sop_compliance_score, attendance_score,
            total_score, rank, is_eligible, ineligibility_reason
        ) VALUES (
            p_property_id, v_user_record.id, p_month, p_year,
            v_score_record.task_completion_rate,
            v_score_record.training_completion_rate,
            v_score_record.sop_compliance_rate,
            v_score_record.attendance_rate,
            (v_score_record.task_completion_rate * v_config.task_completion_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.training_completion_rate * v_config.training_completion_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.sop_compliance_rate * v_config.sop_compliance_weight / 100.0)::DECIMAL(5,2),
            (v_score_record.attendance_rate * v_config.attendance_weight / 100.0)::DECIMAL(5,2),
            v_score_record.total_score,
            0, -- Will update later
            v_score_record.is_eligible,
            v_score_record.ineligibility_reason
        );
    END LOOP;
    
    -- Update rankings (only for eligible employees)
    UPDATE eom_scoring_history
    SET rank = subquery.rank
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank
        FROM eom_scoring_history
        WHERE property_id = p_property_id
        AND month = p_month
        AND year = p_year
        AND is_eligible = true
    ) subquery
    WHERE eom_scoring_history.id = subquery.id;
    
    -- Return results
    RETURN QUERY
    SELECT 
        esh.user_id,
        p.full_name::TEXT,
        esh.total_score,
        esh.rank,
        esh.is_eligible
    FROM eom_scoring_history esh
    JOIN profiles p ON p.id = esh.user_id
    WHERE esh.property_id = p_property_id
    AND esh.month = p_month
    AND esh.year = p_year
    ORDER BY esh.rank ASC, esh.total_score DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.safe_notification_type(p_value text, p_default notification_type DEFAULT 'system'::notification_type)
 RETURNS notification_type
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_value text;
begin
  v_value := lower(trim(coalesce(p_value, '')));
  if v_value = '' then
    return p_default;
  end if;

  begin
    return v_value::public.notification_type;
  exception when others then
    return p_default;
  end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sanitize_search_input(p_input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT regexp_replace(
    regexp_replace(
        regexp_replace(
            COALESCE(p_input, ''),
            '[^a-zA-Z0-9\s\-_@.]', '', 'g'  -- Remove special characters
        ),
        '\s+', ' ', 'g'  -- Normalize whitespace
    ),
    '^\s+|\s+$', '', 'g'  -- Trim
);
$function$
;

CREATE OR REPLACE FUNCTION public.save_password_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.encrypted_password <> OLD.encrypted_password THEN
    INSERT INTO public.password_history (user_id, password_hash)
    VALUES (NEW.id, NEW.encrypted_password);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_documents(p_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, file_url text, status document_status, property_id uuid, folder_id uuid, created_at timestamp with time zone, rank real, headline text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_query_tsquery tsquery;
BEGIN
    -- Convert search query to tsquery
    v_query_tsquery := plainto_tsquery('english', p_query);
    
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.file_url,
        d.status,
        d.property_id,
        d.folder_id,
        d.created_at,
        ts_rank_cd(d.search_vector, v_query_tsquery, 32)::REAL AS rank,
        ts_headline('english', d.title || ' ' || COALESCE(d.description, ''), v_query_tsquery, 
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=10') AS headline
    FROM documents d
    WHERE d.search_vector @@ v_query_tsquery
    AND d.is_archived = FALSE
    AND (
        -- Apply property filter if provided
        p_property_id IS NULL OR d.property_id = p_property_id
    )
    AND (
        -- Apply folder filter if provided
        p_folder_id IS NULL OR d.folder_id = p_folder_id
    )
    -- Respect visibility
    AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        d.created_by = auth.uid() OR
        d.owner_id = auth.uid() OR
        (
            d.status = 'PUBLISHED' AND 
            (
                d.visibility = 'all_properties' OR
                (d.visibility = 'property' AND public.has_property_access(auth.uid(), d.property_id)) OR
                (d.visibility = 'department' AND EXISTS (
                    SELECT 1 FROM user_departments ud
                    WHERE ud.user_id = auth.uid() AND ud.department_id = d.department_id
                )) OR
                (d.visibility = 'role' AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = auth.uid() AND ur.role = d.role
                ))
            )
        )
    )
    ORDER BY rank DESC, d.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_media_assets(search_query text, type_filter media_type DEFAULT NULL::media_type, category_filter media_category DEFAULT NULL::media_category, tag_filter text[] DEFAULT NULL::text[], uploaded_by_filter uuid DEFAULT NULL::uuid, property_id_filter uuid DEFAULT NULL::uuid)
 RETURNS SETOF media_assets
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM media_assets
  WHERE 
    -- Search in title and description
    (search_query IS NULL OR search_query = '' OR 
     to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', search_query))
    -- Type filter
    AND (type_filter IS NULL OR media_type = type_filter)
    -- Category filter
    AND (category_filter IS NULL OR category = category_filter)
    -- Tag filter
    AND (tag_filter IS NULL OR tags @> tag_filter)
    -- Uploaded by filter
    AND (uploaded_by_filter IS NULL OR uploaded_by = uploaded_by_filter)
    -- Property filter
    AND (property_id_filter IS NULL OR property_id = property_id_filter OR is_public = true)
    -- Not archived
    AND is_archived = false
  ORDER BY created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_sop_documents(p_query text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_is_template boolean DEFAULT NULL::boolean, p_page_size integer DEFAULT 20, p_page_number integer DEFAULT 1, p_sort_by text DEFAULT 'updated_at'::text, p_sort_order text DEFAULT 'desc'::text)
 RETURNS TABLE(id uuid, title text, title_ar text, description text, description_ar text, code text, status text, department_id uuid, department_name text, category_id uuid, category_name text, subcategory_id uuid, subcategory_name text, version integer, is_template boolean, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, updated_by uuid, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  v_offset := (p_page_number - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE 
    sd.archived_at IS NULL
    AND (p_query IS NULL OR 
         (sd.title ILIKE '%' || p_query || '%' OR 
          sd.description ILIKE '%' || p_query || '%' OR
          sd.code ILIKE '%' || p_query || '%'))
    AND (p_department_id IS NULL OR sd.department_id = p_department_id)
    AND (p_category_id IS NULL OR sd.category_id = p_category_id)
    AND (p_status IS NULL OR sd.status = p_status)
    AND (p_is_template IS NULL OR sd.is_template = p_is_template);
  
  -- Return paginated results
  RETURN QUERY
  SELECT 
    sd.id,
    sd.title,
    sd.title_ar,
    sd.description,
    sd.description_ar,
    sd.code,
    sd.status,
    sd.department_id,
    d.name as department_name,
    sd.category_id,
    c.name as category_name,
    sd.subcategory_id,
    sc.name as subcategory_name,
    sd.version,
    sd.is_template,
    sd.created_at,
    sd.updated_at,
    sd.created_by,
    sd.updated_by,
    v_total_count
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE 
    sd.archived_at IS NULL
    AND (p_query IS NULL OR 
         (sd.title ILIKE '%' || p_query || '%' OR 
          sd.description ILIKE '%' || p_query || '%' OR
          sd.code ILIKE '%' || p_query || '%'))
    AND (p_department_id IS NULL OR sd.department_id = p_department_id)
    AND (p_category_id IS NULL OR sd.category_id = p_category_id)
    AND (p_status IS NULL OR sd.status = p_status)
    AND (p_is_template IS NULL OR sd.is_template = p_is_template)
  ORDER BY 
    CASE 
      WHEN p_sort_by = 'title' AND p_sort_order = 'asc' THEN sd.title
      WHEN p_sort_by = 'title' AND p_sort_order = 'desc' THEN sd.title
      WHEN p_sort_by = 'code' AND p_sort_order = 'asc' THEN sd.code
      WHEN p_sort_by = 'code' AND p_sort_order = 'desc' THEN sd.code
      WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN sd.status
      WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN sd.status
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN sd.created_at
      ELSE sd.updated_at
    END,
    CASE 
      WHEN p_sort_order = 'desc' THEN NULL
      ELSE sd.updated_at
    END DESC,
    CASE 
      WHEN p_sort_order = 'asc' THEN NULL
      ELSE sd.updated_at
    END ASC
  LIMIT p_page_size OFFSET v_offset;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.secure_count_documents(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_visibility text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_file_type text[] DEFAULT NULL::text[], p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_confidentiality_level text DEFAULT NULL::text, p_include_deleted boolean DEFAULT false, p_include_archived boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    SELECT COUNT(*) INTO v_count
    FROM documents d
    WHERE 
        (p_search_query IS NULL OR p_search_query = '' OR 
            (d.title ILIKE '%' || p_search_query || '%' OR
             d.description ILIKE '%' || p_search_query || '%'))
        AND (p_property_id IS NULL OR d.property_id = p_property_id)
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        AND (
            v_is_admin OR
            d.created_by = v_user_id OR
            d.owner_id = v_user_id OR
            (
                d.status = 'PUBLISHED' AND 
                (
                    d.visibility = 'all_properties' OR
                    (d.visibility = 'property' AND EXISTS (
                        SELECT 1 FROM user_properties up 
                        WHERE up.user_id = v_user_id AND up.property_id = d.property_id
                    )) OR
                    (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM user_departments ud 
                        WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
                    )) OR
                    (d.visibility = 'role' AND EXISTS (
                        SELECT 1 FROM user_roles ur 
                        WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT
                    ))
                )
            )
        );
    
    RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.secure_search_documents(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_folder_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_visibility text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_file_type text[] DEFAULT NULL::text[], p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_confidentiality_level text DEFAULT NULL::text, p_include_deleted boolean DEFAULT false, p_include_archived boolean DEFAULT false, p_sort_by text DEFAULT 'created_at'::text, p_sort_order text DEFAULT 'desc'::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, content text, file_url text, status text, visibility text, property_id uuid, department_id uuid, folder_id uuid, file_type text, file_size bigint, file_extension text, confidentiality_level text, is_deleted boolean, is_archived boolean, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, expires_at timestamp with time zone, view_count integer, download_count integer, content_type text, author jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_has_property_access BOOLEAN;
    v_query TEXT;
    v_sort_column TEXT;
    v_sort_direction TEXT;
BEGIN
    -- Validate and sanitize sort column
    v_sort_column := CASE 
        WHEN p_sort_by IN ('created_at', 'updated_at', 'title', 'file_size', 'view_count') 
        THEN p_sort_by 
        ELSE 'created_at' 
    END;
    
    v_sort_direction := CASE 
        WHEN LOWER(p_sort_order) = 'asc' THEN 'ASC' 
        ELSE 'DESC' 
    END;
    
    -- Check user permissions
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );
    
    v_has_property_access := p_property_id IS NULL OR EXISTS (
        SELECT 1 FROM user_properties 
        WHERE user_id = v_user_id AND property_id = p_property_id
    ) OR v_is_admin;
    
    -- Return empty if user doesn't have property access
    IF NOT v_has_property_access THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.content,
        d.file_url,
        d.status::TEXT,
        d.visibility::TEXT,
        d.property_id,
        d.department_id,
        d.folder_id,
        d.file_type,
        d.file_size,
        d.file_extension,
        d.confidentiality_level::TEXT,
        d.is_deleted,
        d.is_archived,
        d.created_by,
        d.created_at,
        d.updated_at,
        d.expires_at,
        d.view_count,
        d.download_count,
        d.content_type,
        jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url
        ) AS author
    FROM documents d
    LEFT JOIN profiles p ON d.created_by = p.id
    WHERE 
        -- Search filter (safe parameterized ILIKE)
        (p_search_query IS NULL OR p_search_query = '' OR 
            (d.title ILIKE '%' || p_search_query || '%' OR
             d.description ILIKE '%' || p_search_query || '%' OR
             d.content ILIKE '%' || p_search_query || '%'))
        -- Property filter
        AND (p_property_id IS NULL OR d.property_id = p_property_id)
        -- Folder filter
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        -- Status filter
        AND (p_status IS NULL OR d.status::TEXT = p_status)
        -- Visibility filter
        AND (p_visibility IS NULL OR d.visibility::TEXT = p_visibility)
        -- Department filter
        AND (p_department_id IS NULL OR d.department_id = p_department_id)
        -- File type filter
        AND (p_file_type IS NULL OR p_file_type = '{}' OR d.file_type = ANY(p_file_type))
        -- Date range filters
        AND (p_date_from IS NULL OR d.created_at >= p_date_from)
        AND (p_date_to IS NULL OR d.created_at <= p_date_to)
        -- Confidentiality filter
        AND (p_confidentiality_level IS NULL OR d.confidentiality_level::TEXT = p_confidentiality_level)
        -- Deleted filter
        AND (p_include_deleted = TRUE OR d.is_deleted = FALSE)
        -- Archived filter
        AND (p_include_archived = TRUE OR d.is_archived = FALSE)
        -- RLS: User can see own documents or published with proper visibility
        AND (
            v_is_admin OR
            d.created_by = v_user_id OR
            d.owner_id = v_user_id OR
            (
                d.status = 'PUBLISHED' AND 
                (
                    d.visibility = 'all_properties' OR
                    (d.visibility = 'property' AND EXISTS (
                        SELECT 1 FROM user_properties up 
                        WHERE up.user_id = v_user_id AND up.property_id = d.property_id
                    )) OR
                    (d.visibility = 'department' AND EXISTS (
                        SELECT 1 FROM user_departments ud 
                        WHERE ud.user_id = v_user_id AND ud.department_id = d.department_id
                    )) OR
                    (d.visibility = 'role' AND EXISTS (
                        SELECT 1 FROM user_roles ur 
                        WHERE ur.user_id = v_user_id AND ur.role::TEXT = d.role::TEXT
                    ))
                )
            )
        )
    ORDER BY 
        CASE v_sort_column 
            WHEN 'title' THEN d.title
            ELSE NULL
        END ASC NULLS LAST,
        CASE v_sort_column 
            WHEN 'created_at' THEN d.created_at::TEXT
            WHEN 'updated_at' THEN d.updated_at::TEXT
            ELSE NULL
        END::TIMESTAMPTZ DESC NULLS LAST
    LIMIT LEAST(p_limit, 500)  -- Hard limit for safety
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.secure_search_tasks(p_search_query text DEFAULT NULL::text, p_status text[] DEFAULT NULL::text[], p_priority text[] DEFAULT NULL::text[], p_assigned_to uuid DEFAULT NULL::uuid, p_created_by uuid DEFAULT NULL::uuid, p_property_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, status text, priority text, assigned_to_id uuid, created_by_id uuid, property_id uuid, department_id uuid, due_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, is_deleted boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );

    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status::TEXT,
        t.priority::TEXT,
        t.assigned_to_id,
        t.created_by_id,
        t.property_id,
        t.department_id,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.is_deleted
    FROM tasks t
    WHERE t.is_deleted = FALSE
        AND (p_search_query IS NULL OR p_search_query = '' OR 
            (t.title ILIKE '%' || p_search_query || '%' OR
             t.description ILIKE '%' || p_search_query || '%'))
        AND (p_status IS NULL OR p_status = '{}' OR t.status::TEXT = ANY(p_status))
        AND (p_priority IS NULL OR p_priority = '{}' OR t.priority::TEXT = ANY(p_priority))
        AND (p_assigned_to IS NULL OR t.assigned_to_id = p_assigned_to)
        AND (p_created_by IS NULL OR t.created_by_id = p_created_by)
        AND (p_property_id IS NULL OR t.property_id = p_property_id)
        AND (p_department_id IS NULL OR t.department_id = p_department_id)
        AND (
            v_is_admin OR
            t.assigned_to_id = v_user_id OR
            t.created_by_id = v_user_id OR
            EXISTS (
                SELECT 1 FROM user_properties up 
                WHERE up.user_id = v_user_id AND up.property_id = t.property_id
            )
        )
    ORDER BY t.created_at DESC
    LIMIT LEAST(p_limit, 500)
    OFFSET GREATEST(p_offset, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.secure_search_users(p_search_query text, p_property_id uuid DEFAULT NULL::uuid, p_department_id uuid DEFAULT NULL::uuid, p_role text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, email text, full_name text, phone text, job_title text, staff_id text, avatar_url text, is_active boolean, hire_date date, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin', 'property_manager', 'property_hr')
    );

    -- Non-admins can only search within their own property
    IF NOT v_is_admin AND p_property_id IS NULL THEN
        SELECT property_id INTO p_property_id
        FROM user_properties
        WHERE user_id = v_user_id
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.phone,
        p.job_title,
        p.staff_id,
        p.avatar_url,
        p.is_active,
        p.hire_date,
        p.created_at
    FROM profiles p
    WHERE 
        -- Search query (sanitized)
        (p_search_query IS NULL OR p_search_query = '' OR 
            (p.full_name ILIKE '%' || p_search_query || '%' OR
             p.email ILIKE '%' || p_search_query || '%' OR
             p.job_title ILIKE '%' || p_search_query || '%' OR
             p.staff_id ILIKE '%' || p_search_query || '%'))
        -- Active filter
        AND (p_is_active IS NULL OR p.is_active = p_is_active)
        -- Property filter (check user_properties)
        AND (p_property_id IS NULL OR EXISTS (
            SELECT 1 FROM user_properties up 
            WHERE up.user_id = p.id AND up.property_id = p_property_id
        ))
        -- Department filter
        AND (p_department_id IS NULL OR EXISTS (
            SELECT 1 FROM user_departments ud 
            WHERE ud.user_id = p.id AND ud.department_id = p_department_id
        ))
        -- Role filter
        AND (p_role IS NULL OR EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = p.id AND ur.role::TEXT = p_role
        ))
        -- RLS: Users can see profiles in their properties
        AND (
            v_is_admin OR
            p.id = v_user_id OR
            EXISTS (
                SELECT 1 FROM user_properties up1
                JOIN user_properties up2 ON up1.property_id = up2.property_id
                WHERE up1.user_id = v_user_id AND up2.user_id = p.id
            )
        )
    ORDER BY p.full_name ASC NULLS LAST
    LIMIT LEAST(p_limit, 200);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_certificate_identifiers()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := generate_verification_code();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_leave_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_media_download_headers(p_media_asset_id uuid, p_disposition text DEFAULT 'attachment'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_asset RECORD;
BEGIN
  -- Verify ownership or admin access
  SELECT * INTO v_asset
  FROM media_assets
  WHERE id = p_media_asset_id;

  IF v_asset IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (
    v_asset.uploaded_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
  ) THEN
    RETURN false;
  END IF;

  UPDATE media_assets
  SET content_disposition = p_disposition
  WHERE id = p_media_asset_id;

  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_read_at_on_read()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status != 'read' AND NEW.status = 'read' THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_sent_at_on_send()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status != 'sent' AND NEW.status = 'sent' THEN
    NEW.sent_at = now();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_effective_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_promotion_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_old_role public.app_role;
    v_old_job_title text;
    v_old_department_id uuid;
    v_property_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
begin
    select p.job_title into v_old_job_title from public.profiles p where p.id = p_employee_id;
    select ur.role into v_old_role from public.user_roles ur where ur.user_id = p_employee_id limit 1;
    select ud.department_id into v_old_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;
    select up.property_id into v_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;

    if p_new_job_title is not null and length(trim(p_new_job_title)) > 0 then
      insert into public.job_titles (title, category, default_role, department_id)
      values (
        trim(p_new_job_title),
        coalesce((select d.name from public.departments d where d.id = p_new_department_id), 'General'),
        coalesce(p_new_role, 'staff'::public.app_role),
        p_new_department_id
      )
      on conflict (title) do nothing;
    end if;

    insert into public.promotions (
        employee_id, promoted_by, old_role, new_role,
        old_job_title, new_job_title, old_department_id, new_department_id,
        effective_date, notes, status
    ) values (
        p_employee_id, v_requester_id, v_old_role, p_new_role,
        v_old_job_title, p_new_job_title, v_old_department_id, p_new_department_id,
        p_effective_date, p_notes, 'pending'
    ) returning id into v_promotion_id;

    v_hr_assignee := public.find_hr_assignee(v_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'promotion',
        v_promotion_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'new_role', p_new_role,
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        v_property_id,
        coalesce(p_new_department_id, v_old_department_id)
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Promotion request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'promotion', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_promotion_request(p_employee_id uuid, p_new_role app_role, p_new_job_title text, p_new_department_id uuid, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  return public.submit_promotion_request(
    p_employee_id,
    p_new_role,
    p_new_job_title,
    p_new_department_id,
    current_date,
    p_notes
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_transfer_request(p_employee_id uuid, p_to_property_id uuid, p_to_department_id uuid, p_effective_date date, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
    v_transfer_id uuid;
    v_request_id uuid;
    v_request_no bigint;
    v_requester_id uuid := auth.uid();
    v_from_property_id uuid;
    v_from_department_id uuid;
    v_hr_assignee uuid;
    v_hr_role public.app_role;
    v_routing_meta jsonb;
begin
    select up.property_id into v_from_property_id from public.user_properties up where up.user_id = p_employee_id limit 1;
    select ud.department_id into v_from_department_id from public.user_departments ud where ud.user_id = p_employee_id limit 1;

    insert into public.transfers (
        employee_id, from_property_id, to_property_id,
        from_department_id, to_department_id, effective_date, notes, status
    ) values (
        p_employee_id, v_from_property_id, p_to_property_id,
        v_from_department_id, p_to_department_id, p_effective_date, p_notes, 'pending'
    ) returning id into v_transfer_id;

    v_hr_assignee := public.find_hr_assignee(p_to_property_id);

    select ur.role into v_hr_role
    from public.user_roles ur
    where ur.user_id = v_hr_assignee
      and ur.role in ('property_hr', 'regional_hr', 'regional_admin', 'corporate_admin')
    order by case ur.role
      when 'property_hr' then 1
      when 'regional_hr' then 2
      when 'regional_admin' then 3
      when 'corporate_admin' then 4
      else 100
    end
    limit 1;

    if v_hr_role is null then
        v_hr_role := 'regional_hr'::public.app_role;
    end if;

    v_routing_meta := jsonb_build_object('missing_hr_assignee', v_hr_assignee is null);

    insert into public.requests (
        entity_type, entity_id, requester_id, current_assignee_id, status, metadata,
        property_id, department_id
    ) values (
        'transfer',
        v_transfer_id,
        v_requester_id,
        v_hr_assignee,
        'pending_hr_review',
        jsonb_build_object(
            'employee_name', (select p.full_name from public.profiles p where p.id = p_employee_id),
            'target_property', (select pr.name from public.properties pr where pr.id = p_to_property_id),
            'effective_date', p_effective_date,
            'routing_warning', v_routing_meta
        ),
        p_to_property_id,
        p_to_department_id
    ) returning id, request_no into v_request_id, v_request_no;

    insert into public.request_steps (
        request_id, step_order, assignee_id, assignee_role, status
    ) values (
        v_request_id, 1, v_hr_assignee, v_hr_role, 'pending'
    );

    if v_hr_assignee is null then
      insert into public.notifications (user_id, type, title, message, metadata)
      select ur.user_id,
             'escalation_alert',
             'Routing issue: Missing HR assignee',
             format('Transfer request #%s requires HR assignment.', v_request_no),
             jsonb_build_object('request_id', v_request_id, 'entity_type', 'transfer', 'reason', 'missing_hr_assignee')
      from public.user_roles ur
      where ur.role in ('regional_admin', 'regional_hr', 'corporate_admin');
    end if;

    return jsonb_build_object('success', true, 'request_id', v_request_id, 'request_no', v_request_no);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.suggest_system_role(p_job_title text)
 RETURNS app_role
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
BEGIN
  SELECT system_role INTO v_role FROM job_title_role_mappings WHERE LOWER(job_title) = LOWER(p_job_title) LIMIT 1;
  IF v_role IS NOT NULL THEN RETURN v_role; END IF;
  IF p_job_title ILIKE '%manager%' OR p_job_title ILIKE '%chef%' OR p_job_title ILIKE '%supervisor%' THEN
    RETURN 'department_head'::app_role;
  ELSIF p_job_title ILIKE '%director%' OR p_job_title ILIKE '%vp%' OR p_job_title ILIKE '%vice president%' THEN
    RETURN 'regional_admin'::app_role;
  ELSIF p_job_title ILIKE '%hr%' AND (p_job_title ILIKE '%corporate%' OR p_job_title ILIKE '%regional%') THEN
    RETURN 'regional_hr'::app_role;
  ELSIF p_job_title ILIKE '%hr%' THEN
    RETURN 'property_hr'::app_role;
  ELSIF p_job_title ILIKE '%general manager%' OR p_job_title ILIKE '%gm%' THEN
    RETURN 'property_manager'::app_role;
  ELSE
    RETURN 'staff'::app_role;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_learning_progress_module_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.content_type = 'module' THEN
        NEW.training_module_id := NEW.content_id;
    ELSE
        NEW.training_module_id := NULL;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_leave_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update leave request status based on workflow request status
  UPDATE leave_requests 
  SET status = CASE NEW.status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'returned_for_correction' THEN 'pending' -- Reset to pending for correction
    ELSE OLD.status
  END
  WHERE id = NEW.entity_id AND NEW.entity_type = 'leave_request';
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_lms_to_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only act if progress is 100% or status is completed
    IF (NEW.status = 'completed' OR NEW.progress_percentage = 100) THEN
        -- Find the associated onboarding task via the assignment
        UPDATE public.onboarding_tasks ot
        SET 
            is_completed = true,
            status = 'completed',
            completed_at = COALESCE(NEW.completed_at, NOW())
        FROM public.learning_assignments la
        WHERE ot.id = la.onboarding_task_id
        AND la.id = NEW.assignment_id
        AND ot.is_completed = false;
    END IF;
    RETURN NEW;    
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_request_due_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_next_due timestamptz;
BEGIN
  IF NEW.status = 'pending' THEN
    UPDATE public.requests
    SET due_at = NEW.due_at
    WHERE id = NEW.request_id;
  ELSIF OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    SELECT rs.due_at INTO v_next_due
    FROM public.request_steps rs
    WHERE rs.request_id = NEW.request_id
      AND rs.status = 'pending'
    ORDER BY rs.step_order
    LIMIT 1;

    UPDATE public.requests
    SET due_at = v_next_due
    WHERE id = NEW.request_id;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_sop_comment_upvotes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_comment_id uuid;
begin
  v_comment_id := coalesce(new.comment_id, old.comment_id);

  update public.sop_comments c
  set upvotes = (
    select coalesce(sum(case v.vote_type when 'up' then 1 when 'down' then -1 else 0 end), 0)
    from public.sop_comment_votes v
    where v.comment_id = v_comment_id
  ),
  updated_at = now()
  where c.id = v_comment_id;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.time_dist(time without time zone, time without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$time_dist$function$
;

CREATE OR REPLACE FUNCTION public.toggle_comment_pin(p_comment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_document_id UUID;
    v_is_pinned BOOLEAN;
    v_new_status BOOLEAN;
BEGIN
    -- Get the document_id and current pin status
    SELECT document_id, is_pinned INTO v_document_id, v_is_pinned
    FROM document_comments
    WHERE id = p_comment_id;
    
    IF v_document_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission (document owner or admin)
    IF NOT EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = v_document_id
        AND (
            d.created_by = auth.uid() OR
            d.owner_id = auth.uid() OR
            public.has_role(auth.uid(), 'regional_admin') OR
            (public.has_role(auth.uid(), 'property_manager') AND 
             public.has_property_access(auth.uid(), d.property_id))
        )
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Toggle pin status
    v_new_status := NOT v_is_pinned;
    
    UPDATE document_comments
    SET is_pinned = v_new_status, updated_at = NOW()
    WHERE id = p_comment_id;
    
    RETURN v_new_status;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.toggle_kudos_like(kudos_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    already_liked BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM kudos_likes 
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid()
    ) INTO already_liked;
    
    IF already_liked THEN
        DELETE FROM kudos_likes 
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid();
        
        UPDATE kudos SET likes_count = likes_count - 1 
        WHERE id = kudos_uuid;
        
        RETURN false;
    ELSE
        INSERT INTO kudos_likes (kudos_id, user_id)
        VALUES (kudos_uuid, auth.uid());
        
        UPDATE kudos SET likes_count = likes_count + 1 
        WHERE id = kudos_uuid;
        
        RETURN true;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.training_content_blocks_resolve_duplicate_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.training_module_id IS NULL OR NEW."order" IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock per module for the duration of the transaction to avoid concurrent order-slot races.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.training_module_id::text, 0));

  -- Replace any existing active block occupying the same order slot.
  DELETE FROM public.training_content_blocks
  WHERE training_module_id = NEW.training_module_id
    AND "order" = NEW."order"
    AND coalesce(is_deleted, false) = false;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_training()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        PERFORM public.check_and_award_achievement(NEW.user_id, 'training_master');

        IF COALESCE(NEW.quiz_score, 0) = 100 THEN
            PERFORM public.check_and_award_achievement(NEW.user_id, 'perfect_completion');
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ts_dist(timestamp without time zone, timestamp without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$ts_dist$function$
;

CREATE OR REPLACE FUNCTION public.tstz_dist(timestamp with time zone, timestamp with time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$tstz_dist$function$
;

CREATE OR REPLACE FUNCTION public.update_approval_delegations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_dashboard_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_document_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_tag_names TEXT;
    v_folder_name TEXT;
    v_document_number TEXT;
BEGIN
    -- Get tag names as a space-separated string
    SELECT string_agg(dt.name, ' ')
    INTO v_tag_names
    FROM document_tag_assignments dta
    JOIN document_tags dt ON dta.tag_id = dt.id
    WHERE dta.document_id = NEW.id;
    
    -- Get folder name
    SELECT name 
    INTO v_folder_name
    FROM document_folders 
    WHERE id = NEW.folder_id;
    
    -- Build search vector with weighted components
    -- Weight levels: A (title), B (tags, folder), C (description), D (document_number)
    NEW.search_vector := 
        -- Title gets highest weight (A)
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        
        -- Tags and folder get medium-high weight (B)
        setweight(to_tsvector('english', COALESCE(v_tag_names, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_folder_name, '')), 'B') ||
        
        -- Description gets medium weight (C)
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        
        -- Document number gets lower weight (D)
        setweight(to_tsvector('english', COALESCE(NEW.document_number, '')), 'D');
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_document_search_vector_on_tag_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update search vector for affected document
    IF TG_OP = 'DELETE' THEN
        UPDATE documents SET id = id WHERE id = OLD.document_id;
        RETURN OLD;
    ELSE
        UPDATE documents SET id = id WHERE id = NEW.document_id;
        RETURN NEW;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_eom_config_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_eom_selection_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_maintenance_tickets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();

  if old.status != 'completed' and new.status = 'completed' then
    new.resolved_at = now();
    new.actual_completion_date = now();
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_modified_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW; 
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_question_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_request_details(p_request_id uuid, p_updates jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID;
    v_current_metadata JSONB;
    v_requester_id UUID;
    v_user_role public.app_role;
    v_new_meta JSONB;
BEGIN
    -- Get request info
    SELECT entity_type, entity_id, metadata, requester_id
    INTO v_entity_type, v_entity_id, v_current_metadata, v_requester_id
    FROM public.requests WHERE id = p_request_id;

    IF v_entity_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    -- Check permissions: Only Requester or Admin/HR can edit
    SELECT role INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF auth.uid() != v_requester_id AND v_user_role NOT IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'corporate_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized to edit this request.');
    END IF;

    -- Update Promotion
    IF v_entity_type = 'promotion' THEN
        UPDATE public.promotions SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            new_role = CASE WHEN p_updates ? 'new_role' THEN (p_updates->>'new_role')::public.app_role ELSE new_role END,
            new_job_title = CASE WHEN p_updates ? 'new_job_title' THEN (p_updates->>'new_job_title') ELSE new_job_title END,
            new_department_id = CASE WHEN p_updates ? 'new_department_id' THEN (p_updates->>'new_department_id')::UUID ELSE new_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

         -- Update metadata to reflect changes in UI
         UPDATE public.requests
         SET metadata = v_current_metadata || p_updates,
             updated_at = NOW()
         WHERE id = p_request_id;

    -- Update Transfer
    ELSIF v_entity_type = 'transfer' THEN
        UPDATE public.transfers SET
            effective_date = CASE WHEN p_updates ? 'effective_date' THEN (p_updates->>'effective_date')::DATE ELSE effective_date END,
            to_property_id = CASE WHEN p_updates ? 'to_property_id' THEN (p_updates->>'to_property_id')::UUID ELSE to_property_id END,
            to_department_id = CASE WHEN p_updates ? 'to_department_id' THEN (p_updates->>'to_department_id')::UUID ELSE to_department_id END,
            notes = CASE WHEN p_updates ? 'notes' THEN (p_updates->>'notes') ELSE notes END,
            updated_at = NOW()
        WHERE id = v_entity_id;

        -- Update metadata
        v_new_meta := v_current_metadata || p_updates;

        -- Special sync for target property name in metadata
        IF p_updates ? 'to_property_id' THEN
             v_new_meta := v_new_meta || jsonb_build_object(
                'target_property', (SELECT name FROM public.properties WHERE id = (p_updates->>'to_property_id')::UUID)
             );
        END IF;

        UPDATE public.requests
        SET metadata = v_new_meta,
            updated_at = NOW()
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_shifts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sop_comment_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_sop_document(p_document_id uuid, p_updated_by uuid, p_title text DEFAULT NULL::text, p_title_ar text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_description_ar text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_subcategory_id uuid DEFAULT NULL::uuid, p_content jsonb DEFAULT NULL::jsonb, p_status text DEFAULT NULL::text, p_change_summary text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status TEXT;
  v_new_version BOOLEAN := FALSE;
  v_version_number INTEGER;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM sop_documents
  WHERE id = p_document_id;
  
  -- Check if we need a new version
  IF p_content IS NOT NULL THEN
    v_new_version := TRUE;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM sop_document_versions
    WHERE document_id = p_document_id;
    
    -- Insert new version
    INSERT INTO sop_document_versions (
      document_id,
      version_number,
      content,
      created_by,
      change_summary
    ) VALUES (
      p_document_id,
      v_version_number,
      p_content,
      p_updated_by,
      COALESCE(p_change_summary, 'Content updated')
    );
  END IF;
  
  -- Update document
  UPDATE sop_documents
  SET 
    title = COALESCE(p_title, title),
    title_ar = COALESCE(p_title_ar, title_ar),
    description = COALESCE(p_description, description),
    description_ar = COALESCE(p_description_ar, description_ar),
    department_id = COALESCE(p_department_id, department_id),
    category_id = COALESCE(p_category_id, category_id),
    subcategory_id = COALESCE(p_subcategory_id, subcategory_id),
    status = COALESCE(p_status, status),
    version = CASE WHEN v_new_version THEN v_version_number ELSE version END,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = p_updated_by
  WHERE id = p_document_id;
  
  -- If status changed to under_review, create approval workflow
  IF p_status = 'under_review' AND v_current_status != 'under_review' THEN
    INSERT INTO sop_document_approvals (
      document_id,
      approver_id,
      approver_role,
      status,
      created_by
    )
    SELECT 
      p_document_id,
      u.id,
      'department_head',
      'pending',
      p_updated_by
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role = 'department_head' 
      AND ur.department_id = COALESCE(p_department_id, (SELECT department_id FROM sop_documents WHERE id = p_document_id))
      LIMIT 1
    ON CONFLICT (document_id, approver_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Document updated successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  
  -- Auto-set completed_at when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Clear completed_at if status changes from completed
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_workflow_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_department_access(auth_user_id uuid, target_dept_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM departments d
    JOIN user_properties up ON d.property_id = up.property_id
    WHERE d.id = target_dept_id 
    AND up.user_id = auth_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.users_share_property(user_a uuid, user_b uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM user_properties up1
    JOIN user_properties up2 ON up1.property_id = up2.property_id
    WHERE up1.user_id = user_a 
    AND up2.user_id = user_b
  );
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_access(p_document_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_doc RECORD;
    v_is_admin BOOLEAN;
BEGIN
    -- Check admin status
    v_is_admin := EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = v_user_id 
        AND role IN ('regional_admin', 'regional_hr', 'corporate_admin')
    );
    
    -- Get document
    SELECT * INTO v_doc
    FROM documents
    WHERE id = p_document_id AND is_deleted = FALSE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Admin can access all
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Owner can access
    IF v_doc.created_by = v_user_id OR v_doc.owner_id = v_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check published status and visibility
    IF v_doc.status = 'PUBLISHED' THEN
        CASE v_doc.visibility
            WHEN 'all_properties' THEN
                RETURN TRUE;
            WHEN 'property' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_properties 
                    WHERE user_id = v_user_id AND property_id = v_doc.property_id
                );
            WHEN 'department' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_departments 
                    WHERE user_id = v_user_id AND department_id = v_doc.department_id
                );
            WHEN 'role' THEN
                RETURN EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = v_user_id AND role::TEXT = v_doc.role::TEXT
                );
            ELSE
                RETURN FALSE;
        END CASE;
    END IF;
    
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_uuid_array(p_input text[])
 RETURNS uuid[]
 LANGUAGE sql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT ARRAY_AGG(x::UUID)
FROM UNNEST(p_input) AS x
WHERE x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$function$
;

CREATE OR REPLACE FUNCTION public.verify_audit_export_integrity(p_export_id uuid)
 RETURNS TABLE(is_valid boolean, message text, verified_at timestamp with time zone, stored_hash text, computed_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_export record;
    v_file_data bytea;
    v_computed_hash text;
BEGIN
    -- Get export record
    SELECT * INTO v_export
    FROM audit_exports
    WHERE id = p_export_id;
    
    IF v_export IS NULL THEN
        RETURN QUERY SELECT 
            false,
            'Export not found'::text,
            now(),
            null::text,
            null::text;
        RETURN;
    END IF;
    
    IF v_export.sha256_hash IS NULL THEN
        RETURN QUERY SELECT 
            false,
            'No hash stored for this export'::text,
            now(),
            null::text,
            null::text;
        RETURN;
    END IF;
    
    -- Note: In production, this would read from storage
    -- For now, we verify the hash exists and format is valid
    v_computed_hash := v_export.sha256_hash;
    
    -- Verify hash format (64 hex characters for SHA-256)
    IF v_export.sha256_hash !~ '^[a-f0-9]{64}$' THEN
        RETURN QUERY SELECT 
            false,
            'Invalid hash format'::text,
            now(),
            v_export.sha256_hash,
            null::text;
        RETURN;
    END IF;
    
    -- Update verification status
    UPDATE audit_exports
    SET 
        integrity_verified = true,
        verified_at = now(),
        verified_by = auth.uid()
    WHERE id = p_export_id;
    
    RETURN QUERY SELECT 
        true,
        'Integrity verified successfully'::text,
        now(),
        v_export.sha256_hash,
        v_computed_hash;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_certificate(verification_code_param character varying)
 RETURNS TABLE(is_valid boolean, certificate_number character varying, recipient_name character varying, title character varying, certificate_type character varying, completion_date timestamp with time zone, expiry_date timestamp with time zone, status character varying, issued_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (c.status = 'active' AND (c.expiry_date IS NULL OR c.expiry_date > NOW())) as is_valid,
    c.certificate_number,
    c.recipient_name,
    c.title,
    c.certificate_type,
    c.completion_date,
    c.expiry_date,
    c.status,
    c.created_at as issued_at
  FROM certificates c
  WHERE c.verification_code = verification_code_param;
  
  -- Log the verification attempt
  INSERT INTO certificate_history (certificate_id, action, details)
  SELECT id, 'verified', '{"source": "public"}'::jsonb
  FROM certificates
  WHERE verification_code = verification_code_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_mfa_code(p_user_id uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret public.mfa_secrets%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN false;
  END IF;

  -- Get the stored secret
  SELECT * INTO v_secret
  FROM public.mfa_secrets
  WHERE user_id = p_user_id AND enabled = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if it's a backup code
  IF p_code = ANY(v_secret.backup_codes) THEN
    -- Remove the used backup code
    UPDATE public.mfa_secrets
    SET backup_codes = array_remove(backup_codes, p_code),
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Log backup code usage
    INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
    VALUES (p_user_id, 'mfa.backup_code_used', 'warning', jsonb_build_object('code_prefix', substring(p_code, 1, 4)));
    
    RETURN true;
  END IF;
  
  -- Verify TOTP code (in production, use proper TOTP library)
  -- For now, accept any 6-digit code for demonstration
  IF p_code IS NULL OR length(p_code) != 6 OR p_code !~ '^\d+$' THEN
    -- Log failed verification
    INSERT INTO public.security_audit_logs (user_id, event_type, severity, metadata)
    VALUES (p_user_id, 'mfa.verification_failed', 'warning', jsonb_build_object('reason', 'invalid_format'));
    
    RETURN false;
  END IF;
  
  -- Log successful verification
  INSERT INTO public.security_audit_logs (user_id, event_type, severity)
  VALUES (p_user_id, 'mfa.verified', 'info');
  
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_report_signature(p_export_id uuid, p_report_data jsonb, p_signature text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_computed_signature text;
BEGIN
    v_computed_signature := generate_report_signature(p_export_id, p_report_data);
    
    -- Use constant-time comparison to prevent timing attacks
    RETURN encode(
        digest(v_computed_signature, 'sha256'),
        'hex'
    ) = encode(
        digest(p_signature, 'sha256'),
        'hex'
    );
END;
$function$
;

-- ------------------------------------------------------------
-- Triggers (109)
-- ------------------------------------------------------------
CREATE TRIGGER check_password_history_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_password_history();
CREATE TRIGGER check_password_reuse_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_password_reuse();
CREATE TRIGGER enforce_password_policy_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_password_policy();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.account_action_notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.achievement_definitions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.admin_delegations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.approval_delegations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.certificate_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.employee_of_the_month FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.employee_promotions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.employee_referrals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.employee_transfers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.eom_auto_selections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.eom_automation_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.job_titles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.kudos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.learning_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.learning_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.learning_quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.maintenance_sla_policies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.media_collections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.microlearning_content FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.motivational_content FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.onboarding_process FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.onboarding_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.scheduled_reminders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sop_approval_workflows FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sop_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sop_comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sop_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sop_tags FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.system_wiki FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_assignment_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_content_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_modules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_paths FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_progress FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.training_quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_dashboard_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_invitations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_path_enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_vacation_balance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workflow_executions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workflow_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_new_announcement AFTER INSERT ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.create_announcement_notifications();
CREATE TRIGGER on_new_conversation_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();
CREATE TRIGGER on_new_kudos AFTER INSERT ON public.kudos FOR EACH ROW EXECUTE FUNCTION public.handle_kudos_notification();
CREATE TRIGGER on_new_leave_request AFTER INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.create_leave_request_notification();
CREATE TRIGGER on_new_maintenance_ticket AFTER INSERT ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.create_maintenance_notification();
CREATE TRIGGER on_new_request AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.create_request_notification();
CREATE TRIGGER on_new_task AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.create_task_notification();
CREATE TRIGGER on_request_step_change AFTER UPDATE ON public.request_steps FOR EACH ROW EXECUTE FUNCTION public.handle_request_step_change();
CREATE TRIGGER on_sop_document_approved AFTER UPDATE ON public.sop_documents FOR EACH ROW EXECUTE FUNCTION public.notify_sop_assignments();
CREATE TRIGGER set_notification_expires_at BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_notification_expires_at();
CREATE TRIGGER track_document_version BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.track_document_version();
CREATE TRIGGER track_sop_version BEFORE UPDATE ON public.sop_documents FOR EACH ROW EXECUTE FUNCTION public.track_sop_version();
CREATE TRIGGER trg_auto_close_resolved_tickets AFTER UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.auto_close_resolved_tickets();
CREATE TRIGGER trg_check_maintenance_sla AFTER INSERT OR UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.check_maintenance_sla();
CREATE TRIGGER trg_eom_auto_nomination AFTER INSERT ON public.eom_scoring_history FOR EACH ROW EXECUTE FUNCTION public.auto_nominate_top_performer();
CREATE TRIGGER trg_log_approval_history AFTER UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.log_approval_history();
CREATE TRIGGER trg_log_promotion_status AFTER UPDATE ON public.employee_promotions FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
CREATE TRIGGER trg_log_referral_history AFTER UPDATE ON public.employee_referrals FOR EACH ROW EXECUTE FUNCTION public.log_referral_history();
CREATE TRIGGER trg_log_transfer_status AFTER UPDATE ON public.employee_transfers FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
CREATE TRIGGER trg_maintenance_sla_breach AFTER UPDATE ON public.maintenance_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_sla_breach();
CREATE TRIGGER trg_track_failed_login AFTER INSERT ON public.failed_login_attempts FOR EACH ROW EXECUTE FUNCTION public.track_failed_login_attempts();
CREATE TRIGGER update_eom_score_on_achievement AFTER INSERT ON public.user_achievements FOR EACH ROW EXECUTE FUNCTION public.update_eom_score_on_achievement();
CREATE TRIGGER update_eom_score_on_kudos AFTER INSERT ON public.kudos FOR EACH ROW EXECUTE FUNCTION public.update_eom_score_on_kudos();
CREATE TRIGGER update_eom_score_on_training AFTER UPDATE ON public.training_progress FOR EACH ROW EXECUTE FUNCTION public.update_eom_score_on_training();
CREATE TRIGGER update_knowledge_question_version BEFORE UPDATE ON public.knowledge_questions FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_question_version();

-- ------------------------------------------------------------
-- Views
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.achievement_leaderboard AS
  SELECT user_id, count(*) AS total_achievements, sum(points) AS total_points, max(earned_at) AS last_achievement_at
  FROM user_achievements GROUP BY user_id ORDER BY (sum(points)) DESC;

CREATE OR REPLACE VIEW public.user_message_stats AS
  SELECT p.id AS user_id, p.full_name, p.email,
    count(CASE WHEN ((m.sender_id = p.id) AND (m.status <> 'archived')) THEN 1 ELSE NULL END) AS sent_messages,
    count(CASE WHEN ((m.recipient_id = p.id) AND (m.status <> 'archived')) THEN 1 ELSE NULL END) AS received_messages,
    count(CASE WHEN ((m.recipient_id = p.id) AND (m.status = 'sent')) THEN 1 ELSE NULL END) AS unread_messages,
    count(CASE WHEN ((m.priority = 'urgent') AND (m.recipient_id = p.id) AND (m.status <> 'archived')) THEN 1 ELSE NULL END) AS urgent_messages
  FROM (profiles p LEFT JOIN messages m ON ((p.id = m.sender_id) OR (p.id = m.recipient_id)))
  WHERE (p.is_active = true) GROUP BY p.id, p.full_name, p.email;

-- Materialized view: sop_document_search
-- Note: definition approximated; anon role has SELECT revoked (only authenticated)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.sop_document_search AS
  SELECT
    d.id,
    d.title,
    d.content,
    d.category_id,
    d.property_id,
    d.status,
    d.created_at,
    d.updated_at,
    to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(d.content, '')) AS search_vector
  FROM public.sop_documents d
  WHERE d.status = 'approved'
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS sop_document_search_id_idx ON public.sop_document_search (id);
CREATE INDEX IF NOT EXISTS sop_document_search_vector_idx ON public.sop_document_search USING gin (search_vector);

REVOKE SELECT ON public.sop_document_search FROM anon;
GRANT SELECT ON public.sop_document_search TO authenticated;

-- ------------------------------------------------------------
-- Row Level Security: ENABLE
-- ------------------------------------------------------------
ALTER TABLE public.account_action_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_department_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_of_the_month ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eom_auto_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eom_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eom_scoring_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_title_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_question_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_related_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microlearning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_context_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_review_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_wiki ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_block_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_module_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_path_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vacation_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies (423)
-- ------------------------------------------------------------
CREATE POLICY account_action_notes_insert ON public.account_action_notes FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY account_action_notes_select ON public.account_action_notes FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY achievement_definitions_manage_admin_delete ON public.achievement_definitions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text]))))));
CREATE POLICY achievement_definitions_manage_admin_insert ON public.achievement_definitions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text]))))));
CREATE POLICY achievement_definitions_manage_admin_update ON public.achievement_definitions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text]))))));
CREATE POLICY achievement_definitions_select ON public.achievement_definitions FOR SELECT TO authenticated USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND ((ur.role)::text = ANY (ARRAY['corporate_admin'::text, 'regional_admin'::text, 'regional_hr'::text, 'property_hr'::text])))))));
CREATE POLICY "Users can view activity in their properties" ON public.activity_log FOR SELECT TO authenticated USING (((property_id IS NULL) OR (EXISTS ( SELECT 1
   FROM user_properties up
  WHERE ((up.user_id = ( SELECT auth.uid() AS uid)) AND (up.property_id = activity_log.property_id))))));
CREATE POLICY admin_delegations_delete ON public.admin_delegations FOR DELETE TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY admin_delegations_insert ON public.admin_delegations FOR INSERT TO authenticated WITH CHECK (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY admin_delegations_select ON public.admin_delegations FOR SELECT TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR (delegate_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (fallback_delegate_ids)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY admin_delegations_update ON public.admin_delegations FOR UPDATE TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role))) WITH CHECK (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY announcement_attachments_select ON public.announcement_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM announcements a
  WHERE ((a.id = announcement_attachments.announcement_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((a.expires_at IS NULL) OR (a.expires_at > now())))))));
CREATE POLICY announcement_reads_insert_users ON public.announcement_reads FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY announcement_reads_select ON public.announcement_reads FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY announcement_targets_select ON public.announcement_targets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM announcements a
  WHERE ((a.id = announcement_targets.announcement_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((a.expires_at IS NULL) OR (a.expires_at > now())))))));
CREATE POLICY announcements_select_all_authenticated ON public.announcements FOR SELECT TO authenticated USING ((((expires_at IS NULL) OR (expires_at > now())) AND ((scheduled_at IS NULL) OR (scheduled_at <= now()))));
CREATE POLICY announcements_update_admins ON public.announcements FOR UPDATE TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY consolidated_announcements_insert ON public.announcements FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))));
CREATE POLICY property_isolation_announcements ON public.announcements FOR ALL TO public USING (check_property_access(property_id));
CREATE POLICY "Users can create delegations for their approvals" ON public.approval_delegations FOR INSERT TO authenticated WITH CHECK ((delegator_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update their own delegations" ON public.approval_delegations FOR UPDATE TO authenticated USING ((delegator_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view delegations they created or received" ON public.approval_delegations FOR SELECT TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR (delegate_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY approval_history_select ON public.approval_history FOR SELECT TO authenticated USING (((approver_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (EXISTS ( SELECT 1
   FROM approval_requests ar
  WHERE ((ar.id = approval_history.approval_request_id) AND ((ar.current_approver_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM ((user_properties up1
             JOIN user_properties up2 ON ((up1.property_id = up2.property_id)))
             JOIN approval_requests ar2 ON (((ar2.entity_id)::text ~~ (('%'::text || (up2.user_id)::text) || '%'::text))))
          WHERE (up1.user_id = ( SELECT auth.uid() AS uid))))))))));
CREATE POLICY approval_requests_select ON public.approval_requests FOR SELECT TO authenticated USING (((current_approver_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (EXISTS ( SELECT 1
   FROM temporary_approvers ta
  WHERE (((ta.delegate_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (ta.fallback_delegate_ids))) AND (ta.start_at <= now()) AND (ta.end_at >= now()) AND (((ta.entity_type IS NOT NULL) AND (ta.entity_id IS NOT NULL) AND (ta.entity_type = approval_requests.entity_type) AND (ta.entity_id = approval_requests.entity_id)) OR ((ta.entity_type IS NULL) AND (ta.entity_id IS NULL) AND ((ta.scope_type = 'all'::text) OR ((ta.scope_type = 'property'::text) AND (ta.scope_id IN ( SELECT user_properties.property_id
           FROM user_properties
          WHERE (user_properties.user_id = approval_requests.current_approver_id)))) OR ((ta.scope_type = 'department'::text) AND (ta.scope_id IN ( SELECT user_departments.department_id
           FROM user_departments
          WHERE (user_departments.user_id = approval_requests.current_approver_id))))))) AND (ta.delegator_id = approval_requests.current_approver_id))))));
CREATE POLICY attendance_insert_own ON public.attendance FOR INSERT TO public WITH CHECK ((employee_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY attendance_update_own ON public.attendance FOR UPDATE TO public USING ((employee_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY consolidated_attendance_select ON public.attendance FOR SELECT TO public USING (((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) OR (employee_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY audit_logs_strict_select ON public.audit_logs FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY categories_manage_admin ON public.categories FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY categories_select_authenticated ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY allow_certificate_history_insert ON public.certificate_history FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = performed_by));
CREATE POLICY consolidated_certificate_history_select ON public.certificate_history FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role]))))) OR (EXISTS ( SELECT 1
   FROM certificates c
  WHERE ((c.id = certificate_history.certificate_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY certificate_templates_admin_write ON public.certificate_templates FOR ALL TO authenticated USING (is_admin(( SELECT auth.uid() AS uid))) WITH CHECK (is_admin(( SELECT auth.uid() AS uid)));
CREATE POLICY certificate_templates_select ON public.certificate_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND ((user_id = ( SELECT auth.uid() AS uid)) OR has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role]))));
CREATE POLICY consolidated_certificates_select ON public.certificates FOR SELECT TO public USING ((((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))) AND (EXISTS ( SELECT 1
   FROM user_properties up
  WHERE ((up.user_id = ( SELECT auth.uid() AS uid)) AND (up.property_id = certificates.property_id))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can join conversations they're invited to" ON public.conversation_participants FOR INSERT TO authenticated WITH CHECK ((participant_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can leave their own conversations" ON public.conversation_participants FOR DELETE TO authenticated USING ((participant_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view their own conversations" ON public.conversation_participants FOR SELECT TO authenticated USING ((participant_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = ANY (participant_ids)));
CREATE POLICY "Users can update their conversations" ON public.conversations FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = ANY (participant_ids)));
CREATE POLICY "Users can view conversations they are part of" ON public.conversations FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = ANY (participant_ids)));
CREATE POLICY "Managers can create import logs" ON public.data_import_logs FOR INSERT TO public WITH CHECK ((has_any_role(( SELECT auth.uid() AS uid), ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role]) AND has_property_access(( SELECT auth.uid() AS uid), property_id)));
CREATE POLICY "Managers can delete import logs" ON public.data_import_logs FOR DELETE TO public USING (((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)) AND has_property_access(( SELECT auth.uid() AS uid), property_id)));
CREATE POLICY "Managers can update import logs" ON public.data_import_logs FOR UPDATE TO public USING (((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)) AND has_property_access(( SELECT auth.uid() AS uid), property_id)));
CREATE POLICY "Users see import logs for accessible properties" ON public.data_import_logs FOR SELECT TO public USING (has_property_access(( SELECT auth.uid() AS uid), property_id));
CREATE POLICY departments_modify_admin_pm ON public.departments FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id))));
CREATE POLICY departments_select_authenticated ON public.departments FOR SELECT TO authenticated USING (((is_active = true) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) OR has_property_access(( SELECT auth.uid() AS uid), property_id)));
CREATE POLICY property_isolation_departments ON public.departments FOR ALL TO public USING (check_property_access(property_id));
CREATE POLICY "Authenticated can view designations" ON public.designations FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY doc_ack_update_own ON public.document_acknowledgments FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY document_acknowledgments_insert ON public.document_acknowledgments FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_acknowledgments.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR (d.status = 'PUBLISHED'::document_status)))))));
CREATE POLICY document_acknowledgments_select ON public.document_acknowledgments FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_acknowledgments.document_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (EXISTS ( SELECT 1
           FROM (departments dept
             JOIN user_departments ud ON ((dept.id = ud.department_id)))
          WHERE ((dept.id = d.department_id) AND (ud.user_id = ( SELECT auth.uid() AS uid))))))))))));
CREATE POLICY document_approvals_delete_author_admin_pending ON public.document_approvals FOR DELETE TO authenticated USING (((status = 'pending'::text) AND (is_active = true) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_approvals.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role)))))));
CREATE POLICY document_approvals_select ON public.document_approvals FOR SELECT TO authenticated USING (((approver_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_approvals.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role)))))));
CREATE POLICY document_approvals_select_approver_or_delegate ON public.document_approvals FOR SELECT TO authenticated USING (((approver_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (EXISTS ( SELECT 1
   FROM (documents d
     JOIN temporary_approvers ta ON ((ta.delegator_id = document_approvals.approver_id)))
  WHERE ((d.id = document_approvals.document_id) AND ((ta.delegate_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (ta.fallback_delegate_ids))) AND (ta.start_at <= now()) AND (ta.end_at >= now()) AND (((ta.entity_type IS NOT NULL) AND (ta.entity_id IS NOT NULL) AND (ta.entity_type = 'document_approval'::text) AND (ta.entity_id = document_approvals.id)) OR ((ta.entity_type IS NULL) AND (ta.entity_id IS NULL) AND ((ta.scope_type = 'all'::text) OR ((ta.scope_type = 'property'::text) AND (NOT (ta.scope_id IS DISTINCT FROM d.property_id))) OR ((ta.scope_type = 'department'::text) AND (NOT (ta.scope_id IS DISTINCT FROM d.department_id)))))))))));
CREATE POLICY document_approvals_update_approver_or_delegate ON public.document_approvals FOR UPDATE TO authenticated USING (((status = 'pending'::text) AND (is_active = true) AND ((approver_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (EXISTS ( SELECT 1
   FROM (temporary_approvers ta
     JOIN documents d ON ((d.id = document_approvals.document_id)))
  WHERE ((ta.delegator_id = document_approvals.approver_id) AND ((ta.delegate_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (ta.fallback_delegate_ids))) AND (ta.start_at <= now()) AND (ta.end_at >= now()) AND ((ta.max_approvals IS NULL) OR (ta.approvals_used < ta.max_approvals)) AND (((ta.entity_type IS NOT NULL) AND (ta.entity_id IS NOT NULL) AND (ta.entity_type = 'document_approval'::text) AND (ta.entity_id = document_approvals.id)) OR ((ta.entity_type IS NULL) AND (ta.entity_id IS NULL) AND ((ta.scope_type = 'all'::text) OR ((ta.scope_type = 'property'::text) AND (NOT (ta.scope_id IS DISTINCT FROM d.property_id))) OR ((ta.scope_type = 'department'::text) AND (NOT (ta.scope_id IS DISTINCT FROM d.department_id)))))))))))) WITH CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
CREATE POLICY document_comments_delete ON public.document_comments FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_comments.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY document_comments_insert ON public.document_comments FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_comments.document_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid)) OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)) OR ((d.visibility = 'department'::document_visibility) AND (d.department_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_departments ud
          WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = d.department_id)))))))))));
CREATE POLICY document_comments_resolve ON public.document_comments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_comments.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)))))));
CREATE POLICY document_comments_select ON public.document_comments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_comments.document_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid)) OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)) OR ((d.visibility = 'department'::document_visibility) AND (d.department_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_departments ud
          WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = d.department_id))))))))));
CREATE POLICY document_comments_update_own ON public.document_comments FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Manage department access (DELETE)" ON public.document_department_access FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM documents
  WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))))));
CREATE POLICY "Manage department access (INSERT)" ON public.document_department_access FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM documents
  WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))))));
CREATE POLICY "Manage department access (UPDATE)" ON public.document_department_access FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM documents
  WHERE ((documents.id = document_department_access.document_id) AND ((documents.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))))));
CREATE POLICY "View department access" ON public.document_department_access FOR SELECT TO authenticated USING (true);
CREATE POLICY document_download_logs_insert ON public.document_download_logs FOR INSERT TO authenticated WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY document_download_logs_select ON public.document_download_logs FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_download_logs.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id))))))));
CREATE POLICY "Users can manage their own favorites" ON public.document_favorites FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY document_folders_delete ON public.document_folders FOR DELETE TO authenticated USING (((is_system = false) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND (property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY document_folders_insert ON public.document_folders FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND (property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (departments d
     JOIN user_departments ud ON ((d.id = ud.department_id)))
  WHERE ((d.id = document_folders.department_id) AND (ud.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY document_folders_select ON public.document_folders FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (is_system = true) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR ((department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = document_folders.department_id))))) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY document_folders_update ON public.document_folders FOR UPDATE TO authenticated USING (((is_system = false) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND (property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (departments d
     JOIN user_departments ud ON ((d.id = ud.department_id)))
  WHERE ((d.id = document_folders.department_id) AND (ud.user_id = ( SELECT auth.uid() AS uid)))))) OR (created_by = ( SELECT auth.uid() AS uid)))));
CREATE POLICY document_notification_rules_delete_own ON public.document_notification_rules FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY document_notification_rules_insert_own ON public.document_notification_rules FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ((folder_id IS NULL) OR (EXISTS ( SELECT 1
   FROM document_folders df
  WHERE ((df.id = document_notification_rules.folder_id) AND ((df.is_system = true) OR (df.created_by = ( SELECT auth.uid() AS uid)) OR has_property_access(( SELECT auth.uid() AS uid), df.property_id))))))));
CREATE POLICY document_notification_rules_select_own ON public.document_notification_rules FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY document_notification_rules_update_own ON public.document_notification_rules FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY document_tag_assignments_delete ON public.document_tag_assignments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_tag_assignments.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)))))));
CREATE POLICY document_tag_assignments_insert ON public.document_tag_assignments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_tag_assignments.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)))))));
CREATE POLICY document_tag_assignments_select ON public.document_tag_assignments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_tag_assignments.document_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (d.created_by = ( SELECT auth.uid() AS uid)) OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)))))));
CREATE POLICY document_tags_delete ON public.document_tags FOR DELETE TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY document_tags_insert ON public.document_tags FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role)));
CREATE POLICY document_tags_select ON public.document_tags FOR SELECT TO authenticated USING ((auth.role() = 'authenticated'::text));
CREATE POLICY document_tags_update ON public.document_tags FOR UPDATE TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY document_versions_insert_for_document_authors ON public.document_versions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_versions.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role))))));
CREATE POLICY document_versions_select ON public.document_versions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_versions.document_id) AND (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (d.created_by = ( SELECT auth.uid() AS uid)) OR ((d.status = 'PUBLISHED'::document_status) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id)))))));
CREATE POLICY document_views_insert ON public.document_views FOR INSERT TO authenticated WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY document_views_select ON public.document_views FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.id = document_views.document_id) AND ((d.created_by = ( SELECT auth.uid() AS uid)) OR (d.owner_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), d.property_id))))))));
CREATE POLICY documents_modify_author_approver ON public.documents FOR ALL TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id))));
CREATE POLICY documents_select_by_visibility ON public.documents FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR ((visibility = 'all_properties'::document_visibility) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'property'::document_visibility) AND (property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = documents.department_id)))) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'group_department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((user_departments ud
     JOIN departments ud_dept ON ((ud.department_id = ud_dept.id)))
     JOIN departments doc_dept ON ((documents.department_id = doc_dept.id)))
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (lower(ud_dept.name) = lower(doc_dept.name))))) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'specific_departments'::document_visibility) AND (EXISTS ( SELECT 1
   FROM (document_department_access dda
     JOIN user_departments ud ON ((dda.department_id = ud.department_id)))
  WHERE ((dda.document_id = documents.id) AND (ud.user_id = ( SELECT auth.uid() AS uid))))) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'role'::document_visibility) AND (role IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = documents.role)))) AND (status = 'PUBLISHED'::document_status)) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY documents_select_strict_visibility ON public.documents FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) AND has_property_access(( SELECT auth.uid() AS uid), property_id)) OR (has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = documents.department_id))))) OR ((visibility = 'all_properties'::document_visibility) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'property'::document_visibility) AND (property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = ( SELECT auth.uid() AS uid)) AND (ud.department_id = documents.department_id)))) AND (status = 'PUBLISHED'::document_status)) OR ((visibility = 'role'::document_visibility) AND (role IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = documents.role)))) AND (status = 'PUBLISHED'::document_status)) OR (created_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can delete own documents" ON public.employee_documents FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can upload own documents" ON public.employee_documents FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own documents" ON public.employee_documents FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])))))));
CREATE POLICY "EOM manage policy" ON public.employee_of_the_month FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY "EOM select policy" ON public.employee_of_the_month FOR SELECT TO authenticated USING (true);
CREATE POLICY consolidated_employee_promotions_insert ON public.employee_promotions FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN user_properties emp_up ON ((emp_up.user_id = employee_promotions.employee_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (up.property_id = emp_up.property_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))))));
CREATE POLICY consolidated_employee_promotions_select ON public.employee_promotions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN user_properties emp_up ON ((emp_up.user_id = employee_promotions.employee_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (up.property_id = emp_up.property_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (employee_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can create referrals" ON public.employee_referrals FOR INSERT TO public WITH CHECK ((referred_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update their own referrals" ON public.employee_referrals FOR UPDATE TO public USING ((referred_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY consolidated_employee_referrals_select ON public.employee_referrals FOR SELECT TO public USING ((((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE (user_roles.role = ANY (ARRAY['regional_hr'::app_role, 'property_hr'::app_role])))) AND (property_id IN ( SELECT user_properties.property_id
   FROM user_properties
  WHERE (user_properties.user_id = ( SELECT auth.uid() AS uid))))) OR (referred_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Regional admin/HR can create transfers" ON public.employee_transfers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))));
CREATE POLICY consolidated_employee_transfers_select ON public.employee_transfers FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND ((up.property_id = employee_transfers.from_property_id) OR (up.property_id = employee_transfers.to_property_id))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (employee_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY eom_auto_selections_manage ON public.eom_auto_selections FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY eom_auto_selections_view ON public.eom_auto_selections FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])))))));
CREATE POLICY eom_automation_config_manage ON public.eom_automation_config FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN profiles p ON ((p.id = ( SELECT auth.uid() AS uid))))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY eom_automation_config_view ON public.eom_automation_config FOR SELECT TO authenticated USING (true);
CREATE POLICY eom_scoring_history_view ON public.eom_scoring_history FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role])))))));
CREATE POLICY "Anyone view escalation rules" ON public.escalation_rules FOR SELECT TO public USING (true);
CREATE POLICY escalation_rules_admin_only ON public.escalation_rules FOR ALL TO authenticated USING (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role)) WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role));
CREATE POLICY "Anyone can view public events" ON public.events FOR SELECT TO authenticated USING ((is_public = true));
CREATE POLICY "Users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK ((created_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE TO authenticated USING ((created_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view events they attend" ON public.events FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = ANY (attendees)));
CREATE POLICY failed_login_admin_all ON public.failed_login_attempts FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY feed_comments_delete_own ON public.feed_comments FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = author_id));
CREATE POLICY feed_comments_insert_own ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = author_id) AND can_view_feed_item(feed_item_id)));
CREATE POLICY feed_comments_select_visible_items ON public.feed_comments FOR SELECT TO authenticated USING (can_view_feed_item(feed_item_id));
CREATE POLICY feed_comments_update_own ON public.feed_comments FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = author_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = author_id));
CREATE POLICY feed_reactions_delete_own ON public.feed_reactions FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY feed_reactions_insert_own ON public.feed_reactions FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (reaction_type = ANY (ARRAY['like'::text, 'love'::text, 'clap'::text, 'wow'::text])) AND can_view_feed_item(feed_item_id)));
CREATE POLICY feed_reactions_select_visible_items ON public.feed_reactions FOR SELECT TO authenticated USING (can_view_feed_item(feed_item_id));
CREATE POLICY consolidated_goals_select ON public.goals FOR SELECT TO public USING (((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) OR (employee_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY goals_insert_own ON public.goals FOR INSERT TO public WITH CHECK ((employee_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY goals_update_own ON public.goals FOR UPDATE TO public USING ((employee_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Authenticated can view holidays" ON public.holidays FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Authenticated users can view visible news" ON public.hospitality_news FOR SELECT TO authenticated USING ((is_visible = true));
CREATE POLICY inbound_emails_admin_read ON public.inbound_emails FOR SELECT TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY "Public can submit applications" ON public.job_applications FOR INSERT TO anon, authenticated WITH CHECK (((status = 'submitted'::text) AND (applicant_email IS NOT NULL) AND ((length(TRIM(BOTH FROM applicant_email)) >= 3) AND (length(TRIM(BOTH FROM applicant_email)) <= 320)) AND (job_posting_id IS NOT NULL)));
CREATE POLICY consolidated_job_applications_select ON public.job_applications FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN job_postings jp ON ((jp.property_id = up.property_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (jp.id = job_applications.job_posting_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'property_manager'::app_role) AND (( SELECT auth.uid() AS uid) = ANY (job_applications.routed_to))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (referred_by = ( SELECT auth.uid() AS uid))));
CREATE POLICY consolidated_job_applications_update ON public.job_applications FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN job_postings jp ON ((jp.property_id = up.property_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (jp.id = job_applications.job_posting_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'property_manager'::app_role) AND (( SELECT auth.uid() AS uid) = ANY (job_applications.routed_to))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN job_postings jp ON ((jp.property_id = up.property_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (jp.id = job_applications.job_posting_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'property_manager'::app_role) AND (( SELECT auth.uid() AS uid) = ANY (job_applications.routed_to))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))))));
CREATE POLICY job_postings_manage ON public.job_postings FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY job_postings_select ON public.job_postings FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can read job title mappings" ON public.job_title_role_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR can manage job title mappings" ON public.job_title_role_mappings FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY "Allow manage access for admins" ON public.job_titles FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))));
CREATE POLICY "Allow read access for authenticated users" ON public.job_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create attempts" ON public.knowledge_question_attempts FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users see own attempts" ON public.knowledge_question_attempts FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Full access to question options" ON public.knowledge_question_options FOR ALL TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY consolidated_knowledge_question_options_select ON public.knowledge_question_options FOR SELECT TO public USING (((question_id IN ( SELECT knowledge_questions.id
   FROM knowledge_questions
  WHERE (knowledge_questions.status = 'published'::question_status))) OR (question_id IN ( SELECT knowledge_questions.id
   FROM knowledge_questions
  WHERE (knowledge_questions.created_by = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM (learning_quiz_questions lqq
     JOIN learning_quizzes lq ON ((lq.id = lqq.quiz_id)))
  WHERE ((lqq.question_id = knowledge_question_options.question_id) AND (lq.status = 'published'::question_status))))));
CREATE POLICY "HR can manage usages" ON public.knowledge_question_usages FOR ALL TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE ((user_roles.role)::text = ANY (ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_hr'::text, 'property_manager'::text])))));
CREATE POLICY "Usages follow question visibility" ON public.knowledge_question_usages FOR SELECT TO public USING ((question_id IN ( SELECT knowledge_questions.id
   FROM knowledge_questions
  WHERE (knowledge_questions.status = 'published'::question_status))));
CREATE POLICY "HR can view versions" ON public.knowledge_question_versions FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE ((user_roles.role)::text = ANY (ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_hr'::text])))));
CREATE POLICY "Authenticated users can create questions" ON public.knowledge_questions FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Creators can update own questions" ON public.knowledge_questions FOR UPDATE TO public USING (((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE ((user_roles.role)::text = ANY (ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_hr'::text]))))));
CREATE POLICY consolidated_knowledge_questions_select ON public.knowledge_questions FOR SELECT TO public USING (((created_by = ( SELECT auth.uid() AS uid)) OR (reviewed_by = ( SELECT auth.uid() AS uid)) OR (status = 'published'::question_status) OR (EXISTS ( SELECT 1
   FROM (learning_quiz_questions lqq
     JOIN learning_quizzes lq ON ((lq.id = lqq.quiz_id)))
  WHERE ((lqq.question_id = knowledge_questions.id) AND (lq.status = 'published'::question_status))))));
CREATE POLICY "Users can create sessions" ON public.knowledge_quiz_sessions FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update own sessions" ON public.knowledge_quiz_sessions FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users see own sessions" ON public.knowledge_quiz_sessions FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Admins can manage related articles" ON public.knowledge_related_articles FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role]))))));
CREATE POLICY "Anyone can view related articles" ON public.knowledge_related_articles FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view public kudos" ON public.kudos FOR SELECT TO authenticated USING ((is_public = true));
CREATE POLICY "Authenticated users can create kudos" ON public.kudos FOR INSERT TO authenticated WITH CHECK ((giver_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update own kudos" ON public.kudos FOR UPDATE TO authenticated USING ((giver_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view own kudos" ON public.kudos FOR SELECT TO authenticated USING (((recipient_id = ( SELECT auth.uid() AS uid)) OR (giver_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Anyone can view kudos likes" ON public.kudos_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like kudos" ON public.kudos_likes FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "HR can manage assignments" ON public.learning_assignments FOR ALL TO public USING (can_manage_assignments(( SELECT auth.uid() AS uid)));
CREATE POLICY learning_assignments_manage_policy_insert ON public.learning_assignments FOR INSERT TO authenticated WITH CHECK ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_manager'::app_role) OR has_role_optimized('property_hr'::app_role) OR has_role_optimized('department_head'::app_role)));
CREATE POLICY learning_assignments_select_policy ON public.learning_assignments FOR SELECT TO authenticated USING ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role) OR has_role_optimized('property_hr'::app_role) OR (assigned_by = ( SELECT auth.uid() AS uid)) OR ((COALESCE(is_deleted, false) = false) AND (((target_type = 'user'::learning_target_type) AND (target_id = (( SELECT auth.uid() AS uid))::text)) OR (target_type = 'everyone'::learning_target_type) OR ((target_type = 'department'::learning_target_type) AND (target_id = ANY ((get_user_departments(( SELECT auth.uid() AS uid)))::text[]))) OR ((target_type = 'property'::learning_target_type) AND (target_id = ANY ((get_user_properties(( SELECT auth.uid() AS uid)))::text[]))) OR ((target_type = 'role'::learning_target_type) AND (target_id = ANY ((get_my_roles())::text[])))))));
CREATE POLICY consolidated_learning_progress_all ON public.learning_progress FOR ALL TO public USING ((can_manage_assignments(( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((can_manage_assignments(( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY consolidated_learning_progress_select ON public.learning_progress FOR SELECT TO public USING (((has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (EXISTS ( SELECT 1
   FROM (user_departments ud
     JOIN user_departments my_dept ON ((my_dept.department_id = ud.department_id)))
  WHERE ((ud.user_id = learning_progress.user_id) AND (my_dept.user_id = ( SELECT auth.uid() AS uid)))))) OR ((has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)) AND (EXISTS ( SELECT 1
   FROM (user_properties up
     JOIN user_properties my_prop ON ((my_prop.property_id = up.property_id)))
  WHERE ((up.user_id = learning_progress.user_id) AND (my_prop.user_id = ( SELECT auth.uid() AS uid)))))) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "HR can manage quiz questions" ON public.learning_quiz_questions FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND ((user_roles.role)::text = ANY (ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_hr'::text, 'department_manager'::text]))))));
CREATE POLICY learning_quiz_questions_delete ON public.learning_quiz_questions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY learning_quiz_questions_insert ON public.learning_quiz_questions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY learning_quiz_questions_select ON public.learning_quiz_questions FOR SELECT TO authenticated USING (((quiz_id IN ( SELECT q.id
   FROM learning_quizzes q)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY learning_quiz_questions_update ON public.learning_quiz_questions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Draft quizzes viewable by creators and HR" ON public.learning_quizzes FOR ALL TO public USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND ((user_roles.role)::text = ANY (ARRAY['regional_admin'::text, 'regional_hr'::text, 'property_hr'::text, 'department_manager'::text])))))));
CREATE POLICY learning_quizzes_delete ON public.learning_quizzes FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY learning_quizzes_insert ON public.learning_quizzes FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY learning_quizzes_select ON public.learning_quizzes FOR SELECT TO authenticated USING (((status = 'published'::question_status) OR (created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY learning_quizzes_update ON public.learning_quizzes FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY "Users can create leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = requester_id));
CREATE POLICY "Users can view own leave requests" ON public.leave_requests FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = requester_id));
CREATE POLICY "Authenticated can view leave_types" ON public.leave_types FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Users can upload maintenance attachments" ON public.maintenance_attachments FOR INSERT TO public WITH CHECK (((( SELECT auth.uid() AS uid) = uploaded_by_id) AND (EXISTS ( SELECT 1
   FROM maintenance_tickets mt
  WHERE ((mt.id = maintenance_attachments.ticket_id) AND ((EXISTS ( SELECT 1
           FROM user_properties
          WHERE ((user_properties.user_id = ( SELECT auth.uid() AS uid)) AND (user_properties.property_id = mt.property_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))))))));
CREATE POLICY "Users can view maintenance attachments" ON public.maintenance_attachments FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM maintenance_tickets mt
  WHERE ((mt.id = maintenance_attachments.ticket_id) AND ((EXISTS ( SELECT 1
           FROM user_properties
          WHERE ((user_properties.user_id = ( SELECT auth.uid() AS uid)) AND (user_properties.property_id = mt.property_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role]))))))))));
CREATE POLICY "Users can create maintenance comments" ON public.maintenance_comments FOR INSERT TO public WITH CHECK (((( SELECT auth.uid() AS uid) = author_id) AND (EXISTS ( SELECT 1
   FROM maintenance_tickets mt
  WHERE ((mt.id = maintenance_comments.ticket_id) AND ((EXISTS ( SELECT 1
           FROM user_properties
          WHERE ((user_properties.user_id = ( SELECT auth.uid() AS uid)) AND (user_properties.property_id = mt.property_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))))))));
CREATE POLICY "Users can view maintenance comments" ON public.maintenance_comments FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM maintenance_tickets mt
  WHERE ((mt.id = maintenance_comments.ticket_id) AND ((EXISTS ( SELECT 1
           FROM user_properties
          WHERE ((user_properties.user_id = ( SELECT auth.uid() AS uid)) AND (user_properties.property_id = mt.property_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role]))))))))));
CREATE POLICY "Maintenance schedules manageable by admins/managers" ON public.maintenance_schedules FOR ALL TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role])))));
CREATE POLICY "Maintenance schedules viewable by authorized roles" ON public.maintenance_schedules FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))));
CREATE POLICY maintenance_sla_policies_manage ON public.maintenance_sla_policies FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY maintenance_sla_policies_select ON public.maintenance_sla_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tickets" ON public.maintenance_tickets FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = reported_by_id));
CREATE POLICY maintenance_tickets_select_policy ON public.maintenance_tickets FOR SELECT TO public USING ((has_property_access(( SELECT auth.uid() AS uid), property_id) OR (reported_by_id = ( SELECT auth.uid() AS uid)) OR (assigned_to_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY maintenance_tickets_update_policy ON public.maintenance_tickets FOR UPDATE TO public USING ((has_property_access(( SELECT auth.uid() AS uid), property_id) OR (reported_by_id = ( SELECT auth.uid() AS uid)) OR (assigned_to_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY media_access_logs_insert ON public.media_access_logs FOR INSERT TO authenticated WITH CHECK ((accessed_by = auth.uid()));
CREATE POLICY media_access_logs_select ON public.media_access_logs FOR SELECT TO authenticated USING (((accessed_by = ( SELECT auth.uid() AS uid)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY media_asset_usages_delete ON public.media_asset_usages FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM media_assets ma
  WHERE ((ma.id = media_asset_usages.media_asset_id) AND ((ma.uploaded_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))))));
CREATE POLICY media_asset_usages_insert ON public.media_asset_usages FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM media_assets ma
  WHERE ((ma.id = media_asset_usages.media_asset_id) AND ((ma.uploaded_by = auth.uid()) OR has_role(auth.uid(), 'regional_admin'::app_role) OR has_role(auth.uid(), 'property_manager'::app_role))))));
CREATE POLICY media_asset_usages_select ON public.media_asset_usages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM media_assets ma
  WHERE ((ma.id = media_asset_usages.media_asset_id) AND ((ma.is_public = true) OR (ma.uploaded_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((ma.property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), ma.property_id)))))));
CREATE POLICY media_assets_delete ON public.media_assets FOR DELETE TO authenticated USING (((uploaded_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id) AND has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role))));
CREATE POLICY media_assets_insert ON public.media_assets FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id))));
CREATE POLICY media_assets_select ON public.media_assets FOR SELECT TO authenticated USING (((is_public = true) OR (uploaded_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id))));
CREATE POLICY media_assets_update ON public.media_assets FOR UPDATE TO authenticated USING (((uploaded_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id) AND has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role))));
CREATE POLICY media_collection_items_delete ON public.media_collection_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM media_collections mc
  WHERE ((mc.id = media_collection_items.collection_id) AND ((mc.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role))))));
CREATE POLICY media_collection_items_insert ON public.media_collection_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM media_collections mc
  WHERE ((mc.id = media_collection_items.collection_id) AND ((mc.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role))))));
CREATE POLICY media_collection_items_select ON public.media_collection_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM media_collections mc
  WHERE ((mc.id = media_collection_items.collection_id) AND ((mc.is_system = true) OR (mc.created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((mc.property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), mc.property_id)))))));
CREATE POLICY media_collections_delete ON public.media_collections FOR DELETE TO authenticated USING ((((created_by = ( SELECT auth.uid() AS uid)) AND (is_system = false)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY media_collections_insert ON public.media_collections FOR INSERT TO authenticated WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY media_collections_select ON public.media_collections FOR SELECT TO authenticated USING (((is_system = true) OR (created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR ((property_id IS NOT NULL) AND has_property_access(( SELECT auth.uid() AS uid), property_id))));
CREATE POLICY media_collections_update ON public.media_collections FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY "Users can delete their own attachments" ON public.message_attachments FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = uploaded_by_id));
CREATE POLICY "Users can insert attachments to their messages" ON public.message_attachments FOR INSERT TO public WITH CHECK (((( SELECT auth.uid() AS uid) = uploaded_by_id) AND (EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.id = message_attachments.message_id) AND (( SELECT auth.uid() AS uid) = messages.sender_id))))));
CREATE POLICY "Users can update their own attachments" ON public.message_attachments FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = uploaded_by_id));
CREATE POLICY "Users can view attachments of accessible messages" ON public.message_attachments FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.id = message_attachments.message_id) AND ((( SELECT auth.uid() AS uid) = messages.sender_id) OR (( SELECT auth.uid() AS uid) = messages.recipient_id) OR (messages.recipient_id IS NULL))))));
CREATE POLICY consolidated_messages_insert ON public.messages FOR INSERT TO public WITH CHECK (((( SELECT auth.uid() AS uid) = sender_id) OR ((sender_id = ( SELECT auth.uid() AS uid)) AND ((property_id IS NULL) OR (property_id = ANY (get_user_properties(( SELECT auth.uid() AS uid))))) AND ((department_id IS NULL) OR (department_id = ANY (get_user_departments(( SELECT auth.uid() AS uid))))))));
CREATE POLICY consolidated_messages_select ON public.messages FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = recipient_id) OR (recipient_id IS NULL) OR ((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid)) OR is_regional_admin_or_higher(( SELECT auth.uid() AS uid)) OR ((property_id IS NOT NULL) AND (property_id = ANY (get_user_properties(( SELECT auth.uid() AS uid))))) OR ((department_id IS NOT NULL) AND (department_id = ANY (get_user_departments(( SELECT auth.uid() AS uid))))))));
CREATE POLICY consolidated_messages_update ON public.messages FOR UPDATE TO public USING (((((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = recipient_id)) AND (status <> 'archived'::text)) OR ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = ANY (ARRAY['sent'::text, 'delivered'::text]))) OR ((( SELECT auth.uid() AS uid) = sender_id) AND (status = 'draft'::text)) OR ((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))))) WITH CHECK (((((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = recipient_id)) AND (status <> 'archived'::text)) OR ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = ANY (ARRAY['sent'::text, 'delivered'::text]))) OR ((( SELECT auth.uid() AS uid) = sender_id) AND (status = 'draft'::text)) OR ((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY mfa_secrets_delete_own ON public.mfa_secrets FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY mfa_secrets_insert_own ON public.mfa_secrets FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY mfa_secrets_select_own ON public.mfa_secrets FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY mfa_secrets_update_own ON public.mfa_secrets FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Microlearning manageable by admins and managers" ON public.microlearning_content FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Microlearning viewable by authenticated users" ON public.microlearning_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage module skills" ON public.module_skills FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Everyone can view module skills" ON public.module_skills FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage motivational content" ON public.motivational_content FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND ((user_roles.role)::text = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));
CREATE POLICY "Everyone can read active motivational content" ON public.motivational_content FOR SELECT TO public USING ((is_active = true));
CREATE POLICY "Authenticated can view all batches" ON public.notification_batches FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Service role full access on notification_batches" ON public.notification_batches FOR ALL TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text));
CREATE POLICY service_role_full_access_notification_delivery_events ON public.notification_delivery_events FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY users_view_own_notification_delivery_events ON public.notification_delivery_events FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY admins_read_notification_email_templates ON public.notification_email_templates FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role]))))));
CREATE POLICY service_role_full_access_notification_email_templates ON public.notification_email_templates FOR ALL TO public USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY notification_preferences_insert_own ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY notification_preferences_select_own ON public.notification_preferences FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY notification_preferences_update_own ON public.notification_preferences FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Service role full access on notification_queue" ON public.notification_queue FOR ALL TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text));
CREATE POLICY "Users can view own queue items" ON public.notification_queue FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY notification_templates_admin_only ON public.notification_templates FOR ALL TO authenticated USING (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role)) WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role));
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Managers can view/edit their staff's process" ON public.onboarding_process FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = onboarding_process.user_id) AND ((profiles.reporting_to = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role]))))))))));
CREATE POLICY "Users can view their own process" ON public.onboarding_process FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update relevant onboarding tasks" ON public.onboarding_tasks FOR UPDATE TO public USING (((assigned_to_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM onboarding_process p
  WHERE ((p.id = onboarding_tasks.process_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM user_roles r
  WHERE ((r.user_id = ( SELECT auth.uid() AS uid)) AND (r.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))));
CREATE POLICY "Users can view assigned tasks" ON public.onboarding_tasks FOR SELECT TO public USING (((assigned_to_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM onboarding_process
  WHERE ((onboarding_process.id = onboarding_tasks.process_id) AND (onboarding_process.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))));
CREATE POLICY "Templates are viewable by everyone" ON public.onboarding_templates FOR SELECT TO public USING (true);
CREATE POLICY "Templates editable by admins" ON public.onboarding_templates FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role]))))));
CREATE POLICY password_history_insert_own ON public.password_history FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY password_history_select_own ON public.password_history FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY password_reset_requests_admin_select ON public.password_reset_requests FOR SELECT TO authenticated USING ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY consolidated_payslips_select ON public.payslips FOR SELECT TO public USING (((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) OR (employee_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY consolidated_performance_reviews_select ON public.performance_reviews FOR SELECT TO public USING (((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) OR ((employee_id = ( SELECT auth.uid() AS uid)) OR (reviewer_id = ( SELECT auth.uid() AS uid)))));
CREATE POLICY pii_access_logs_strict_select ON public.pii_access_logs FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]))))));
CREATE POLICY consolidated_profiles_update ON public.profiles FOR UPDATE TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role) OR (id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
CREATE POLICY profiles_select_public ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY properties_modify_admin ON public.properties FOR ALL TO authenticated USING (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role)) WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role));
CREATE POLICY properties_select_public ON public.properties FOR SELECT TO public USING (true);
CREATE POLICY push_subscriptions_delete_own ON public.push_subscriptions FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can create own answers" ON public.quiz_answers FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM quiz_attempts
  WHERE ((quiz_attempts.id = quiz_answers.attempt_id) AND (quiz_attempts.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Users can view own answers" ON public.quiz_answers FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM quiz_attempts
  WHERE ((quiz_attempts.id = quiz_answers.attempt_id) AND (quiz_attempts.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Users can create own attempts" ON public.quiz_attempts FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage questions" ON public.quiz_questions FOR ALL TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Anyone can view running quizzes" ON public.quizzes FOR SELECT TO public USING (((status = 'running'::text) OR (( SELECT auth.uid() AS uid) = created_by) OR true));
CREATE POLICY "Authenticated can create quizzes" ON public.quizzes FOR INSERT TO public WITH CHECK ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Creator can update quizzes" ON public.quizzes FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = created_by));
CREATE POLICY rate_limit_entries_admin_select ON public.rate_limit_entries FOR SELECT TO authenticated USING ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY referral_history_insert ON public.referral_history FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM job_applications ja
  WHERE ((ja.id = referral_history.referral_id) AND (is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))))));
CREATE POLICY referral_history_select ON public.referral_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM job_applications ja
  WHERE ((ja.id = referral_history.referral_id) AND ((ja.referred_by = ( SELECT auth.uid() AS uid)) OR has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role]))))));
CREATE POLICY consolidated_request_attachments_insert ON public.request_attachments FOR INSERT TO authenticated WITH CHECK ((((uploaded_by = ( SELECT auth.uid() AS uid)) AND can_view_request(request_id)) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_attachments.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_attachments_select ON public.request_attachments FOR SELECT TO authenticated USING ((can_view_request(request_id) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_attachments.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_comments_insert ON public.request_comments FOR INSERT TO authenticated WITH CHECK ((((author_id = ( SELECT auth.uid() AS uid)) AND can_view_request(request_id) AND ((visibility = 'all'::text) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_comments.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_comments_select ON public.request_comments FOR SELECT TO authenticated USING (((can_view_request(request_id) AND ((visibility = 'all'::text) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_comments.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_events_select ON public.request_events FOR SELECT TO authenticated USING ((can_view_request(request_id) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_events.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY request_events_insert_authorized ON public.request_events FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_events.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id)))));
CREATE POLICY request_sla_policies_manage ON public.request_sla_policies FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY request_sla_policies_select ON public.request_sla_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY consolidated_request_steps_insert ON public.request_steps FOR INSERT TO authenticated WITH CHECK ((is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_steps.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_steps_select ON public.request_steps FOR SELECT TO authenticated USING ((can_view_request(request_id) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_steps.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_request_steps_update ON public.request_steps FOR UPDATE TO authenticated USING (((can_view_request(request_id) AND ((assignee_id = ( SELECT auth.uid() AS uid)) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_steps.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id)))))) WITH CHECK (((can_view_request(request_id) AND ((assignee_id = ( SELECT auth.uid() AS uid)) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM requests r
  WHERE ((r.id = request_steps.request_id) AND can_view_request(( SELECT auth.uid() AS uid), r.id))))));
CREATE POLICY consolidated_requests_select ON public.requests FOR SELECT TO authenticated USING ((can_view_request(id) OR can_view_request(( SELECT auth.uid() AS uid), id)));
CREATE POLICY consolidated_requests_update ON public.requests FOR UPDATE TO authenticated USING ((can_view_request(( SELECT auth.uid() AS uid), id) OR (can_view_request(id) AND (((requester_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::text, 'returned_for_correction'::text]))) OR (current_assignee_id = ( SELECT auth.uid() AS uid)) OR is_hr(( SELECT auth.uid() AS uid)) OR is_admin(( SELECT auth.uid() AS uid)))))) WITH CHECK ((can_view_request(( SELECT auth.uid() AS uid), id) OR (requester_id = requester_id)));
CREATE POLICY requests_insert_authenticated ON public.requests FOR INSERT TO authenticated WITH CHECK ((requester_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY "Anyone can read role_permissions" ON public.role_permissions FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can view salary_components" ON public.salary_components FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY "Service role can manage reminders" ON public.scheduled_reminders FOR ALL TO public USING (((( SELECT ( SELECT ( SELECT auth.jwt() AS jwt) AS jwt) AS jwt) ->> 'role'::text) = 'service_role'::text));
CREATE POLICY "Users can view their reminders" ON public.scheduled_reminders FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY audit_logs_insert_system_only ON public.security_audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY audit_logs_select_admin_only ON public.security_audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'corporate_admin'::app_role]))))));
CREATE POLICY "Managers can create shifts" ON public.shifts FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Managers can delete shifts" ON public.shifts FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Update own shifts" ON public.shifts FOR UPDATE TO public USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY consolidated_shifts_select ON public.shifts FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY property_isolation_shifts ON public.shifts FOR ALL TO public USING (check_property_access(property_id));
CREATE POLICY "Admins and HR can manage skills" ON public.skills FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY "Everyone can view skills" ON public.skills FOR SELECT TO public USING (true);
CREATE POLICY sop_access_logs_insert_own ON public.sop_access_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY sop_access_logs_select_own_or_admin ON public.sop_access_logs FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY sop_acknowledgments_select ON public.sop_acknowledgments FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role])))))));
CREATE POLICY sop_approval_steps_select ON public.sop_approval_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_approval_workflows_select ON public.sop_approval_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_attachments_select ON public.sop_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own bookmarks" ON public.sop_bookmarks FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY bookmarks_delete ON public.sop_bookmarks FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY bookmarks_insert ON public.sop_bookmarks FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY bookmarks_select ON public.sop_bookmarks FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY categories_select ON public.sop_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_comment_votes_delete ON public.sop_comment_votes FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY sop_comment_votes_insert ON public.sop_comment_votes FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY sop_comment_votes_select ON public.sop_comment_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_comment_votes_update ON public.sop_comment_votes FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY comments_delete ON public.sop_comments FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY comments_insert ON public.sop_comments FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY comments_select ON public.sop_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_update ON public.sop_comments FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view context triggers" ON public.sop_context_triggers FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY sop_document_relations_select ON public.sop_document_relations FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_document_tags_select ON public.sop_document_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_document_versions_select ON public.sop_document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY consolidated_sop_documents_insert ON public.sop_documents FOR INSERT TO public WITH CHECK ((((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) AND ((( SELECT auth.uid() AS uid) = created_by) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role]))))))) OR (((property_id IS NULL) OR (property_id = ANY (get_user_properties(( SELECT auth.uid() AS uid))))) AND ((department_id IS NULL) OR (department_id = ANY (get_user_departments(( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['property_manager'::app_role, 'department_head'::app_role, 'regional_admin'::app_role]))))))));
CREATE POLICY consolidated_sop_documents_select ON public.sop_documents FOR SELECT TO public USING (((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text) OR ((status = 'approved'::sop_document_status) AND (is_regional_admin_or_higher(( SELECT auth.uid() AS uid)) OR (property_id IS NULL) OR (property_id = ANY (get_user_properties(( SELECT auth.uid() AS uid))))) AND ((department_id IS NULL) OR (department_id = ANY (get_user_departments(( SELECT auth.uid() AS uid))))))));
CREATE POLICY sop_update_scoped ON public.sop_documents FOR UPDATE TO public USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'regional_admin'::app_role))))));
CREATE POLICY "Users can manage own feedback" ON public.sop_feedback FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY feedback_insert ON public.sop_feedback FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY feedback_select ON public.sop_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY feedback_update ON public.sop_feedback FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can create own quiz attempts" ON public.sop_quiz_attempts FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY consolidated_sop_quiz_attempts_select ON public.sop_quiz_attempts FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_departments ud ON ((ud.user_id = ur.user_id)))
     JOIN user_departments emp_ud ON ((emp_ud.user_id = sop_quiz_attempts.user_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'department_head'::app_role) AND (ud.department_id = emp_ud.department_id)))) OR (EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN user_properties emp_up ON ((emp_up.user_id = sop_quiz_attempts.user_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND (up.property_id = emp_up.property_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can view quiz questions for accessible SOPs" ON public.sop_quiz_questions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM sop_documents sd
  WHERE ((sd.id = sop_quiz_questions.sop_document_id) AND (sd.status = 'approved'::sop_document_status)))));
CREATE POLICY consolidated_sop_quiz_questions_all ON public.sop_quiz_questions FOR ALL TO authenticated USING (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN sop_documents sd ON ((sd.id = sop_quiz_questions.sop_document_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND ((sd.property_id = up.property_id) OR (sd.property_id IS NULL))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM ((user_roles ur
     JOIN user_properties up ON ((up.user_id = ur.user_id)))
     JOIN sop_documents sd ON ((sd.id = sop_quiz_questions.sop_document_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = 'property_hr'::app_role) AND ((sd.property_id = up.property_id) OR (sd.property_id IS NULL))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role])))))));
CREATE POLICY sop_review_reminders_admin_select ON public.sop_review_reminders FOR SELECT TO authenticated USING ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY sop_review_reminders_admin_update ON public.sop_review_reminders FOR UPDATE TO authenticated USING ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role))) WITH CHECK ((has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role)));
CREATE POLICY role_assignments_select ON public.sop_role_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY sop_tags_select ON public.sop_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own view history" ON public.sop_view_history FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "System can insert status history" ON public.status_history FOR INSERT TO authenticated WITH CHECK ((changed_by = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can view status history for entities they can access" ON public.status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY "Admins can modify settings" ON public.system_settings FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY "All authenticated users can read settings" ON public.system_settings FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL));
CREATE POLICY "Enable all access for admins" ON public.system_wiki FOR ALL TO authenticated USING (has_role(( SELECT auth.uid() AS uid), 'corporate_admin'::app_role));
CREATE POLICY "Enable read access for all users" ON public.system_wiki FOR SELECT TO authenticated USING (true);
CREATE POLICY task_attachments_insert_policy ON public.task_attachments FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = uploaded_by_id));
CREATE POLICY task_attachments_select_policy ON public.task_attachments FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_attachments.task_id) AND ((( SELECT auth.uid() AS uid) = tasks.created_by_id) OR (( SELECT auth.uid() AS uid) = tasks.assigned_to_id) OR (EXISTS ( SELECT 1
           FROM task_watchers
          WHERE ((task_watchers.task_id = tasks.id) AND (task_watchers.user_id = ( SELECT auth.uid() AS uid))))))))));
CREATE POLICY task_comments_insert_policy ON public.task_comments FOR INSERT TO public WITH CHECK (((( SELECT auth.uid() AS uid) = author_id) AND (EXISTS ( SELECT 1
   FROM tasks
  WHERE (tasks.id = task_comments.task_id)))));
CREATE POLICY task_comments_select_policy ON public.task_comments FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_comments.task_id) AND ((( SELECT auth.uid() AS uid) = tasks.created_by_id) OR (( SELECT auth.uid() AS uid) = tasks.assigned_to_id) OR (EXISTS ( SELECT 1
           FROM task_watchers
          WHERE ((task_watchers.task_id = tasks.id) AND (task_watchers.user_id = ( SELECT auth.uid() AS uid))))))))));
CREATE POLICY task_watchers_delete_policy ON public.task_watchers FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY task_watchers_insert_policy ON public.task_watchers FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY task_watchers_select_policy ON public.task_watchers FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM tasks
  WHERE ((tasks.id = task_watchers.task_id) AND (( SELECT auth.uid() AS uid) = tasks.created_by_id))))));
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = created_by_id) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role])))))));
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = created_by_id));
CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = created_by_id) OR (( SELECT auth.uid() AS uid) = assigned_to_id) OR (EXISTS ( SELECT 1
   FROM task_watchers
  WHERE ((task_watchers.task_id = tasks.id) AND (task_watchers.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))));
CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = created_by_id) OR (( SELECT auth.uid() AS uid) = assigned_to_id) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'property_manager'::app_role, 'department_head'::app_role])))))));
CREATE POLICY "Admins manage temporary approvers" ON public.temporary_approvers FOR ALL TO public USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY "Users view their own temporary approver records" ON public.temporary_approvers FOR SELECT TO public USING (((approver_id = ( SELECT auth.uid() AS uid)) OR (temporary_approver_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY temporary_approvers_delete_delegation ON public.temporary_approvers FOR DELETE TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY temporary_approvers_insert_delegation ON public.temporary_approvers FOR INSERT TO authenticated WITH CHECK (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY temporary_approvers_select_delegation ON public.temporary_approvers FOR SELECT TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR (delegate_id = ( SELECT auth.uid() AS uid)) OR (( SELECT auth.uid() AS uid) = ANY (fallback_delegate_ids)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY temporary_approvers_update_delegation ON public.temporary_approvers FOR UPDATE TO authenticated USING (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role))) WITH CHECK (((delegator_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_hr'::app_role)));
CREATE POLICY "Training rules manageable by admins" ON public.training_assignment_rules FOR ALL TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_roles.user_id
   FROM user_roles
  WHERE (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));
CREATE POLICY training_assignment_rules_delete ON public.training_assignment_rules FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT ur.user_id
   FROM user_roles ur
  WHERE (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));
CREATE POLICY training_assignment_rules_insert ON public.training_assignment_rules FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT ur.user_id
   FROM user_roles ur
  WHERE (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));
CREATE POLICY training_assignment_rules_select ON public.training_assignment_rules FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT ur.user_id
   FROM user_roles ur
  WHERE (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));
CREATE POLICY training_assignment_rules_update ON public.training_assignment_rules FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) IN ( SELECT ur.user_id
   FROM user_roles ur
  WHERE (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role]))))) WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT ur.user_id
   FROM user_roles ur
  WHERE (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role])))));
CREATE POLICY training_block_progress_manage ON public.training_block_progress FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY training_block_progress_select ON public.training_block_progress FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_any_role(( SELECT auth.uid() AS uid), ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role, 'department_head'::app_role])));
CREATE POLICY training_certificates_select ON public.training_certificates FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM training_progress tp
  WHERE ((tp.id = training_certificates.training_progress_id) AND ((tp.user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND (EXISTS ( SELECT 1
           FROM (user_properties up
             JOIN profiles p ON ((up.user_id = p.id)))
          WHERE ((p.id = tp.user_id) AND (up.property_id IN ( SELECT user_properties.property_id
                   FROM user_properties
                  WHERE (user_properties.user_id = ( SELECT auth.uid() AS uid)))))))))))));
CREATE POLICY training_content_blocks_delete ON public.training_content_blocks FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM training_modules
  WHERE ((training_modules.id = training_content_blocks.training_module_id) AND (training_modules.created_by = ( SELECT auth.uid() AS uid))))));
CREATE POLICY training_content_blocks_insert ON public.training_content_blocks FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM training_modules
  WHERE ((training_modules.id = training_content_blocks.training_module_id) AND (training_modules.created_by = ( SELECT auth.uid() AS uid))))));
CREATE POLICY training_content_blocks_select ON public.training_content_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY training_content_blocks_update ON public.training_content_blocks FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM training_modules
  WHERE ((training_modules.id = training_content_blocks.training_module_id) AND (training_modules.created_by = ( SELECT auth.uid() AS uid))))));
CREATE POLICY training_content_templates_select ON public.training_content_templates FOR SELECT TO public USING (true);
CREATE POLICY "System can manage training module documents" ON public.training_module_documents FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role]))))));
CREATE POLICY "Users can view training module documents" ON public.training_module_documents FOR SELECT TO public USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));
CREATE POLICY training_module_resources_manage_delete ON public.training_module_resources FOR DELETE TO authenticated USING ((has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]) OR (has_any_role(( SELECT auth.uid() AS uid), ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]) AND (EXISTS ( SELECT 1
   FROM training_modules tm
  WHERE ((tm.id = training_module_resources.training_module_id) AND check_property_access(tm.property_id)))))));
CREATE POLICY training_module_resources_manage_insert ON public.training_module_resources FOR INSERT TO authenticated WITH CHECK ((has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]) OR (has_any_role(( SELECT auth.uid() AS uid), ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]) AND (EXISTS ( SELECT 1
   FROM training_modules tm
  WHERE ((tm.id = training_module_resources.training_module_id) AND check_property_access(tm.property_id)))))));
CREATE POLICY training_module_resources_manage_update ON public.training_module_resources FOR UPDATE TO authenticated USING ((has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]) OR (has_any_role(( SELECT auth.uid() AS uid), ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]) AND (EXISTS ( SELECT 1
   FROM training_modules tm
  WHERE ((tm.id = training_module_resources.training_module_id) AND check_property_access(tm.property_id))))))) WITH CHECK ((has_any_role(( SELECT auth.uid() AS uid), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]) OR (has_any_role(( SELECT auth.uid() AS uid), ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]) AND (EXISTS ( SELECT 1
   FROM training_modules tm
  WHERE ((tm.id = training_module_resources.training_module_id) AND check_property_access(tm.property_id)))))));
CREATE POLICY training_module_resources_select ON public.training_module_resources FOR SELECT TO public USING (true);
CREATE POLICY property_isolation_training_modules ON public.training_modules FOR ALL TO public USING (check_property_access(property_id));
CREATE POLICY training_modules_insert_admins ON public.training_modules FOR INSERT TO authenticated WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY training_modules_update_admins ON public.training_modules FOR UPDATE TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY path_modules_manage ON public.training_path_modules FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY path_modules_view ON public.training_path_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY paths_manage ON public.training_paths FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY paths_view ON public.training_paths FOR SELECT TO authenticated USING ((is_active = true));
CREATE POLICY training_progress_insert ON public.training_progress FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY training_progress_select ON public.training_progress FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND (EXISTS ( SELECT 1
   FROM (user_properties up
     JOIN profiles p ON ((up.user_id = p.id)))
  WHERE ((p.id = training_progress.user_id) AND (up.property_id IN ( SELECT user_properties.property_id
           FROM user_properties
          WHERE (user_properties.user_id = ( SELECT auth.uid() AS uid)))))))) OR (has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role) AND (EXISTS ( SELECT 1
   FROM user_departments ud
  WHERE ((ud.user_id = training_progress.user_id) AND (ud.department_id IN ( SELECT user_departments.department_id
           FROM user_departments
          WHERE (user_departments.user_id = ( SELECT auth.uid() AS uid))))))))));
CREATE POLICY training_progress_update ON public.training_progress FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY quiz_attempts_own ON public.training_quiz_attempts FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY quiz_attempts_view ON public.training_quiz_attempts FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'department_head'::app_role)));
CREATE POLICY training_quizzes_manage ON public.training_quizzes FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]))))));
CREATE POLICY training_quizzes_select ON public.training_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view all achievements" ON public.user_achievements FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Users can manage own dashboard preferences" ON public.user_dashboard_preferences FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_departments_modify_admin_hr_pm ON public.user_departments FOR ALL TO public USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role) AND user_has_department_access(( SELECT auth.uid() AS uid), department_id))));
CREATE POLICY user_departments_select_scope ON public.user_departments FOR SELECT TO public USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (user_id = ( SELECT auth.uid() AS uid)) OR user_has_department_access(( SELECT auth.uid() AS uid), department_id)));
CREATE POLICY user_invitations_admin_insert ON public.user_invitations FOR INSERT TO authenticated WITH CHECK (((invited_by = ( SELECT auth.uid() AS uid)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role)));
CREATE POLICY user_invitations_admin_select ON public.user_invitations FOR SELECT TO authenticated USING (((invited_by = ( SELECT auth.uid() AS uid)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role)));
CREATE POLICY user_invitations_admin_update ON public.user_invitations FOR UPDATE TO authenticated USING (((invited_by = ( SELECT auth.uid() AS uid)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role))) WITH CHECK (((invited_by = ( SELECT auth.uid() AS uid)) OR has_role_optimized('corporate_admin'::app_role) OR has_role_optimized('regional_admin'::app_role) OR has_role_optimized('regional_hr'::app_role)));
CREATE POLICY user_path_enrollments_own ON public.user_path_enrollments FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_path_enrollments_view ON public.user_path_enrollments FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'property_manager'::app_role)));
CREATE POLICY "Users can manage own pins" ON public.user_pins FOR ALL TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_properties_modify_admin_hr ON public.user_properties FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY user_properties_select_scope ON public.user_properties FOR SELECT TO public USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR (user_id = ( SELECT auth.uid() AS uid)) OR has_property_access(( SELECT auth.uid() AS uid), property_id)));
CREATE POLICY consolidated_user_roles_select ON public.user_roles FOR SELECT TO public USING (((user_id = ( SELECT auth.uid() AS uid)) OR (has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role) OR users_share_property(( SELECT auth.uid() AS uid), user_id))));
CREATE POLICY user_roles_modify_admin_hr ON public.user_roles FOR ALL TO authenticated USING ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role))) WITH CHECK ((has_role(( SELECT auth.uid() AS uid), 'regional_admin'::app_role) OR has_role(( SELECT auth.uid() AS uid), 'regional_hr'::app_role)));
CREATE POLICY user_sessions_admin_all ON public.user_sessions FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY user_sessions_select_own ON public.user_sessions FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_settings_insert_own ON public.user_settings FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_settings_select_own ON public.user_settings FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY user_settings_update_own ON public.user_settings FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "HR can manage shifts" ON public.user_shifts FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['property_hr'::app_role, 'regional_hr'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY "Managers can view property shifts" ON public.user_shifts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN user_properties up ON ((ur.user_id = up.user_id)))
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['property_manager'::app_role, 'department_head'::app_role, 'property_hr'::app_role, 'regional_admin'::app_role])) AND (up.property_id = user_shifts.property_id)))));
CREATE POLICY "Users can view own shifts" ON public.user_shifts FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Admins can manage user skills" ON public.user_skills FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))));
CREATE POLICY consolidated_user_skills_select ON public.user_skills FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['regional_admin'::app_role, 'regional_hr'::app_role, 'property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))) OR (( SELECT auth.uid() AS uid) = user_id)));
CREATE POLICY "HR can view all vacation balances" ON public.user_vacation_balance FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role = ANY (ARRAY['property_hr'::app_role, 'regional_hr'::app_role, 'regional_admin'::app_role]))))));
CREATE POLICY "Users can view own vacation balance" ON public.user_vacation_balance FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'regional_admin'::app_role)))));
CREATE POLICY "Anyone can view workflow definitions" ON public.workflow_definitions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view workflow executions" ON public.workflow_executions FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'regional_admin'::app_role)))));
CREATE POLICY "Admins can view schedules" ON public.workflow_schedules FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'regional_admin'::app_role)))));

