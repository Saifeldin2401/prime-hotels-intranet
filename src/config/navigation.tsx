import {
    LayoutDashboard,
    Users,
    Key,
    Settings,
    Shield,
    FileText,
    BookOpen,
    HelpCircle,
    Bell,
    Calendar,
    Award,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    PlusCircle,
    Download,
    Eye,
    ChevronDown,
    Search,
    UserPlus,
    Building2,
    Briefcase,
    Activity,
    ClipboardList,
    Workflow,
    Brain,
    Layers,
    History,
    FileSearch,
    Microscope,
    UserCheck,
    Lock,
    Globe,
    Zap,
    Scale,
    Tornado
} from 'lucide-react'
import type { NavItem } from '../lib/types'

export const navigation: NavItem[] = [
    {
        path: '/',
        title: 'dashboard',
        icon: LayoutDashboard,
        description: 'Main overview of your activities',
        allowedRoles: ['all']
    },
    // Training Group
    {
        path: '/training',
        title: 'training',
        icon: Award,
        description: 'Training and certifications',
        allowedRoles: ['all'],
        group: 'learning'
    },
    {
        path: '/training/hub',
        title: 'training_hub',
        icon: Layers,
        description: 'Central hub for training management',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        group: 'learning',
        order: 1.1
    },
    {
        path: '/training/certificates',
        title: 'certificates',
        icon: Award,
        description: 'View and download certificates',
        allowedRoles: ['all'],
        group: 'learning',
        order: 1.2
    },
    {
        path: '/training/paths',
        title: 'training_paths',
        icon: Zap,
        description: 'Structured learning pathways',
        allowedRoles: ['all'],
        group: 'learning',
        order: 1.3
    },
    {
        path: '/training/analytics',
        title: 'training_analytics',
        icon: Activity,
        description: 'Insights into training performance',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'learning',
        order: 1.4
    },
    // Learning Group
    {
        path: '/learning',
        title: 'learning',
        icon: BookOpen,
        description: 'My learning and quizzes',
        allowedRoles: ['all'],
        group: 'learning'
    },
    {
        path: '/learning/my',
        title: 'my_learning',
        icon: BookOpen,
        description: 'Your assigned and completed courses',
        allowedRoles: ['all'],
        group: 'learning',
        order: 2.1
    },
    {
        path: '/learning/quizzes',
        title: 'quizzes',
        icon: HelpCircle,
        description: 'Take and manage quizzes',
        allowedRoles: ['all'],
        group: 'learning',
        order: 2.2
    },
    {
        path: '/learning/assignments',
        title: 'assignments',
        icon: ClipboardList,
        description: 'Manage course assignments',
        allowedRoles: ['regional_admin', 'regional_hr', 'property_hr', 'department_head'],
        group: 'learning',
        order: 2.3
    },
    // Knowledge Base Group
    {
        path: '/knowledge',
        title: 'knowledge_base',
        icon: FileText,
        description: 'Policies, SOPs, and company information',
        allowedRoles: ['all'],
        group: 'knowledge'
    },
    {
        path: '/knowledge/articles',
        title: 'articles',
        icon: FileText,
        description: 'Browse knowledge base articles',
        allowedRoles: ['all'],
        group: 'knowledge',
        order: 3.1
    },
    {
        path: '/knowledge/favorites',
        title: 'favorites',
        icon: Zap,
        description: 'Your bookmarked articles',
        allowedRoles: ['all'],
        group: 'knowledge',
        order: 3.2
    },
    // Task Management Group
    {
        path: '/tasks',
        title: 'tasks',
        icon: ChecklistIcon,
        description: 'Manage your tasks and projects',
        allowedRoles: ['all'],
        group: 'tasks'
    },
    {
        path: '/tasks/my',
        title: 'my_tasks',
        icon: ChecklistIcon,
        description: 'Tasks assigned to you',
        allowedRoles: ['all'],
        group: 'tasks',
        order: 4.1
    },
    {
        path: '/tasks/board',
        title: 'task_board',
        icon: LayoutDashboard,
        description: 'Visual task management board',
        allowedRoles: ['all'],
        group: 'tasks',
        order: 4.2
    },
    // Administration Group
    {
        path: '/admin',
        title: 'administration',
        icon: Shield,
        description: 'System administration and management',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration'
    },
    {
        path: '/admin/users',
        title: 'user_management',
        icon: Users,
        description: 'Manage system users and properties',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1.1
    },
    {
        path: '/admin/organization',
        title: 'org_control_center',
        icon: Building2,
        description: 'Manage hotel properties and departments',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr'],
        group: 'administration',
        order: 1.2
    },
    {
        path: '/admin/job-titles',
        title: 'job_titles',
        icon: Briefcase,
        description: 'Manage enterprise job titles',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 1.3
    },
    {
        path: '/admin/properties',
        title: 'hotel_properties',
        icon: Building2,
        description: 'Manage hotel locations',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 1.4
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
        path: '/admin/notifications',
        title: 'notification_batches',
        icon: Bell,
        description: 'Monitor bulk notification jobs',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 3.8
    },
    {
        path: '/admin/issue-certificate',
        title: 'issue_certificate',
        icon: Award,
        description: 'Manually issue certificates to employees',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 3.9
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
        description: 'PII data access history',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr'],
        group: 'administration',
        order: 5.1
    },
    {
        path: '/admin/routing-health',
        title: 'routing_health',
        icon: Tornado,
        description: 'Dynamic navigation state monitoring',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr'],
        group: 'administration',
        order: 5.5
    },
    {
        path: '/admin/escalation',
        title: 'escalation_rules',
        icon: History,
        description: 'Manage ticket escalation logic',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 6.1
    },
    {
        path: '/admin/delegations',
        title: 'delegation_settings',
        icon: UserCheck,
        description: 'Manage authority delegation rules',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 6.5
    },
    {
        path: '/admin/sla',
        title: 'sla_settings',
        icon: Lock,
        description: 'Enterprise SLA monitoring and settings',
        allowedRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        group: 'administration',
        order: 6.6
    },
    {
        path: '/admin/settings',
        title: 'system_settings',
        icon: Settings,
        description: 'Global application configuration',
        allowedRoles: ['corporate_admin', 'regional_admin'],
        group: 'administration',
        order: 10
    }
]

// Icons
function ChecklistIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
