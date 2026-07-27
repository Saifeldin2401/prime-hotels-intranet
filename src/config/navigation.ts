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

import { canRoleAccess, type AllowedRoles } from '@/features/access/policy'
import type { AppRole } from '@/lib/constants'
import {
    Activity,
    AlertTriangle,
    ArrowRightLeft,
    ArrowUp,
    Award,
    BarChart3,
    BedDouble,
    Bell,
    BellRing,
    BookOpen,
    BookText,
    Boxes,
    Brain,
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
    FileSignature,
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
    Package,
    PackageSearch,
    Search,
    Settings,
    Shield,
    Target,
    Truck,
    User,
    Users,
    Wallet,
    Workflow,
    Wrench,
    Zap,
    type LucideIcon
} from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NavigationGroup =
    | 'personal_space'
    | 'housekeeping_ops'
    | 'finance_revenue'
    | 'hr_staff'
    | 'knowledge_sop'
    | 'reports_analytics'
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
        collapsible: true
    },
    {
        id: 'housekeeping_ops',
        title: 'groups.housekeeping_ops',
        icon: Briefcase,
        order: 2,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'finance_revenue',
        title: 'groups.finance_revenue',
        icon: Wallet,
        order: 3,
        visibleTo: ['corporate_admin', 'regional_admin', 'property_manager', 'department_head'],
        collapsible: true
    },
    {
        id: 'hr_staff',
        title: 'groups.hr_staff',
        icon: Users,
        order: 4,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'knowledge_sop',
        title: 'groups.knowledge_sop',
        icon: BookOpen,
        order: 5,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'reports_analytics',
        title: 'groups.reports_analytics',
        icon: BarChart3,
        order: 6,
        visibleTo: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        collapsible: true
    },
    {
        id: 'administration',
        title: 'groups.administration',
        icon: Shield,
        order: 7,
        visibleTo: ['corporate_admin', 'regional_admin', 'property_manager'],
        collapsible: true
    }
]

// ============================================================================
// ROUTE DEFINITIONS
// ============================================================================

