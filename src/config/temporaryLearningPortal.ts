export const TEMP_LEARNING_PORTAL_MODE = true

export const TEMP_LEARNING_PORTAL_BRAND = {
    name: 'Diyafa',
    fullName: 'Diyafa Hotels & Resorts',
    productName: 'Diyafa Learning Portal',
    website: 'https://www.dyafa.com',
    logo: '/dyafa-logo.svg',
}

const LEARNING_PORTAL_GROUPS = new Set([
    'knowledge_base',
    'learning',
    'learning_management',
])

const LEARNING_PORTAL_PATH_PREFIXES = [
    '/knowledge',
    '/learning',
    '/training',
    '/questions',
]

export function isLearningPortalGroup(groupId: string): boolean {
    return LEARNING_PORTAL_GROUPS.has(groupId)
}

export function isLearningPortalPath(path: string): boolean {
    return LEARNING_PORTAL_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
