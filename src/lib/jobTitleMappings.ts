import type { AppRole } from './constants'

/**
 * Common hotel job titles mapped to system permission roles
 * This mapping is used to auto-suggest the appropriate system role
 * when creating or updating employee profiles
 */

export interface JobTitleDefinition {
    title: string
    role: AppRole
    category: string
}

// Comprehensive list of hotel job titles and their system role mappings
export const JOB_TITLE_MAPPINGS: JobTitleDefinition[] = [
    // Front Office - Staff Level
    { title: 'Front Desk Agent', role: 'staff', category: 'Front Office' },
    { title: 'Guest Service Agent', role: 'staff', category: 'Front Office' },
    { title: 'Night Auditor', role: 'staff', category: 'Front Office' },
    { title: 'Bellman', role: 'staff', category: 'Front Office' },
    { title: 'Concierge', role: 'staff', category: 'Front Office' },
    { title: 'Door Attendant', role: 'staff', category: 'Front Office' },
    { title: 'Valet Attendant', role: 'staff', category: 'Front Office' },

    // Housekeeping - Staff Level
    { title: 'Room Attendant', role: 'staff', category: 'Housekeeping' },
    { title: 'Housekeeping Attendant', role: 'staff', category: 'Housekeeping' },
    { title: 'Laundry Attendant', role: 'staff', category: 'Housekeeping' },
    { title: 'Public Area Attendant', role: 'staff', category: 'Housekeeping' },
    { title: 'Linen Attendant', role: 'staff', category: 'Housekeeping' },

    // Food & Beverage - Staff Level
    { title: 'Server', role: 'staff', category: 'Food & Beverage' },
    { title: 'Waiter', role: 'staff', category: 'Food & Beverage' },
    { title: 'Waitress', role: 'staff', category: 'Food & Beverage' },
    { title: 'Bartender', role: 'staff', category: 'Food & Beverage' },
    { title: 'Barista', role: 'staff', category: 'Food & Beverage' },
    { title: 'Kitchen Steward', role: 'staff', category: 'Food & Beverage' },
    { title: 'Commis Chef', role: 'staff', category: 'Food & Beverage' },
    { title: 'Demi Chef', role: 'staff', category: 'Food & Beverage' },
    { title: 'Room Service Attendant', role: 'staff', category: 'Food & Beverage' },

    // Engineering - Staff Level
    { title: 'Maintenance Technician', role: 'staff', category: 'Engineering' },
    { title: 'Engineering Attendant', role: 'staff', category: 'Engineering' },
    { title: 'HVAC Technician', role: 'staff', category: 'Engineering' },
    { title: 'Electrician', role: 'staff', category: 'Engineering' },
    { title: 'Plumber', role: 'staff', category: 'Engineering' },

    // Sales & Marketing - Staff Level
    { title: 'Sales Coordinator', role: 'staff', category: 'Sales & Marketing' },
    { title: 'Reservations Agent', role: 'staff', category: 'Sales & Marketing' },
    { title: 'Marketing Coordinator', role: 'staff', category: 'Sales & Marketing' },

    // Front Office - Department Head Level
    { title: 'Front Office Supervisor', role: 'department_head', category: 'Front Office' },
    { title: 'Assistant Front Office Manager', role: 'department_head', category: 'Front Office' },
    { title: 'Front Office Manager', role: 'department_head', category: 'Front Office' },
    { title: 'Guest Relations Manager', role: 'department_head', category: 'Front Office' },
    { title: 'Front Desk Manager', role: 'department_head', category: 'Front Office' },

    // Housekeeping - Department Head Level
    { title: 'Housekeeping Supervisor', role: 'department_head', category: 'Housekeeping' },
    { title: 'Assistant Executive Housekeeper', role: 'department_head', category: 'Housekeeping' },
    { title: 'Executive Housekeeper', role: 'department_head', category: 'Housekeeping' },
    { title: 'Laundry Manager', role: 'department_head', category: 'Housekeeping' },

    // Food & Beverage - Department Head Level
    { title: 'Restaurant Supervisor', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Restaurant Manager', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Food & Beverage Manager', role: 'department_head', category: 'Food & Beverage' },
    { title: 'F&B Manager', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Executive Chef', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Sous Chef', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Chef de Partie', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Banquet Manager', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Bar Manager', role: 'department_head', category: 'Food & Beverage' },
    { title: 'Pastry Chef', role: 'department_head', category: 'Food & Beverage' },

    // Engineering - Department Head Level
    { title: 'Chief Engineer', role: 'department_head', category: 'Engineering' },
    { title: 'Maintenance Manager', role: 'department_head', category: 'Engineering' },
    { title: 'Assistant Chief Engineer', role: 'department_head', category: 'Engineering' },
    { title: 'Engineering Manager', role: 'department_head', category: 'Engineering' },

    // Sales & Marketing - Department Head Level
    { title: 'Sales Manager', role: 'department_head', category: 'Sales & Marketing' },
    { title: 'Revenue Manager', role: 'department_head', category: 'Sales & Marketing' },
    { title: 'Director of Sales', role: 'department_head', category: 'Sales & Marketing' },
    { title: 'Marketing Manager', role: 'department_head', category: 'Sales & Marketing' },

    // Other Departments - Department Head Level
    { title: 'Security Manager', role: 'department_head', category: 'Security' },
    { title: 'Recreation Manager', role: 'department_head', category: 'Recreation' },
    { title: 'Spa Manager', role: 'department_head', category: 'Spa' },
    { title: 'Fitness Manager', role: 'department_head', category: 'Recreation' },
    { title: 'Conference Manager', role: 'department_head', category: 'Conference' },
    { title: 'Purchasing Manager', role: 'department_head', category: 'Purchasing' },
    { title: 'IT Manager', role: 'department_head', category: 'Information Technology' },

    // Property HR Level
    { title: 'HR Coordinator', role: 'property_hr', category: 'Human Resources' },
    { title: 'HR Officer', role: 'property_hr', category: 'Human Resources' },
    { title: 'Property HR Manager', role: 'property_hr', category: 'Human Resources' },
    { title: 'Cluster HR Manager', role: 'property_hr', category: 'Human Resources' },
    { title: 'Learning & Development Coordinator', role: 'property_hr', category: 'Human Resources' },
    { title: 'HR Manager', role: 'property_hr', category: 'Human Resources' },
    { title: 'Talent Acquisition Manager', role: 'property_hr', category: 'Human Resources' },

    // Property Manager Level
    { title: 'General Manager', role: 'property_manager', category: 'Management' },
    { title: 'Hotel Manager', role: 'property_manager', category: 'Management' },
    { title: 'Resident Manager', role: 'property_manager', category: 'Management' },
    { title: 'Assistant General Manager', role: 'property_manager', category: 'Management' },
    { title: 'Operations Manager', role: 'property_manager', category: 'Management' },

    // Regional/Corporate HR Level
    { title: 'Corporate HR Manager', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'Regional HR Manager', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'HR Director', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'Corporate Learning & Development Manager', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'Corporate Talent Acquisition Manager', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'VP of Human Resources', role: 'regional_hr', category: 'Corporate HR' },
    { title: 'Director of Human Resources', role: 'regional_hr', category: 'Corporate HR' },

    // Regional/Corporate Admin Level
    { title: 'Area General Manager', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Regional Director', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Vice President of Operations', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Director of Operations', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Corporate Operations Manager', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Chief Operating Officer', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'VP Operations', role: 'regional_admin', category: 'Corporate Management' },
    { title: 'Regional VP', role: 'regional_admin', category: 'Corporate Management' },
]

/**
 * Suggests the appropriate system role based on a job title
 * Uses both exact matching and keyword-based heuristics
 */
export function suggestSystemRole(jobTitle: string): AppRole {
    if (!jobTitle) return 'staff'

    const normalized = jobTitle.toLowerCase().trim()

    // Try exact match first
    const exactMatch = JOB_TITLE_MAPPINGS.find(
        mapping => mapping.title.toLowerCase() === normalized
    )
    if (exactMatch) return exactMatch.role

    // Keyword-based heuristics for partial matches
    if (normalized.includes('director') ||
        normalized.includes('vp') ||
        normalized.includes('vice president') ||
        normalized.includes('chief operating') ||
        normalized.includes('regional')) {
        if (normalized.includes('hr') || normalized.includes('human resource')) {
            return 'regional_hr'
        }
        return 'regional_admin'
    }

    if (normalized.includes('general manager') ||
        normalized.includes('hotel manager') ||
        normalized.includes('gm')) {
        return 'property_manager'
    }

    if (normalized.includes('hr')) {
        if (normalized.includes('corporate') || normalized.includes('regional')) {
            return 'regional_hr'
        }
        return 'property_hr'
    }

    if (normalized.includes('manager') ||
        normalized.includes('supervisor') ||
        normalized.includes('chef') ||
        normalized.includes('head')) {
        return 'department_head'
    }

    // Default to staff for unknown titles
    return 'staff'
}

/**
 * Gets all unique job titles for autocomplete/dropdown
 */
export function getCommonJobTitles(): string[] {
    return JOB_TITLE_MAPPINGS.map(m => m.title).sort()
}

/**
 * Gets all unique job title categories
 */
export function getJobTitleCategories(): string[] {
    const categories = new Set(JOB_TITLE_MAPPINGS.map(m => m.category))
    return Array.from(categories).sort()
}

/**
 * Gets job titles for a specific category
 */
export function getJobTitlesByCategory(category: string): string[] {
    return JOB_TITLE_MAPPINGS
        .filter(m => m.category === category)
        .map(m => m.title)
        .sort()
}

/**
 * Gets job titles for a specific system role
 */
export function getJobTitlesByRole(role: AppRole): string[] {
    return JOB_TITLE_MAPPINGS
        .filter(m => m.role === role)
        .map(m => m.title)
        .sort()
}