export const ROUTES: RouteConfig[] = [
    // -------------------------------------------------------------------------
    // MY PERSONAL SPACE GROUP
    // -------------------------------------------------------------------------
    {
        path: '/dashboard',
        title: 'dashboard',
        icon: Home,
        description: 'Your personalized dashboard',
        allowedRoles: 'all',
        keywords: ['home', 'overview', 'dashboard', 'analytics', 'welcome'],
        group: 'personal_space',
        order: 1,
    },
    {
        path: '/tasks',
        title: 'my_tasks',
        icon: CheckSquare,
        description: 'Your assigned tasks',
        allowedRoles: 'all',
        keywords: ['todo', 'assignments', 'checklist', 'tasks'],
        badgeKey: 'overdueTasks',
        group: 'personal_space',
        order: 2,
    },
    {
        path: '/learning/my',
        title: 'my_training',
        icon: GraduationCap,
        description: 'Your assigned training modules',
        allowedRoles: 'all',
        badgeKey: 'pendingTraining',
        group: 'personal_space',
        order: 3,
    },
    {
        path: '/training/certificates',
        title: 'my_certificates',
        icon: Award,
        description: 'Your earned certificates',
        allowedRoles: 'all',
        group: 'personal_space',
        order: 4,
    },
    {
        path: '/hr/payslips',
        title: 'payslips',
        icon: Wallet,
        description: 'Your payroll documents',
        allowedRoles: 'all',
        keywords: ['salary', 'pay', 'paystub', 'payroll', 'payslips'],
        group: 'personal_space',
        order: 5,
    },
    {
        path: '/hr/leave',
        title: 'my_requests',
        icon: Calendar,
        description: 'Submit and track leave requests',
        allowedRoles: 'all',
        keywords: ['leave', 'vacation', 'time off', 'sick leave', 'requests'],
        group: 'personal_space',
        order: 6,
    },
    {
        path: '/hr/attendance',
        title: 'attendance',
        icon: History,
        description: 'Your attendance records and clock-in/out',
        allowedRoles: 'all',
        keywords: ['clock in', 'clock out', 'punch', 'hours', 'attendance'],
        group: 'personal_space',
        order: 7,
    },
    {
        path: '/hr/performance',
        title: 'performance',
        icon: Award,
        description: 'Your performance evaluations and ratings',
        allowedRoles: 'all',
        keywords: ['review', 'appraisal', 'evaluation', 'rating', 'performance'],
        group: 'personal_space',
        order: 8,
    },
    {
        path: '/hr/goals',
        title: 'goals',
        icon: Target,
        description: 'Your career goals and milestones',
        allowedRoles: 'all',
        keywords: ['okr', 'target', 'milestone', 'career', 'goals'],
        badgeKey: 'activeGoals',
        group: 'personal_space',
        order: 9,
    },

    // -------------------------------------------------------------------------
    // OPERATIONS GROUP
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    {
        path: '/operations/projects',
        title: 'projects_capex',
        icon: Building2,
        description: 'Capital expenditure tracking, hotel pre-opening checklists, and renovation milestones',
        allowedRoles: 'all',
        keywords: ['capex', 'projects', 'pre-opening', 'renovation', 'budget', 'capital expenditure'],
        group: 'housekeeping_ops',
        order: 0,
    },
    {
        path: '/housekeeping/rooms',
        title: 'room_status_board',
        icon: BedDouble,
        description: 'Live room status board',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 1
    },
    {
        path: '/housekeeping/tasks',
        title: 'housekeeping_tasks',
        icon: ClipboardCheck,
        description: 'Assign and track housekeeping tasks',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 2
    },
    {
        path: '/maintenance',
        title: 'maintenance',
        icon: Wrench,
        description: 'Submit and track maintenance tickets',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 3
    },
    {
        path: '/operations',
        title: 'operations_dashboard',
        icon: BarChart3,
        description: 'PMS integration and operational analytics',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'housekeeping_ops',
        order: 4
    },
    {
        path: '/operations/logbook',
        title: 'daily_logbook',
        icon: BookText,
        description: 'Shift log and handover notes',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 5
    },
    {
        path: '/operations/guest-requests',
        title: 'guest_requests',
        icon: BellRing,
        description: 'Track and fulfill front-line guest service requests',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 6
    },
    {
        path: '/operations/incidents',
        title: 'incidents',
        icon: AlertTriangle,
        description: 'Log and track operational incidents',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 7
    },
    {
        path: '/operations/vip-guests',
        title: 'vip_guests',
        icon: Crown,
        description: 'Flag VIP guests for staff attention',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 8
    },
    {
        path: '/operations/lost-found',
        title: 'lost_found',
        icon: PackageSearch,
        description: 'Track lost and found items',
        allowedRoles: 'all',
        group: 'housekeeping_ops',
        order: 9
    },
    {
        path: '/approvals',
        title: 'approvals',
        icon: CheckSquare,
        description: 'Pending items requiring your approval',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        badgeKey: 'pendingApprovals',
        group: 'housekeeping_ops',
        order: 10
    },

    // -------------------------------------------------------------------------
    // FINANCE & REVENUE GROUP
    // -------------------------------------------------------------------------
    {
        path: '/finance/budgets',
        title: 'budgets',
        icon: Wallet,
        description: 'Budget allocations by category and period',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        group: 'finance_revenue',
        order: 1
    },
    {
        path: '/finance/invoices',
        title: 'invoices',
        icon: FileText,
        description: 'Vendor invoices and approval workflow',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        group: 'finance_revenue',
        order: 2
    },
    {
        path: '/procurement/requests',
        title: 'purchase_requests',
        icon: ClipboardList,
        description: 'Submit and approve purchase requests',
        allowedRoles: 'all',
        group: 'finance_revenue',
        order: 3
    },
    {
        path: '/procurement/orders',
        title: 'purchase_orders',
        icon: Package,
        description: 'Track purchase orders and receive goods',
        allowedRoles: 'all',
        group: 'finance_revenue',
        order: 4
    },
    {
        path: '/procurement/inventory',
        title: 'inventory',
        icon: Boxes,
        description: 'Basic per-property inventory',
        allowedRoles: 'all',
        group: 'finance_revenue',
        order: 5
    },
    {
        path: '/procurement/suppliers',
        title: 'suppliers',
        icon: Truck,
        description: 'Corporate-wide supplier registry',
        allowedRoles: 'all',
        group: 'finance_revenue',
        order: 6
    },
    {
        path: '/commercial/accounts',
        title: 'commercial_accounts',
        icon: Briefcase,
        description: 'Corporate and commercial client accounts',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        group: 'finance_revenue',
        order: 7
    },
    {
        path: '/commercial/leads',
        title: 'commercial_leads',
        icon: Target,
        description: 'Sales pipeline and opportunities',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        group: 'finance_revenue',
        order: 8
    },


    // -------------------------------------------------------------------------
    // HR & STAFF GROUP
    // -------------------------------------------------------------------------
    {
        path: '/directory',
        title: 'directory',
        icon: Users,
        description: 'Employee directory',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 1
    },
    {
        path: '/hr/control',
        title: 'hr_control_center',
        icon: ClipboardList,
        description: 'Central hub for HR workflows and approvals',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_staff',
        order: 2
    },
    {
        path: '/hr/onboarding',
        title: 'onboarding_tracker',
        icon: CheckSquare,
        description: 'Track new hire onboarding progress',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_staff',
        order: 3
    },
    {
        path: '/hr/scheduling',
        title: 'shift_scheduling',
        icon: Clock,
        description: 'Shift planning and attendance corrections',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager'],
        group: 'hr_staff',
        order: 4
    },
    {
        path: '/hr/performance-management',
        title: 'performance_management',
        icon: Award,
        description: 'Manage performance reviews for staff',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_staff',
        order: 5
    },
    {
        path: '/hr/goals-management',
        title: 'goals_management',
        icon: Target,
        description: 'Assign and track employee goals',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'hr_staff',
        order: 6
    },
    {
        path: '/hr/payslips-management',
        title: 'payslips_management',
        icon: Wallet,
        description: 'Create and publish payslips',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'hr_staff',
        order: 7
    },
    {
        path: '/training/hub',
        title: 'lms_admin',
        icon: GraduationCap,
        description: 'Unified LMS admin workspace',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_staff',
        order: 8
    },

    // -------------------------------------------------------------------------
    // KNOWLEDGE & SOPS GROUP
    // -------------------------------------------------------------------------
    {
        path: '/knowledge',
        title: 'knowledge_base',
        icon: BookOpen,
        description: 'Centralized knowledge hub - SOPs, policies, guides',
        allowedRoles: 'all',
        keywords: ['sop', 'policy', 'guide', 'manual', 'knowledge'],
        badgeKey: 'requiredReading',
        group: 'knowledge_sop',
        order: 1
    },
    {
        path: '/announcements',
        title: 'announcements',
        icon: Megaphone,
        description: 'Company announcements',
        allowedRoles: 'all',
        group: 'knowledge_sop',
        order: 2
    },
    {
        path: '/documents',
        title: 'documents',
        icon: FileText,
        description: 'Document library and file management',
        allowedRoles: 'all',
        group: 'knowledge_sop',
        order: 3
    },
    {
        path: '/knowledge/wiki',
        title: 'system_wiki',
        icon: BookOpen,
        description: 'How to use REMAL Connect',
        allowedRoles: 'all',
        keywords: ['wiki', 'help', 'docs', 'system'],
        group: 'knowledge_sop',
        order: 4
    },

    // -------------------------------------------------------------------------
    // LEARNING GROUP (under HR & Staff)
    // -------------------------------------------------------------------------
    {
        path: '/learning/my',
        title: 'my_training',
        icon: GraduationCap,
        description: 'Your assigned training modules',
        allowedRoles: 'all',
        badgeKey: 'pendingTraining',
        group: 'hr_staff',
        order: 10
    },
    {
        path: '/training/paths',
        title: 'training_paths',
        icon: BookOpen,
        description: 'Learning paths and curricula',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 11
    },
    {
        path: '/training/certificates',
        title: 'my_certificates',
        icon: Award,
        description: 'Your earned certificates',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 12
    },
    {
        path: '/training/hub',
        title: 'lms_admin',
        icon: GraduationCap,
        description: 'Unified LMS admin workspace',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_staff',
        order: 13
    },
    {
        path: '/training/modules',
        title: 'training_modules',
        icon: BookOpen,
        description: 'Legacy modules route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'hr_staff',
        order: 14,
        hideFromNav: true
    },
    {
        path: '/training/builder',
        title: 'training_builder',
        icon: ListTodo,
        description: 'Legacy builder route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'hr_staff',
        order: 15,
        hideFromNav: true
    },
    {
        path: '/training/assignments',
        title: 'training_assignments',
        icon: Users,
        description: 'Legacy assignments route (redirects to LMS Admin)',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'hr_staff',
        order: 16,
        hideFromNav: true
    },
    {
        path: '/questions',
        title: 'questions',
        icon: FileQuestion,
        description: 'Manage knowledge questions',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'hr_staff',
        order: 17
    },
    {
        path: '/learning/quizzes',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage quizzes',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'hr_staff',
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
        group: 'personal_space',
        order: 10
    },
    {
        path: '/announcements',
        title: 'announcements',
        icon: Megaphone,
        description: 'Company announcements',
        allowedRoles: 'all',
        group: 'knowledge_sop',
        order: 2
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
        path: '/admin/companies',
        title: 'company_management',
        icon: Building,
        description: 'Manage operating companies',
        allowedRoles: ['corporate_admin'],
        group: 'administration',
        order: 1.9
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
    // -------------------------------------------------------------------------
    // REPORTS & ANALYTICS GROUP
    // -------------------------------------------------------------------------
    {
        path: '/reports',
        title: 'reports',
        icon: BarChart3,
        description: 'Analytics and reports',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'reports_analytics',
        order: 1
    },
    {
        path: '/admin/analytics',
        title: 'system_analytics',
        icon: Activity,
        description: 'System usage and insights',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'reports_analytics',
        order: 2
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
        path: '/admin/quality-audits',
        title: 'quality_audits',
        icon: ClipboardList,
        description: 'Manage quality audit templates and runs',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 3.55
    },
    {
        path: '/admin/compliance',
        title: 'compliance_center',
        icon: Shield,
        description: 'Audit logs, PII access tracking, and compliance exports',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 3.6
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
        group: 'administration',
        order: 1
    },
    {
        path: '/settings',
        title: 'settings',
        icon: Settings,
        description: 'App preferences',
        allowedRoles: 'all',
        group: 'administration',
        order: 2
    },
    {
        path: '/search',
        title: 'search',
        icon: Search,
        description: 'Global search',
        allowedRoles: 'all',
        group: 'administration',
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
