import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { SYSTEM_PAGES } from '@/lib/searchConfig'
import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'document' | 'page' | 'action' | 'navigation' | 'help'
  url?: string
  count?: number
  category?: string
}

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

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))

const dedupeById = <T extends { id: string }>(rows: T[]) =>
  Array.from(new Map(rows.map((row) => [row.id, row])).values())

const toPromise = <T,>(value: PromiseLike<T>): Promise<T> => Promise.resolve(value)

const applyIdsScope = <T,>(query: T, column: string, ids: string[]): T => {
  const q = query as any
  if (ids.length === 1) return q.eq(column, ids[0])
  if (ids.length > 1) return q.in(column, ids)
  return query
}

const SEARCH_DRAFT_ROLES = new Set([
  'administrator',
  'super_admin',
  'corporate_admin',
  'training_manager',
  'knowledge_manager',
  'author',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr'
])

const USER_SEARCH_ROLES = new Set([
  'administrator',
  'super_admin',
  'corporate_admin',
  'training_manager',
  'knowledge_manager',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'department_head'
])

const ALL_TASKS_ROLES = new Set([
  'administrator',
  'super_admin',
  'corporate_admin',
  'training_manager',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
  'department_head'
])

const ALL_REFERRALS_ROLES = new Set([
  'administrator',
  'super_admin',
  'corporate_admin',
  'training_manager',
  'regional_admin',
  'regional_hr',
  'property_hr',
  'property_manager'
])

