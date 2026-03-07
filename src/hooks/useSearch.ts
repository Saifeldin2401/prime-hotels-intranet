import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
// Local interface for suggestions
export interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'document' | 'page' | 'action' | 'navigation' | 'help'
  url?: string
  count?: number
  category?: string
}

import { SYSTEM_PAGES } from '@/lib/searchConfig'

interface SearchResult {
  id: string
  type: 'document' | 'user' | 'training' | 'announcement' | 'sop' | 'task' | 'ticket' | 'referral' | 'page'
  title: string
  description?: string
  category?: string
  url: string
  metadata?: Record<string, unknown>
  relevance_score?: number
}

interface UseSearchOptions {
  includeDocuments?: boolean
  includeUsers?: boolean
  includeTraining?: boolean
  includeAnnouncements?: boolean
  includeSOPs?: boolean
  includeTasks?: boolean
  includeTickets?: boolean
  includeReferrals?: boolean
  limit?: number
  propertyId?: string
  departmentId?: string
}

const isQuotaExceededError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export function useSearch(query: string, options: UseSearchOptions = {}) {

  const { user, primaryRole } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const {
    includeDocuments = true,
    includeUsers = true,
    includeTraining = true,
    includeAnnouncements = true,
    includeSOPs = true,
    includeTasks = true,
    includeTickets = true,
    includeReferrals = true,
    limit = 20,
    propertyId: _propertyId,
    departmentId: _departmentId
  } = options

  // Global search query
  const { data, isLoading, error } = useQuery({
    queryKey: ['global-search', query, options],
    queryFn: async () => {
      if (!query.trim()) return []

      setIsSearching(true)
      const results: SearchResult[] = []
      const queryLower = query.toLowerCase()
      const escapedQuery = escapeSearchQuery(query)

      // 1. Search System Pages (Local)
      const matchingPages = SYSTEM_PAGES.filter(page =>
        page.title.toLowerCase().includes(queryLower) ||
        page.description.toLowerCase().includes(queryLower) ||
        page.keywords.some(k => k.toLowerCase().includes(queryLower))
      )

      results.push(...matchingPages.map(page => ({
        id: page.id,
        type: 'page' as const,
        title: page.title,
        description: page.description,
        category: page.category,
        url: page.url,
        relevance_score: calculateRelevanceScore(query, page.title, page.description) + 20 // Boost page scores
      })))

      try {
        // Search Documents
        if (includeDocuments) {
          try {
            const { data: documents } = await supabase
              .from('documents')
              .select('id, title, description, status')
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 2))

            if (documents) {
              results.push(...documents.map(doc => ({
                id: doc.id,
                type: 'document' as const,
                title: doc.title,
                description: doc.description,
                category: 'Document', // Fallback as column doesn't exist
                url: `/documents/${doc.id}`,
                metadata: { status: doc.status },
                relevance_score: calculateRelevanceScore(query, doc.title, doc.description)
              })))
            }
          } catch (e) { console.error('Error searching documents:', e) }
        }

        // Search Users
        if (includeUsers && ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) {
          try {
            const { data: users } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .or(`full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (users) {
              results.push(...users.map(user => ({
                id: user.id,
                type: 'user' as const,
                title: user.full_name || 'Unknown User',
                description: user.email,
                category: 'Staff', // Fallback
                url: `/users/${user.id}`,
                metadata: {},
                relevance_score: calculateRelevanceScore(query, user.full_name || '', user.email)
              })))
            }
          } catch (e) { console.error('Error searching users:', e) }
        }

        // Search Training
        if (includeTraining) {
          try {
            const { data: training } = await supabase
              .from('training_modules')
              .select('id, title, description, category, status')
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (training) {
              const isTrainingAdmin = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(primaryRole || '')
              results.push(...training.map(module => ({
                id: module.id,
                type: 'training' as const,
                title: module.title,
                description: module.description,
                category: module.category,
                url: isTrainingAdmin ? `/training/hub/${module.id}?view=builder` : `/learning/training/${module.id}`,
                metadata: { status: module.status },
                relevance_score: calculateRelevanceScore(query, module.title, module.description)
              })))
            }
          } catch (e) { console.error('Error searching training:', e) }
        }

        // Search Announcements
        if (includeAnnouncements) {
          try {
            const { data: announcements } = await supabase
              .from('announcements')
              .select('id, title, content, priority')
              .or(`title.ilike.%${escapedQuery}%,content.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (announcements) {
              results.push(...announcements.map(announcement => ({
                id: announcement.id,
                type: 'announcement' as const,
                title: announcement.title,
                description: announcement.content,
                category: 'Announcement',
                url: `/announcements/${announcement.id}`,
                metadata: { priority: announcement.priority },
                relevance_score: calculateRelevanceScore(query, announcement.title, announcement.content)
              })))
            }
          } catch (e) { console.error('Error searching announcements:', e) }
        }

        // Search SOPs
        if (includeSOPs) {
          try {
            // Primary Search: sop_documents table
            const { data: sops } = await supabase
              .from('sop_documents')
              .select('id, title, description, category, version')
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (sops) {
              results.push(...sops.map(sop => ({
                id: sop.id,
                type: 'sop' as const,
                title: sop.title,
                description: sop.description,
                category: sop.category,
                url: `/knowledge/${sop.id}`,
                metadata: { version: sop.version },
                relevance_score: calculateRelevanceScore(query, sop.title, sop.description)
              })))
            }
          } catch (e) {
            console.warn('SOP search failed:', e)
          }
        }

        // Search Tasks
        if (includeTasks) {
          try {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, title, description, status, due_date')
              .eq('is_deleted', false)
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (tasks) {
              results.push(...tasks.map(task => ({
                id: task.id,
                type: 'task' as const,
                title: task.title || 'Untitled Task',
                description: task.description || undefined,
                category: 'Task',
                url: `/tasks/${task.id}`,
                metadata: { status: task.status, due_date: task.due_date },
                relevance_score: calculateRelevanceScore(query, task.title || '', task.description || '')
              })))
            }
          } catch (e) { console.error('Error searching tasks:', e) }
        }

        // Search Maintenance Tickets
        if (includeTickets) {
          try {
            const { data: tickets } = await supabase
              .from('maintenance_tickets')
              .select('id, title, description, status, priority, room_number')
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,room_number.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (tickets) {
              results.push(...tickets.map(ticket => ({
                id: ticket.id,
                type: 'ticket' as const,
                title: ticket.title || 'Maintenance Ticket',
                description: ticket.description || undefined,
                category: 'Maintenance',
                url: `/maintenance/tickets/${ticket.id}`,
                metadata: { status: ticket.status, priority: ticket.priority, room_number: ticket.room_number },
                relevance_score: calculateRelevanceScore(query, ticket.title || '', ticket.description || ticket.room_number || '')
              })))
            }
          } catch (e) { console.error('Error searching maintenance tickets:', e) }
        }

        // Search Referrals (Job Applications with referrer)
        if (includeReferrals) {
          try {
            const canViewAllReferrals = ['corporate_admin', 'regional_admin', 'regional_hr', 'property_hr', 'property_manager']
              .includes(primaryRole || '')

            if (!canViewAllReferrals && !user?.id) {
              // No user context to scope referrals, skip query
            } else {
              let referralsQuery = supabase
                .from('job_applications')
                .select('id, applicant_name, applicant_email, applicant_phone, status, referred_by')
                .not('referred_by', 'is', null)
                .or(`applicant_name.ilike.%${escapedQuery}%,applicant_email.ilike.%${escapedQuery}%,applicant_phone.ilike.%${escapedQuery}%`)
                .limit(Math.ceil(limit / 4))

              if (!canViewAllReferrals) {
                referralsQuery = referralsQuery.eq('referred_by', user!.id)
              }

              const { data: referrals } = await referralsQuery

              if (referrals) {
                results.push(...referrals.map(referral => ({
                  id: referral.id,
                  type: 'referral' as const,
                  title: referral.applicant_name || 'Referral',
                  description: referral.applicant_email || referral.applicant_phone || undefined,
                  category: 'Referral',
                  url: '/jobs/referrals',
                  metadata: { status: referral.status },
                  relevance_score: calculateRelevanceScore(
                    query,
                    referral.applicant_name || '',
                    [referral.applicant_email, referral.applicant_phone].filter(Boolean).join(' ')
                  )
                })))
              }
            }
          } catch (e) { console.error('Error searching referrals:', e) }
        }

        // Sort by relevance score
        return results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)).slice(0, limit)

      } catch (error) {
        console.error('Search error:', error)
        return []
      } finally {
        setIsSearching(false)
      }
    },
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  useEffect(() => {
    if (data) {
      setSearchResults(data)
    }
  }, [data])

  return {
    results: searchResults,
    isLoading: isLoading || isSearching,
    error,
    hasResults: searchResults.length > 0
  }
}

