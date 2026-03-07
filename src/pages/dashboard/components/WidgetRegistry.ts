import { lazy, createElement } from 'react'
import type { AppRole } from '@/lib/constants'

type WidgetComponentProps = Record<string, unknown>
type WidgetComponent = React.ComponentType<WidgetComponentProps>

// Define the shape of a Widget configuration in the registry
export interface WidgetConfig {
    id: string
    component: React.LazyExoticComponent<WidgetComponent> | WidgetComponent
    title: string
    requiredRoles: (AppRole | 'all')[]
    requiredDepartments?: string[]
    gridSize?: {
        w: 1 | 2 | 3 | 4 // Out of a 4-column grid (or 12 depending on implementation)
        h: number
    }
    sensitivity?: 'low' | 'medium' | 'high'
    defaultVisible?: boolean
}

const MissingWidget = ({ name }: { name: string }) =>
    createElement(
        'div',
        { className: 'rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500' },
        `${name} failed to load.`
    )

const lazyWidget = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
    lazy<WidgetComponent>(async () => {
        const module = await loader()
        const component = (module[exportName] as WidgetComponent | undefined) ?? (module.default as WidgetComponent | undefined)
        if (!component) {
            console.error(`Widget export "${exportName}" not found.`)
            return { default: (() => createElement(MissingWidget, { name: exportName })) as unknown as WidgetComponent }
        }
        return { default: component }
    })

// Lazy load the widget components to optimize bundle size
const QuickInsights = lazyWidget(() => import('./QuickInsights'), 'QuickInsights')
const MotivationWidget = lazyWidget(() => import('./MotivationWidget'), 'MotivationWidget')
const StatsGrid = lazyWidget(() => import('./StatsGrid'), 'StatsGrid')
const QuickActions = lazyWidget(() => import('./QuickActions'), 'QuickActions')
const KnowledgeBaseWidget = lazyWidget(() => import('./KnowledgeBaseWidget'), 'KnowledgeBaseWidget')
const MaintenanceWidget = lazyWidget(() => import('./MaintenanceWidget'), 'MaintenanceWidget')
const TrainingProgress = lazyWidget(() => import('./TrainingProgress'), 'TrainingProgress')
const AnnouncementsWidget = lazyWidget(() => import('./AnnouncementsWidget'), 'AnnouncementsWidget')
const TeamWidget = lazyWidget(() => import('./TeamWidget'), 'TeamWidget')
const PerformanceChart = lazyWidget(() => import('./PerformanceChart'), 'PerformanceChart')
const EmployeeOfMonthWidget = lazyWidget(() => import('./EmployeeOfMonthWidget'), 'EmployeeOfMonthWidget')
const TasksWidget = lazyWidget(() => import('./TasksWidget'), 'TasksWidget')
const CalendarWidget = lazyWidget(() => import('./CalendarWidget'), 'CalendarWidget')
const HospitalityNewsWidget = lazyWidget(() => import('./HospitalityNewsWidget'), 'HospitalityNewsWidget')
const TodaysBirthdaysWidget = lazyWidget(() => import('./TodaysBirthdaysWidget'), 'TodaysBirthdaysWidget')
const OnlineUsersWidget = lazyWidget(() => import('./OnlineUsersWidget'), 'OnlineUsersWidget')
const PinnedItemsWidget = lazyWidget(() => import('./PinnedItemsWidget'), 'PinnedItemsWidget')
const RoleAwareInsights = lazyWidget(() => import('./RoleAwareInsights'), 'RoleAwareInsights')
const ShiftHandoverWidget = lazyWidget(() => import('./ShiftHandoverWidget'), 'ShiftHandoverWidget')
const EliteSpotlightWidget = lazyWidget(() => import('./EliteSpotlightWidget'), 'EliteSpotlightWidget')

