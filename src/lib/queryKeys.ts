/**
 * Query Key Factory
 * 
 * Provides centralized, type-safe query keys for React Query.
 * Using a factory pattern prevents cache invalidation bugs and
 * ensures consistency across the codebase.
 * 
 * Usage:
 *   const { data } = useQuery({
 *     queryKey: queryKeys.articles.list({ propertyId: '123' }),
 *     queryFn: () => getArticles({ property_id: '123' })
 *   })
 * 
 * Invalidation:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.articles.all })
 */

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (filters: { propertyId?: string; departmentId?: string; query?: string } = {}) => 
    [...knowledgeKeys.lists(), filters] as const,
  
  details: () => [...knowledgeKeys.all, 'detail'] as const,
  detail: (id: string) => [...knowledgeKeys.details(), id] as const,
  
  featured: (propertyId?: string) => 
    [...knowledgeKeys.all, 'featured', propertyId ?? 'all'] as const,
  
  recent: (propertyId?: string) => 
    [...knowledgeKeys.all, 'recent', propertyId ?? 'all'] as const,
  
  requiredReading: (userId: string) => 
    [...knowledgeKeys.all, 'required', userId] as const,
  
  bookmarks: (userId: string) => 
    [...knowledgeKeys.all, 'bookmarks', userId] as const,
  
  related: (documentId: string) => 
    [...knowledgeKeys.all, 'related', documentId] as const,
  
  search: (query: string) => 
    [...knowledgeKeys.all, 'search', query] as const,
  
  categories: (departmentId?: string) => 
    [...knowledgeKeys.all, 'categories', departmentId ?? 'all'] as const,
  
  feedback: {
    all: ['knowledge', 'feedback'] as const,
    stats: () => ['knowledge', 'feedback', 'stats'] as const,
    recent: () => ['knowledge', 'feedback', 'recent'] as const,
    trends: () => ['knowledge', 'feedback', 'trends'] as const,
  },
  
  contextualHelp: (triggerType: string, triggerValue: string) => 
    [...knowledgeKeys.all, 'contextual', triggerType, triggerValue] as const,
} as const

// ============================================================================
// LEARNING/TRAINING
// ============================================================================

export const learningKeys = {
  all: ['learning'] as const,
  
  modules: () => [...learningKeys.all, 'modules'] as const,
  module: (id: string) => [...learningKeys.modules(), id] as const,
  moduleRoster: (moduleId: string) => 
    [...learningKeys.module(moduleId), 'roster'] as const,
  
  quizzes: () => [...learningKeys.all, 'quizzes'] as const,
  quiz: (id: string) => [...learningKeys.quizzes(), id] as const,
  
  assignments: (userId: string) => 
    [...learningKeys.all, 'assignments', userId] as const,
  
  progress: (userId: string, contentType: string, contentId: string) => 
    [...learningKeys.all, 'progress', userId, contentType, contentId] as const,
  
  skills: {
    all: ['learning', 'skills'] as const,
    list: () => ['learning', 'skills', 'list'] as const,
    user: (userId: string) => ['learning', 'skills', 'user', userId] as const,
    module: (moduleId: string) => ['learning', 'skills', 'module', moduleId] as const,
  },
} as const

// ============================================================================
// USER & AUTH
// ============================================================================

export const userKeys = {
  all: ['users'] as const,
  
  current: () => [...userKeys.all, 'current'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  roles: (userId: string) => [...userKeys.all, 'roles', userId] as const,
  permissions: (userId: string) => [...userKeys.all, 'permissions', userId] as const,
  
  dashboard: {
    all: ['users', 'dashboard'] as const,
    preferences: (userId: string) => ['users', 'dashboard', 'preferences', userId] as const,
    stats: (userId: string) => ['users', 'dashboard', 'stats', userId] as const,
  },
} as const

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export const announcementKeys = {
  all: ['announcements'] as const,
  
  lists: () => [...announcementKeys.all, 'list'] as const,
  list: (filters: { propertyId?: string; isActive?: boolean } = {}) => 
    [...announcementKeys.lists(), filters] as const,
  
  detail: (id: string) => [...announcementKeys.all, id] as const,
  
  feed: (userId: string) => [...announcementKeys.all, 'feed', userId] as const,
} as const

// ============================================================================
// MAINTENANCE
// ============================================================================

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  
  tickets: () => [...maintenanceKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...maintenanceKeys.tickets(), id] as const,
  
  lists: (filters: { propertyId?: string; status?: string; assignedTo?: string } = {}) => 
    [...maintenanceKeys.tickets(), filters] as const,
  
  stats: (propertyId?: string) => 
    [...maintenanceKeys.all, 'stats', propertyId ?? 'all'] as const,
  
  schedules: (propertyId?: string) => 
    [...maintenanceKeys.all, 'schedules', propertyId ?? 'all'] as const,
} as const

