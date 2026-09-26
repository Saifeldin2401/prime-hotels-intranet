/**
 * Navigation Configuration - Single Source of Truth
 *
 * The product has exactly five workspaces (docs/product/PRODUCT_DEFINITION.md).
 * Each navigation group IS a workspace and each route below is the one
 * canonical URL for its job. Retired URLs live only in
 * src/routes/legacyRedirects.tsx and never appear here.
 *
 *   LEARN         My day - My learning - Courses - Paths - Knowledge - Certificates
 *   STUDIO        Courses - Quizzes - Review
 *   MANAGE        Compliance - Assignments - Team progress - Certificates - Evidence
 *   ORGANIZATION  Overview - People - Hotels & departments - Settings - Audit
 *   PLATFORM      Operator console (platform-operator identity, not tenant roles)
 *
 * Search, notifications, profile and personal settings are account utilities
 * reachable from every workspace; they are not navigation destinations.
 *
 * Tenant visibility is decided by the database capability matrix
 * (role_capabilities / get_my_capabilities) - the same matrix the database
 * enforces on every write - never by hand-kept app-role lists.
 */

import type { Capability } from '@/hooks/useCapabilities'
import type { WorkspaceId } from '@/stores/workspaceStore'
import {
    Activity,
    AlertTriangle,
    Award,
    BarChart3,
    Bell,
    BookOpen,
    Bot,
    Building,
    Building2,
    ClipboardCheck,
    ClipboardList,
    Compass,
    Crown,
    FileBarChart,
    FileText,
    GraduationCap,
    Home,
    ListChecks,
    Plus,
    Mail,
    Map,
    Search,
    Settings,
    Shield,
    ShieldCheck,
    Upload,
    User,
    Users,
    type LucideIcon
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NavigationGroup =
    | 'learn'
    | 'studio'
    | 'manage'
    | 'organization'
    | 'platform_operations'
    /** Account utilities: never listed in a workspace, reachable everywhere. */
    | 'account'

export interface RouteConfig {
    /** Canonical route path */
    path: string
    /** i18n key (nav namespace) for the display name */
    title: string
    /** Lucide icon component */
    icon: LucideIcon
    /** Optional description for tooltips/help and the command palette */
    description?: string
    /**
     * Tenant capabilities, any of which opens this route. Omitted = every
     * signed-in member. Ignored for platform routes (operator identity).
     */
    requires?: Capability[]
    /** Platform-operator permission (platform_operator_can) for platform routes */
    platformPermission?: string
    /** Key for dynamic badge count from useSidebarCounts */
    badgeKey?: string
    /** Workspace this route belongs to */
    group: NavigationGroup
    /** Display order within group (lower = higher) */
    order: number
    /** Reachable and searchable, but not listed in the sidebar */
    hideFromNav?: boolean
    /** Search keywords for Command Palette */
    keywords?: string[]
}

export interface NavigationGroupConfig {
    id: NavigationGroup
    workspace: WorkspaceId | null
    title: string  // i18n key
    icon: LucideIcon
    order: number
}

// ============================================================================
// WORKSPACES
// ============================================================================

export const NAVIGATION_GROUPS: NavigationGroupConfig[] = [
    { id: 'learn', workspace: 'LEARN', title: 'groups.learn', icon: GraduationCap, order: 1 },
    { id: 'studio', workspace: 'STUDIO', title: 'groups.studio', icon: BookOpen, order: 2 },
    { id: 'manage', workspace: 'MANAGE', title: 'groups.manage', icon: ShieldCheck, order: 3 },
    { id: 'organization', workspace: 'ORGANIZATION', title: 'groups.organization', icon: Building2, order: 4 },
    { id: 'platform_operations', workspace: 'PLATFORM', title: 'groups.platform_operations', icon: Crown, order: 5 },
    { id: 'account', workspace: null, title: 'groups.account', icon: User, order: 6 },
]

export const WORKSPACE_GROUP: Record<WorkspaceId, NavigationGroup> = {
    LEARN: 'learn',
    STUDIO: 'studio',
    MANAGE: 'manage',
    ORGANIZATION: 'organization',
    PLATFORM: 'platform_operations',
}

const AUTHOR: Capability[] = ['content.author', 'content.publish']
const OVERSIGHT: Capability[] = ['reports.view', 'assignment.manage']
const PEOPLE: Capability[] = ['people.manage', 'org.admin']

// ============================================================================
// ROUTE OWNERSHIP - one canonical URL per job
// ============================================================================

export const ROUTES: RouteConfig[] = [
    // -------------------------------------------------------------------------
    // LEARN - "What must I do now?"
    // -------------------------------------------------------------------------
    { path: '/learn', title: 'workspace.my_day', icon: Home, group: 'learn', order: 1,
      description: 'What is required of you now, what to resume, and what is due soon',
      keywords: ['home', 'my day', 'today', 'dashboard'] },
    { path: '/learn/my', title: 'workspace.my_learning', icon: GraduationCap, group: 'learn', order: 2,
      badgeKey: 'pendingTraining',
      description: 'Your assigned and in-progress courses',
      keywords: ['assignments', 'my courses', 'training', 'resume'] },
    { path: '/learn/courses', title: 'workspace.explore', icon: Compass, group: 'learn', order: 3,
      description: 'Browse published courses',
      keywords: ['courses', 'catalog', 'explore'] },
    { path: '/learn/paths', title: 'workspace.learning_paths', icon: Map, group: 'learn', order: 4,
      description: 'Learning paths for your role',
      keywords: ['paths', 'onboarding', 'roadmap'] },
    { path: '/knowledge', title: 'knowledge_base', icon: BookOpen, group: 'learn', order: 5,
      requires: ['knowledge.read'], badgeKey: 'requiredReading',
      description: 'Trusted articles: SOPs, standards and policies',
      keywords: ['sop', 'policy', 'article', 'standard', 'knowledge'] },
    { path: '/learn/certificates', title: 'my_certificates', icon: Award, group: 'learn', order: 6,
      description: 'Certificates you have earned and their verification codes',
      keywords: ['certificates', 'accreditation'] },

    // -------------------------------------------------------------------------
    // STUDIO - "What needs authoring or review?"
    // -------------------------------------------------------------------------
    { path: '/studio', title: 'workspace.my_content', icon: BookOpen, group: 'studio', order: 1,
      requires: AUTHOR,
      description: 'Your drafts and the course library; create or continue a course',
      keywords: ['courses', 'drafts', 'builder', 'author', 'create course'] },
    { path: '/studio/courses', title: 'workspace.courses', icon: GraduationCap, group: 'studio', order: 2,
      requires: AUTHOR,
      description: 'The course library and course builder',
      keywords: ['courses', 'library', 'builder', 'modules'] },
    { path: '/studio/create', title: 'workspace.create', icon: Plus, group: 'studio', order: 2,
      requires: AUTHOR,
      description: 'Start a course, article or quiz - from scratch, a template, source documents or AI',
      keywords: ['create', 'new course', 'new article', 'new quiz', 'ai', 'template'] },
    { path: '/studio/quizzes', title: 'quizzes', icon: ListChecks, group: 'studio', order: 4,
      requires: AUTHOR,
      description: 'Quizzes and the question bank',
      keywords: ['quiz', 'questions', 'assessment', 'question bank'] },
    { path: '/studio/articles', title: 'workspace.articles', icon: FileText, group: 'studio', order: 2,
      requires: AUTHOR,
      description: 'Every SOP, guide and policy: drafts, published versions and master copies',
      keywords: ['articles', 'sop', 'policy', 'guide', 'knowledge'] },
    { path: '/studio/articles/new', title: 'workspace.new_article', icon: ClipboardList, group: 'studio', order: 3,
      requires: AUTHOR, hideFromNav: true,
      description: 'Write a knowledge article',
      keywords: ['article', 'sop', 'write'] },
    { path: '/studio/review', title: 'workspace.review_queue', icon: ClipboardCheck, group: 'studio', order: 3,
      requires: ['content.publish'],
      description: 'Content waiting for approval',
      keywords: ['review', 'approve', 'publish'] },
    { path: '/studio/media', title: 'workspace.media_library', icon: Upload, group: 'studio', order: 5,
      requires: AUTHOR,
      description: 'Images and video used in courses and articles' },

    // -------------------------------------------------------------------------
    // MANAGE - "Where are we failing compliance?"
    // -------------------------------------------------------------------------
    { path: '/manage/risk', title: 'workspace.risk_queue', icon: AlertTriangle, group: 'manage', order: 1,
      requires: OVERSIGHT,
      description: 'Overdue training, failed quizzes and expiring certificates, by hotel and department',
      keywords: ['risk', 'overdue', 'attention', 'compliance', 'expiring'] },
    { path: '/manage/compliance', title: 'workspace.compliance', icon: ShieldCheck, hideFromNav: true, group: 'manage', order: 6,
      requires: OVERSIGHT,
      description: 'Completion and overdue risk across hotels and departments',
      keywords: ['compliance', 'overdue', 'risk', 'analytics'] },
    { path: '/manage/assignments', title: 'workspace.assignments', icon: ClipboardList, group: 'manage', order: 2,
      requires: ['assignment.manage'],
      description: 'Assign courses and quizzes, with due dates',
      keywords: ['assign', 'assignment', 'due date'] },
    { path: '/manage/tracking', title: 'workspace.course_tracking', icon: Activity, group: 'manage', order: 3,
      requires: OVERSIGHT,
      description: 'Completion by course, stalled learners and follow-up actions',
      keywords: ['track', 'tracking', 'progress', 'course insights'] },
    { path: '/manage/assignments/quizzes', title: 'workspace.quiz_assignments', icon: ListChecks, hideFromNav: true, group: 'manage', order: 8,
      requires: ['assignment.manage'],
      description: 'Assign quizzes to people, departments or roles',
      keywords: ['quiz', 'assign quiz'] },
    { path: '/manage/team', title: 'workspace.team', icon: Users, group: 'manage', order: 4,
      requires: OVERSIGHT,
      description: 'Department ranking, overdue bottlenecks and skill risk',
      keywords: ['team', 'department', 'progress', 'executive'] },
    { path: '/manage/certificates', title: 'all_certificates', icon: Award, group: 'manage', order: 5,
      requires: ['certificate.issue'],
      description: 'Issued certificates and manual issuance',
      keywords: ['certificates', 'issue'] },
    { path: '/manage/reports', title: 'workspace.evidence', icon: FileBarChart, group: 'manage', order: 6,
      requires: ['reports.view'],
      description: 'Reports and evidence exports for audits',
      keywords: ['reports', 'export', 'evidence', 'audit'] },
    { path: '/manage/assignments/rules', title: 'workspace.assignment_rules', icon: Shield, group: 'manage', order: 6,
      requires: ['assignment.manage'], hideFromNav: true,
      description: 'Automatic assignment rules by role, hotel and department' },
    { path: '/manage/skills', title: 'skills_matrix', icon: Activity, hideFromNav: true, group: 'manage', order: 7,
      requires: OVERSIGHT,
      description: 'Department skill coverage and gaps',
      keywords: ['skills', 'matrix', 'gaps'] },

    // -------------------------------------------------------------------------
    // ORGANIZATION - "What organization action is blocked?"
    // -------------------------------------------------------------------------
    { path: '/admin/organization', title: 'workspace.org_overview', icon: Building2, group: 'organization', order: 1,
      requires: PEOPLE,
      description: 'Setup gaps, structure and reporting lines',
      keywords: ['organization', 'hierarchy', 'departments', 'org chart'] },
    { path: '/admin/users', title: 'workspace.people', icon: Users, group: 'organization', order: 2,
      requires: PEOPLE,
      description: 'Members, roles and hotel/department placement',
      keywords: ['users', 'people', 'roles', 'members', 'invite'] },
    { path: '/admin/structure', title: 'workspace.hotels_departments', icon: Building, group: 'organization', order: 3,
      requires: ['org.admin', 'people.manage'],
      description: 'Departments, roles and reporting lines',
      keywords: ['departments', 'structure', 'org chart', 'roles'] },
    { path: '/admin/settings', title: 'system_settings', icon: Settings, group: 'organization', order: 4,
      requires: ['org.settings'],
      description: 'Organization settings, branding and policies',
      keywords: ['settings', 'branding', 'policies'] },
    { path: '/admin/audit', title: 'audit_logs', icon: ClipboardList, group: 'organization', order: 5,
      requires: ['audit.view'],
      description: 'Audit trail of changes in this organization',
      keywords: ['audit', 'logs', 'security'] },
    { path: '/admin/export', title: 'tenant_data_export', icon: Upload, hideFromNav: true, group: 'organization', order: 6,
      requires: ['org.settings'],
      description: 'Full organization data archive',
      keywords: ['export', 'archive', 'gdpr', 'backup'] },
    { path: '/admin/invitations', title: 'workspace.invitations', icon: Mail, group: 'organization', order: 7,
      requires: PEOPLE, hideFromNav: true },
    { path: '/admin/users/bulk', title: 'user_management', icon: Users, group: 'organization', order: 8,
      requires: ['people.manage'], hideFromNav: true },
    { path: '/admin/pii-access', title: 'pii_access_logs', icon: Shield, group: 'organization', order: 9,
      requires: ['audit.view'], hideFromNav: true },
    { path: '/admin/notifications', title: 'notification_batches', icon: Bell, group: 'organization', order: 10,
      requires: ['org.admin'], hideFromNav: true },

    // -------------------------------------------------------------------------
    // PLATFORM - "Which organization or operation needs attention?"
    // -------------------------------------------------------------------------
    { path: '/platform', title: 'workspace.exceptions', icon: Crown, group: 'platform_operations', order: 1,
      description: 'Fleet health, tenant exceptions and background jobs',
      keywords: ['platform', 'control center', 'operations'] },
    { path: '/platform/organizations', title: 'organizations_hub', icon: Building2, group: 'platform_operations', order: 2,
      platformPermission: 'tenant.read',
      description: 'Customer organizations, subscriptions and authorized access',
      keywords: ['tenants', 'organizations', 'enter tenant'] },
    { path: '/platform/master-library', title: 'global_master_library', icon: BookOpen, group: 'platform_operations', order: 3,
      platformPermission: 'master_content.manage',
      description: 'Master courses and articles deployable to organizations',
      keywords: ['master', 'library', 'deploy', 'templates'] },
    { path: '/platform/operations', title: 'platform_operations_hub', icon: Activity, group: 'platform_operations', order: 4,
      platformPermission: 'ops.manage',
      description: 'Task queue, AI generation pipeline and document ingestion',
      keywords: ['queue', 'jobs', 'retry'] },
    { path: '/platform/users', title: 'workspace.operators', icon: Users, group: 'platform_operations', order: 5,
      platformPermission: 'operator.manage',
      description: 'Platform operators and cross-tenant user directory',
      keywords: ['operators', 'users', 'directory'] },
    { path: '/platform/control-center', title: 'workspace.platform_statistics', icon: BarChart3, hideFromNav: true, group: 'platform_operations', order: 14,
      description: 'Fleet totals, global search and recent operator activity',
      keywords: ['statistics', 'control center', 'global search'] },
    { path: '/platform/analytics', title: 'platform_analytics', icon: BarChart3, hideFromNav: true, group: 'platform_operations', order: 6,
      platformPermission: 'tenant.read',
      description: 'Cross-tenant usage metrics',
      keywords: ['analytics', 'usage', 'metrics'] },
    { path: '/platform/audit', title: 'cross_tenant_audit', icon: Shield, hideFromNav: true, group: 'platform_operations', order: 7,
      platformPermission: 'tenant.read',
      description: 'Audit trail of operator actions and tenant sessions',
      keywords: ['audit', 'impersonation'] },
    { path: '/platform/settings', title: 'platform_settings', icon: Settings, group: 'platform_operations', order: 6,
      platformPermission: 'config.manage',
      description: 'Feature flags and runtime configuration',
      keywords: ['feature flags', 'config'] },
    { path: '/platform/ai-settings', title: 'ai_course_generator', icon: Bot, hideFromNav: true, group: 'platform_operations', order: 9,
      platformPermission: 'config.manage',
      description: 'AI providers, routing and spend caps',
      keywords: ['ai', 'models', 'providers', 'spend cap'] },
    { path: '/platform/email-templates', title: 'email_templates', icon: Mail, hideFromNav: true, group: 'platform_operations', order: 10,
      platformPermission: 'config.manage',
      description: 'Transactional email templates',
      keywords: ['email', 'templates'] },
    { path: '/platform/email-analytics', title: 'email_analytics', icon: BarChart3, group: 'platform_operations', order: 11,
      platformPermission: 'ops.manage', hideFromNav: true },
    { path: '/platform/email-inbound', title: 'email_inbound', icon: Mail, group: 'platform_operations', order: 12,
      platformPermission: 'ops.manage', hideFromNav: true },
    { path: '/platform/retention-policies', title: 'retention_policies', icon: Shield, group: 'platform_operations', order: 13,
      platformPermission: 'config.manage', hideFromNav: true },

    // -------------------------------------------------------------------------
    // ACCOUNT UTILITIES - reachable from every workspace, never a destination
    // -------------------------------------------------------------------------
    { path: '/search', title: 'search', icon: Search, group: 'account', order: 1, hideFromNav: true },
    { path: '/notifications', title: 'alerts', icon: Bell, group: 'account', order: 2, hideFromNav: true },
    { path: '/profile', title: 'my_profile', icon: User, group: 'account', order: 3, hideFromNav: true,
      keywords: ['profile', 'account', 'me'] },
    { path: '/settings', title: 'settings', icon: Settings, group: 'account', order: 4, hideFromNav: true,
      keywords: ['preferences', 'dark mode', 'theme', 'language'] },
]

// ============================================================================
// ACCESS
// ============================================================================

export interface NavAccess {
    /** Tenant capabilities of the member in the current organization */
    capabilities: readonly Capability[]
    /** Server-resolved platform-operator identity */
    isPlatformOperator: boolean
    /** Platform-operator permission check (platform_operator_can) */
    can?: (permission: string) => boolean
}

/**
 * Whether a member may open a route. Platform routes follow the platform
 * operator identity and its permissions, never a tenant role; tenant routes
 * follow the capability matrix.
 */
export function canAccessRoute(route: RouteConfig, access: NavAccess): boolean {
    if (route.group === 'platform_operations') {
        if (!access.isPlatformOperator) return false
        return !route.platformPermission || (access.can?.(route.platformPermission) ?? false)
    }
    if (!route.requires || route.requires.length === 0) return true
    return route.requires.some((c) => access.capabilities.includes(c))
}

/** Sidebar entries of one workspace the member can open, in display order. */
export function getWorkspaceRoutes(workspace: WorkspaceId, access: NavAccess): RouteConfig[] {
    const group = WORKSPACE_GROUP[workspace]
    return ROUTES
        .filter((r) => r.group === group && !r.hideFromNav && canAccessRoute(r, access))
        .sort((a, b) => a.order - b.order)
}

/**
 * The workspace that owns a URL, or null for account utilities (profile,
 * settings, search, notifications), which keep whatever workspace is active.
 */
export function getWorkspaceForPath(pathname: string): WorkspaceId | null {
    const path = pathname.toLowerCase()
    const under = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

    if (under('/platform')) return 'PLATFORM'
    if (under('/admin')) return 'ORGANIZATION'
    if (under('/studio')) return 'STUDIO'
    if (under('/manage')) return 'MANAGE'
    if (under('/learn') || under('/knowledge') || under('/documents')) return 'LEARN'
    return null
}

/** Route config for a canonical path (exact match). */
export function getRouteByPath(path: string): RouteConfig | undefined {
    return ROUTES.find((route) => route.path === path)
}

/** The deepest canonical route that owns a (possibly parameterised) path. */
export function getOwningRoute(pathname: string): RouteConfig | undefined {
    return ROUTES
        .filter((r) => pathname === r.path || pathname.startsWith(`${r.path}/`))
        .sort((a, b) => b.path.length - a.path.length)[0]
}

export function getGroupConfig(groupId: NavigationGroup): NavigationGroupConfig | undefined {
    return NAVIGATION_GROUPS.find((g) => g.id === groupId)
}
