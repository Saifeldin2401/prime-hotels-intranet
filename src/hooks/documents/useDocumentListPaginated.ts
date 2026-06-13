import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/lib/types'
import { secureSearchDocuments, secureCountDocuments } from '@/lib/secureSearch'
import { useQuery } from '@tanstack/react-query'
import type { DocumentFilters } from './types'

export function useDocumentsPaginated(
  filters?: DocumentFilters,
  pagination?: { page: number; pageSize: number }
) {
  const { primaryRole } = useAuth()
  const pageSize = pagination?.pageSize || 20
  const page = pagination?.page || 1

  return useQuery({
    queryKey: ['documents-paginated', filters, primaryRole, page, pageSize],
    queryFn: async () => {
      // SECURE: Use parameterized RPC for count when searching
      let totalCount = 0

      if (filters?.search) {
        totalCount = await secureCountDocuments({
          search: filters.search,
          property_id: filters.property_id,
          department_id: filters.department_id,
          status: filters.status,
          visibility: filters.visibility,
          file_type: filters.file_type,
          date_from: filters.date_from,
          date_to: filters.date_to,
          confidentiality_level: filters.confidentiality_level,
          include_deleted: filters.include_deleted,
          include_archived: filters.include_archived
        })
      } else {
        let countQuery = supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })

        if (filters?.include_deleted) {
          countQuery = countQuery.eq('is_deleted', true)
        } else {
          countQuery = countQuery.eq('is_deleted', false)
        }

        if (!filters?.include_archived && !filters?.include_deleted) {
          countQuery = countQuery.eq('is_archived', false)
        }

        const contentTypeFilter = filters?.contentType === undefined ? 'document' : filters.contentType
        if (contentTypeFilter) {
          countQuery = countQuery.eq('content_type', contentTypeFilter)
        }

        if (filters?.status) countQuery = countQuery.eq('status', filters.status)
        if (filters?.visibility) countQuery = countQuery.eq('visibility', filters.visibility)
        if (filters?.property_id) countQuery = countQuery.eq('property_id', filters.property_id)
        if (filters?.department_id) countQuery = countQuery.eq('department_id', filters.department_id)
        if (filters?.folder_id !== undefined) {
          if (filters.folder_id === null) {
            countQuery = countQuery.is('folder_id', null)
          } else {
            countQuery = countQuery.eq('folder_id', filters.folder_id)
          }
        }
        if (filters?.confidentiality_level) {
          countQuery = countQuery.eq('confidentiality_level', filters.confidentiality_level)
        }
        if (filters?.file_type) {
          if (Array.isArray(filters.file_type)) {
            countQuery = countQuery.in('file_type', filters.file_type)
          } else {
            countQuery = countQuery.eq('file_type', filters.file_type)
          }
        }
        if (filters?.date_from) countQuery = countQuery.gte('created_at', filters.date_from)
        if (filters?.date_to) countQuery = countQuery.lte('created_at', filters.date_to)

        if (filters?.tags && filters.tags.length > 0) {
          const { data: tagDocRows, error: tagDocErr } = await supabase
            .from('document_tag_assignments')
            .select('document_id')
            .in('tag_id', filters.tags)

          if (tagDocErr) throw tagDocErr

          const docIds = Array.from(new Set((tagDocRows || []).map((r) => r.document_id).filter(Boolean)))
          if (docIds.length === 0) {
            return {
              documents: [] as Document[],
              totalCount: 0,
              totalPages: 0,
              currentPage: page,
            }
          }
          countQuery = countQuery.in('id', docIds)
        }

        const { count, error: countError } = await countQuery
        if (countError) throw countError
        totalCount = count || 0
      }

      // SECURE: Use parameterized RPC for data fetching when searching
      let data: Document[] = []

      if (filters?.search) {
        const from = (page - 1) * pageSize
        const secureData = await secureSearchDocuments({
          search: filters.search,
          property_id: filters.property_id,
          folder_id: filters.folder_id,
          status: filters.status,
          visibility: filters.visibility,
          department_id: filters.department_id,
          file_type: filters.file_type,
          date_from: filters.date_from,
          date_to: filters.date_to,
          confidentiality_level: filters.confidentiality_level,
          include_deleted: filters.include_deleted,
          include_archived: filters.include_archived,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
          limit: pageSize,
          offset: from
        })
        data = secureData as Document[]
      } else {
        let query = supabase
          .from('documents')
          .select(`
            id,
            title,
            description,
            content_type,
            status,
            visibility,
            property_id,
            department_id,
            folder_id,
            file_type,
            file_extension,
            file_size,
            file_url,
            role,
            requires_acknowledgment,
            current_version,
            storage_bucket,
            storage_path,
            content,
            view_count,
            download_count,
            is_archived,
            is_deleted,
            deleted_at,
            expires_at,
            confidentiality_level,
            created_by,
            created_at,
            updated_at,
            folder:document_folders(id, name),
            tag_assignments:document_tag_assignments(tag:document_tags(id, name, color)),
            author:profiles!documents_created_by_fkey(id, full_name, avatar_url)
          `)
          .order(filters?.sort_by || 'created_at', {
            ascending: filters?.sort_order === 'asc'
          })

        if (filters?.include_deleted) {
          query = query.eq('is_deleted', true)
        } else {
          query = query.eq('is_deleted', false)
        }

        if (!filters?.include_archived && !filters?.include_deleted) {
          query = query.eq('is_archived', false)
        }

        const contentTypeFilter = filters?.contentType === undefined ? 'document' : filters.contentType
        if (contentTypeFilter) {
          query = query.eq('content_type', contentTypeFilter)
        }
        if (filters?.status) query = query.eq('status', filters.status)
        if (filters?.visibility) query = query.eq('visibility', filters.visibility)
        if (filters?.property_id) query = query.eq('property_id', filters.property_id)
        if (filters?.department_id) query = query.eq('department_id', filters.department_id)
        if (filters?.folder_id !== undefined) {
          if (filters.folder_id === null) {
            query = query.is('folder_id', null)
          } else {
            query = query.eq('folder_id', filters.folder_id)
          }
        }

        if (filters?.tags && filters.tags.length > 0) {
          const { data: tagDocRows, error: tagDocErr } = await supabase
            .from('document_tag_assignments')
            .select('document_id')
            .in('tag_id', filters.tags)

          if (tagDocErr) throw tagDocErr

          const docIds = Array.from(new Set((tagDocRows || []).map((r) => r.document_id).filter(Boolean)))
          if (docIds.length === 0) {
            return {
              documents: [] as Document[],
              totalCount: totalCount,
              totalPages: 0,
              currentPage: page,
            }
          }
          query = query.in('id', docIds)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        const { data: queryData, error } = await query
        if (error) throw error

        data = (queryData || []).map(doc => {
          const hydrated = doc as any
          if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
            hydrated.tags = hydrated.tag_assignments
              .map((a: any) => a.tag)
              .filter(Boolean)
          }
          if (Array.isArray(hydrated.author) && hydrated.author.length > 0) {
            hydrated.author = hydrated.author[0]
          }
          return hydrated as unknown as Document
        })
      }

      return {
        documents: data,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page
      }
    },
  })
}
