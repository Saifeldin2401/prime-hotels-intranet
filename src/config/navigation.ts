/**
 * Navigation Configuration - Single Source of Truth
 * 
 * Defines all navigation routes, access control, and 7-domain SaaS grouping:
 * 1. Home & Cockpit (home_workspace)
 * 2. Organization & Governance (organization_hub)
 * 3. Learning & Academy (learning_academy)
 * 4. Knowledge & SOPs (knowledge_governance)
 * 5. Analytics & Reports (analytics_reports)
 * 6. Administration & Settings (tenant_admin)
 * 7. Platform Control Center (platform_operations - Operator only)
 */

import { canRoleAccess, type AllowedRoles } from '@/features/access/policy'
import type { AppRole } from '@/lib/constants'
import {
    Activity,
    AlertTriangle,
    ArrowRightLeft,
    Award,
    BarChart3,
    BedDouble,
    Bell,
    BellRing,
    BookOpen,
    BookText,
    Bot,
    Boxes,
    Briefcase,
    Building,
    Building2,
    Calendar,
    CheckSquare,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Crown,
    FileQuestion,
    FileText,
    GraduationCap,
    History,
    Home,
    Image,
    Layers,
    ListTodo,
    Mail,
    Megaphone,
    MessageSquare,
    Package,
    PackageSearch,
    Search,
    Settings,
    Shield,
    Target,
    Truck,
    Upload,
    User,
    UserPlus,
    Users,
    UsersRound,
    Wallet,
    Workflow,
    Wrench,
    type LucideIcon
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NavigationGroup =
    | 'home_workspace'
    | 'organization_hub'
    | 'learning_academy'
    | 'knowledge_governance'
    | 'analytics_reports'
    | 'tenant_admin'
    | 'platform_operations'
    // Legacy fallbacks for backwards compatibility
    | 'personal_space'
    | 'knowledge_sop'
    | 'administration'

export type Permission = 'read' | 'write' | 'approve' | 'delete' | 'manage'

export interface RouteConfig {
    /** Unique route path */
    path: string
    /** i18n translation key for display name */
    title: string
    /** Lucide icon component */
    icon: LucideIcon
    /** Optional description for tooltips/help */
    description?: string
    /** Which roles can access this route */
    allowedRoles: AllowedRoles
    /** Permission matrix per role (optional, for fine-grained control) */
    permissions?: Partial<Record<AppRole, Permission[]>>
    /** Key for dynamic badge count from useSidebarCounts */
    badgeKey?: string
    /** Navigation group for sidebar organization */
    group: NavigationGroup
    /** Display order within group (lower = higher) */
    order: number
    /** Hide from sidebar navigation (for detail pages) */
    hideFromNav?: boolean
    /** Child routes (for expandable menus) */
    children?: Omit<RouteConfig, 'group' | 'children'>[]
    /** Search keywords for Command Palette */
    keywords?: string[]
    /**
     * Role-specific path overrides
     * Same nav label routes to different destinations per role
     */
    rolePathOverrides?: Partial<Record<AppRole, string>>
}

export interface NavigationGroupConfig {
    id: NavigationGroup
    title: string  // i18n key
    icon: LucideIcon
    order: number
    /** Roles that can see this group at all */
    visibleTo: AllowedRoles
    /** Whether group is collapsible in sidebar */
    collapsible: boolean
}

// ============================================================================
// NAVIGATION GROUPS (7 SaaS Domains)
// ============================================================================

export const NAVIGATION_GROUPS: NavigationGroupConfig[] = [
    {
        id: 'home_workspace',
        title: 'groups.home_workspace',
        icon: Home,
        order: 1,
        visibleTo: 'all',
        collapsible: false
    },
    {
        id: 'organization_hub',
        title: 'groups.organization_hub',
        icon: Building2,
        order: 2,
        visibleTo: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        collapsible: true
    },
    {
        id: 'learning_academy',
        title: 'groups.learning_academy',
        icon: GraduationCap,
        order: 3,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'knowledge_governance',
        title: 'groups.knowledge_governance',
        icon: BookOpen,
        order: 4,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'analytics_reports',
        title: 'groups.analytics_reports',
        icon: BarChart3,
        order: 5,
        visibleTo: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        collapsible: true
    },
    {
        id: 'tenant_admin',
        title: 'groups.tenant_admin',
        icon: Shield,
        order: 6,
        visibleTo: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        collapsible: true
    },
    {
        id: 'platform_operations',
        title: 'groups.platform_operations',
        icon: Crown,
        order: 7,
        visibleTo: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        collapsible: true
    }
]

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export const ROUTES: RouteConfig[] = [
    // -------------------------------------------------------------------------
    // 1. HOME & COCKPIT (home_workspace)
    // -------------------------------------------------------------------------
    {
        path: '/dashboard',
        title: 'dashboard',
        icon: Home,
        description: 'Personalized dashboard and daily summary',
        allowedRoles: 'all',
        keywords: ['home', 'overview', 'dashboard', 'analytics', 'welcome'],
        group: 'home_workspace',
        order: 1,
    },
    {
        path: '/home/learner',
        title: 'learner_cockpit',
        icon: Target,
        description: 'Learner cockpit with streaks, progress, courses and assessments',
        allowedRoles: 'all',
        keywords: ['learner', 'cockpit', 'study', 'streak', 'quizzes', 'my learning'],
        group: 'home_workspace',
        order: 2,
    },
    {
        path: '/learning/my',
        title: 'my_training',
        icon: GraduationCap,
        description: 'Assigned training modules and interactive courses',
        allowedRoles: 'all',
        badgeKey: 'pendingTraining',
        keywords: ['training', 'learning', 'courses', 'modules', 'masterclass'],
        group: 'home_workspace',
        order: 3,
    },
    {
        path: '/profile',
        title: 'my_profile',
        icon: User,
        description: 'Your user profile, settings, and credentials',
        allowedRoles: 'all',
        keywords: ['profile', 'account', 'me', 'credentials'],
        group: 'home_workspace',
        order: 4,
    },

    // -------------------------------------------------------------------------
    // 2. ORGANIZATION & GOVERNANCE (organization_hub)
    // -------------------------------------------------------------------------
    {
        path: '/admin/organization',
        title: 'org_structure',
        icon: Building2,
        description: 'Organizational hierarchy, reporting lines, departments and org chart',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['organization', 'org chart', 'reporting lines', 'hierarchy', 'departments'],
        group: 'organization_hub',
        order: 1,
    },
    {
        path: '/admin/properties',
        title: 'property_management',
        icon: Building,
        description: 'Manage hotel properties, locations, and facilities within the organization',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['properties', 'hotels', 'locations', 'branches', 'resorts'],
        group: 'organization_hub',
        order: 2,
    },
    {
        path: '/admin/users',
        title: 'user_management',
        icon: Users,
        description: 'Manage organization user accounts, roles, and property assignments',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr'],
        keywords: ['users', 'roles', 'permissions', 'accounts', 'people', 'team'],
        group: 'organization_hub',
        order: 3,
    },
    {
        path: '/dashboard/executive',
        title: 'executive_dashboard',
        icon: Target,
        description: 'General Manager scorecard: department compliance ranking, overdue bottlenecks, and skill risk',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['executive', 'gm', 'general manager', 'scorecard', 'compliance ranking'],
        group: 'organization_hub',
        order: 4,
    },
    {
        path: '/admin/users/bulk',
        title: 'user_management',
        icon: Users,
        description: 'Bulk user provisioning and CSV imports',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'organization_hub',
        order: 5,
        hideFromNav: true,
    },

    // -------------------------------------------------------------------------
    // 3. LEARNING & ACADEMY (learning_academy)
    // -------------------------------------------------------------------------
    {
        path: '/training/hub',
        title: 'lms_admin',
        icon: GraduationCap,
        description: 'ALTUS Academy training control center, course catalog, and curricula',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'knowledge_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['academy', 'lms', 'curriculum', 'training creator', 'courses'],
        group: 'learning_academy',
        order: 1,
    },
    {
        path: '/training/paths',
        title: 'training_paths',
        icon: BookOpen,
        description: 'Role-based learning journeys and onboarding roadmaps',
        allowedRoles: 'all',
        keywords: ['paths', 'roadmaps', 'curricula', 'learning paths'],
        group: 'learning_academy',
        order: 2,
    },
    {
        path: '/training/skills',
        title: 'skills_matrix',
        icon: Shield,
        description: 'Department skill matrix, proficiency coverage, and gaps',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['skills', 'competencies', 'matrix', 'proficiencies'],
        group: 'learning_academy',
        order: 3,
    },
    {
        path: '/training/competencies',
        title: 'competency_matrix',
        icon: Target,
        description: 'Hospitality competency framework, required vs actual proficiency, and skill gap analysis',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['competency', 'competencies', 'skills gap', 'proficiency', 'matrix', 'framework'],
        group: 'learning_academy',
        order: 4,
    },
    {
        path: '/training/instructor',
        title: 'instructor_workspace',
        icon: ClipboardCheck,
        description: 'Instructor-led session rosters, attendance check-in, and supervisor practical checklists',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['instructor', 'ILT', 'classroom', 'attendance', 'roster', 'practical', 'observation'],
        group: 'learning_academy',
        order: 5,
    },
    {
        path: '/training/certificates',
        title: 'my_certificates',
        icon: Award,
        description: 'Earned certificates, accreditations, and verification codes',
        allowedRoles: 'all',
        keywords: ['certificates', 'accreditation', 'awards', 'diploma'],
        group: 'learning_academy',
        order: 6,
    },
    {
        path: '/assessments',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage knowledge question bank and assessments',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'knowledge_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'learning_academy',
        order: 7,
        hideFromNav: true,
    },

    // -------------------------------------------------------------------------
    // 4. KNOWLEDGE & SOPS (knowledge_governance)
    // -------------------------------------------------------------------------
    {
        path: '/knowledge',
        title: 'knowledge_base',
        icon: BookOpen,
        description: 'Centralized knowledge hub - SOPs, standards, brand policies',
        allowedRoles: 'all',
        keywords: ['sop', 'policy', 'guide', 'manual', 'knowledge', 'standard'],
        badgeKey: 'requiredReading',
        group: 'knowledge_governance',
        order: 1,
    },
    {
        path: '/documents',
        title: 'documents',
        icon: FileText,
        description: 'Official organization document library, manuals, and files',
        allowedRoles: 'all',
        keywords: ['documents', 'files', 'pdf', 'manuals', 'policies'],
        group: 'knowledge_governance',
        order: 2,
    },
    {
        path: '/manage/review',
        title: 'knowledge_review',
        icon: ClipboardList,
        description: 'SOP and course content review, approval workflows, and quality governance',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'knowledge_manager', 'author', 'corporate_admin', 'regional_admin', 'regional_hr'],
        keywords: ['review', 'approval', 'publish', 'governance', 'quality'],
        group: 'knowledge_governance',
        order: 3,
    },
    {
        path: '/media',
        title: 'media_library',
        icon: Image,
        description: 'Hotel photos, video training assets, and brand media',
        allowedRoles: 'all',
        keywords: ['media', 'photos', 'videos', 'images', 'assets', 'gallery'],
        group: 'knowledge_governance',
        order: 4,
    },

    // -------------------------------------------------------------------------
    // 5. ANALYTICS & REPORTS (analytics_reports)
    // -------------------------------------------------------------------------
    {
        path: '/reports',
        title: 'reports',
        icon: BarChart3,
        description: 'Executive analytics, occupancy trends, and business intelligence',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['reports', 'analytics', 'bi', 'occupancy', 'revpar'],
        group: 'analytics_reports',
        order: 1,
    },
    {
        path: '/admin/analytics',
        title: 'training_dashboard',
        icon: Activity,
        description: 'Organization-wide training completion, progress metrics, and compliance rates',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['analytics', 'training stats', 'completion rate', 'metrics'],
        group: 'analytics_reports',
        order: 2,
    },

    // -------------------------------------------------------------------------
    // 6. ADMINISTRATION & SETTINGS (tenant_admin)
    // -------------------------------------------------------------------------
    {
        path: '/admin/audit',
        title: 'audit_logs',
        icon: ClipboardList,
        description: 'System audit logs, event tracking, and compliance trails',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['audit logs', 'security events', 'traceability'],
        group: 'tenant_admin',
        order: 1,
    },
    {
        path: '/admin/ai-course-generator',
        title: 'ai_course_generator',
        icon: Bot,
        description: 'AI Course Generator routing mode, providers, models, spend caps and QA thresholds',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin'],
        keywords: ['ai', 'course generator', 'model routing', 'ai settings', 'providers', 'spend cap'],
        group: 'tenant_admin',
        order: 2,
    },
    {
        path: '/admin/export',
        title: 'tenant_data_export',
        icon: Upload,
        description: 'Full organization data archive (users, transcripts, SOPs, certificates) for compliance and offboarding',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin'],
        keywords: ['export', 'data archive', 'offboarding', 'portability', 'gdpr', 'backup'],
        group: 'tenant_admin',
        order: 3,
    },
    {
        path: '/admin/settings',
        title: 'system_settings',
        icon: Settings,
        description: 'Configure organization workspace settings, branding, and global policies',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['settings', 'config', 'branding', 'preferences'],
        group: 'tenant_admin',
        order: 4,
    },
    {
        path: '/settings',
        title: 'settings',
        icon: Settings,
        description: 'Personal application preferences, theme, language, and security',
        allowedRoles: 'all',
        keywords: ['settings', 'preferences', 'dark mode', 'theme'],
        group: 'tenant_admin',
        order: 5,
    },
    {
        path: '/admin/pii-access',
        title: 'pii_access_logs',
        icon: Shield,
        description: 'PII access tracking and compliance data governance',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'tenant_admin',
        order: 6,
        hideFromNav: true,
    },
    {
        path: '/admin/notifications',
        title: 'notification_batches',
        icon: Bell,
        description: 'Bulk notification jobs and broadcast queue',
        allowedRoles: ['administrator', 'super_admin', 'training_manager', 'corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'tenant_admin',
        order: 7,
        hideFromNav: true,
    },

    // -------------------------------------------------------------------------
    // 7. PLATFORM OPERATOR & SUPER ADMIN (platform_operations)
    // -------------------------------------------------------------------------
    {
        path: '/platform',
        title: 'platform_control_center',
        icon: Crown,
        description: 'Executive SaaS control plane, cross-tenant telemetry, and background jobs',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['platform', 'control center', 'super admin', 'telemetry', 'operations'],
        group: 'platform_operations',
        order: 1,
    },
    {
        path: '/platform/organizations',
        title: 'organizations_hub',
        icon: Building2,
        description: 'Manage customer organizations, subscriptions, and authorized cross-tenant access',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['platform', 'tenants', 'organizations', 'enter tenant', 'impersonation'],
        group: 'platform_operations',
        order: 2,
    },
    {
        path: '/platform/users',
        title: 'platform_user_directory',
        icon: Users,
        description: 'Global multi-tenant user directory, platform operator roles, and status control',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['platform', 'users', 'directory', 'operator roles', 'super admin'],
        group: 'platform_operations',
        order: 3,
    },
    {
        path: '/platform/master-library',
        title: 'global_master_library',
        icon: BookOpen,
        description: 'Platform master SOPs and hospitality courses deployable to customer tenants',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['master', 'library', 'deploy', 'templates', 'master sops', 'master courses'],
        group: 'platform_operations',
        order: 4,
    },
    {
        path: '/platform/operations',
        title: 'platform_operations_hub',
        icon: Activity,
        description: 'Real-time task queue, AI generation pipeline, and document vector ingestion',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['operations', 'queue', 'ai generation', 'background tasks', 'retry'],
        group: 'platform_operations',
        order: 5,
    },
    {
        path: '/platform/settings',
        title: 'platform_settings',
        icon: Settings,
        description: 'Platform feature flags, AI provider routing defaults, and runtime governance',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['platform settings', 'feature flags', 'ai routing', 'config'],
        group: 'platform_operations',
        order: 6,
    },
    {
        path: '/platform/analytics',
        title: 'platform_analytics',
        icon: BarChart3,
        description: 'Cross-tenant business intelligence, global learner counts, and usage metrics',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['analytics', 'platform', 'metrics', 'learners', 'ai usage'],
        group: 'platform_operations',
        order: 7,
    },
    {
        path: '/platform/audit',
        title: 'cross_tenant_audit',
        icon: Shield,
        description: 'Immutable audit trail of cross-tenant operator actions and impersonation sessions',
        allowedRoles: ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'],
        keywords: ['audit', 'security', 'logs', 'cross-tenant', 'compliance'],
        group: 'platform_operations',
        order: 8,
    },
    {
        path: '/search',
        title: 'search',
        icon: Search,
        description: 'Global search',
        allowedRoles: 'all',
        group: 'home_workspace',
        order: 99,
        hideFromNav: true,
    }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve the actual path for a route based on user's role
 */
export function resolvePathForRole(route: RouteConfig, role: AppRole | null): string {
    if (!role) return route.path
    return route.rolePathOverrides?.[role] || route.path
}

/**
 * Check if a role can access a route
 */
export function canAccessRoute(route: RouteConfig, role: AppRole | null): boolean {
    return canRoleAccess(role, route.allowedRoles)
}

/**
 * Check if a role can see a navigation group
 */
export function canSeeGroup(group: NavigationGroupConfig, role: AppRole | null): boolean {
    return canRoleAccess(role, group.visibleTo)
}

/**
 * Get all routes for a specific role, organized by group
 */
export function getRoutesForRole(role: AppRole | null): Map<NavigationGroup, RouteConfig[]> {
    const routesByGroup = new Map<NavigationGroup, RouteConfig[]>()

    if (!role) return routesByGroup

    // Initialize groups in defined order
    NAVIGATION_GROUPS
        .filter(group => canSeeGroup(group, role))
        .sort((a, b) => a.order - b.order)
        .forEach(group => {
            routesByGroup.set(group.id, [])
        })

    // Populate routes
    ROUTES
        .filter(route => !route.hideFromNav && canAccessRoute(route, role))
        .sort((a, b) => a.order - b.order)
        .forEach(route => {
            const groupRoutes = routesByGroup.get(route.group)
            if (groupRoutes) {
                groupRoutes.push(route)
            }
        })

    // Remove empty groups
    for (const [groupId, routes] of routesByGroup.entries()) {
        if (routes.length === 0) {
            routesByGroup.delete(groupId)
        }
    }

    return routesByGroup
}

/**
 * Get flat list of routes for a role (for mobile nav)
 */
export function getFlatRoutesForRole(role: AppRole | null): RouteConfig[] {
    if (!role) return []

    return ROUTES
        .filter(route => !route.hideFromNav && canAccessRoute(route, role))
        .sort((a, b) => {
            const groupA = NAVIGATION_GROUPS.find(g => g.id === a.group)?.order ?? 99
            const groupB = NAVIGATION_GROUPS.find(g => g.id === b.group)?.order ?? 99
            if (groupA !== groupB) return groupA - groupB
            return a.order - b.order
        })
}

/**
 * Get route config by path
 */
export function getRouteByPath(path: string): RouteConfig | undefined {
    return ROUTES.find(route => route.path === path)
}

/**
 * Get quick actions for mobile bottom bar
 */
export function getMobileQuickActions(role: AppRole | null): RouteConfig[] {
    if (!role) return []

    const priorityPaths = (role === 'staff' || role === 'learner')
        ? ['/dashboard', '/learning/my', '/knowledge', '/documents', '/profile']
        : ['/dashboard', '/admin/organization', '/training/hub', '/knowledge', '/profile']

    return priorityPaths
        .map(path => ROUTES.find(r => r.path === path))
        .filter((route): route is RouteConfig => route !== undefined && canAccessRoute(route, role))
        .slice(0, 5)
}

/**
 * Get navigation group config by ID
 */
export function getGroupConfig(groupId: NavigationGroup): NavigationGroupConfig | undefined {
    return NAVIGATION_GROUPS.find(g => g.id === groupId)
}