// ============================================================================
// HR
// ============================================================================

export const hrKeys = {
  all: ['hr'] as const,
  
  employees: () => [...hrKeys.all, 'employees'] as const,
  employee: (id: string) => [...hrKeys.employees(), id] as const,
  directory: (propertyId?: string) => [...hrKeys.employees(), 'directory', propertyId ?? 'all'] as const,
  
  leave: {
    all: ['hr', 'leave'] as const,
    requests: (userId: string) => ['hr', 'leave', 'requests', userId] as const,
    balance: (userId: string) => ['hr', 'leave', 'balance', userId] as const,
  },
  
  attendance: {
    all: ['hr', 'attendance'] as const,
    user: (userId: string) => ['hr', 'attendance', 'user', userId] as const,
    property: (propertyId: string, date: string) => 
      ['hr', 'attendance', 'property', propertyId, date] as const,
  },
  
  shifts: {
    all: ['hr', 'shifts'] as const,
    user: (userId: string) => ['hr', 'shifts', 'user', userId] as const,
    schedule: (propertyId: string, startDate: string, endDate: string) => 
      ['hr', 'shifts', 'schedule', propertyId, startDate, endDate] as const,
  },
  
  performance: {
    all: ['hr', 'performance'] as const,
    reviews: (userId: string) => ['hr', 'performance', 'reviews', userId] as const,
    goals: (userId: string) => ['hr', 'performance', 'goals', userId] as const,
  },
} as const

// ============================================================================
// APPROVALS
// ============================================================================

export const approvalKeys = {
  all: ['approvals'] as const,
  
  pending: (userId: string) => [...approvalKeys.all, 'pending', userId] as const,
  submitted: (userId: string) => [...approvalKeys.all, 'submitted', userId] as const,
  
  requests: {
    all: ['approvals', 'requests'] as const,
    detail: (id: string) => ['approvals', 'requests', id] as const,
  },
} as const

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
} as const



// ============================================================================
// DOCUMENTS
// ============================================================================

export const documentKeys = {
  all: ['documents'] as const,
  
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: { propertyId?: string; departmentId?: string; type?: string } = {}) => 
    [...documentKeys.lists(), filters] as const,
  
  detail: (id: string) => [...documentKeys.all, id] as const,
  
  library: (userId: string) => [...documentKeys.all, 'library', userId] as const,
} as const

// ============================================================================
// ANALYTICS
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  
  events: () => [...analyticsKeys.all, 'events'] as const,
  stats: (period: string) => [...analyticsKeys.all, 'stats', period] as const,
  
  dashboard: {
    all: ['analytics', 'dashboard'] as const,
    kpi: (propertyId?: string) => ['analytics', 'dashboard', 'kpi', propertyId ?? 'all'] as const,
    activity: (propertyId?: string) => ['analytics', 'dashboard', 'activity', propertyId ?? 'all'] as const,
  },
} as const

// ============================================================================
// MESSAGING
// ============================================================================

export const messagingKeys = {
  all: ['messaging'] as const,
  
  conversations: (userId: string) => [...messagingKeys.all, 'conversations', userId] as const,
  conversation: (id: string) => [...messagingKeys.all, 'conversation', id] as const,
  messages: (conversationId: string) => 
    [...messagingKeys.conversation(conversationId), 'messages'] as const,
} as const

// ============================================================================
// DEPARTMENTS & PROPERTIES
// ============================================================================

export const organizationKeys = {
  all: ['organization'] as const,
  
  properties: () => [...organizationKeys.all, 'properties'] as const,
  property: (id: string) => [...organizationKeys.properties(), id] as const,
  
  departments: (propertyId?: string) => 
    [...organizationKeys.all, 'departments', propertyId ?? 'all'] as const,
  department: (id: string) => [...organizationKeys.all, 'department', id] as const,
} as const

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/** @deprecated Use specific key factories instead */
export const queryKeys = {
  knowledge: knowledgeKeys,
  learning: learningKeys,
  users: userKeys,
  announcements: announcementKeys,
  maintenance: maintenanceKeys,
  hr: hrKeys,
  approvals: approvalKeys,
  notifications: notificationKeys,
  documents: documentKeys,
  analytics: analyticsKeys,
  messaging: messagingKeys,
  organization: organizationKeys,
} as const

export default queryKeys