export function useSearch(query: string, options: UseSearchOptions = {}) {
  const { user, primaryRole, roles, departments, properties } = useAuth()
  const { currentProperty, propertyIds } = useProperty()
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
    propertyId: explicitPropertyId,
    departmentId: explicitDepartmentId
  } = options

  const isAdmin = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin'].includes(primaryRole || '')
  const roleValues = uniqueStrings((roles || []).map((roleRow) => roleRow?.role))
  const canSearchDraftContent = roleValues.some((role) => SEARCH_DRAFT_ROLES.has(role))
  const canSearchUsers = USER_SEARCH_ROLES.has(primaryRole || '')
  const canViewAllTasks = ALL_TASKS_ROLES.has(primaryRole || '')
  const canViewAllReferrals = ALL_REFERRALS_ROLES.has(primaryRole || '')

  const userPropertyIds = uniqueStrings((properties || []).map((p) => p?.id))
  const userDepartmentIds = uniqueStrings((departments || []).map((d) => d?.id))

  const scopedPropertyIds = (() => {
    // If an explicit property is provided, ensure it's within the user's authorized properties
    if (isRealPropertyId(explicitPropertyId)) {
      if (isAdmin) return [explicitPropertyId]
      if (userPropertyIds.includes(explicitPropertyId)) return [explicitPropertyId]
      // Fallback to authorized properties if override is invalid/unauthorized
    }
    
    if (isRealPropertyId(currentProperty?.id)) {
      const id = currentProperty.id
      if (isAdmin || userPropertyIds.includes(id)) return [id]
    }
    
    return isAdmin && propertyIds.length === 0 ? [] : userPropertyIds
  })()

  const scopedDepartmentIds = (() => {
    if (explicitDepartmentId) {
      if (isAdmin || userDepartmentIds.includes(explicitDepartmentId)) return [explicitDepartmentId]
    }
    return userDepartmentIds
  })()

  const matchesAnnouncementAudience = (announcement): boolean => {
    if (!user?.id) return false
    if (announcement.created_by === user.id) return true

    const audience = announcement.target_audience
    if (!audience || audience.type === 'all') return true

    const values = audience.values || []
    switch (audience.type) {
      case 'role':
        return roleValues.some((role) => values.includes(role))
      case 'department':
        return scopedDepartmentIds.some((departmentId) => values.includes(departmentId))
      case 'property':
        return scopedPropertyIds.some((propertyId) => values.includes(propertyId))
      case 'individual':
        return values.includes(user.id)
      default:
        return true
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['global-search', query, options, user?.id, primaryRole, scopedPropertyIds, scopedDepartmentIds, roleValues],
    queryFn: async () => {
      if (!query.trim()) return []

      setIsSearching(true)
      const results: SearchResult[] = []
      const queryLower = query.toLowerCase()
      const escapedQuery = escapeSearchQuery(query)

      const matchingPages = SYSTEM_PAGES.filter((page) =>
        page.title.toLowerCase().includes(queryLower) ||
        page.description.toLowerCase().includes(queryLower) ||
        page.keywords.some((keyword) => keyword.toLowerCase().includes(queryLower))
      )

      results.push(...matchingPages.map((page) => ({
        id: page.id,
        type: 'page' as const,
        title: page.title,
        description: page.description,
        category: page.category,
        url: page.url,
        relevance_score: calculateRelevanceScore(query, page.title, page.description) + 20
      })))

      try {
        if (includeDocuments) {
          try {
            const documentLimit = Math.ceil(limit / 2)
            const textFilter = `title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`
            const queryResults: Array<{ data; error: { message?: string } | null }> = []

            const runDocumentQuery = async (mutate) => {
              let q = supabase
                .from('documents')
                .select('id, title, description, status, visibility, property_id, department_id, role, created_by')
                .eq('is_deleted', false)
                .or(textFilter)
                .limit(documentLimit)

              if (!canSearchDraftContent) {
                q = q.eq('status', 'PUBLISHED')
              }

              const result = await mutate(q)
              queryResults.push(result)
            }

            await runDocumentQuery((q) => q.eq('visibility', 'all_properties'))

            if (scopedPropertyIds.length > 0) {
              await runDocumentQuery((q) => applyIdsScope(q.eq('visibility', 'property'), 'property_id', scopedPropertyIds))
            }

            if (scopedDepartmentIds.length > 0) {
              await runDocumentQuery((q) =>
                applyIdsScope(q.eq('visibility', 'department'), 'department_id', scopedDepartmentIds)
              )
              await runDocumentQuery((q) =>
                applyIdsScope(q.eq('visibility', 'group_department'), 'department_id', scopedDepartmentIds)
              )
            }

            if (roleValues.length > 0) {
              await runDocumentQuery((q) => applyIdsScope(q.eq('visibility', 'role'), 'role', roleValues))
            }

            if (user?.id) {
              await runDocumentQuery((q) => q.eq('created_by', user.id))
            }

            if (scopedDepartmentIds.length > 0) {
              const { data: accessRows, error: accessError } = await supabase
                .from('document_department_access')
                .select('document_id')
                .in('department_id', scopedDepartmentIds)

              if (!accessError) {
                const allowedDocumentIds = uniqueStrings((accessRows || []).map((row) => row?.document_id))
                if (allowedDocumentIds.length > 0) {
                  await runDocumentQuery((q) =>
                    q
                      .eq('visibility', 'specific_departments')
                      .in('id', allowedDocumentIds)
                  )
                }
              } else {
                console.warn('Document department access query failed:', accessError.message)
              }
            }

            queryResults.forEach((result) => {
              if (result.error) {
                console.warn('Document search query failed:', result.error.message)
              }
            })

            const documents = dedupeById(queryResults.flatMap((result) => result.data || []))

            results.push(...documents.map((doc) => ({
              id: doc.id,
              type: 'document' as const,
              title: doc.title,
              description: doc.description,
              category: 'Document',
              url: `/documents/${doc.id}`,
              metadata: {
                status: doc.status,
                visibility: doc.visibility
              },
              relevance_score: calculateRelevanceScore(query, doc.title, doc.description)
            })))
          } catch (searchError) {
            console.error('Error searching documents:', searchError)
          }
        }

        if (includeUsers && canSearchUsers) {
          try {
            const { data: users } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .or(`full_name.ilike.%${escapedQuery}%,email.ilike.%${escapedQuery}%`)
              .eq('is_active', true)
              .limit(Math.ceil(limit / 4))

            if (users) {
              results.push(...users.map((profileRow) => ({
                id: profileRow.id,
                type: 'user' as const,
                title: profileRow.full_name || 'Unknown User',
                description: profileRow.email,
                category: 'Staff',
                url: `/users/${profileRow.id}`,
                metadata: {},
                relevance_score: calculateRelevanceScore(
                  query,
                  profileRow.full_name || '',
                  profileRow.email
                )
              })))
            }
          } catch (searchError) {
            console.error('Error searching users:', searchError)
          }
        }

        if (includeTraining) {
          try {
            const trainingLimit = Math.ceil(limit / 4)
            const textFilter = `title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`
            const trainingQueries: Array<PromiseLike<{ data: any; error: { message?: string } | null }>> = []

            const buildTrainingQuery = () => {
              let q = supabase
                .from('training_modules')
                .select('id, title, description, category, status, property_id')
                .or(textFilter)
                .limit(trainingLimit)

              if (!canSearchDraftContent) {
                q = q.in('status', ['published', 'active'])
              }
              return q
            }

            trainingQueries.push(toPromise(buildTrainingQuery().is('property_id', null)))
            if (scopedPropertyIds.length > 0) {
              trainingQueries.push(toPromise(applyIdsScope(buildTrainingQuery(), 'property_id', scopedPropertyIds)))
            }

            const trainingResults = await Promise.all(trainingQueries)
            const training = dedupeById(trainingResults.flatMap((result) => result.data || []))

            const isTrainingAdmin = roleValues.some((role) =>
              ['corporate_admin', 'regional_admin', 'regional_hr', 'property_manager'].includes(role)
            )

            results.push(...training.map((module) => ({
              id: module.id,
              type: 'training' as const,
              title: module.title,
              description: module.description,
              category: module.category,
              url: isTrainingAdmin
                ? `/training/hub/${module.id}?view=builder`
                : `/learning/training/${module.id}`,
              metadata: { status: module.status },
              relevance_score: calculateRelevanceScore(query, module.title, module.description)
            })))
          } catch (searchError) {
            console.error('Error searching training:', searchError)
          }
        }

        if (includeAnnouncements) {
          try {
            const announcementsLimit = Math.ceil(limit / 2)
            const announcementQueries: Array<PromiseLike<{ data: any; error: { message?: string } | null }>> = []

            const buildAnnouncementsQuery = () =>
              supabase
                .from('announcements')
                .select('id, title, content, priority, target_audience, created_by, property_id')
                .or(`title.ilike.%${escapedQuery}%,content.ilike.%${escapedQuery}%`)
                .limit(announcementsLimit)

            announcementQueries.push(toPromise(buildAnnouncementsQuery().is('property_id', null)))
            if (scopedPropertyIds.length > 0) {
              announcementQueries.push(toPromise(applyIdsScope(buildAnnouncementsQuery(), 'property_id', scopedPropertyIds)))
            }

            const announcementResults = await Promise.all(announcementQueries)
            const announcementsRaw = dedupeById(announcementResults.flatMap((result) => result.data || []))
            const announcements = announcementsRaw.filter(matchesAnnouncementAudience)

            results.push(...announcements.map((announcement) => ({
              id: announcement.id,
              type: 'announcement' as const,
              title: announcement.title,
              description: announcement.content,
              category: 'Announcement',
              url: `/announcements/${announcement.id}`,
              metadata: { priority: announcement.priority },
              relevance_score: calculateRelevanceScore(query, announcement.title, announcement.content)
            })))
          } catch (searchError) {
            console.error('Error searching announcements:', searchError)
          }
        }

        if (includeSOPs) {
          // sop_documents consolidated into documents (content_type='sop').
          // SOP status values are now mapped to document_status enum (DRAFT/PUBLISHED/etc).
          try {
            const sopLimit = Math.ceil(limit / 4)
            const sopQueries: Array<PromiseLike<{ data: any; error: { message?: string } | null }>> = []

            const buildSopQuery = () => {
              let q = supabase
                .from('documents')
                .select('id, title, description, sop_code as category, current_version as version, property_id, department_id, status')
                .eq('content_type', 'sop')
                .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`)
                .limit(sopLimit)

              if (!canSearchDraftContent) {
                q = q.eq('status', 'PUBLISHED')
              }

              return q
            }

            sopQueries.push(toPromise(buildSopQuery().is('property_id', null).is('department_id', null)))
            if (scopedPropertyIds.length > 0) {
              sopQueries.push(toPromise(applyIdsScope(buildSopQuery(), 'property_id', scopedPropertyIds)))
            }
            if (scopedDepartmentIds.length > 0) {
              sopQueries.push(toPromise(applyIdsScope(buildSopQuery(), 'department_id', scopedDepartmentIds)))
            }

            const sopResults = await Promise.all(sopQueries)
            const sops = dedupeById(sopResults.flatMap((result) => result.data || []))

            results.push(...sops.map((sop: { id: string; title: string; description?: string; category?: string; version?: number; status?: string }) => ({
              id: sop.id,
              type: 'sop' as const,
              title: sop.title,
              description: sop.description,
              category: sop.category,
              url: `/knowledge/${sop.id}`,
              metadata: { version: sop.version, status: sop.status },
              relevance_score: calculateRelevanceScore(query, sop.title, sop.description)
            })))
          } catch (searchError) {
            console.warn('SOP search failed:', searchError)
          }
        }

        if (includeTasks) {
          try {
            const taskLimit = Math.ceil(limit / 3)
            const textFilter = `title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%`
            const taskDepartmentIds =
              explicitDepartmentId
                ? [explicitDepartmentId]
                : (primaryRole === 'department_head' || primaryRole === 'author')
                  ? userDepartmentIds
                  : []

            const buildTaskBaseQuery = () => {
              let q = supabase
                .from('tasks')
                .select('id, title, description, status, due_date, assigned_to_id, created_by_id, department_id')
                .eq('is_deleted', false)
                .or(textFilter)
                .limit(taskLimit)

              q = applyIdsScope(q, 'property_id', scopedPropertyIds)
              q = applyIdsScope(q, 'department_id', taskDepartmentIds)
              return q
            }

            const taskQueries: Array<PromiseLike<{ data: any; error: { message?: string } | null }>> = []
            if (canViewAllTasks) {
              taskQueries.push(toPromise(buildTaskBaseQuery()))
            } else if (user?.id) {
              taskQueries.push(toPromise(buildTaskBaseQuery().eq('assigned_to_id', user.id)))
              taskQueries.push(toPromise(buildTaskBaseQuery().eq('created_by_id', user.id)))
            }

            const taskResults = await Promise.all(taskQueries)
            const tasks = dedupeById(taskResults.flatMap((result) => result.data || []))

            results.push(...tasks.map((task) => ({
              id: task.id,
              type: 'task' as const,
              title: task.title || 'Untitled Task',
              description: task.description || undefined,
              category: 'Task',
              url: `/tasks/${task.id}`,
              metadata: { status: task.status, due_date: task.due_date },
              relevance_score: calculateRelevanceScore(query, task.title || '', task.description || '')
            })))
          } catch (searchError) {
            console.error('Error searching tasks:', searchError)
          }
        }

        if (includeTickets) {
          try {
            let ticketsQuery = supabase
              .from('maintenance_tickets')
              .select('id, title, description, status, priority, room_number')
              .eq('is_deleted', false)
              .or(`title.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,room_number.ilike.%${escapedQuery}%`)

            ticketsQuery = applyIdsScope(ticketsQuery, 'property_id', scopedPropertyIds)

            const ticketDepartmentIds =
              explicitDepartmentId
                ? [explicitDepartmentId]
                : (primaryRole === 'department_head' || primaryRole === 'author')
                  ? userDepartmentIds
                  : []
            ticketsQuery = applyIdsScope(ticketsQuery, 'department_id', ticketDepartmentIds)

            const { data: tickets } = await ticketsQuery.limit(Math.ceil(limit / 3))

            if (tickets) {
              results.push(...tickets.map((ticket) => ({
                id: ticket.id,
                type: 'ticket' as const,
                title: ticket.title || 'Maintenance Ticket',
                description: ticket.description || undefined,
                category: 'Maintenance',
                url: `/maintenance/tickets/${ticket.id}`,
                metadata: {
                  status: ticket.status,
                  priority: ticket.priority,
                  room_number: ticket.room_number
                },
                relevance_score: calculateRelevanceScore(
                  query,
                  ticket.title || '',
                  ticket.description || ticket.room_number || ''
                )
              })))
            }
          } catch (searchError) {
            console.error('Error searching maintenance tickets:', searchError)
          }
        }

        if (includeReferrals) {
          try {
            if (!canViewAllReferrals && !user?.id) {
              return dedupeById(results)
                .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
                .slice(0, limit)
            }

            let referralsQuery = supabase
              .from('job_applications')
              .select('id, applicant_name, applicant_email, applicant_phone, status, referred_by')
              .not('referred_by', 'is', null)
              .or(`applicant_name.ilike.%${escapedQuery}%,applicant_email.ilike.%${escapedQuery}%,applicant_phone.ilike.%${escapedQuery}%`)
              .limit(Math.ceil(limit / 4))

            if (!canViewAllReferrals && user?.id) {
              referralsQuery = referralsQuery.eq('referred_by', user.id)
            }

            const { data: referrals } = await referralsQuery

            if (referrals) {
              results.push(...referrals.map((referral) => ({
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
          } catch (searchError) {
            console.error('Error searching referrals:', searchError)
          }
        }

        return dedupeById(results)
          .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
          .slice(0, limit)
      } catch (searchError) {
        console.error('Search error:', searchError)
        return []
      } finally {
        setIsSearching(false)
      }
    },
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
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

function calculateRelevanceScore(query: string, title: string, description?: string): number {
  let score = 0
  const queryLower = query.toLowerCase()
  const titleLower = title.toLowerCase()
  const descriptionLower = (description || '').toLowerCase()

  if (titleLower === queryLower) score += 100
  else if (titleLower.startsWith(queryLower)) score += 80
  else if (titleLower.includes(queryLower)) score += 60

  if (descriptionLower.includes(queryLower)) score += 30

  const titleWords = titleLower.split(/\s+/)
  const queryWords = queryLower.split(/\s+/)
  queryWords.forEach((queryWord) => {
    if (titleWords.some((titleWord) => titleWord === queryWord)) score += 20
  })

  return score
}

export function useSearchSuggestions(query: string) {
  const { user, roles, departments, properties } = useAuth()
  const { currentProperty, propertyIds } = useProperty()

  const roleValues = uniqueStrings((roles || []).map((roleRow) => roleRow?.role))
  const canSearchDraftContent = roleValues.some((role) => SEARCH_DRAFT_ROLES.has(role))

  const scopedPropertyIds = (() => {
    if (isRealPropertyId(currentProperty?.id)) return [currentProperty.id]
    if (propertyIds.length > 0) return propertyIds
    return uniqueStrings((properties || []).map((property) => property?.id))
  })()

  const scopedDepartmentIds = uniqueStrings((departments || []).map((department) => department?.id))

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['search-suggestions', query, user?.id, scopedPropertyIds, scopedDepartmentIds, roleValues],
    queryFn: async () => {
      if (!query.trim()) return []

      const suggestions: SearchSuggestion[] = []
      const queryLower = query.toLowerCase()
      const escapedQuery = escapeSearchQuery(query)

      if (queryLower.startsWith('add') || queryLower.startsWith('create') || queryLower.startsWith('new')) {
        const actionMap = [
          { keywords: ['user', 'staff', 'employee'], text: 'Add New Staff Member', url: '/admin/users' },
          { keywords: ['task', 'todo'], text: 'Create New Task', url: '/tasks' },
          { keywords: ['announcement', 'news'], text: 'Post Announcement', url: '/announcements' },
          { keywords: ['ticket', 'maintenance'], text: 'Raise Maintenance Ticket', url: '/maintenance' },
          { keywords: ['job', 'posting'], text: 'Create Job Posting', url: '/jobs/new' }
        ]

        actionMap.forEach((action) => {
          if (action.keywords.some((keyword) => queryLower.includes(keyword)) || queryLower.length < 5) {
            suggestions.push({
              id: `action-${action.text}`,
              text: action.text,
              type: 'action',
              url: action.url
            })
          }
        })
      }

      if (queryLower.startsWith('go') || queryLower.startsWith('open') || queryLower.includes('page')) {
        SYSTEM_PAGES.forEach((page) => {
          if (
            page.keywords.some((keyword) => queryLower.includes(keyword)) ||
            page.title.toLowerCase().includes(queryLower)
          ) {
            suggestions.push({
              id: `nav-${page.id}`,
              text: `Go to ${page.title}`,
              type: 'navigation',
              url: page.url
            })
          }
        })
      }

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

      if (suggestions.length < 5) {
        try {
          const docSuggestionLimit = 3
          const docQueryResults: Array<{ data: any }> = []

          const runDocumentSuggestionQuery = async (mutate) => {
            let q = supabase
              .from('documents')
              .select('id, title, status, visibility')
              .ilike('title', `%${escapedQuery}%`)
              .eq('is_deleted', false)
              .limit(docSuggestionLimit)

            if (!canSearchDraftContent) q = q.eq('status', 'PUBLISHED')
            const result = await mutate(q)
            docQueryResults.push({ data: result.data || [] })
          }

          await runDocumentSuggestionQuery((q) => q.eq('visibility', 'all_properties'))
          if (scopedPropertyIds.length > 0) {
            await runDocumentSuggestionQuery((q) => applyIdsScope(q.eq('visibility', 'property'), 'property_id', scopedPropertyIds))
          }
          if (scopedDepartmentIds.length > 0) {
            await runDocumentSuggestionQuery((q) => applyIdsScope(q.eq('visibility', 'department'), 'department_id', scopedDepartmentIds))
            await runDocumentSuggestionQuery((q) => applyIdsScope(q.eq('visibility', 'group_department'), 'department_id', scopedDepartmentIds))
          }
          if (roleValues.length > 0) {
            await runDocumentSuggestionQuery((q) => applyIdsScope(q.eq('visibility', 'role'), 'role', roleValues))
          }

          const visibleDocuments = dedupeById(docQueryResults.flatMap((result) => result.data || [])).slice(0, 3)
          suggestions.push(...visibleDocuments.map((doc) => ({
            id: doc.id,
            text: doc.title,
            type: 'document' as const,
            url: `/documents/${doc.id}`
          })))

          if (suggestions.length < 8) {
            // sop_documents consolidated into documents (content_type='sop').
            const sopQueries: Array<PromiseLike<{ data: any }>> = []

            const buildSopSuggestionQuery = () => {
              let q = supabase
                .from('documents')
                .select('id, title, status')
                .eq('content_type', 'sop')
                .ilike('title', `%${escapedQuery}%`)
                .limit(3)

              if (!canSearchDraftContent) q = q.eq('status', 'PUBLISHED')
              return q
            }

            sopQueries.push(toPromise(buildSopSuggestionQuery().is('property_id', null).is('department_id', null)))
            if (scopedPropertyIds.length > 0) {
              sopQueries.push(toPromise(applyIdsScope(buildSopSuggestionQuery(), 'property_id', scopedPropertyIds)))
            }
            if (scopedDepartmentIds.length > 0) {
              sopQueries.push(toPromise(applyIdsScope(buildSopSuggestionQuery(), 'department_id', scopedDepartmentIds)))
            }

            const sopResults = await Promise.all(sopQueries)
            const sops = dedupeById(sopResults.flatMap((result) => result.data || [])).slice(0, 3)

            suggestions.push(...sops.map((sop: { id: string; title: string }) => ({
              id: sop.id,
              text: sop.title,
              type: 'document' as const,
              url: `/knowledge/${sop.id}`,
              category: 'SOP'
            })))
          }
        } catch (suggestionError) {
          console.warn('Suggestion fetch failed', suggestionError)
        }
      }

      return dedupeById(suggestions).slice(0, 8)
    },
    enabled: query.trim().length > 0,
    staleTime: 60 * 1000,
  })

  return {
    suggestions,
    isLoading
  }
}

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

    const updatedSearches = [query, ...recentSearches.filter((savedQuery) => savedQuery !== query)].slice(0, 10)

    try {
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))
    } catch (error) {
      if (isQuotaExceededError(error)) {
        const fallback = updatedSearches.slice(0, 5)
        try {
          localStorage.setItem('recentSearches', JSON.stringify(fallback))
          return
        } catch {
          // Ignore fallback write failures.
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
