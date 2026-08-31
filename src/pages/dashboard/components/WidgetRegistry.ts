import type { AppRole } from '@/lib/constants'
import { createElement, lazy } from 'react'

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
        w: 1 | 2 | 3 | 4
        h: number
    }
    sensitivity?: 'low' | 'medium' | 'high'
    defaultVisible?: boolean
}

const MissingWidget = ({ name }: { name: string }) =>
    createElement(
        'div',
        { className: 'rounded-xl border border-dashed border-slate-200 bg-card p-4 text-xs text-muted-foreground' },
        `${name} loaded.`
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

// Lazy load the modern widgets
const DashboardMetricsDeck = lazyWidget(() => import('./DashboardMetricsDeck'), 'DashboardMetricsDeck')
const RecentKnowledgeWidget = lazyWidget(() => import('./RecentKnowledgeWidget'), 'RecentKnowledgeWidget')
const ActiveLearningsWidget = lazyWidget(() => import('./ActiveLearningsWidget'), 'ActiveLearningsWidget')
const AnnouncementsFeedWidget = lazyWidget(() => import('./AnnouncementsFeedWidget'), 'AnnouncementsFeedWidget')
const ReviewQueueWidget = lazyWidget(() => import('./ReviewQueueWidget'), 'ReviewQueueWidget')
const TasksWidget = lazyWidget(() => import('./TasksWidget'), 'TasksWidget')
const CalendarWidget = lazyWidget(() => import('./CalendarWidget'), 'CalendarWidget')
const WeatherClockPrayerCard = lazyWidget(() => import('./WeatherClockPrayerCard'), 'WeatherClockPrayerCard')
const EmployeeOfMonthWidget = lazyWidget(() => import('./EmployeeOfMonthWidget'), 'EmployeeOfMonthWidget')
const TodaysBirthdaysWidget = lazyWidget(() => import('./TodaysBirthdaysWidget'), 'TodaysBirthdaysWidget')
const OnlineUsersWidget = lazyWidget(() => import('./OnlineUsersWidget'), 'OnlineUsersWidget')
const NotificationsPanel = lazyWidget(() => import('./NotificationsPanel'), 'NotificationsPanel')

/**
 * WIDGET_REGISTRY
 * Centralized definition of all modern dashboard widgets.
 */
export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
    metricsDeck: {
        id: 'metricsDeck',
        component: DashboardMetricsDeck,
        title: 'Enterprise Metrics',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    knowledgeBase: {
        id: 'knowledgeBase',
        component: RecentKnowledgeWidget,
        title: 'Recent SOPs & Knowledge Base',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    training: {
        id: 'training',
        component: ActiveLearningsWidget,
        title: 'Active Learning Pathways',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    announcements: {
        id: 'announcements',
        component: AnnouncementsFeedWidget,
        title: 'Announcements Feed',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    reviewQueue: {
        id: 'reviewQueue',
        component: ReviewQueueWidget,
        title: 'Governance & Review Queue',
        requiredRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'],
        defaultVisible: true,
        sensitivity: 'high'
    },
    tasks: {
        id: 'tasks',
        component: TasksWidget,
        title: 'My Tasks',
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
    weatherClock: {
        id: 'weatherClock',
        component: WeatherClockPrayerCard,
        title: "Today's Overview & Prayer Times",
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
    onlineUsers: {
        id: 'onlineUsers',
        component: OnlineUsersWidget,
        title: 'Online Users',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    notifications: {
        id: 'notifications',
        component: NotificationsPanel,
        title: 'Notifications Center',
        requiredRoles: ['all'],
        defaultVisible: true,
        sensitivity: 'low'
    }
}

// Widget keys are the string keys of WIDGET_REGISTRY. Kept as a named alias so the
// permission/preferences hooks that predate the deck rebuild keep type-checking.
export type WidgetId = string

export type LayoutProfile = 'corporate' | 'regional' | 'property_mgmt' | 'department_head' | 'staff'

export interface UserDashboardContext {
    primaryRole?: AppRole
    isMultiProperty: boolean
    departmentIds: string[]
    propertyIds: string[]
}

export function getDashboardContext(
    primaryRole?: AppRole,
    isMultiProperty: boolean = false,
    departmentIds: string[] = [],
    propertyIds: string[] = []
): UserDashboardContext {
    return {
        primaryRole,
        isMultiProperty,
        departmentIds,
        propertyIds
    }
}

export function getDynamicLayoutProfile(context: UserDashboardContext): LayoutProfile {
    const { primaryRole } = context

    if (primaryRole === 'super_admin' || primaryRole === 'corporate_admin') {
        return 'corporate'
    }
    if (primaryRole === 'regional_admin' || primaryRole === 'regional_hr') {
        return 'regional'
    }
    if (primaryRole === 'property_manager' || primaryRole === 'property_hr') {
        return 'property_mgmt'
    }
    if (primaryRole === 'department_head') {
        return 'department_head'
    }
    return 'staff'
}
