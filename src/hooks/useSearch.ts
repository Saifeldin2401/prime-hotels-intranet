import { useProperty } from '@/contexts/PropertyContext'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { SYSTEM_PAGES } from '@/lib/searchConfig'
import { supabase } from '@/lib/supabase'
import { escapeSearchQuery } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

interface SearchResult {
  id: string
  type: 'document' | 'user' | 'training' | 'sop' | 'page'
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
  includeSOPs?: boolean
  limit?: number
  propertyId?: string
  departmentId?: string
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

export function useSearch(query: string, options: UseSearchOptions = {}) {
  const { user, primaryRole, roles, departments, properties } = useAuth()
  const { currentProperty, propertyIds } = useProperty()
  const { currentOrganization, isPlatformScope } = useTenant()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const {
    includeDocuments = true,
    includeUsers = true,
    includeTraining = true,
    includeSOPs = true,
    limit = 20,
    propertyId: explicitPropertyId,
    departmentId: explicitDepartmentId
  } = options

  const isAdmin = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin'].includes(primaryRole || '')
  const roleValues = uniqueStrings((roles || []).map((roleRow) => roleRow?.role))
  const canSearchDraftContent = roleValues.some((role) => SEARCH_DRAFT_ROLES.has(role))
  const canSearchUsers = USER_SEARCH_ROLES.has(primaryRole || '')

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['global-search', query, options, user?.id, primaryRole, scopedPropertyIds, scopedDepartmentIds, roleValues, currentOrganization?.id, isPlatformScope],
    queryFn: async () => {
      if (!query.trim()) return []

      setIsSearching(true)
      const results: SearchResult[] = []
      const queryLower = query.toLowerCase()
      const escapedQuery = escapeSearchQuery(query)

      const matchingPages = SYSTEM_PAGES.filter((page) => {
        if (isPlatformScope && (page.url.startsWith('/knowledge') || page.url.startsWith('/learn/my') || page.url.startsWith('/documents') || page.url.startsWith('/sops') || page.url.startsWith('/learn/my'))) {
          return false
        }
        return (
          page.title.toLowerCase().includes(queryLower) ||
          page.description.toLowerCase().includes(queryLower) ||
          page.keywords.some((keyword) => keyword.toLowerCase().includes(queryLower))
        )
      })

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

              if (currentOrganization?.id && !isPlatformScope) {
                q = q.or(`organization_id.eq.${currentOrganization.id},is_master_template.eq.true`)
              } else {
                q = q.eq('is_master_template', true)
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

        if (includeUsers && canSearchUsers && currentOrganization?.id && !isPlatformScope) {
          try {
            const { data: users } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('organization_id', currentOrganization.id)
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
                url: `/profile/${profileRow.id}`,
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
                .from('courses')
                .select('id, title, description, category, status, property_id')
                .or(textFilter)
                .limit(trainingLimit)

              if (!canSearchDraftContent) {
                q = q.in('status', ['published', 'active'])
              }

              if (currentOrganization?.id && !isPlatformScope) {
                q = q.or(`organization_id.eq.${currentOrganization.id},is_master_template.eq.true`)
              } else {
                q = q.eq('is_master_template', true)
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
                ? `/studio/courses/${module.id}?view=builder`
                : `/learn/player/${module.id}`,
              metadata: { status: module.status },
              relevance_score: calculateRelevanceScore(query, module.title, module.description)
            })))
          } catch (searchError) {
            console.error('Error searching training:', searchError)
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

              if (currentOrganization?.id && !isPlatformScope) {
                q = q.or(`organization_id.eq.${currentOrganization.id},is_master_template.eq.true`)
              } else {
                q = q.eq('is_master_template', true)
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
