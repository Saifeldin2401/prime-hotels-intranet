import { lazy } from 'react'
import type { AppRole } from '@/lib/constants'

// Define the shape of a Widget configuration in the registry
export interface WidgetConfig {
    id: string
    component: React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>
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

// Lazy load the widget components to optimize bundle size
const QuickInsights = lazy(() => import('./QuickInsights').then(module => ({ default: module.QuickInsights })))
const MotivationWidget = lazy(() => import('./MotivationWidget').then(module => ({ default: module.MotivationWidget })))
const StatsGrid = lazy(() => import('./StatsGrid').then(module => ({ default: module.StatsGrid })))
const QuickActions = lazy(() => import('./QuickActions').then(module => ({ default: module.QuickActions })))
const KnowledgeBaseWidget = lazy(() => import('./KnowledgeBaseWidget').then(module => ({ default: module.KnowledgeBaseWidget })))
const MaintenanceWidget = lazy(() => import('./MaintenanceWidget').then(module => ({ default: module.MaintenanceWidget })))
const TrainingProgress = lazy(() => import('./TrainingProgress').then(module => ({ default: module.TrainingProgress })))
const AnnouncementsWidget = lazy(() => import('./AnnouncementsWidget').then(module => ({ default: module.AnnouncementsWidget })))
const TeamWidget = lazy(() => import('./TeamWidget').then(module => ({ default: module.TeamWidget })))
const PerformanceChart = lazy(() => import('./PerformanceChart').then(module => ({ default: module.PerformanceChart })))
const EmployeeOfMonthWidget = lazy(() => import('./EmployeeOfMonthWidget').then(module => ({ default: module.EmployeeOfMonthWidget })))
const TasksWidget = lazy(() => import('./TasksWidget').then(module => ({ default: module.TasksWidget })))
const CalendarWidget = lazy(() => import('./CalendarWidget').then(module => ({ default: module.CalendarWidget })))
const HospitalityNewsWidget = lazy(() => import('./HospitalityNewsWidget').then(module => ({ default: module.HospitalityNewsWidget })))
const TodaysBirthdaysWidget = lazy(() => import('./TodaysBirthdaysWidget').then(module => ({ default: module.TodaysBirthdaysWidget })))
const OnlineUsersWidget = lazy(() => import('./OnlineUsersWidget').then(module => ({ default: module.OnlineUsersWidget })))

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
        requiredRoles: ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'],
        defaultVisible: true,
        sensitivity: 'low'
    },
    performanceChart: {
        id: 'performanceChart',
        component: PerformanceChart,
        title: 'Performance Analytics',
        requiredRoles: ['all'],
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
    }
}

export type WidgetId = keyof typeof WIDGET_REGISTRY
