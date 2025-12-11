import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SearchSuggestion } from '@/components/search/AdvancedSearch'

interface SearchResult {
  id: string
  type: 'document' | 'user' | 'training' | 'announcement' | 'sop' | 'ticket' | 'referral'
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

      try {
        // Search Documents
        if (includeDocuments) {
          const { data: documents } = await supabase
            .from('documents')
            .select('id, title, description, category, status')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(limit / 2)

          if (documents) {
            results.push(...documents.map(doc => ({
              id: doc.id,
              type: 'document' as const,
              title: doc.title,
              description: doc.description,
              category: doc.category,
              url: `/documents/${doc.id}`,
              metadata: { status: doc.status },
              relevance_score: calculateRelevanceScore(query, doc.title, doc.description)
            })))
          }
        }

        // Search Users (if admin/HR/manager)
        if (includeUsers && ['regional_admin', 'regional_hr', 'property_manager', 'department_head'].includes(primaryRole || '')) {
          const { data: users } = await supabase
            .from('profiles')
            .select('id, full_name, email, department, property')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(limit / 4)

          if (users) {
            results.push(...users.map(user => ({
              id: user.id,
              type: 'user' as const,
              title: user.full_name,
              description: user.email,
              category: user.department,
              url: `/users/${user.id}`,
              metadata: { department: user.department, property: user.property },
              relevance_score: calculateRelevanceScore(query, user.full_name, user.email)
            })))
          }
        }

        // Search Training Modules
        if (includeTraining) {
          const { data: training } = await supabase
            .from('training_modules')
            .select('id, title, description, category, status')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(limit / 4)

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
        }

        // Search Announcements
        if (includeAnnouncements) {
          const { data: announcements } = await supabase
            .from('announcements')
            .select('id, title, content, category, priority')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .limit(limit / 4)

          if (announcements) {
            results.push(...announcements.map(announcement => ({
              id: announcement.id,
              type: 'announcement' as const,
              title: announcement.title,
              description: announcement.content,
              category: announcement.category,
              url: `/announcements/${announcement.id}`,
              metadata: { priority: announcement.priority },
              relevance_score: calculateRelevanceScore(query, announcement.title, announcement.content)
            })))
          }
        }

        // Search SOPs
        if (includeSOPs) {
          const { data: sops } = await supabase
            .from('sops')
            .select('id, title, description, category, version')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(limit / 4)

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
      if (!query.trim() || !profile?.id) return []

      const suggestions: SearchSuggestion[] = []

      // Recent searches (would come from user preferences/localStorage)
      const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
      suggestions.push(...recentSearches.slice(0, 3).map((search: string, index: number) => ({
        id: `recent-${index}`,
        text: search,
        type: 'recent' as const
      })))

      // Popular searches (would come from analytics)
      const popularSearches = [
        'training modules', 'SOP documents', 'HR policies', 'safety procedures',
        'user guide', 'maintenance tickets', 'announcements', 'certifications'
      ]
      
      popularSearches.forEach((search, index) => {
        if (search.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            id: `popular-${index}`,
            text: search,
            type: 'popular' as const,
            count: Math.floor(Math.random() * 100) + 10
          })
        }
      })

      // Document suggestions
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title, category')
        .ilike('title', `%${query}%`)
        .limit(3)

      if (documents) {
        suggestions.push(...documents.map(doc => ({
          id: doc.id,
          text: doc.title,
          type: 'document' as const,
          category: doc.category
        })))
      }

      return suggestions.slice(0, 8)
    },
    enabled: query.trim().length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