/**
 * WIDGET_REGISTRY
 * Centralized definition of all dynamic dashboard widgets.
 * Defines access control, layout behavior, and component loading.
 */
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
    quickInsights: {
        id: 'quickInsights',
        component: QuickInsights,
        title: 'Quick Insights',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    roleAwareInsights: {
        id: 'roleAwareInsights',
        component: RoleAwareInsights,
        title: 'Operational Overview',
        requiredRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        defaultVisible: true,
        sensitivity: 'high'
    },
    motivation: {
        id: 'motivation',
        component: MotivationWidget,
        title: 'Motivation',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    statsGrid: {
        id: 'statsGrid',
        component: StatsGrid,
        title: 'Statistics Overview',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    quickActions: {
        id: 'quickActions',
        component: QuickActions,
        title: 'Quick Actions',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    announcements: {
        id: 'announcements',
        component: AnnouncementsWidget,
        title: 'Announcements',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    tasks: {
        id: 'tasks',
        component: TasksWidget,
        title: 'My Tasks',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    training: {
        id: 'training',
        component: TrainingProgress,
        title: 'Training Progress',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    calendar: {
        id: 'calendar',
        component: CalendarWidget,
        title: 'Schedule & Calendar',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    knowledgeBase: {
        id: 'knowledgeBase',
        component: KnowledgeBaseWidget,
        title: 'Knowledge Base',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    employeeOfMonth: {
        id: 'employeeOfMonth',
        component: EmployeeOfMonthWidget,
        title: 'Employee of the Month',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    todaysBirthdays: {
        id: 'todaysBirthdays',
        component: TodaysBirthdaysWidget,
        title: "Today's Birthdays",
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    hospitalityNews: {
        id: 'hospitalityNews',
        component: HospitalityNewsWidget,
        title: 'Hospitality News',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    performanceChart: {
        id: 'performanceChart',
        component: PerformanceChart,
        title: 'Performance Analytics',
        requiredRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        defaultVisible: true,
        sensitivity: 'high'
    },
    maintenance: {
        id: 'maintenance',
        component: MaintenanceWidget,
        title: 'Maintenance Overview',
        requiredRoles: ['corporate_admin', 'regional_admin', 'property_manager', 'department_head'],
        defaultVisible: false,
        sensitivity: 'medium'
    },
    teamActivity: {
        id: 'teamActivity',
        component: TeamWidget,
        title: 'Team Activity',
        requiredRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    onlineUsers: {
        id: 'onlineUsers',
        component: OnlineUsersWidget,
        title: 'Online Users',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    pinnedItems: {
        id: 'pinnedItems',
        component: PinnedItemsWidget,
        title: 'Pinned Items',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low',
        gridSize: { w: 2, h: 2 }
    },
    shiftHandover: {
        id: 'shiftHandover',
        component: ShiftHandoverWidget,
        title: 'Shift Handover',
        requiredRoles: ['property_manager', 'department_head', 'manager', 'corporate_admin'],
        defaultVisible: true,
        sensitivity: 'medium'
    },
    eliteSpotlight: {
        id: 'eliteSpotlight',
        component: EliteSpotlightWidget,
        title: 'Elite Spotlight',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    }
}

export type WidgetId = keyof typeof WIDGET_REGISTRY

export type DashboardWidgetId = WidgetId | 'socialFeed'

export interface LayoutProfile {
    mainColumn: (DashboardWidgetId | DashboardWidgetId[])[]
    sidebar: DashboardWidgetId[]
    bottomFullWidth?: DashboardWidgetId[]
}

export const LAYOUT_PROFILES: Record<'corporate' | 'manager' | 'staff', LayoutProfile> = {
    corporate: {
        mainColumn: [
            'quickInsights',
            'roleAwareInsights',
            'performanceChart',
            'eliteSpotlight',
            'quickActions',
            'hospitalityNews'
        ],
        sidebar: [
            'motivation',
            'announcements',
            'pinnedItems',
            'knowledgeBase',
            'onlineUsers'
        ],
        bottomFullWidth: [
            'socialFeed' // Internal Activity
        ]
    },
    manager: {
        mainColumn: [
            'quickInsights',
            'roleAwareInsights',
            ['tasks', 'calendar'],
            'shiftHandover',
            'quickActions',
            'hospitalityNews'
        ],
        sidebar: [
            'motivation',
            'maintenance',
            'announcements',
            'eliteSpotlight',
            'todaysBirthdays',
            'knowledgeBase'
        ],
        bottomFullWidth: [
            'socialFeed'
        ]
    },
    staff: {
        mainColumn: [
            'motivation',
            ['tasks', 'calendar'],
            'training',
            'quickActions',
            'hospitalityNews'
        ],
        sidebar: [
            'announcements',
            'pinnedItems',
            'employeeOfMonth',
            'eliteSpotlight',
            'todaysBirthdays',
            'knowledgeBase'
        ],
        bottomFullWidth: [
            'socialFeed'
        ]
    }
}

export const getLayoutProfile = (role: AppRole | null | undefined): LayoutProfile => {
    if (!role) return LAYOUT_PROFILES.staff

    if (['corporate_admin', 'regional_admin', 'super_admin'].includes(role)) {
        return LAYOUT_PROFILES.corporate
    }

    if (['property_manager', 'property_hr', 'department_head', 'manager'].includes(role)) {
        return LAYOUT_PROFILES.manager
    }

    return LAYOUT_PROFILES.staff
}
