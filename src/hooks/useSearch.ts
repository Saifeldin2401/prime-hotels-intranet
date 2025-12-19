import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
// Local interface for suggestions
export interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'document' | 'page'
  count?: number
  category?: string
}

import { SYSTEM_PAGES } from '@/lib/searchConfig'

interface SearchResult {
  id: string
  type: 'document' | 'user' | 'training' | 'announcement' | 'sop' | 'ticket' | 'referral' | 'page'
  title: string
  description?: string
  category?: string
  url: string
  metadata?: Record<string, any>
  relevance_score?: number
}

interface UseSearchOptions {
  includeDocuments?: boolean
  includeUsers?: boolean
  includeTraining?: boolean
  includeAnnouncements?: boolean
  includeSOPs?: boolean
  includeTickets?: boolean
  includeReferrals?: boolean
  limit?: number
  propertyId?: string
  departmentId?: string
}

export function useSearch(query: string, options: UseSearchOptions = {}) {

  const { profile, primaryRole } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const {
    includeDocuments = true,
    includeUsers = true,
    includeTraining = true,
    includeAnnouncements = true,
    includeSOPs = true,
    includeTickets = true,
    includeReferrals = true,
    limit = 20,
    propertyId,
    departmentId
  } = options

  // Global search query
  const { data, isLoading, error } = useQuery({
    queryKey: ['global-search', query, options],
    queryFn: async () => {
      if (!query.trim()) return []

      setIsSearching(true)
      const results: SearchResult[] = []
      const queryLower = query.toLowerCase()

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
              .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
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
        if (includeUsers && ['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) {
          try {
            const { data: users } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
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
              .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
              .limit(Math.ceil(limit / 4))

            if (training) {
              results.push(...training.map(module => ({
                id: module.id,
                type: 'training' as const,
                title: module.title,
                description: module.description,
                category: module.category,
                url: `/training/modules/${module.id}`,
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
              .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
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
              .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
              .limit(Math.ceil(limit / 4))

            if (sops) {
              results.push(...sops.map(sop => ({
                id: sop.id,
                type: 'sop' as const,
                title: sop.title,
                description: sop.description,
                category: sop.category,
                url: `/sops/${sop.id}`,
                metadata: { version: sop.version },
                relevance_score: calculateRelevanceScore(query, sop.title, sop.description)
              })))
            }
          } catch (e) {
            console.warn('SOP search failed:', e)
          }
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
  const { t } = useTranslation()

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
          { keywords: ['user', 'staff', 'employee'], text: 'Add New Staff Member', url: '/users/new', icon: 'UserPlus' },
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
            } as any)
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
            } as any)
          }
        })
      }

      // 3. Help / How-To
      if (queryLower.includes('how') || queryLower.includes('help')) {
        suggestions.push({
          id: 'help-sop',
          text: 'Search Standard Operating Procedures',
          type: 'help',
          url: '/sops'
        } as any)
        suggestions.push({
          id: 'help-manual',
          text: 'Open User Manual',
          type: 'help',
          url: '/documents'
        } as any)
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
            .ilike('title', `%${query}%`)
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
              .ilike('title', `%${query}%`)
              .limit(3)

            if (sops) {
              suggestions.push(...sops.map(sop => ({
                id: sop.id,
                text: sop.title,
                type: 'document' as const, // Reusing document type for icon consistency
                url: `/sops/${sop.id}`,
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

    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
    const updatedSearches = [query, ...recentSearches.filter((s: string) => s !== query)].slice(0, 10)
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))
  }

  const getRecentSearches = (): string[] => {
    return JSON.parse(localStorage.getItem('recentSearches') || '[]')
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
