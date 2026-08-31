/**
 * Navigation Configuration - Single Source of Truth
 * 
 * This file defines ALL navigation routes, access control, and grouping.
 * Used by: SidebarNavigation, MobileNavigation, App routes, permission checks
 * 
 * Best Practices Applied:
 * - Configuration-driven: No hardcoded menus
 * - Role inheritance: Higher roles see everything lower roles see
 * - Logical grouping: Organized by 6 intuitive operational domains
 * - Badge integration: Dynamic counts for pending items
 * - i18n ready: All labels use translation keys
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
// NAVIGATION GROUPS
// ============================================================================

export const NAVIGATION_GROUPS: NavigationGroupConfig[] = [
    {
        id: 'personal_space',
        title: 'groups.personal_space',
        icon: User,
        order: 1,
        visibleTo: 'all',
        collapsible: false
    },
    {
        id: 'knowledge_sop',
        title: 'groups.knowledge_sop',
        icon: BookOpen,
        order: 3,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'administration',
        title: 'groups.administration',
        icon: Shield,
        order: 6,
        visibleTo: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        collapsible: true
    }
]

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export const ROUTES: RouteConfig[] = [
    // -------------------------------------------------------------------------
    // 1. MY WORKSPACE (personal_space)
    // -------------------------------------------------------------------------
    {
        path: '/dashboard',
        title: 'dashboard',
        icon: Home,
        description: 'Personalized dashboard and daily summary',
        allowedRoles: 'all',
        keywords: ['home', 'overview', 'dashboard', 'analytics', 'welcome'],
        group: 'personal_space',
        order: 1,
    },
    {
        path: '/learning/my',
        title: 'my_training',
        icon: GraduationCap,
        description: 'Assigned training modules and interactive courses',
        allowedRoles: 'all',
        badgeKey: 'pendingTraining',
        keywords: ['training', 'learning', 'courses', 'modules', 'masterclass'],
        group: 'personal_space',
        order: 5,
    },
    {
        path: '/profile',
        title: 'my_profile',
        icon: User,
        description: 'Your user profile, settings, and credentials',
        allowedRoles: 'all',
        keywords: ['profile', 'account', 'me', 'credentials'],
        group: 'personal_space',
        order: 7,
    },

    // -------------------------------------------------------------------------
    // 3. KNOWLEDGE & TRAINING HUB (knowledge_sop)
    // -------------------------------------------------------------------------
    {
        path: '/knowledge',
        title: 'knowledge_base',
        icon: BookOpen,
        description: 'Centralized knowledge hub - SOPs, standards, brand policies',
        allowedRoles: 'all',
        keywords: ['sop', 'policy', 'guide', 'manual', 'knowledge', 'standard'],
        badgeKey: 'requiredReading',
        group: 'knowledge_sop',
        order: 1,
    },
    {
        path: '/documents',
        title: 'documents',
        icon: FileText,
        description: 'Document library, official manuals, and file management',
        allowedRoles: 'all',
        keywords: ['documents', 'files', 'pdf', 'manuals', 'policies'],
        group: 'knowledge_sop',
        order: 3,
    },
    {
        path: '/training/hub',
        title: 'lms_admin',
        icon: GraduationCap,
        description: 'ALTUS Academy training control center and course management',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['academy', 'lms', 'curriculum', 'training creator', 'courses'],
        group: 'knowledge_sop',
        order: 4,
    },
    {
        path: '/training/paths',
        title: 'training_paths',
        icon: BookOpen,
        description: 'Role-based learning journeys and onboarding roadmaps',
        allowedRoles: 'all',
        keywords: ['paths', 'roadmaps', 'curricula', 'learning paths'],
        group: 'knowledge_sop',
        order: 5,
    },
    {
        path: '/training/skills',
        title: 'skills_matrix',
        icon: Shield,
        description: 'Department skill matrix, proficiency coverage, and gaps',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['skills', 'competencies', 'matrix', 'proficiencies'],
        group: 'knowledge_sop',
        order: 6,
    },
    {
        path: '/training/certificates',
        title: 'my_certificates',
        icon: Award,
        description: 'Earned certificates, accreditations, and verification codes',
        allowedRoles: 'all',
        keywords: ['certificates', 'accreditation', 'awards', 'diploma'],
        group: 'knowledge_sop',
        order: 7,
    },
    {
        path: '/media',
        title: 'media_library',
        icon: Image,
        description: 'Hotel photos, video training assets, and brand media',
        allowedRoles: 'all',
        keywords: ['media', 'photos', 'videos', 'images', 'assets', 'gallery'],
        group: 'knowledge_sop',
        order: 8,
    },
    {
        path: '/knowledge/wiki',
        title: 'system_wiki',
        icon: BookOpen,
        description: 'System wiki, user manuals, and how-to platform guides',
        allowedRoles: 'all',
        keywords: ['wiki', 'help', 'docs', 'manual', 'system'],
        group: 'knowledge_sop',
        order: 9,
    },
    // Secondary sub-routes (hidden from main sidebar navigation to keep UI clean)
    {
        path: '/learning/quizzes',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage quizzes',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'knowledge_sop',
        order: 10,
        hideFromNav: true,
    },
    {
        path: '/questions',
        title: 'questions',
        icon: FileQuestion,
        description: 'Manage knowledge question bank',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'knowledge_sop',
        order: 11,
        hideFromNav: true,
    },
    {
        path: '/training/hub?view=list',
        title: 'training_modules',
        icon: BookOpen,
        description: 'Module management',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'knowledge_sop',
        order: 12,
        hideFromNav: true,
    },
    {
        path: '/training/hub?view=builder',
        title: 'training_builder',
        icon: ListTodo,
        description: 'Training builder',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'knowledge_sop',
        order: 13,
        hideFromNav: true,
    },
    {
        path: '/training/hub?view=assignments',
        title: 'training_assignments',
        icon: Users,
        description: 'Training assignments',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'knowledge_sop',
        order: 14,
        hideFromNav: true,
    },

    // -------------------------------------------------------------------------
    // 6. INTELLIGENCE & GOVERNANCE (administration)
    // -------------------------------------------------------------------------
    {
        path: '/reports',
        title: 'reports',
        icon: BarChart3,
        description: 'Executive analytics, occupancy trends, and business intelligence',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['reports', 'analytics', 'bi', 'occupancy', 'revpar'],
        group: 'administration',
        order: 1,
    },
    {
        path: '/admin/users',
        title: 'user_management',
        icon: Users,
        description: 'Manage platform user accounts, roles, and property assignments',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        keywords: ['users', 'roles', 'permissions', 'accounts'],
        group: 'administration',
        order: 6,
    },
    {
        path: '/admin/organization',
        title: 'org_structure',
        icon: Target,
        description: 'Organizational hierarchy, reporting lines, and org chart',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['organization', 'org chart', 'reporting lines', 'hierarchy'],
        group: 'administration',
        order: 8,
    },
    {
        path: '/admin/properties',
        title: 'property_management',
        icon: Building,
        description: 'Manage hotel properties, locations, and facilities',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        keywords: ['properties', 'hotels', 'locations', 'branches'],
        group: 'administration',
        order: 9,
    },
    {
        path: '/admin/ai-course-generator',
        title: 'ai_course_generator',
        icon: Bot,
        description: 'AI Course Generator routing mode, providers, models, spend caps and QA thresholds',
        allowedRoles: ['corporate_admin'],
        keywords: ['ai', 'course generator', 'model routing', 'ai settings', 'providers', 'spend cap'],
        group: 'administration',
        order: 12,
    },
    {
        path: '/admin/audit',
        title: 'audit_logs',
        icon: ClipboardList,
        description: 'System audit logs, event tracking, and compliance trails',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        keywords: ['audit logs', 'security events', 'traceability'],
        group: 'administration',
        order: 13,
    },
    {
        path: '/admin/pii-access',
        title: 'pii_access_logs',
        icon: Shield,
        description: 'PII access tracking and compliance data governance',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        keywords: ['pii', 'gdpr', 'privacy', 'security'],
        group: 'administration',
        order: 14,
        hideFromNav: true,
    },
    {
        path: '/admin/certificates',
        title: 'all_certificates',
        icon: Award,
        description: 'Organization-wide certificate ledger',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 17,
        hideFromNav: true,
    },
    {
        path: '/admin/notifications',
        title: 'notification_batches',
        icon: Bell,
        description: 'Bulk notification jobs and broadcast queue',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 18,
        hideFromNav: true,
    },
    {
        path: '/admin/settings',
        title: 'system_settings',
        icon: Settings,
        description: 'Configure platform settings, branding, and global policies',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        keywords: ['settings', 'config', 'branding', 'preferences'],
        group: 'administration',
        order: 19,
    },
    {
        path: '/settings',
        title: 'settings',
        icon: Settings,
        description: 'Personal application preferences, theme, and language',
        allowedRoles: 'all',
        keywords: ['settings', 'preferences', 'dark mode', 'theme'],
        group: 'administration',
        order: 20,
    },
    {
        path: '/search',
        title: 'search',
        icon: Search,
        description: 'Global search',
        allowedRoles: 'all',
        group: 'administration',
        order: 21,
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

    const priorityPaths = role === 'staff'
        ? ['/dashboard', '/learning/my', '/knowledge', '/documents', '/profile']
        : ['/dashboard', '/learning/my', '/knowledge', '/training/hub', '/profile']

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
