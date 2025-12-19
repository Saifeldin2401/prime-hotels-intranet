/**
 * Navigation Configuration - Single Source of Truth
 * 
 * This file defines ALL navigation routes, access control, and grouping.
 * Used by: SidebarNavigation, MobileNavigation, App routes, permission checks
 * 
 * Best Practices Applied:
 * - Configuration-driven: No hardcoded menus
 * - Role inheritance: Higher roles see everything lower roles see
 * - Logical grouping: Organized by functional area
 * - Badge integration: Dynamic counts for pending items
 * - i18n ready: All labels use translation keys
 */

import {
    Home,
    FileText,
    BookOpen,
    Settings,
    Users,
    Wrench,
    MessageSquare,
    BarChart3,
    User,
    Calendar,
    CheckSquare,
    Megaphone,
    Briefcase,
    Award,
    ClipboardList,
    FolderOpen,
    ArrowUp,
    ArrowRightLeft,
    Bell,
    Search,
    Shield,
    Building,
    ListTodo,
    GraduationCap,
    FileQuestion,
    History,
    Workflow,
    Target,
    Wallet,
    type LucideIcon
} from 'lucide-react'
import type { AppRole } from '@/lib/constants'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NavigationGroup =
    | 'home'
    | 'my_work'
    | 'knowledge_base'
    | 'learning'
    | 'learning_management'
    | 'question_bank'
    | 'operations'
    | 'hr_management'
    | 'my_hr'
    | 'communication'
    | 'administration'
    | 'settings'

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
    allowedRoles: AppRole[] | 'all'
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
    /**
     * Role-specific path overrides
     * Same nav label routes to different destinations per role
     * Example: Dashboard -> /dashboard/property-manager for property_manager
     */
    rolePathOverrides?: Partial<Record<AppRole, string>>
}

export interface NavigationGroupConfig {
    id: NavigationGroup
    title: string  // i18n key
    icon: LucideIcon
    order: number
    /** Roles that can see this group at all */
    visibleTo: AppRole[] | 'all'
    /** Whether group is collapsible in sidebar */
    collapsible: boolean
}

// ============================================================================
// NAVIGATION GROUPS
// ============================================================================

