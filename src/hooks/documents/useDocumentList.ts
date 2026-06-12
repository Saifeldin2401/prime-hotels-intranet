import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/lib/types'
import { secureSearchDocuments } from '@/lib/secureSearch'
import { useQuery } from '@tanstack/react-query'
import type { DocumentFilters } from './types'
import { saveRecentlyViewedDocument } from './utils'

export function useDocuments(filters?: DocumentFilters) {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['documents', filters, primaryRole],
    queryFn: async () => {
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

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility)
      }
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }
      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id)
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }

      if (filters?.folder_id !== undefined) {
        if (filters.folder_id === null) {
          query = query.is('folder_id', null)
        } else {
          query = query.eq('folder_id', filters.folder_id)
        }
      }

      if (filters?.confidentiality_level) {
        query = query.eq('confidentiality_level', filters.confidentiality_level)
      }

      if (filters?.file_type) {
        if (Array.isArray(filters.file_type)) {
          query = query.in('file_type', filters.file_type)
        } else {
          query = query.eq('file_type', filters.file_type)
        }
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      if (filters?.has_expiry) {
        query = query.not('expires_at', 'is', null)
      }
      if (filters?.expiry_before) {
        query = query.lte('expires_at', filters.expiry_before)
      }
      if (filters?.expiry_after) {
        query = query.gte('expires_at', filters.expiry_after)
      }

      if (filters?.tags && filters.tags.length > 0) {
        const { data: tagDocRows, error: tagDocErr } = await supabase
          .from('document_tag_assignments')
          .select('document_id')
          .in('tag_id', filters.tags)

        if (tagDocErr) throw tagDocErr

        const docIds = Array.from(new Set((tagDocRows || []).map((r) => r.document_id).filter(Boolean)))
        if (docIds.length === 0) return [] as Document[]

        query = query.in('id', docIds)
      }

      // SECURE: Use parameterized database function for search
      // VULNERABLE CODE (DO NOT USE): query = query.or(`title.ilike.%${escaped}%,...`)
      if (filters?.search) {
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
          limit: 100
        })

        return secureData.map((doc: Record<string, unknown>) => {
          const hydrated = doc as Record<string, unknown>
          if (hydrated.author) {
            hydrated.author = typeof hydrated.author === 'string'
              ? JSON.parse(hydrated.author)
              : hydrated.author
          }
          return hydrated as unknown as Document
        })
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(doc => {
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
    },
  })
}

export function useDocument(documentId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['document', documentId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
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
          folder:document_folders(id, name, parent_id),
          tag_assignments:document_tag_assignments(tag_id, tag:document_tags(id, name, color)),
          departments(id, name),
          properties(id, name),
          author:profiles!documents_created_by_fkey(id, full_name)
        `)
        .eq('id', documentId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error

      if (user?.id) {
        saveRecentlyViewedDocument(user.id, documentId)
      }
      const hydrated = data as any
      if (hydrated) {
        if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
          hydrated.tags = hydrated.tag_assignments
            .map((a: any) => a.tag)
            .filter(Boolean)
        }
        if (Array.isArray(hydrated.author) && hydrated.author.length > 0) {
          hydrated.author = hydrated.author[0]
        }
      }
      return hydrated as unknown as Document
    },
    enabled: !!documentId,
  })
}
