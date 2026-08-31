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
    | 'hotel_operations'
    | 'knowledge_sop'
    | 'hr_staff'
    | 'finance_revenue'
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
        id: 'hotel_operations',
        title: 'groups.hotel_operations',
        icon: BedDouble,
        order: 2,
        visibleTo: 'all',
        collapsible: true
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
        id: 'hr_staff',
        title: 'groups.hr_staff',
        icon: Users,
        order: 4,
        visibleTo: 'all',
        collapsible: true
    },
    {
        id: 'finance_revenue',
        title: 'groups.finance_revenue',
        icon: Wallet,
        order: 5,
        visibleTo: ['corporate_admin', 'regional_admin', 'property_manager', 'department_head'],
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
        path: '/tasks',
        title: 'my_tasks',
        icon: CheckSquare,
        description: 'Your assigned daily tasks and checklists',
        allowedRoles: 'all',
        keywords: ['todo', 'assignments', 'checklist', 'tasks'],
        badgeKey: 'overdueTasks',
        group: 'personal_space',
        order: 2,
    },
    {
        path: '/hr/leave',
        title: 'my_requests',
        icon: Calendar,
        description: 'Submit and track vacation, leave, and requests',
        allowedRoles: 'all',
        keywords: ['leave', 'vacation', 'time off', 'sick leave', 'requests'],
        group: 'personal_space',
        order: 3,
    },
    {
        path: '/hr/attendance',
        title: 'attendance',
        icon: History,
        description: 'Attendance records, shift times, and clocking',
        allowedRoles: 'all',
        keywords: ['clock in', 'clock out', 'punch', 'hours', 'attendance'],
        group: 'personal_space',
        order: 4,
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
        path: '/messaging',
        title: 'messaging',
        icon: MessageSquare,
        description: 'Direct team messages, announcements, and chats',
        allowedRoles: 'all',
        badgeKey: 'unreadMessages',
        keywords: ['chat', 'messages', 'inbox', 'communication'],
        group: 'personal_space',
        order: 6,
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
    // 2. HOTEL OPERATIONS (hotel_operations)
    // -------------------------------------------------------------------------
    {
        path: '/housekeeping/rooms',
        title: 'room_status_board',
        icon: BedDouble,
        description: 'Live room occupancy and cleanliness status board',
        allowedRoles: 'all',
        keywords: ['rooms', 'housekeeping', 'status', 'occupancy', 'cleaning'],
        group: 'hotel_operations',
        order: 1,
    },
    {
        path: '/housekeeping/tasks',
        title: 'housekeeping_tasks',
        icon: ClipboardCheck,
        description: 'Assign and track room turnover and cleaning checklists',
        allowedRoles: 'all',
        keywords: ['housekeeping', 'cleaning', 'tasks', 'turnover'],
        group: 'hotel_operations',
        order: 2,
    },
    {
        path: '/maintenance',
        title: 'maintenance',
        icon: Wrench,
        description: 'Submit, triage, and resolve maintenance tickets',
        allowedRoles: 'all',
        keywords: ['maintenance', 'repair', 'ticket', 'work order', 'engineering'],
        group: 'hotel_operations',
        order: 3,
    },
    {
        path: '/operations/guest-requests',
        title: 'guest_requests',
        icon: BellRing,
        description: 'Track and fulfill front-line guest service requests',
        allowedRoles: 'all',
        keywords: ['guest', 'concierge', 'service', 'amenities', 'requests'],
        group: 'hotel_operations',
        order: 4,
    },
    {
        path: '/operations/logbook',
        title: 'daily_logbook',
        icon: BookText,
        description: 'Duty manager shift log and handover notes',
        allowedRoles: 'all',
        keywords: ['logbook', 'shift', 'handover', 'duty manager'],
        group: 'hotel_operations',
        order: 5,
    },
    {
        path: '/operations/incidents',
        title: 'incidents',
        icon: AlertTriangle,
        description: 'Log and track operational, safety, and security incidents',
        allowedRoles: 'all',
        keywords: ['incident', 'safety', 'security', 'accident', 'hazard'],
        group: 'hotel_operations',
        order: 6,
    },
    {
        path: '/operations/vip-guests',
        title: 'vip_guests',
        icon: Crown,
        description: 'VIP guest arrivals, preferences, and special care',
        allowedRoles: 'all',
        keywords: ['vip', 'guest', 'amenities', 'executive', 'royalty'],
        group: 'hotel_operations',
        order: 7,
    },
    {
        path: '/operations/lost-found',
        title: 'lost_found',
        icon: PackageSearch,
        description: 'Lost and found item tracking and custody records',
        allowedRoles: 'all',
        keywords: ['lost', 'found', 'items', 'belongings', 'custody'],
        group: 'hotel_operations',
        order: 8,
    },
    {
        path: '/operations/projects',
        title: 'projects_capex',
        icon: Building2,
        description: 'Capital expenditure projects, hotel pre-opening checklists, and renovations',
        allowedRoles: 'all',
        keywords: ['capex', 'projects', 'pre-opening', 'renovation', 'budget'],
        group: 'hotel_operations',
        order: 9,
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
        path: '/announcements',
        title: 'announcements',
        icon: Megaphone,
        description: 'Company-wide and property-specific announcements',
        allowedRoles: 'all',
        keywords: ['news', 'announcements', 'broadcast', 'updates'],
        group: 'knowledge_sop',
        order: 2,
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
    // NOTE: the standalone System Wiki page was removed in the KB 8->3 consolidation.
    // The `system_wiki` table is retained; a later data-migration slice folds it into articles.
    // Secondary sub-routes (hidden from main sidebar navigation to keep UI clean)
    // NOTE: quiz + question bank surfaces consolidated into one page at /assessments
    // (src/pages/assessments/QuestionBank.tsx). Legacy /learning/quizzes and
    // /questions paths still redirect there. Keep this minimal if another branch
    // also edits navigation.ts.
    {
        path: '/assessments?section=assessments',
        title: 'quizzes',
        icon: CheckSquare,
        description: 'Manage quizzes',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'knowledge_sop',
        order: 10,
        hideFromNav: true,
    },
    {
        path: '/assessments',
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
    // 4. PEOPLE & HR (hr_staff)
    // -------------------------------------------------------------------------
    {
        path: '/directory',
        title: 'directory',
        icon: Users,
        description: 'Complete employee directory, contact info, and property staff',
        allowedRoles: 'all',
        keywords: ['directory', 'staff', 'employees', 'phonebook', 'team'],
        group: 'hr_staff',
        order: 1,
    },
    {
        path: '/hr/team',
        title: 'my_team',
        icon: UsersRound,
        description: 'Your direct reports, team attendance, and training status',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['team', 'direct reports', 'staff', 'roster', 'subordinates'],
        group: 'hr_staff',
        order: 2,
    },
    {
        path: '/hr/control',
        title: 'hr_control_center',
        icon: ClipboardList,
        description: 'Executive HR hub for approvals, leaves, and staff lifecycles',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['hr', 'control center', 'personnel', 'lifecycle'],
        group: 'hr_staff',
        order: 3,
    },
    {
        path: '/hr/scheduling',
        title: 'shift_scheduling',
        icon: Clock,
        description: 'Shift planning, roster builder, and attendance scheduling',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head', 'manager'],
        keywords: ['scheduling', 'shifts', 'roster', 'timetable', 'planning'],
        group: 'hr_staff',
        order: 4,
    },
    {
        path: '/hr/onboarding',
        title: 'onboarding_tracker',
        icon: CheckSquare,
        description: 'New hire onboarding tracking and 30-60-90 day checklists',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        keywords: ['onboarding', 'new hire', 'welcome', 'checklists'],
        group: 'hr_staff',
        order: 5,
    },
    {
        path: '/hr/performance-management',
        title: 'performance_management',
        icon: Award,
        description: 'Employee appraisals, performance reviews, and ratings',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['reviews', 'performance', 'evaluations', 'appraisals'],
        group: 'hr_staff',
        order: 6,
    },
    {
        path: '/hr/goals-management',
        title: 'goals_management',
        icon: Target,
        description: 'Departmental goals, milestones, and KPI alignment',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['goals', 'okr', 'kpi', 'targets'],
        group: 'hr_staff',
        order: 7,
    },
    {
        path: '/hr/payslips-management',
        title: 'payslips_management',
        icon: Wallet,
        description: 'Upload, publish, and manage employee monthly payroll slips',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        keywords: ['payroll', 'salary', 'payslips', 'wages'],
        group: 'hr_staff',
        order: 8,
    },
    {
        path: '/hr/referrals',
        title: 'referrals',
        icon: UserPlus,
        description: 'Employee referral program and candidate tracking',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['referral', 'recruitment', 'hiring', 'talent'],
        group: 'hr_staff',
        order: 9,
    },
    // Secondary personal HR items (hidden from main nav since they are also in personal_space or accessible via profile)
    {
        path: '/hr/payslips',
        title: 'payslips',
        icon: Wallet,
        description: 'Your payroll documents',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 10,
        hideFromNav: true,
    },
    {
        path: '/hr/performance',
        title: 'performance',
        icon: Award,
        description: 'Your performance reviews',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 11,
        hideFromNav: true,
    },
    {
        path: '/hr/goals',
        title: 'goals',
        icon: Target,
        description: 'Your career goals',
        allowedRoles: 'all',
        group: 'hr_staff',
        order: 12,
        hideFromNav: true,
    },

    // -------------------------------------------------------------------------
    // 5. FINANCE & COMMERCIAL (finance_revenue)
    // -------------------------------------------------------------------------
    {
        path: '/finance/budgets',
        title: 'budgets',
        icon: Wallet,
        description: 'Departmental operational budgets and variance tracking',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['budget', 'financials', 'accounting', 'cost centers'],
        group: 'finance_revenue',
        order: 1,
    },
    {
        path: '/finance/invoices',
        title: 'invoices',
        icon: FileText,
        description: 'Vendor invoice processing and approval workflows',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['invoices', 'bills', 'vendors', 'payables'],
        group: 'finance_revenue',
        order: 2,
    },
    {
        path: '/finance/chart-of-accounts',
        title: 'chart_of_accounts',
        icon: BookOpen,
        description: 'Master General Ledger chart of accounts catalog',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['chart of accounts', 'gl', 'ledger', 'accounting'],
        group: 'finance_revenue',
        order: 3,
    },
    {
        path: '/procurement/requests',
        title: 'purchase_requests',
        icon: ClipboardList,
        description: 'Submit and approve departmental purchase requests',
        allowedRoles: 'all',
        keywords: ['procurement', 'purchase', 'requests', 'supplies'],
        group: 'finance_revenue',
        order: 4,
    },
    {
        path: '/procurement/orders',
        title: 'purchase_orders',
        icon: Package,
        description: 'Purchase orders, delivery status, and receiving slips',
        allowedRoles: 'all',
        keywords: ['orders', 'po', 'goods receiving', 'purchasing'],
        group: 'finance_revenue',
        order: 5,
    },
    {
        path: '/procurement/inventory',
        title: 'inventory',
        icon: Boxes,
        description: 'Property inventory counts, PAR levels, and stock tracking',
        allowedRoles: 'all',
        keywords: ['inventory', 'stock', 'par levels', 'store'],
        group: 'finance_revenue',
        order: 6,
    },
    {
        path: '/procurement/suppliers',
        title: 'suppliers',
        icon: Truck,
        description: 'Corporate-wide approved supplier registry',
        allowedRoles: 'all',
        keywords: ['suppliers', 'vendors', 'contractors', 'partners'],
        group: 'finance_revenue',
        order: 7,
    },
    {
        path: '/commercial/accounts',
        title: 'commercial_accounts',
        icon: Briefcase,
        description: 'Corporate client accounts and negotiated corporate rates',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['corporate', 'clients', 'commercial', 'accounts'],
        group: 'finance_revenue',
        order: 8,
    },
    {
        path: '/commercial/leads',
        title: 'commercial_leads',
        icon: Target,
        description: 'Sales pipeline, group booking leads, and event inquiries',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['sales', 'leads', 'events', 'banquets', 'groups'],
        group: 'finance_revenue',
        order: 9,
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
        path: '/operations',
        title: 'operations_dashboard',
        icon: Activity,
        description: 'Operations data import, night audit metrics, and KPI analytics',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['night audit', 'operations dashboard', 'metrics'],
        group: 'administration',
        order: 2,
    },
    {
        path: '/operations/import',
        title: 'data_import',
        icon: Upload,
        description: 'Upload and validate PMS operations data and CSV files',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['import', 'upload', 'csv', 'pms data'],
        group: 'administration',
        order: 3,
    },
    {
        path: '/approvals',
        title: 'approvals',
        icon: CheckSquare,
        description: 'Central queue for all pending organizational approvals',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        badgeKey: 'pendingApprovals',
        keywords: ['approvals', 'pending', 'authorization', 'sign-off'],
        group: 'administration',
        order: 4,
    },
    {
        path: '/admin/quality-audits',
        title: 'quality_audits',
        icon: ClipboardList,
        description: 'Hotel brand standards quality audit checklists and inspections',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        keywords: ['audits', 'inspections', 'quality', 'standards'],
        group: 'administration',
        order: 5,
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
        path: '/admin/job-titles',
        title: 'job_titles',
        icon: Briefcase,
        description: 'Standardized hotel job titles and default role mappings',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        keywords: ['job titles', 'positions', 'designations'],
        group: 'administration',
        order: 7,
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
        path: '/admin/companies',
        title: 'company_management',
        icon: Building2,
        description: 'Manage legal operating companies and brands',
        allowedRoles: ['corporate_admin'],
        keywords: ['companies', 'legal entities', 'brands'],
        group: 'administration',
        order: 10,
        hideFromNav: true,
    },
    {
        path: '/hr/departments',
        title: 'departments',
        icon: Layers,
        description: 'Configure and manage property operational departments',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['departments', 'divisions', 'sections'],
        group: 'administration',
        order: 11,
    },
    {
        path: '/admin/workflows',
        title: 'automations',
        icon: Workflow,
        description: 'Automated notification rules, approval flows, and triggers',
        allowedRoles: ['corporate_admin', 'regional_admin', 'property_manager'],
        keywords: ['workflows', 'automation', 'triggers', 'rules'],
        group: 'administration',
        order: 12,
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
        path: '/admin/delegations',
        title: 'delegations',
        icon: ArrowRightLeft,
        description: 'Temporary delegation of managerial approval authority',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        keywords: ['delegations', 'substitute', 'acting manager'],
        group: 'administration',
        order: 15,
        hideFromNav: true,
    },
    {
        path: '/admin/email-writer',
        title: 'email_writer',
        icon: Mail,
        description: 'Compose branded corporate and guest emails with AI',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        keywords: ['email', 'writer', 'templates', 'communication'],
        group: 'administration',
        order: 16,
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
        ? ['/dashboard', '/learning/my', '/tasks', '/messaging', '/profile']
        : ['/dashboard', '/approvals', '/tasks', '/messaging', '/profile']

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