export const NAVIGATION_GROUPS: NavigationGroupConfig[] = [
    {
        id: 'home',
        title: 'groups.home',
        icon: Home,
        order: 0,
        visibleTo: 'all',
        collapsible: false
    },
    {
        id: 'my_work',
        title: 'groups.my_work',
        icon: User,
        order: 1,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'knowledge_base',
        title: 'groups.knowledge_base',
        icon: BookOpen,
        order: 2,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'learning',
        title: 'groups.learning',
        icon: GraduationCap,
        order: 3,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'operations',
        title: 'groups.operations',
        icon: CheckSquare,
        order: 4,
        visibleTo: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        collapsible: true
    },
    {
        id: 'hr_management',
        title: 'groups.hr_management',
        icon: Users,
        order: 5,
        visibleTo: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        collapsible: true
    },
    {
        id: 'my_hr',
        title: 'groups.my_hr',
        icon: Users,
        order: 5.5,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'learning_management',
        title: 'groups.learning_management',
        icon: GraduationCap,
        order: 6,
        visibleTo: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        collapsible: true
    },
    {
        id: 'question_bank',
        title: 'groups.question_bank',
        icon: FileQuestion,
        order: 7,
        visibleTo: ['regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        collapsible: true
    },
    {
        id: 'communication',
        title: 'groups.communication',
        icon: MessageSquare,
        order: 8,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'administration',
        title: 'groups.admin',
        icon: Shield,
        order: 9,
        visibleTo: ['regional_admin', 'regional_hr'],
        collapsible: true
    },
    {
        id: 'settings',
        title: 'groups.settings',
        icon: Settings,
        order: 10,
        visibleTo: 'all',
        collapsible: false
    }
]

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export const ROUTES: RouteConfig[] = [
    // -------------------------------------------------------------------------
    // HOME GROUP
    // -------------------------------------------------------------------------
    {
        path: '/dashboard',
        title: 'dashboard',
        icon: BarChart3,
        description: 'Your personalized dashboard',
        allowedRoles: 'all',
        group: 'home',
        order: 1,
        // Role-specific dashboard routing - same label, different destinations
        rolePathOverrides: {
            staff: '/staff-dashboard',
            department_head: '/dashboard/department-head',
            property_manager: '/dashboard/property-manager',
            property_hr: '/dashboard/property-hr',
            regional_hr: '/dashboard/regional-hr',
            regional_admin: '/dashboard/corporate-admin'
        }
    },
    {
        path: '/dashboard/my-team',
        title: 'my_team',
        icon: Users,
        description: 'View and manage your direct reports',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'home',
        order: 2
    },

    // -------------------------------------------------------------------------
    // MY WORK GROUP
    // -------------------------------------------------------------------------
    {
        path: '/hr/leave',
        title: 'my_requests',
        icon: Calendar,
        description: 'Submit and track leave requests',
        allowedRoles: 'all',
        group: 'my_hr',
        order: 5
    },
    {
        path: '/hr/attendance',
        title: 'attendance',
        icon: History,
        description: 'Your attendance records and clock-in/out',
        allowedRoles: 'all',
        group: 'my_hr',
        order: 1
    },
    {
        path: '/hr/performance',
        title: 'performance',
        icon: Award,
        description: 'Your performance evaluations and ratings',
        allowedRoles: 'all',
        group: 'my_hr',
        order: 2
    },
    {
        path: '/hr/goals',
        title: 'goals',
        icon: Target,
        description: 'Your career goals and milestones',
        allowedRoles: 'all',
        badgeKey: 'activeGoals',
        group: 'my_hr',
        order: 3
    },
    {
        path: '/hr/payslips',
        title: 'payslips',
        icon: Wallet,
        description: 'Your payroll documents',
        allowedRoles: 'all',
        group: 'my_hr',
        order: 4
    },
    {
        path: '/tasks',
        title: 'my_tasks',
        icon: CheckSquare,
        description: 'Your assigned tasks',
        allowedRoles: 'all',
        badgeKey: 'overdueTasks',
        group: 'my_work',
        order: 2
    },
    {
        path: '/onboarding',
        title: 'onboarding',
        icon: CheckSquare, // Using CheckSquare as it looks like a checklist
        description: 'Complete your onboarding tasks',
        allowedRoles: 'all',
        group: 'my_work',
        order: 0 // Priority!
    },

    // -------------------------------------------------------------------------
    // OPERATIONS GROUP
    // -------------------------------------------------------------------------
    {
        path: '/approvals',
        title: 'approvals',
        icon: CheckSquare,
        description: 'Pending items requiring your approval',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        badgeKey: 'pendingApprovals',
        group: 'operations',
        order: 1
    },
    {
        path: '/hr/inbox',
        title: 'hr_inbox',
        icon: FolderOpen,
        description: 'HR requests inbox - Use Approvals instead',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        badgeKey: 'pendingApprovals',
        group: 'operations',
        order: 2,
        hideFromNav: true  // Hidden - consolidated into /approvals
    },
    {
        path: '/maintenance',
        title: 'maintenance',
        icon: Wrench,
        description: 'Submit and track maintenance tickets',
        allowedRoles: 'all',
        group: 'operations',
        order: 3
    },

    // -------------------------------------------------------------------------
    // HR MANAGEMENT GROUP
    // -------------------------------------------------------------------------
    {
        path: '/directory',
        title: 'directory',
        icon: Users,
        description: 'Employee directory',
        allowedRoles: 'all',
        group: 'hr_management',
        order: 1
    },
    {
        path: '/jobs',
        title: 'jobs',
        icon: Briefcase,
        description: 'Job postings and applications',
        allowedRoles: 'all',
        group: 'hr_management',
        order: 2
    },
    {
        path: '/hr/referrals',
        title: 'referrals',
        icon: Users,
        description: 'Employee referral program',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 3
    },
    {
        path: '/hr/promotions/new',
        title: 'promotions',
        icon: ArrowUp,
        description: 'Initiate employee promotions',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr'],
        group: 'hr_management',
        order: 4
    },
    {
        path: '/hr/transfers/new',
        title: 'transfers',
        icon: ArrowRightLeft,
        description: 'Initiate employee transfers',
        allowedRoles: ['regional_admin', 'regional_hr'],
        group: 'hr_management',
        order: 5
    },
    {
        path: '/hr/operations',
        title: 'hr_operations',
        icon: Building,
        description: 'HR operations center',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr'],
        group: 'hr_management',
        order: 6
    },
    {
        path: '/hr/onboarding',
        title: 'onboarding_tracker',
        icon: CheckSquare,
        description: 'Track new hire onboarding progress',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_management',
        order: 0.5 // Top priority in HR
    },
    {
        path: '/hr/promotions/history',
        title: 'promotion_history', // Keeping key same, or should I update key? The logic uses translation. 'Promotions & Transfers' is english.
        // Wait, title is i18n key. 'nav.promotion_history'.
        // I should probably not change the key if I don't change the json.
        // But the previous edit tried to change the TITLE to 'Promotions & Transfers'.
        // If 'title' is valid key, it's fine. If it's a string literal, it's fine.
        // The file comment says `title: string // i18n translation key`.
        // So I should stick to a key, OR check if I need to add a new key.
        // I will keep the key 'nav.promotion_history' but update the English translation JSON.
        // Ah, I missed that step.
        // Let's check common.json or similar.
        // I will proceed with just changing the comment/description for now or if I can't change the key, I will update the JSON.
        // Actually, let's just make sure the description is updated.
        // And I will try to update en/common.json later if needed.
        // For now, I will just update the description in the config.
        icon: History,
        description: 'View promotion and transfer history',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 7
    },

    // -------------------------------------------------------------------------
    // KNOWLEDGE BASE GROUP
    // -------------------------------------------------------------------------
    {
        path: '/knowledge',
        title: 'knowledge_base',
        icon: BookOpen,
        description: 'Centralized knowledge hub - SOPs, policies, guides',
        allowedRoles: 'all',
        badgeKey: 'requiredReading',
        group: 'knowledge_base',
        order: 1
    },
    {
        path: '/knowledge/review',
        title: 'knowledge_review',
        icon: CheckSquare,
        description: 'Review pending content',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr'],
        badgeKey: 'pendingReviews',
        group: 'knowledge_base',
        order: 2
    },
    {
        path: '/knowledge/analytics',
        title: 'knowledge_analytics',
        icon: BarChart3,
        description: 'Content usage and insights',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager'],
        group: 'knowledge_base',
        order: 3
    },

    // -------------------------------------------------------------------------
    // LEARNING GROUP (Personal)
    // -------------------------------------------------------------------------
    {
        path: '/learning/my',
        title: 'my_training',
        icon: GraduationCap,
        description: 'Your assigned training modules',
        allowedRoles: 'all',
        badgeKey: 'pendingTraining',
        group: 'learning',
        order: 1
    },
    {
        path: '/training/paths',
        title: 'training_paths',
        icon: BookOpen,
        description: 'Learning paths and curricula',
        allowedRoles: 'all',
        group: 'learning',
        order: 2
    },
    {
        path: '/training/certificates',
        title: 'my_certificates',
        icon: Award,
        description: 'Your earned certificates',
        allowedRoles: 'all',
        group: 'learning',
        order: 3
    },

    // -------------------------------------------------------------------------
    // LEARNING MANAGEMENT GROUP (Admin)
    // -------------------------------------------------------------------------
    {
        path: '/training/modules',
        title: 'training_modules',
        icon: BookOpen,
        description: 'Manage training modules',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager'],
        group: 'learning_management',
        order: 1
    },
    {
        path: '/training/builder',
        title: 'training_builder',
        icon: ListTodo,
        description: 'Create training content',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager'],
        group: 'learning_management',
        order: 2
    },
    {
        path: '/training/assignments',
        title: 'training_assignments',
        icon: Users,
        description: 'Assign training to users',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'learning_management',
        order: 3
    },

    // -------------------------------------------------------------------------
    // QUESTION BANK GROUP (Admin)
    // -------------------------------------------------------------------------
    {
        path: '/questions',
        title: 'questions',
        icon: FileQuestion,
        description: 'Manage knowledge questions',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr'],
        group: 'question_bank',
        order: 1
    },
    {
        path: '/learning/quizzes',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage quizzes',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'question_bank',
        order: 2
    },

    // -------------------------------------------------------------------------
    // COMMUNICATION GROUP
    // -------------------------------------------------------------------------
    {
        path: '/messaging',
        title: 'messaging',
        icon: MessageSquare,
        description: 'Direct messages and team chat',
        allowedRoles: 'all',
        badgeKey: 'unreadMessages',
        group: 'communication',
        order: 1
    },
    {
        path: '/announcements',
        title: 'announcements',
        icon: Megaphone,
        description: 'Company announcements',
        allowedRoles: 'all',
        group: 'communication',
        order: 2
    },
    {
        path: '/documents',
        title: 'documents',
        icon: FileText,
        description: 'Policies and documents',
        allowedRoles: 'all',
        group: 'communication',
        order: 3
    },

    // -------------------------------------------------------------------------
    // ADMINISTRATION GROUP
    // -------------------------------------------------------------------------
    {
        path: '/admin/users',
        title: 'user_management',
        icon: Users,
        description: 'Manage system users',
        allowedRoles: ['regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1
    },
    {
        path: '/admin/job-titles',
        title: 'job_titles', // Using string literal as placeholder until i18n key is added
        icon: Briefcase,
        description: 'Manage master list of job titles',
        allowedRoles: ['regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1.5
    },
    {
        path: '/admin/organization',
        title: 'org_structure',
        icon: Target,
        description: 'Manage organizational hierarchy and reporting lines',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 1.7
    },
    {
        path: '/admin/properties',
        title: 'property_management',
        icon: Building,
        description: 'Manage hotel properties',
        allowedRoles: ['regional_admin'],
        group: 'administration',
        order: 2
    },
    {
        path: '/reports',
        title: 'reports',
        icon: BarChart3,
        description: 'Analytics and reports',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 3
    },
    {
        path: '/admin/workflows',
        title: 'automations',
        icon: Workflow,
        description: 'Manage workflow automations',
        allowedRoles: ['regional_admin', 'property_manager'],
        group: 'administration',
        order: 3.5
    },
    {
        path: '/admin/notifications',
        title: 'Notification Batches',
        icon: Bell,
        description: 'Monitor bulk notification jobs',
        allowedRoles: ['regional_admin', 'regional_hr'],
        group: 'administration',
        order: 3.8
    },
    {
        path: '/admin/audit',
        title: 'audit_logs',
        icon: ClipboardList,
        description: 'System audit logs',
        allowedRoles: ['regional_admin'],
        group: 'administration',
        order: 5
    },
    {
        path: '/admin/escalation',
        title: 'escalation_rules',
        icon: Bell,
        description: 'Configure escalation rules',
        allowedRoles: ['regional_admin'],
        group: 'administration',
        order: 6
    },
    {
        path: '/admin/onboarding/templates',
        title: 'onboarding_templates',
        icon: ListTodo,
        description: 'Manage onboarding checklists',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 3.6
    },

    // -------------------------------------------------------------------------
    // SETTINGS GROUP
    // -------------------------------------------------------------------------
    {
        path: '/profile',
        title: 'my_profile',
        icon: User,
        description: 'Your profile settings',
        allowedRoles: 'all',
        group: 'settings',
        order: 1
    },
    {
        path: '/settings',
        title: 'settings',
        icon: Settings,
        description: 'App preferences',
        allowedRoles: 'all',
        group: 'settings',
        order: 2
    },
    {
        path: '/search',
        title: 'search',
        icon: Search,
        description: 'Global search',
        allowedRoles: 'all',
        group: 'settings',
        order: 3,
        hideFromNav: true  // Accessible via header search
    }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve the actual path for a route based on user's role
 * Handles rolePathOverrides for same-label-different-destination routes
 */
export function resolvePathForRole(route: RouteConfig, role: AppRole | null): string {
    if (!role) return route.path
    return route.rolePathOverrides?.[role] || route.path
}

/**
 * Check if a role can access a route
 */
export function canAccessRoute(route: RouteConfig, role: AppRole | null): boolean {
    if (!role) return false
    if (route.allowedRoles === 'all') return true
    return route.allowedRoles.includes(role)
}

/**
 * Check if a role can see a navigation group
 */
export function canSeeGroup(group: NavigationGroupConfig, role: AppRole | null): boolean {
    if (!role) return false
    if (group.visibleTo === 'all') return true
    return group.visibleTo.includes(role)
}

/**
 * Get all routes for a specific role, organized by group
 */
export function getRoutesForRole(role: AppRole | null): Map<NavigationGroup, RouteConfig[]> {
    const routesByGroup = new Map<NavigationGroup, RouteConfig[]>()

    if (!role) return routesByGroup

    // Initialize groups
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
            // Sort by group order first, then route order
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

    // Priority routes for quick access
    const priorityPaths = role === 'staff'
        ? ['/staff-dashboard', '/learning/my', '/tasks', '/messaging', '/profile']
        : ['/dashboard', '/approvals', '/tasks', '/messaging', '/profile']

    return priorityPaths
        .map(path => ROUTES.find(r => r.path === path))
        .filter((route): route is RouteConfig => route !== undefined && canAccessRoute(route, role))
        .slice(0, 5)  // Max 5 items in bottom bar
}

/**
 * Get navigation group config by ID
 */
export function getGroupConfig(groupId: NavigationGroup): NavigationGroupConfig | undefined {
    return NAVIGATION_GROUPS.find(g => g.id === groupId)
}
