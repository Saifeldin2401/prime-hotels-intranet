import { FileText, Settings, Users, Home, BookOpen, GraduationCap, ClipboardList, Building, MessageSquare } from 'lucide-react'

export interface SearchablePage {
    id: string
    title: string
    description: string
    url: string
    keywords: string[]
    icon: string // Store icon name as string to avoid serialization issues, map in component
    category: 'System' | 'HR' | 'Operations' | 'Learning'
}

export const SYSTEM_PAGES: SearchablePage[] = [
    // System & General
    {
        id: 'page-home',
        title: 'Dashboard',
        description: 'Overview of your activities and tasks',
        url: '/',
        keywords: ['home', 'start', 'main', 'dashboard'],
        icon: 'Home',
        category: 'System'
    },
    {
        id: 'page-settings',
        title: 'Settings',
        description: 'Manage account and application preferences',
        url: '/settings',
        keywords: ['config', 'preferences', 'account', 'profile', 'password'],
        icon: 'Settings',
        category: 'System'
    },

    // Knowledge & Training
    {
        id: 'page-sops',
        title: 'SOP Library',
        description: 'Standard Operating Procedures and guidelines',
        url: '/sops',
        keywords: ['sops', 'procedures', 'rules', 'guidelines', 'policy', 'standards'],
        icon: 'BookOpen',
        category: 'Operations'
    },
    {
        id: 'page-documents',
        title: 'Document Center',
        description: 'All company documents and files',
        url: '/documents',
        keywords: ['files', 'docs', 'pdf', 'forms', 'templates'],
        icon: 'FileText',
        category: 'Operations'
    },
    {
        id: 'page-training',
        title: 'Training Dashboard',
        description: 'My learning paths and assigned modules',
        url: '/training',
        keywords: ['learn', 'course', 'education', 'modules', 'assignments'],
        icon: 'GraduationCap',
        category: 'Learning'
    },

    // HR & Staff
    {
        id: 'page-directory',
        title: 'Employee Directory',
        description: 'Find contact information for staff',
        url: '/directory',
        keywords: ['staff', 'people', 'contacts', 'phone', 'email', 'users', 'search staff'],
        icon: 'Users',
        category: 'HR'
    },
    {
        id: 'page-tasks',
        title: 'My Tasks',
        description: 'View and manage your assigned tasks',
        url: '/tasks',
        keywords: ['todo', 'work', 'jobs', 'assignments', 'checklist'],
        icon: 'ClipboardList',
        category: 'Operations'
    },

    // Communication
    {
        id: 'page-messages',
        title: 'Messages',
        description: 'Internal chat and communications',
        url: '/messages',
        keywords: ['chat', 'email', 'inbox', 'conversation', 'dm'],
        icon: 'MessageSquare',
        category: 'System'
    }
]