// Helper function to calculate relevance score
function calculateRelevanceScore(query: string, title: string, description?: string): number {
  let score = 0
  const queryLower = query.toLowerCase()
  const titleLower = title.toLowerCase()
  const descLower = (description || '').toLowerCase()

  // Exact title match
  if (titleLower === queryLower) score += 100
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) score += 80
  // Title contains query
  else if (titleLower.includes(queryLower)) score += 60

  // Description contains query
  if (descLower.includes(queryLower)) score += 30

  // Word boundaries in title
  const titleWords = titleLower.split(/\s+/)
  const queryWords = queryLower.split(/\s+/)
  queryWords.forEach(queryWord => {
    if (titleWords.some(word => word === queryWord)) score += 20
  })

  return score
}

// Hook for search suggestions
export function useSearchSuggestions(query: string) {
  const { profile } = useAuth()

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['search-suggestions', query, profile?.id],
    queryFn: async () => {
      // Always return some suggestions even if query is empty (popular/recent handled in component)
      if (!query.trim()) return []

      const suggestions: SearchSuggestion[] = []
      const queryLower = query.toLowerCase()

      // 1. Smart Actions (Intent Detection)
      if (queryLower.startsWith('add') || queryLower.startsWith('create') || queryLower.startsWith('new')) {
        const actionMap = [
          { keywords: ['user', 'staff', 'employee'], text: 'Add New Staff Member', url: '/admin/users', icon: 'UserPlus' },
          { keywords: ['task', 'todo'], text: 'Create New Task', url: '/tasks', icon: 'CheckSquare' },
          { keywords: ['announcement', 'news'], text: 'Post Announcement', url: '/announcements', icon: 'Megaphone' },
          { keywords: ['ticket', 'maintenance'], text: 'Raise Maintenance Ticket', url: '/maintenance', icon: 'Wrench' },
          { keywords: ['job', 'posting'], text: 'Create Job Posting', url: '/jobs/new', icon: 'Briefcase' }
        ]

        actionMap.forEach(action => {
          if (action.keywords.some(k => queryLower.includes(k)) || queryLower.length < 5) {
            suggestions.push({
              id: `action-${action.text}`,
              text: action.text,
              type: 'action',
              url: action.url
            })
          }
        })
      }

      // 2. Navigation Shortcuts
      if (queryLower.startsWith('go') || queryLower.startsWith('open') || queryLower.includes('page')) {
        SYSTEM_PAGES.forEach(page => {
          if (page.keywords.some(k => queryLower.includes(k)) || page.title.toLowerCase().includes(queryLower)) {
            suggestions.push({
              id: `nav-${page.id}`,
              text: `Go to ${page.title}`,
              type: 'navigation',
              url: page.url
            })
          }
        })
      }

      // 3. Help / How-To
      if (queryLower.includes('how') || queryLower.includes('help')) {
        suggestions.push({
          id: 'help-sop',
          text: 'Search Standard Operating Procedures',
          type: 'help',
          url: '/knowledge'
        })
        suggestions.push({
          id: 'help-manual',
          text: 'Open User Manual',
          type: 'help',
          url: '/documents'
        })
      }

      // 4. Content Suggestions (Database)
      // Only fetch if we don't have many smart suggestions
      // 4. Content Suggestions (Database)
      // Only fetch if we don't have many smart suggestions
      if (suggestions.length < 5) {
        try {
          // Query Documents
          const { data: documents } = await supabase
            .from('documents')
            .select('id, title, status')
            .ilike('title', `%${escapeSearchQuery(query)}%`)
            .limit(3)

          if (documents) {
            suggestions.push(...documents.map(doc => ({
              id: doc.id,
              text: doc.title,
              type: 'document' as const,
              url: `/documents/${doc.id}`
            })))
          }

          // Query SOPs
          if (suggestions.length < 8) {
            const { data: sops } = await supabase
              .from('sop_documents')
              .select('id, title')
              .ilike('title', `%${escapeSearchQuery(query)}%`)
              .limit(3)

            if (sops) {
              suggestions.push(...sops.map(sop => ({
                id: sop.id,
                text: sop.title,
                type: 'document' as const, // Reusing document type for icon consistency
                url: `/knowledge/${sop.id}`,
                category: 'SOP'
              })))
            }
          }

        } catch (e) { console.warn('Suggestion fetch failed', e) }
      }

      return suggestions.slice(0, 8)
    },
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
  })

  return {
    suggestions,
    isLoading
  }
}

// Hook to save recent searches
export function useRecentSearches() {
  const saveSearch = (query: string) => {
    if (!query.trim()) return

    let recentSearches: string[] = []
    try {
      recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
    } catch {
      console.warn('Failed to parse recent searches')
      recentSearches = []
    }
    const updatedSearches = [query, ...recentSearches.filter((s: string) => s !== query)].slice(0, 10)
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        const fallback = updatedSearches.slice(0, 5)
        try {
          localStorage.setItem('recentSearches', JSON.stringify(fallback))
          return
        } catch {
          // Ignore secondary write failures.
        }
      }
      console.warn('Failed to persist recent searches', error)
    }
  }

  const getRecentSearches = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]')
    } catch {
      return []
    }
  }

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches')
  }

  return {
    saveSearch,
    getRecentSearches,
    clearRecentSearches
  }
}
