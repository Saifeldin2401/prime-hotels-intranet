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

import { ROLES, type AppRole } from '@/lib/constants'
import {
    Activity,
    ArrowRightLeft,
    ArrowUp,
    Award,
    BarChart3,
    Bell,
    BookOpen,
    Brain,
    Briefcase,
    Building,
    Calendar,
    CheckSquare,
    ClipboardList,
    Clock,
    FileQuestion,
    FileText,
    FolderOpen,
    GraduationCap,
    History,
    Home,
    Layers,
    ListTodo,
    Mail,
    Megaphone,
    MessageSquare,
    Search,
    Settings,
    Shield,
    Target,
    User,
    Users,
    Wallet,
    Workflow,
    Wrench,
    type LucideIcon
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NavigationGroup =
    | 'home'
    | 'my_work'
    | 'knowledge_base'
    | 'learning'
    | 'learning_management'
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
     * Example: Reports -> /reports/summary for regional_admin
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
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'hr_management',
        title: 'groups.hr_management',
        icon: Users,
        order: 5,
        visibleTo: 'all',
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
        visibleTo: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
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
        visibleTo: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
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
        path: '/operations',
        title: 'operations_dashboard',
        icon: BarChart3,
        description: 'PMS integration and operational analytics',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'operations',
        order: 0
    },
    {
        path: '/operations/analytics',
        title: 'operations_analytics',
        icon: Activity,
        description: 'Trend analysis and multi-property comparison',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'operations',
        order: 0.1,
        hideFromNav: true  // Accessible from dashboard
    },
    {
        path: '/operations/flash-report',
        title: 'flash_report',
        icon: FileText,
        description: 'Daily consolidated flash report',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'operations',
        order: 0.2,
        hideFromNav: true
    },
    {
        path: '/operations/import',
        title: 'data_import',
        icon: FileText,
        description: 'Import PMS data via CSV',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'operations',
        order: 0.3,
        hideFromNav: true
    },
    {
        path: '/operations/pms-config',
        title: 'pms_configuration',
        icon: Settings,
        description: 'Configure PMS integrations',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'operations',
        order: 0.4,
        hideFromNav: true
    },
    {
        path: '/approvals',
        title: 'approvals',
        icon: CheckSquare,
        description: 'Pending items requiring your approval',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
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
        path: '/hr/control',
        title: 'hr_control_center',
        icon: ClipboardList,
        description: 'Central hub for HR workflows and approvals',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 0
    },
    {
        path: '/hr/performance-management',
        title: 'performance_management',
        icon: Award,
        description: 'Manage performance reviews for staff',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 6.6
    },
    {
        path: '/hr/goals-management',
        title: 'goals_management',
        icon: Target,
        description: 'Assign and track employee goals',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 6.7
    },
    {
        path: '/hr/payslips-management',
        title: 'payslips_management',
        icon: Wallet,
        description: 'Create and publish payslips',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_management',
        order: 6.8
    },
    {
        path: '/hr/team',
        title: 'my_team',
        icon: Users,
        description: 'Manage your direct reports',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager'],
        group: 'hr_management',
        order: 6.9
    },
    {
        path: '/hr/motivational-content',
        title: 'motivational_content',
        icon: Target,
        description: 'Manage global dashboard motivational quotes',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'hr_management',
        order: 6.95
    },
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
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
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
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
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
        path: '/hr/scheduling',
        title: 'shift_scheduling',
        icon: Clock,
        description: 'Shift planning and attendance corrections',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager'],
        group: 'hr_management',
        order: 6.5
    },
    {
        path: '/hr/onboarding',
        title: 'onboarding_tracker',
        icon: CheckSquare,
        description: 'Track new hire onboarding progress',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_management',
        order: 0.5 // Top priority in HR
    },
    {
        path: '/hr/promotions/history',
        title: 'promotion_history',
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
        path: '/knowledge/wiki',
        title: 'system_wiki',
        icon: BookOpen,
        description: 'How to use PRIME Connect',
        allowedRoles: 'all',
        group: 'knowledge_base',
        order: 1.5
    },
    {
        path: '/knowledge/review',
        title: 'knowledge_review',
        icon: CheckSquare,
        description: 'Review pending content',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        badgeKey: 'pendingReviews',
        group: 'knowledge_base',
        order: 2
    },
    {
        path: '/knowledge/analytics',
        title: 'knowledge_analytics',
        icon: BarChart3,
        description: 'Content usage and insights',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
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
        path: '/training/hub',
        title: 'lms_admin',
        icon: GraduationCap,
        description: 'Unified LMS admin workspace',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'learning_management',
        order: 1
    },
    {
        path: '/training/modules',
        title: 'training_modules',
        icon: BookOpen,
        description: 'Legacy modules route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'learning_management',
        order: 2,
        hideFromNav: true
    },
    {
        path: '/training/builder',
        title: 'training_builder',
        icon: ListTodo,
        description: 'Legacy builder route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'learning_management',
        order: 3,
        hideFromNav: true
    },
    {
        path: '/training/assignments',
        title: 'training_assignments',
        icon: Users,
        description: 'Legacy assignments route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'learning_management',
        order: 4,
        hideFromNav: true
    },

    // -------------------------------------------------------------------------
    // QUESTIONS & QUIZZES (under Learning Management)
    // -------------------------------------------------------------------------
    {
        path: '/questions',
        title: 'questions',
        icon: FileQuestion,
        description: 'Manage knowledge questions',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'learning_management',
        order: 5
    },
    {
        path: '/learning/quizzes',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage quizzes',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'learning_management',
        order: 6
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
        description: 'Document library and file management',
        allowedRoles: 'all',
        group: 'knowledge_base',
        order: 4
    },

    // -------------------------------------------------------------------------
    // ADMINISTRATION GROUP
    // -------------------------------------------------------------------------
    {
        path: '/admin/users',
        title: 'user_management',
        icon: Users,
        description: 'Manage system users',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1
    },
    {
        path: '/admin/job-titles',
        title: 'job_titles',
        icon: Briefcase,
        description: 'Manage master list of job titles',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1.5
    },
    {
        path: '/admin/organization',
        title: 'org_structure',
        icon: Target,
        description: 'Manage organizational hierarchy and reporting lines',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 1.7
    },
    {
        path: '/admin/properties',
        title: 'property_management',
        icon: Building,
        description: 'Manage hotel properties',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 2
    },
    {
        path: '/hr/departments',
        title: 'departments',
        icon: Layers,
        description: 'Manage property departments',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 2.5
    },
    {
        path: '/reports',
        title: 'reports',
        icon: BarChart3,
        description: 'Analytics and reports',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 3
    },
    {
        path: '/admin/certificates/generate',
        title: 'manual_certificates',
        icon: Award,
        description: 'Generate manual certificates for users',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.1
    },
    {
        path: '/admin/analytics',
        title: 'system_analytics',
        icon: Activity,
        description: 'System usage and insights',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 3.2
    },
    {
        path: '/admin/workflows',
        title: 'automations',
        icon: Workflow,
        description: 'Manage workflow automations',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        group: 'administration',
        order: 3.5
    },
    {
        path: '/admin/news-publisher',
        title: 'news_publisher',
        icon: Megaphone,
        description: 'Manage global hospitality news',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.51
    },
    {
        path: '/admin/siem-config',
        title: 'siem_integrations',
        icon: Shield,
        description: 'Configure external SIEM webhooks',
        allowedRoles: ['corporate_admin'],
        group: 'administration',
        order: 3.52
    },
    {
        path: '/admin/retention-policies',
        title: 'retention_policies',
        icon: Clock,
        description: 'Manage audit data retention lifecycles',
        allowedRoles: ['corporate_admin'],
        group: 'administration',
        order: 3.53
    },
    {
        path: '/admin/report-builder',
        title: 'report_builder',
        icon: FileText,
        description: 'Build automated reporting queries',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.54
    },
    {
        path: '/admin/ai-tools',
        title: 'ai_tools',
        icon: Brain,
        description: 'AI-powered HR tools and analytics',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 3.7
    },
    {
        path: '/admin/ai-governance',
        title: 'ai_governance',
        icon: Brain,
        description: 'Autonomous AI governance controls and telemetry',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 3.75
    },
    {
        path: '/admin/finance-controls',
        title: 'finance_controls',
        icon: Wallet,
        description: 'Manage financial approval policies, budgets, and finance audit controls',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.78
    },
    {
        path: '/admin/governance-controls',
        title: 'governance_controls',
        icon: Shield,
        description: 'Manage authority model, ownership structure, and department governance settings',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.79
    },
    {
        path: '/admin/governance-risk',
        title: 'governance_risk',
        icon: Activity,
        description: 'Operate incident escalation, delegation authority, and compliance audit controls',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.80
    },
    {
        path: '/admin/governance-executive',
        title: 'governance_executive',
        icon: BarChart3,
        description: 'Executive governance dashboard with portfolio and property rollups',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.81
    },
    {
        path: '/admin/notifications',
        title: 'notification_batches',
        icon: Bell,
        description: 'Monitor bulk notification jobs',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 3.8
    },
    {
        path: '/admin/email-writer',
        title: 'email_writer',
        icon: Mail,
        description: 'Compose branded system emails with AI assistance',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 3.85
    },
    {
        path: '/admin/inbound-emails',
        title: 'inbound_emails',
        icon: Mail,
        description: 'View inbound emails received via Resend',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 3.86
    },
    {
        path: '/admin/audit',
        title: 'audit_logs',
        icon: ClipboardList,
        description: 'System audit logs',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 5
    },
    {
        path: '/admin/pii-access',
        title: 'pii_access_logs',
        icon: Shield,
        description: 'PII access tracking and compliance',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 5.5
    },
    {
        path: '/admin/compliance',
        title: 'compliance_center',
        icon: Shield,
        description: 'Enterprise audit exports, compliance monitoring, and regulatory reporting',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 4.9
    },
    {
        path: '/admin/escalation',
        title: 'escalation_rules',
        icon: Bell,
        description: 'Configure escalation rules',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 6
    },
    {
        path: '/admin/sla',
        title: 'sla_settings',
        icon: Clock,
        description: 'Configure SLA policies',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 6.5
    },
    {
        path: '/admin/routing-health',
        title: 'routing_health',
        icon: Activity,
        description: 'Monitor and repair request routing issues',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'administration',
        order: 7
    },
    {
        path: '/admin/delegations',
        title: 'delegations',
        icon: ArrowRightLeft,
        description: 'Manage temporary delegation of admin permissions',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 7.5
    },
    {
        path: '/admin/settings',
        title: 'system_settings',
        icon: Settings,
        description: 'Configure global application settings',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 8
    },

    {
        path: '/admin/onboarding/templates',
        title: 'onboarding_templates',
        icon: ListTodo,
        description: 'Manage onboarding checklists',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
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

    if (route.allowedRoles.includes(role)) return true

    const currentLevel = ROLES[role]?.level ?? Number.MAX_SAFE_INTEGER
    return route.allowedRoles.some((allowedRole) => {
        const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
        return currentLevel <= allowedLevel
    })
}

/**
 * Check if a role can see a navigation group
 */
export function canSeeGroup(group: NavigationGroupConfig, role: AppRole | null): boolean {
    if (!role) return false
    if (group.visibleTo === 'all') return true

    if (group.visibleTo.includes(role)) return true

    const currentLevel = ROLES[role]?.level ?? Number.MAX_SAFE_INTEGER
    return group.visibleTo.some((allowedRole) => {
        const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
        return currentLevel <= allowedLevel
    })
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
        ? ['/dashboard', '/learning/my', '/tasks', '/messaging', '/profile']
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
