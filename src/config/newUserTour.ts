import type { TourStep } from '@/hooks/useTour'
import type { AppRole } from '@/lib/constants'

/**
 * Base tour steps shown to ALL users
 */
const BASE_STEPS: TourStep[] = [
    {
        element: '#sidebar-logo',
        popover: {
            title: '🎉 Welcome to PRIME Connect!',
            description: 'This is your hotel intranet portal. Let us show you around!',
            side: 'right',
            align: 'start'
        }
    },
    {
        element: '#sidebar-nav',
        popover: {
            title: '📋 Navigation Menu',
            description: 'Access all your available features from here.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '#user-menu',
        popover: {
            title: '👤 Your Profile',
            description: 'View your profile, change settings, switch language, or log out.',
            side: 'bottom',
            align: 'end'
        }
    },
    {
        element: '#notifications-button',
        popover: {
            title: '🔔 Notifications',
            description: 'Stay updated with announcements and important alerts.',
            side: 'bottom',
            align: 'center'
        }
    }
]

/**
 * Steps for STAFF roles (housekeeping, front_desk, staff)
 */
const STAFF_STEPS: TourStep[] = [
    {
        element: '[data-nav="tasks"]',
        popover: {
            title: '✅ My Tasks',
            description: 'View and complete your daily assigned tasks here.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="training"]',
        popover: {
            title: '📚 Training',
            description: 'Access your training modules and track your progress.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="knowledge"]',
        popover: {
            title: '📖 Knowledge Base',
            description: 'Find SOPs, policies, and procedures for your department.',
            side: 'right',
            align: 'center'
        }
    }
]

/**
 * Steps for MANAGER roles (department_head, property_manager)
 */
const MANAGER_STEPS: TourStep[] = [
    {
        element: '[data-nav="dashboard"]',
        popover: {
            title: '📊 Dashboard',
            description: 'View team performance, pending approvals, and key metrics.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="approvals"]',
        popover: {
            title: '✍️ Approvals',
            description: 'Review and approve leave requests, documents, and more.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="reports"]',
        popover: {
            title: '📈 Reports',
            description: 'Access detailed reports and analytics for your team.',
            side: 'right',
            align: 'center'
        }
    }
]

/**
 * Steps for HR roles (property_hr, regional_hr)
 */
const HR_STEPS: TourStep[] = [
    {
        element: '[data-nav="users"]',
        popover: {
            title: '👥 User Management',
            description: 'Add, edit, and manage employee accounts.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="onboarding"]',
        popover: {
            title: '🚀 Onboarding',
            description: 'Track new employee onboarding progress.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="hr"]',
        popover: {
            title: '📋 HR Management',
            description: 'Manage leave, attendance, and HR policies.',
            side: 'right',
            align: 'center'
        }
    }
]

/**
 * Steps for ADMIN roles (super_admin, regional_admin)
 */
const ADMIN_STEPS: TourStep[] = [
    {
        element: '[data-nav="admin"]',
        popover: {
            title: '⚙️ Administration',
            description: 'Full system configuration and management.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="audit"]',
        popover: {
            title: '📝 Audit Logs',
            description: 'Track all system activities and changes.',
            side: 'right',
            align: 'center'
        }
    },
    {
        element: '[data-nav="settings"]',
        popover: {
            title: '🔧 Settings',
            description: 'Configure system-wide settings and preferences.',
            side: 'right',
            align: 'center'
        }
    }
]

/**
 * Get tour steps based on user role
 */
export function getTourStepsForRole(role: AppRole | string | undefined): TourStep[] {
    const steps = [...BASE_STEPS]

    // Staff-level roles
    if (['staff', 'housekeeping', 'front_desk', 'maintenance', 'food_and_beverage'].includes(role || '')) {
        steps.push(...STAFF_STEPS)
    }

    // Manager-level roles
    if (['department_head', 'property_manager', 'general_manager'].includes(role || '')) {
        steps.push(...MANAGER_STEPS)
    }

    // HR roles
    if (['property_hr', 'regional_hr'].includes(role || '')) {
        steps.push(...HR_STEPS)
    }

    // Admin roles
    if (['super_admin', 'regional_admin'].includes(role || '')) {
        steps.push(...ADMIN_STEPS)
    }

    return steps
}

// Storage key prefixes (user ID will be appended)
const WIZARD_COMPLETED_PREFIX = 'prime_wizard_completed_'
const WIZARD_PENDING_KEY = 'prime_wizard_pending'  // Pending is always for current session

/**
 * Check if wizard should show for the given user
 */
export function shouldShowWizard(userId?: string | null): boolean {
    const pending = localStorage.getItem(WIZARD_PENDING_KEY)
    if (!pending || pending !== 'true') return false

    // If no userId yet, we can't check completion - wait for it
    if (!userId) return false

    const completedKey = WIZARD_COMPLETED_PREFIX + userId
    const completed = localStorage.getItem(completedKey)
    return completed !== 'true'
}

/**
 * Mark wizard as pending (for current session, before redirect)
 */
export function markWizardPending(): void {
    localStorage.setItem(WIZARD_PENDING_KEY, 'true')
}

/**
 * Mark wizard as completed for a specific user
 */
export function markWizardCompleted(userId: string): void {
    localStorage.removeItem(WIZARD_PENDING_KEY)
    const completedKey = WIZARD_COMPLETED_PREFIX + userId
    localStorage.setItem(completedKey, 'true')
}

/**
 * Clear wizard pending state (for testing)
 */
export function resetWizardState(userId?: string): void {
    localStorage.removeItem(WIZARD_PENDING_KEY)
    if (userId) {
        localStorage.removeItem(WIZARD_COMPLETED_PREFIX + userId)
    }
}
