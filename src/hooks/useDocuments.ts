import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { logAuditEvent } from '@/lib/auditLog'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import type { Document, DocumentApproval, DocumentVersion } from '@/lib/types'
import { escapeSearchQuery } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

const DOCS_RECENTLY_VIEWED_KEY = 'docs_recently_viewed'
const MAX_RECENT_DOCS = 20

const MAX_BULK_OPERATION_IDS = 200

const assertBulkOperationSize = (ids: string[], operationLabel: string) => {
  if (ids.length > MAX_BULK_OPERATION_IDS) {
    throw new Error(`${operationLabel} limited to ${MAX_BULK_OPERATION_IDS} items per operation. Selected: ${ids.length}`)
  }
}

// ============================================================================
// Types
// ============================================================================

export interface DocumentFilters {
  status?: string
  visibility?: string
  property_id?: string
  department_id?: string
  search?: string
  /**
   * Filter by content type. 
   * Use 'document' for file uploads only.
   * Use undefined to get all types (including knowledge base articles).
   * @default 'document'
   */
  contentType?: string | null
  // Enhanced document system filters
  folder_id?: string | null
  tags?: string[]
  file_type?: string | string[] // pdf, doc, xls, etc.
  date_from?: string // ISO date string
  date_to?: string // ISO date string
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted'
  include_deleted?: boolean // for trash view
  include_archived?: boolean
  has_expiry?: boolean
  expiry_before?: string
  expiry_after?: string
  created_by?: string
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'view_count'
  sort_order?: 'asc' | 'desc'
}

export interface DocumentFolder {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  property_id: string | null
  department_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  document_count?: number
  children?: DocumentFolder[]
}

export interface DocumentTag {
  id: string
  name: string
  color: string | null
  description: string | null
  usage_count?: number
  created_at: string
}

export interface DocumentComment {
  id: string
  document_id: string
  user_id: string
  content: string
  parent_id: string | null
  is_resolved: boolean
  is_pinned: boolean
  created_at: string
  updated_at: string
  author?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  replies?: DocumentComment[]
}

export interface DocumentAnalytics {
  document_id: string
  view_count: number
  download_count: number
  unique_viewers: number
  acknowledgment_count: number
  views_over_time: Array<{
    date: string
    count: number
  }>
  downloads_over_time: Array<{
    date: string
    count: number
  }>
  viewers_by_department: Array<{
    department_id: string
    department_name: string
    count: number
  }>
}

export interface AISuggestion {
  value: string
  confidence: 'high' | 'medium' | 'low'
  reason?: string
}

export interface BulkOperationResult {
  success: string[]
  failed: Array<{ id: string; error: string }>
  total: number
}

export interface DocumentExpiryInfo {
  id: string
  title: string
  expires_at: string
  days_until_expiry: number
  status: 'expired' | 'expiring_soon' | 'active'
  folder_id: string | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function saveRecentlyViewedDocument(userId: string, documentId: string): void {
  if (!isValidUUID(documentId)) return
  try {
    const storageKey = `${DOCS_RECENTLY_VIEWED_KEY}_${userId}`
    const raw = localStorage.getItem(storageKey)
    const existing = raw ? (JSON.parse(raw) as { id: string; viewedAt: string }[]) : []

    const filtered = Array.isArray(existing) ? existing.filter((i) => i?.id !== documentId) : []
    const updated = [{ id: documentId, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT_DOCS)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to record recently viewed document:', e)
  }
}

// ============================================================================
// Core Document Hooks
// ============================================================================

/**
 * Fetch documents with comprehensive filtering support
 */
export function useDocuments(filters?: DocumentFilters) {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['documents', filters, primaryRole],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          folder:document_folders(id, name),
          tag_assignments:document_tag_assignments(tag:document_tags(id, name, color)),
          author:profiles!documents_created_by_fkey(id, full_name, avatar_url)
        `)
        .order(filters?.sort_by || 'created_at', {
          ascending: filters?.sort_order === 'asc'
        })

      // Handle deleted/archived filters
      if (filters?.include_deleted) {
        // For trash view, only show deleted
        query = query.eq('is_deleted', true)
      } else {
        query = query.eq('is_deleted', false)
      }

      if (!filters?.include_archived && !filters?.include_deleted) {
        query = query.eq('is_archived', false)
      }

      // Default to showing only file documents (not knowledge base articles)
      const contentTypeFilter = filters?.contentType === undefined ? 'document' : filters.contentType
      if (contentTypeFilter) {
        query = query.eq('content_type', contentTypeFilter)
      }

      // Apply basic filters
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

      // Enhanced filters
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

      // Date range filters
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      // Expiry filters
      if (filters?.has_expiry) {
        query = query.not('expires_at', 'is', null)
      }
      if (filters?.expiry_before) {
        query = query.lte('expires_at', filters.expiry_before)
      }
      if (filters?.expiry_after) {
        query = query.gte('expires_at', filters.expiry_after)
      }

      // Tags filter - requires two-step query (Supabase client doesn't support subquery builders inside .in)
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

      // Full-text search using database function if available, otherwise ILIKE
      if (filters?.search) {
        const escaped = escapeSearchQuery(filters.search)
        // Try to use full-text search if available
        const { data: ftsData, error: ftsError } = await supabase.rpc('search_documents', {
          p_query: filters.search,
          p_property_id: filters.property_id || null,
          p_folder_id: filters.folder_id === undefined ? null : filters.folder_id,
          p_limit: 100,
          p_offset: 0,
        })

        if (!ftsError && ftsData) {
          return ftsData as Document[]
        }

        // Fallback to ILIKE search
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,content.ilike.%${escaped}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Hydrate tags for each document
      return (data || []).map(doc => {
        const hydrated = doc
        if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
          hydrated.tags = hydrated.tag_assignments
            .map((a) => a.tag)
            .filter(Boolean)
        }
        return hydrated as Document
      })
    },
  })
}

/**
 * Fetch paginated documents with comprehensive filtering
 */
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
      // First get total count
      let countQuery = supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })

      // Apply same filters as main query
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
      if (filters?.search) {
        const escaped = escapeSearchQuery(filters.search)
        countQuery = countQuery.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
      }

      // Tag filter for count (two-step)
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

      // Get paginated data
      let query = supabase
        .from('documents')
        .select(`
          *,
          folder:document_folders(id, name),
          tag_assignments:document_tag_assignments(tag:document_tags(id, name, color)),
          author:profiles!documents_created_by_fkey(id, full_name, avatar_url)
        `)
        .order(filters?.sort_by || 'created_at', {
          ascending: filters?.sort_order === 'asc'
        })

      // Apply same filters
      if (filters?.include_deleted) {
        query = query.eq('is_deleted', true)
      } else {
        query = query.eq('is_deleted', false)
      }

      if (!filters?.include_archived && !filters?.include_deleted) {
        query = query.eq('is_archived', false)
      }

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
      if (filters?.search) {
        const escaped = escapeSearchQuery(filters.search)
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
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
            totalCount: count || 0,
            totalPages: 0,
            currentPage: page,
          }
        }
        query = query.in('id', docIds)
      }

      // Apply pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error } = await query
      if (error) throw error

      const hydratedDocs = (data || []).map(doc => {
        const hydrated = doc
        if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
          hydrated.tags = hydrated.tag_assignments
            .map((a) => a.tag)
            .filter(Boolean)
        }
        return hydrated as Document
      })

      return {
        documents: hydratedDocs,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page
      }
    },
  })
}

/**
 * Fetch a single document by ID
 */
export function useDocument(documentId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['document', documentId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          folder:document_folders(*),
          tag_assignments:document_tag_assignments(tag_id, tag:document_tags(id, name, color)),
          departments(name),
          properties(name),
          author:profiles!documents_created_by_fkey(id, full_name)
        `)
        .eq('id', documentId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error

      if (user?.id) {
        saveRecentlyViewedDocument(user.id, documentId)
      }
      const hydrated = data
      // Normalize tags into a flat array for UI
      if (hydrated?.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
        hydrated.tags = hydrated.tag_assignments
          .map((a) => a.tag)
          .filter(Boolean)
      }
      return hydrated as Document
    },
    enabled: !!documentId,
  })
}

/**
 * Create a new document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient()
  const { user, primaryRole } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (document: Partial<Document>) => {
      if (!user) throw new Error('User must be authenticated')

      if (document.property_id !== undefined && !isRealPropertyId(document.property_id)) {
        throw new Error('A valid property_id is required to create a document')
      }

      const resolvedPropertyId = isRealPropertyId(document.property_id)
        ? document.property_id
        : (isRealPropertyId(currentProperty?.id) ? currentProperty.id : null)

      if (!resolvedPropertyId && document.visibility && document.visibility !== 'all_properties') {
        throw new Error('A valid property_id is required for non-global documents')
      }

      // Regional admins, corporate admins, and HR can auto-publish documents
      const canAutoPublish = primaryRole === 'regional_admin' || primaryRole === 'regional_hr' || primaryRole === 'corporate_admin'
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...document,
          property_id: resolvedPropertyId ?? document.property_id ?? null,
          created_by: user.id,
          status: canAutoPublish ? 'PUBLISHED' : 'DRAFT',
          // Set published fields for auto-published documents
          ...(canAutoPublish && {
            last_published_at: now,
            last_published_by: user.id,
            published_version_number: document.current_version || 1,
          }),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.create.success(data?.status === 'PUBLISHED' ? 'Document published' : 'Document created as draft')
    },
    onError: () => crudToasts.create.error('document')
  })
}

/**
 * Update an existing document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
      if (updates.property_id !== undefined) {
        if (updates.property_id === null) {
          if (updates.visibility && updates.visibility !== 'all_properties') {
            throw new Error('property_id can only be cleared for global documents')
          }
        } else if (!isRealPropertyId(updates.property_id)) {
          throw new Error('A valid property_id is required when updating document scope')
        }
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document', data.id] })
      crudToasts.update.success('Document')
    },
    onError: () => crudToasts.update.error('document')
  })
}

/**
 * Soft delete a document (move to trash)
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.delete.success('Document')
    },
    onError: () => crudToasts.delete.error('document')
  })
}

// ============================================================================
// Document Stats Hook
// ============================================================================

/**
 * Fetch comprehensive document statistics
 */
export function useDocumentStats() {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['document-stats', primaryRole],
    queryFn: async () => {
      // Basic stats
      const { data: basicData, error: basicError } = await supabase
        .from('documents')
        .select('status, file_size, file_extension, folder_id, view_count, download_count, expires_at, is_archived')
        .eq('is_deleted', false)
        .eq('content_type', 'document')

      if (basicError) throw basicError

      // Storage by folder
      const { data: folderStats, error: folderError } = await supabase
        .from('documents')
        .select('folder_id, file_size')
        .eq('is_deleted', false)
        .eq('content_type', 'document')

      if (folderError) throw folderError

      // Expiring soon count
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const { count: expiringSoonCount, error: expiryError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .lte('expires_at', thirtyDaysFromNow.toISOString())
        .gte('expires_at', new Date().toISOString())

      if (expiryError) throw expiryError

      // Expired count
      const { count: expiredCount, error: expiredError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .lt('expires_at', new Date().toISOString())

      if (expiredError) throw expiredError

      // Calculate file type distribution
      const fileTypeStats: Record<string, number> = {}
      basicData?.forEach(doc => {
        const type = doc.file_extension || 'unknown'
        fileTypeStats[type] = (fileTypeStats[type] || 0) + 1
      })

      // Calculate storage by folder
      const storageByFolder: Record<string, number> = {}
      folderStats?.forEach(doc => {
        const folderId = doc.folder_id || 'root'
        storageByFolder[folderId] = (storageByFolder[folderId] || 0) + (doc.file_size || 0)
      })

      return {
        // Basic counts
        total: basicData?.length || 0,
        draft: basicData?.filter(d => d.status === 'DRAFT').length || 0,
        pending: basicData?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        approved: basicData?.filter(d => d.status === 'APPROVED').length || 0,
        published: basicData?.filter(d => d.status === 'PUBLISHED').length || 0,
        rejected: basicData?.filter(d => d.status === 'REJECTED').length || 0,
        archived: basicData?.filter(d => d.is_archived === true).length || 0,

        // Storage
        totalBytes: basicData?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0,
        storageByFolder,

        // File types
        documentsByFileType: fileTypeStats,

        // Engagement
        totalViews: basicData?.reduce((acc, doc) => acc + (doc.view_count || 0), 0) || 0,
        totalDownloads: basicData?.reduce((acc, doc) => acc + (doc.download_count || 0), 0) || 0,

        // Expiry
        expiringSoon: expiringSoonCount || 0,
        expired: expiredCount || 0,
      }
    },
  })
}

// ============================================================================
// Document Folder Hooks
// ============================================================================

/**
 * Fetch all document folders with document counts
 */
export function useDocumentFolders(parentId?: string | null) {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['document-folders', parentId, primaryRole],
    queryFn: async () => {
      let query = supabase
        .from('document_folders')
        .select(`
          *,
          parent:document_folders!parent_id(id, name),
          document_count:documents(count)
        `)
        .order('name', { ascending: true })

      if (parentId === null) {
        query = query.is('parent_id', null)
      } else if (parentId) {
        query = query.eq('parent_id', parentId)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform document_count from subquery result
      const foldersWithCount = (data || []).map(folder => ({
        ...folder,
        document_count: (folder as { document_count?: [{ count: number }] }).document_count?.[0]?.count || 0
      }))

      return foldersWithCount as DocumentFolder[]
    },
  })
}

/**
 * Fetch folder tree (nested structure)
 */
export function useDocumentFolderTree() {
  const { primaryRole } = useAuth()

  return useQuery({
    queryKey: ['document-folder-tree', primaryRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_folders')
        .select(`
          *,
          document_count:documents(count)
        `)
        .order('name', { ascending: true })

      if (error) throw error

      // Build tree structure
      const folders = (data || []).map(folder => ({
        ...folder,
        document_count: (folder as { document_count?: [{ count: number }] }).document_count?.[0]?.count || 0
      })) as DocumentFolder[]

      const folderMap = new Map(folders.map(f => [f.id, { ...f, children: [] as DocumentFolder[] }]))
      const rootFolders: DocumentFolder[] = []

      folders.forEach(folder => {
        const folderWithChildren = folderMap.get(folder.id)!
        if (folder.parent_id) {
          const parent = folderMap.get(folder.parent_id)
          if (parent) {
            parent.children!.push(folderWithChildren)
          }
        } else {
          rootFolders.push(folderWithChildren)
        }
      })

      return rootFolders
    },
  })
}

/**
 * Create a new folder
 */
export function useCreateDocumentFolder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (folder: Partial<DocumentFolder>) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          ...folder,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] })
      queryClient.invalidateQueries({ queryKey: ['document-folder-tree'] })
      crudToasts.create.success('Folder')
    },
    onError: () => crudToasts.create.error('folder')
  })
}

/**
 * Update a folder
 */
export function useUpdateDocumentFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentFolder> & { id: string }) => {
      const { data, error } = await supabase
        .from('document_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] })
      queryClient.invalidateQueries({ queryKey: ['document-folder-tree'] })
      crudToasts.update.success('Folder')
    },
    onError: () => crudToasts.update.error('folder')
  })
}

/**
 * Delete a folder (must be empty)
 */
export function useDeleteDocumentFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', folderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] })
      queryClient.invalidateQueries({ queryKey: ['document-folder-tree'] })
      crudToasts.delete.success('Folder')
    },
    onError: () => crudToasts.delete.error('folder')
  })
}

// ============================================================================
// Document Tag Hooks
// ============================================================================

/**
 * Fetch all document tags with usage counts
 */
export function useDocumentTags() {
  return useQuery({
    queryKey: ['document-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tags')
        .select(`
          *,
          usage_count:document_tag_assignments(count)
        `)
        .order('name', { ascending: true })

      if (error) throw error

      return (data || []).map(tag => ({
        ...tag,
        usage_count: tag.usage_count?.[0]?.count || 0
      })) as DocumentTag[]
    },
  })
}

/**
 * Search tags by name
 */
export function useSearchDocumentTags(searchQuery: string) {
  return useQuery({
    queryKey: ['document-tags-search', searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: async () => {
      const escaped = escapeSearchQuery(searchQuery)
      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .ilike('name', `%${escaped}%`)
        .order('name', { ascending: true })
        .limit(20)

      if (error) throw error
      return data as DocumentTag[]
    },
  })
}

/**
 * Get popular tags (most used)
 */
export function usePopularDocumentTags(limit: number = 10) {
  return useQuery({
    queryKey: ['document-tags-popular', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_tags')
        .select(`
          *,
          usage_count:document_tag_assignments(count)
        `)
        .order('usage_count', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(tag => ({
        ...tag,
        usage_count: tag.usage_count?.[0]?.count || 0
      })) as DocumentTag[]
    },
  })
}

/**
 * Create a new tag
 */
export function useCreateDocumentTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tag: Partial<DocumentTag>) => {
      const { data, error } = await supabase
        .from('document_tags')
        .insert(tag)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags'] })
      crudToasts.create.success('Tag')
    },
    onError: () => crudToasts.create.error('tag')
  })
}

/**
 * Assign tags to a document
 */
export function useAssignDocumentTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, tagIds }: { documentId: string; tagIds: string[] }) => {
      // First remove existing tags
      const { error: deleteError } = await supabase
        .from('document_tag_assignments')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) throw deleteError

      // Then insert new mappings
      if (tagIds.length > 0) {
        const mappings = tagIds.map(tagId => ({
          document_id: documentId,
          tag_id: tagId
        }))

        const { error: insertError } = await supabase
          .from('document_tag_assignments')
          .insert(mappings)

        if (insertError) throw insertError
      }

      return { documentId, tagIds }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-tags'] })
    },
  })
}

// ============================================================================
// Document Comment Hooks
// ============================================================================

/**
 * Fetch comments for a document with threaded replies
 */
export function useDocumentComments(documentId: string) {
  return useQuery({
    queryKey: ['document-comments', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Build threaded structure
      const comments = (data || []) as any[]
      const commentMap = new Map(comments.map((c) => [c.id, { ...c, replies: [] as any[] }]))
      const rootComments = []

      comments.forEach((comment) => {
        const commentWithReplies = commentMap.get(comment.id)!
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id)
          if (parent) parent.replies.push(commentWithReplies)
        } else {
          rootComments.push(commentWithReplies)
        }
      })

      return rootComments as DocumentComment[]
    },
  })
}

/**
 * Add a comment to a document
 */
export function useAddDocumentComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (comment: { documentId: string; content: string; parentId?: string | null }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: comment.documentId,
          parent_id: comment.parentId ?? null,
          user_id: user.id,
          content: comment.content,
        })
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] })
      crudToasts.create.success('Comment')
    },
    onError: () => crudToasts.create.error('comment')
  })
}

/**
 * Update a comment
 */
export function useUpdateDocumentComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string; documentId: string }) => {
      const { data, error } = await supabase
        .from('document_comments')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-comments'] })
      crudToasts.update.success('Comment')
    },
    onError: () => crudToasts.update.error('comment')
  })
}

/**
 * Delete a comment
 */
export function useDeleteDocumentComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; documentId: string }) => {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-comments', variables.documentId] })
      crudToasts.delete.success('Comment')
    },
    onError: () => crudToasts.delete.error('comment')
  })
}

// ============================================================================
// Document Trash Hooks
// ============================================================================

/**
 * Fetch deleted documents (trash)
 */
export function useDocumentTrash() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-trash', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          folder:document_folders(id, name),
          tag_assignments:document_tag_assignments(tag:document_tags(id, name, color)),
          author:profiles!documents_created_by_fkey(id, full_name)
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      if (error) throw error

      // Hydrate tags for each document
      return (data || []).map(doc => {
        const hydrated = doc
        if (hydrated.tag_assignments && Array.isArray(hydrated.tag_assignments)) {
          hydrated.tags = hydrated.tag_assignments
            .map((a) => a.tag)
            .filter(Boolean)
        }
        return hydrated as Document
      })
    },
  })
}

/**
 * Restore a document from trash
 */
export function useRestoreDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-trash'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.update.success('Document restored')
    },
    onError: () => crudToasts.update.error('restore')
  })
}

/**
 * Permanently delete a document
 */
export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Delete file from storage first
      const { data: doc } = await supabase
        .from('documents')
        .select('storage_bucket, storage_path')
        .eq('id', documentId)
        .single()

      if (doc?.storage_bucket && doc?.storage_path) {
        await supabase.storage
          .from(doc.storage_bucket)
          .remove([doc.storage_path])
      }

      // Delete document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-trash'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.delete.success('Document permanently deleted')
    },
    onError: () => crudToasts.delete.error('permanent deletion')
  })
}

// ============================================================================
// Document Expiry Hooks
// ============================================================================

/**
 * Fetch documents with expiry information
 */
export function useDocumentExpiry(status?: 'expiring_soon' | 'expired' | 'all') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-expiry', status, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          id,
          title,
          expires_at,
          folder_id,
          folder:document_folders(id, name)
        `)
        .eq('is_deleted', false)
        .not('expires_at', 'is', null)

      const now = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      if (status === 'expired') {
        query = query.lt('expires_at', now)
      } else if (status === 'expiring_soon') {
        query = query.gte('expires_at', now).lte('expires_at', thirtyDaysFromNow.toISOString())
      }

      query = query.order('expires_at', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      // Calculate days until expiry
      return (data || []).map((doc) => {
        const expiryDate = new Date(doc.expires_at)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        return {
          ...doc,
          days_until_expiry: daysUntilExpiry,
          status: daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 30 ? 'expiring_soon' : 'active'
        } as DocumentExpiryInfo
      })
    },
  })
}

/**
 * Extend document expiry date
 */
export function useExtendDocumentExpiry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, newExpiryDate }: { documentId: string; newExpiryDate: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          expires_at: newExpiryDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-expiry'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      crudToasts.update.success('Expiry date extended')
    },
    onError: () => crudToasts.update.error('expiry extension')
  })
}

// ============================================================================
// Document Bulk Operations Hooks
// ============================================================================

/**
 * Bulk delete documents (soft delete)
 */
export function useDocumentBulkDelete() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      if (!user?.id) throw new Error('User must be authenticated')

      assertBulkOperationSize(ids, 'Bulk delete documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk delete documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      queryClient.invalidateQueries({ queryKey: ['document-stats'] })

      if (result.failed.length === 0) {
        crudToasts.delete.success(`${result.success.length} documents`)
      } else {
        crudToasts.delete.success(`${result.success.length} documents (${result.failed.length} failed)`)
      }
    }
  })
}

/**
 * Bulk restore documents from trash
 */
export function useDocumentBulkRestore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk restore documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_deleted: false,
          deleted_at: null
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk restore documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      queryClient.invalidateQueries({ queryKey: ['document-trash'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Restored ${result.success.length} documents`)
      }
    }
  })
}

/**
 * Bulk move documents to folder
 */
export function useDocumentBulkMove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk move documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }

      if (folderId === null) {
        updateData.folder_id = null
      } else {
        updateData.folder_id = folderId
      }

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .in('id', ids)
        .select('id')

      if (error) {
        console.error('Bulk move error:', error)
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk move documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            folder_id: folderId
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      queryClient.invalidateQueries({ queryKey: ['document-folders'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Moved ${result.success.length} documents`)
      }
    }
  })
}

/**
 * Bulk add tags to documents
 */
export function useDocumentBulkAddTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, tagIds }: { ids: string[]; tagIds: string[] }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk tag documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      // Create mappings for all document-tag combinations
      const mappings = ids.flatMap(docId =>
        tagIds.map(tagId => ({
          document_id: docId,
          tag_id: tagId
        }))
      )

      // Use upsert to avoid duplicates
      const { error } = await supabase
        .from('document_tag_assignments')
        .upsert(mappings, { onConflict: 'document_id,tag_id' })

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        result.success = ids
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk tag documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            tag_ids: tagIds
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      queryClient.invalidateQueries({ queryKey: ['document-tags'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Added tags to ${result.success.length} documents`)
      }
    }
  })
}

/**
 * Bulk archive documents
 */
export function useDocumentBulkArchive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk archive documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk archive documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      queryClient.invalidateQueries({ queryKey: ['document-stats'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Archived ${result.success.length} documents`)
      }
    }
  })
}

/**
 * Bulk unarchive documents
 */
export function useDocumentBulkUnarchive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk unarchive documents')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          is_archived: false,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk unarchive documents',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Unarchived ${result.success.length} documents`)
      }
    }
  })
}

/**
 * Bulk change confidentiality level
 */
export function useDocumentBulkChangeConfidentiality() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ids,
      level
    }: {
      ids: string[];
      level: 'public' | 'internal' | 'confidential' | 'restricted'
    }): Promise<BulkOperationResult> => {
      assertBulkOperationSize(ids, 'Bulk change document confidentiality')

      const result: BulkOperationResult = {
        success: [],
        failed: [],
        total: ids.length
      }

      const { data, error } = await supabase
        .from('documents')
        .update({
          confidentiality_level: level,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id')

      if (error) {
        ids.forEach(id => result.failed.push({ id, error: error.message }))
      } else {
        data?.forEach(item => result.success.push(item.id))
      }

      if (result.success.length > 0) {
        await logAuditEvent({
          event_type: 'admin.action',
          entity_type: 'document',
          description: 'Bulk change document confidentiality',
          metadata: {
            bulk_operation: true,
            total_selected: result.total,
            success_count: result.success.length,
            failure_count: result.failed.length,
            confidentiality_level: level
          }
        })
      }

      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })

      if (result.success.length > 0) {
        crudToasts.update.success(`Updated confidentiality for ${result.success.length} documents`)
      }
    }
  })
}

// ============================================================================
// Document Analytics Hooks
// ============================================================================

/**
 * Fetch analytics for a specific document
 */
export function useDocumentAnalytics(documentId: string) {
  return useQuery({
    queryKey: ['document-analytics', documentId],
    enabled: !!documentId,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<DocumentAnalytics> => {
      // Get basic stats
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('view_count, download_count')
        .eq('id', documentId)
        .single()

      if (docError) throw docError

      // Get acknowledgment count
      const { count: ackCount, error: ackError } = await supabase
        .from('document_acknowledgments')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', documentId)

      if (ackError) throw ackError

      // Get views over time (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: viewsData, error: viewsError } = await supabase
        .from('document_views')
        .select('viewed_at')
        .eq('document_id', documentId)
        .gte('viewed_at', thirtyDaysAgo.toISOString())

      if (viewsError) throw viewsError

      // Aggregate views by date
      const viewsOverTime: Record<string, number> = {}
      viewsData?.forEach(view => {
        const date = new Date(view.viewed_at).toISOString().split('T')[0]
        viewsOverTime[date] = (viewsOverTime[date] || 0) + 1
      })

      // Get unique viewers
      const { data: uniqueViewers, error: uniqueError } = await supabase
        .from('document_views')
        .select('user_id', { count: 'exact' })
        .eq('document_id', documentId)

      if (uniqueError) throw uniqueError

      // Get viewers by department – try RPC first, fall back gracefully
      let viewersByDepartment: Array<{ department_id: string; department_name: string; count: number }> = []
      try {
        const { data: deptData, error: deptError } = await supabase.rpc('get_document_viewers_by_department', {
          p_document_id: documentId
        })

        if (!deptError && deptData) {
          viewersByDepartment = deptData
        }
        // Silently ignore RPC not found errors (PGRST202)
      } catch {
        // RPC unavailable – continue without department data
      }

      return {
        document_id: documentId,
        view_count: doc?.view_count || 0,
        download_count: doc?.download_count || 0,
        unique_viewers: uniqueViewers?.length || 0,
        acknowledgment_count: ackCount || 0,
        views_over_time: Object.entries(viewsOverTime).map(([date, count]) => ({ date, count })),
        downloads_over_time: [], // Would need separate tracking table
        viewers_by_department: viewersByDepartment
      }
    },
  })
}

/**
 * Record a document view
 */
export function useRecordDocumentView() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) return

      // Prefer RPC if present (SECURITY DEFINER), fallback to insert
      const { error: rpcError } = await supabase.rpc('log_document_view', {
        p_document_id: documentId,
        p_user_id: user.id,
      })

      if (rpcError) {
        const { error } = await supabase
          .from('document_views')
          .insert({
            document_id: documentId,
            user_id: user.id,
            viewed_at: new Date().toISOString(),
          })

        // Ignore duplicate-ish errors
        if (error && !error.message.toLowerCase().includes('duplicate')) {
          console.warn('Failed to record document view:', error)
        }
      }

      return documentId
    },
    onSuccess: (documentId) => {
      if (documentId) {
        queryClient.invalidateQueries({ queryKey: ['document-analytics', documentId] })
      }
    }
  })
}

/**
 * Record a document download
 */
export function useRecordDocumentDownload() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user?.id) return documentId

      // Prefer single RPC that logs + increments. Fallback to increment only.
      const { error: logError } = await supabase.rpc('log_document_download', {
        p_document_id: documentId,
        p_user_id: user.id,
        p_ip_address: null,
      })

      if (logError) {
        const { error: incError } = await supabase.rpc('increment_document_download_count', {
          p_document_id: documentId,
        })
        if (incError) {
          console.warn('Failed to increment download count:', incError)
        }
      }

      return documentId
    },
    onSuccess: (documentId) => {
      queryClient.invalidateQueries({ queryKey: ['document-analytics', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
    }
  })
}

// ============================================================================
// AI Smart Actions Hooks
// ============================================================================

/**
 * AI-powered tag suggestions based on document content
 */
export function useAISuggestTags() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])

  const suggestTags = useCallback(async (documentId: string): Promise<AISuggestion[]> => {
    setIsGenerating(true)
    try {
      // Fetch document content
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description, file_type')
        .eq('id', documentId)
        .single()

      if (error) throw error

      // Call AI function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Analyze this document and suggest relevant tags.

Title: ${doc.title}
Description: ${doc.description || 'N/A'}
File Type: ${doc.file_type || 'N/A'}
Content Preview: ${doc.content?.slice(0, 2000) || 'N/A'}

Suggest 5-8 relevant tags for categorizing this document. Consider:
- Department (HR, Finance, Operations, etc.)
- Document type (Policy, SOP, Report, etc.)
- Topic (Safety, Training, Compliance, etc.)
- Hotel operations area (Front Desk, Housekeeping, F&B, etc.)

Return as JSON array: [{"value": "tag-name", "confidence": "high|medium|low", "reason": "brief explanation"}]`,
        }
      })

      if (aiError) throw aiError

      let parsedSuggestions: AISuggestion[] = []

      if (typeof aiData?.response === 'string') {
        try {
          const jsonMatch = aiData.response.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            parsedSuggestions = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.warn('AI tag suggestions parsing failed:', e)
          // Fallback to keyword extraction
          parsedSuggestions = extractTagKeywords(doc.title, doc.content, doc.description)
        }
      }

      setSuggestions(parsedSuggestions)
      return parsedSuggestions
    } catch (error) {
      console.error('Failed to suggest tags:', error)
      const fallback = extractTagKeywords('', '', '')
      setSuggestions(fallback)
      return fallback
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { suggestTags, suggestions, isGenerating }
}

/**
 * AI-powered folder classification suggestion
 */
export function useAIClassifyFolder() {
  const [isClassifying, setIsClassifying] = useState(false)
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)

  const classifyFolder = useCallback(async (documentId: string): Promise<AISuggestion | null> => {
    setIsClassifying(true)
    try {
      // Fetch document
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description, file_type')
        .eq('id', documentId)
        .single()

      if (error) throw error

      // Fetch available folders
      const { data: folders, error: foldersError } = await supabase
        .from('document_folders')
        .select('id, name, description')

      if (foldersError) throw foldersError

      // Call AI for classification
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Classify this document into the most appropriate folder.

Document:
Title: ${doc.title}
Description: ${doc.description || 'N/A'}
File Type: ${doc.file_type || 'N/A'}
Content Preview: ${doc.content?.slice(0, 1500) || 'N/A'}

Available Folders:
${folders?.map(f => `- ${f.name} (ID: ${f.id}): ${f.description || 'No description'}`).join('\n')}

Suggest the best folder ID and explain why. Return as JSON:
{"value": "folder-id", "confidence": "high|medium|low", "reason": "explanation"}`,
        }
      })

      if (aiError) throw aiError

      let result: AISuggestion | null = null

      if (typeof aiData?.response === 'string') {
        try {
          const jsonMatch = aiData.response.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.warn('AI folder classification parsing failed:', e)
          // No fallback for classification
        }
      }

      setSuggestion(result)
      return result
    } catch (error) {
      console.error('Failed to classify folder:', error)
      return null
    } finally {
      setIsClassifying(false)
    }
  }, [])

  return { classifyFolder, suggestion, isClassifying }
}

/**
 * AI-powered duplicate detection
 */
export function useAIDetectDuplicates() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; similarity: number }>>([])

  const detectDuplicates = useCallback(async (file: File): Promise<Array<{ id: string; title: string; similarity: number }>> => {
    setIsDetecting(true)
    try {
      // Extract text from file (basic implementation)
      const fileContent = await file.text().catch(() => '')

      // Fetch existing documents for comparison
      const { data: existingDocs, error } = await supabase
        .from('documents')
        .select('id, title, content, file_type, file_hash')
        .eq('is_deleted', false)
        .limit(100)

      if (error) throw error

      // Simple hash comparison first
      // Note: In production, you'd compute file hash on upload
      const potentialDuplicates = existingDocs?.filter(doc =>
        doc.file_type === file.type ||
        calculateSimilarity(file.name, doc.title) > 70
      ) || []

      // If AI is available, use it for deeper analysis
      if (potentialDuplicates.length > 0 && fileContent.length > 0) {
        const { data: aiData } = await supabase.functions.invoke('process-ai-request', {
          body: {
            task: 'chat',
            prompt: `Compare this new document with existing documents to find duplicates.

New Document:
Name: ${file.name}
Type: ${file.type}
Content Preview: ${fileContent.slice(0, 2000)}

Existing Documents:
${potentialDuplicates.map(d => `ID: ${d.id}, Title: ${d.title}, Type: ${d.file_type}`).join('\n')}

Return IDs of likely duplicates with confidence scores as JSON array:
[{"id": "doc-id", "title": "doc title", "similarity": 85}]`,
          }
        })

        if (typeof aiData?.response === 'string') {
          try {
            const jsonMatch = aiData.response.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const aiResults = JSON.parse(jsonMatch[0])
              setDuplicates(aiResults)
              return aiResults
            }
          } catch (e) {
            console.warn('AI duplicates parsing failed:', e)
            // Fall through to simple comparison
          }
        }
      }

      // Simple similarity-based fallback
      const results = potentialDuplicates.map(doc => ({
        id: doc.id,
        title: doc.title,
        similarity: calculateSimilarity(file.name, doc.title)
      })).filter(d => d.similarity > 60)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)

      setDuplicates(results)
      return results
    } catch (error) {
      console.error('Failed to detect duplicates:', error)
      return []
    } finally {
      setIsDetecting(false)
    }
  }, [])

  return { detectDuplicates, duplicates, isDetecting }
}

/**
 * AI-powered document summarization
 */
export function useAISummarizeDocument() {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const summarizeDocument = useCallback(async (documentId: string): Promise<string | null> => {
    setIsSummarizing(true)
    try {
      // Fetch document
      const { data: doc, error } = await supabase
        .from('documents')
        .select('title, content, description')
        .eq('id', documentId)
        .single()

      if (error) throw error

      // Call AI for summarization
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-ai-request', {
        body: {
          task: 'chat',
          prompt: `Summarize this hotel document concisely.

Title: ${doc.title}
Description: ${doc.description || 'N/A'}
Content: ${doc.content?.slice(0, 5000) || 'N/A'}

Provide:
1. A 1-2 sentence summary
2. Key points (3-5 bullet points)
3. Action items (if any)

Format as plain text.`,
        }
      })

      if (aiError) throw aiError

      const result = typeof aiData?.response === 'string' ? aiData.response : null
      setSummary(result)

      // Save summary to document
      if (result) {
        await supabase
          .from('documents')
          .update({ ai_summary: result })
          .eq('id', documentId)
      }

      return result
    } catch (error) {
      console.error('Failed to summarize document:', error)
      return null
    } finally {
      setIsSummarizing(false)
    }
  }, [])

  return { summarizeDocument, summary, isSummarizing }
}

// ============================================================================
// Existing Hooks (Preserved from original)
// ============================================================================

export function useSubmitForApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error('User must be authenticated')

      const nowIso = new Date().toISOString()

      // Update document status
      const { error: docError } = await supabase
        .from('documents')
        .update({ status: 'PENDING_REVIEW', updated_at: nowIso })
        .eq('id', documentId)

      if (docError) throw docError

      const { error: cleanupError } = await supabase
        .from('document_approvals')
        .delete()
        .eq('document_id', documentId)
        .eq('status', 'pending')

      if (cleanupError) throw cleanupError

      // Create approval requests based on document visibility
      const { data: doc } = await supabase
        .from('documents')
        .select('visibility, property_id, department_id, title')
        .eq('id', documentId)
        .single()

      if (!doc) throw new Error('Document not found')

      let roleFilters: string[] = []
      if (doc.visibility === 'all_properties') {
        roleFilters = ['regional_admin']
      } else if (doc.visibility === 'property') {
        roleFilters = ['property_manager', 'property_hr']
      } else if (doc.visibility === 'department') {
        roleFilters = ['department_head']
      } else if (doc.visibility === 'role') {
        roleFilters = ['regional_admin']
      }

      let approverQuery = supabase
        .from('profiles')
        .select('id, user_roles!inner(role), user_properties(property_id), user_departments(department_id)')
        .eq('is_active', true)
        .in('user_roles.role', roleFilters)

      if (doc.visibility === 'property' && doc.property_id) {
        approverQuery = approverQuery.eq('user_properties.property_id', doc.property_id)
      }
      if (doc.visibility === 'department' && doc.department_id) {
        approverQuery = approverQuery.eq('user_departments.department_id', doc.department_id)
      }

      const { data: approverProfiles, error: approverError } = await approverQuery

      if (approverError) throw approverError

      const approverIds = Array.from(new Set((approverProfiles || []).map(p => p.id)))

      if (approverIds.length === 0) {
        throw new Error('No approvers found for this document scope')
      }

      const approvalRows = approverIds.map(approverId => ({
        document_id: documentId,
        approver_id: approverId,
        approver_role: (roleFilters[0] as any),
        status: 'pending',
        is_active: true,
        entity_type: 'document',
        entity_id: documentId,
      }))

      const { error: approvalError } = await supabase
        .from('document_approvals')
        .insert(approvalRows)

      if (approvalError) throw approvalError

      const { error: notifyError } = await supabase.from('notifications').insert(
        approverIds.map(approverId => ({
          user_id: approverId,
          type: 'approval_required',
          title: 'Approval Required',
          message: `A document "${doc.title || 'Document'}" is awaiting your approval.`,
          entity_type: 'document',
          entity_id: documentId,
          link: '/approvals',
          metadata: { document_id: documentId }
        })))

      if (notifyError) throw notifyError

      return documentId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
  })
}

export function useDocumentVersions(documentId: string) {
  const { user } = useAuth()
  type VersionCreator = {
    id: string
    full_name: string | null
    avatar_url: string | null
  }

  return useQuery({
    queryKey: ['document-versions', documentId],
    enabled: !!documentId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
            *,
            creator:profiles!document_versions_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })

      if (error) throw error
      return data as (DocumentVersion & { creator: VersionCreator | null })[]
    },
  })
}

export function usePendingApprovals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['pending-approvals', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          document:documents(
            *,
            profiles:created_by(full_name)
          )
        `)
        .eq('status', 'pending')
        .eq('approver_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (DocumentApproval & {
        document: Document & { profiles?: { full_name: string } }
      })[]
    },
  })
}

export function useApproveDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, feedback }: { approvalId: string, feedback?: string }) => {
      if (!user) throw new Error('User must be authenticated')

      // Use atomic RPC function to prevent race conditions
      const { data, error } = await supabase.rpc('approve_document_atomic', {
        p_approval_id: approvalId,
        p_approver_id: user.id,
        p_feedback: feedback || null
      })

      if (error) {
        console.error('Document approval failed:', error)
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
    },
  })
}

export function useRejectDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string, reason: string }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase.rpc('reject_document_atomic', {
        p_approval_id: approvalId,
        p_approver_id: user.id,
        p_reason: reason
      })

      if (error) {
        console.error('Document rejection failed:', error)
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

export function useFavorites() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['document-favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_favorites')
        .select('document_id')
        .eq('user_id', user!.id)

      if (error) throw error
      return new Set(data?.map(f => f.document_id) || [])
    }
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ documentId, isFavorite }: { documentId: string, isFavorite: boolean }) => {
      if (!user) throw new Error('User must be authenticated')

      if (isFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('document_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('document_id', documentId)

        if (error) throw error
      } else {
        // Add favorite
        const { error } = await supabase
          .from('document_favorites')
          .insert({
            user_id: user.id,
            document_id: documentId
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-favorites'] })
    }
  })
}

// ============================================================================
// Helper Functions for AI
// ============================================================================

/**
 * Calculate Levenshtein distance for similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 100

  const track: number[][] = Array(shorter.length + 1).fill(null).map(() =>
    Array(longer.length + 1).fill(null)
  )

  for (let i = 0; i <= longer.length; i += 1) {
    track[0][i] = i
  }
  for (let j = 0; j <= shorter.length; j += 1) {
    track[j][0] = j
  }

  for (let j = 1; j <= shorter.length; j += 1) {
    for (let i = 1; i <= longer.length; i += 1) {
      const indicator = longer[i - 1].toLowerCase() === shorter[j - 1].toLowerCase() ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      )
    }
  }

  const distance = track[shorter.length][longer.length]
  return Math.round(((longer.length - distance) / longer.length) * 100)
}

/**
 * Extract tag keywords from content
 */
function extractTagKeywords(title: string, content?: string, description?: string): AISuggestion[] {
  const text = `${title} ${description || ''} ${content || ''}`.toLowerCase()
  const keywords: AISuggestion[] = []

  const keywordPatterns: Array<[RegExp, string, string]> = [
    [/\b(hr|human resources|hiring|onboarding|termination|performance)\b/, 'hr', 'Human Resources'],
    [/\b(finance|accounting|budget|invoice|payment|expense)\b/, 'finance', 'Finance & Accounting'],
    [/\b(operations|ops|daily|routine|workflow)\b/, 'operations', 'Operations'],
    [/\b(safety|emergency|fire|evacuation|first aid|incident)\b/, 'safety', 'Safety & Emergency'],
    [/\b(security|access|key|lock|surveillance)\b/, 'security', 'Security'],
    [/\b(training|learning|development|certification|course)\b/, 'training', 'Training & Development'],
    [/\b(policy|procedure|guideline|compliance|regulation)\b/, 'policy', 'Policies & Compliance'],
    [/\b(maintenance|repair|engineering|facility)\b/, 'maintenance', 'Maintenance & Engineering'],
    [/\b(front desk|reception|checkin|checkout|guest|concierge)\b/, 'front-desk', 'Front Desk'],
    [/\b(housekeeping|cleaning|room|hk)\b/, 'housekeeping', 'Housekeeping'],
    [/\b(f&b|food|beverage|restaurant|kitchen|menu|dining)\b/, 'food-beverage', 'Food & Beverage'],
    [/\b(sales|marketing|promotion|booking|reservation)\b/, 'sales-marketing', 'Sales & Marketing'],
    [/\b(it|technology|system|software|hardware|network)\b/, 'it', 'IT & Technology'],
    [/\b(legal|contract|agreement|liability|insurance)\b/, 'legal', 'Legal'],
  ]

  for (const [pattern, tag, reason] of keywordPatterns) {
    if (pattern.test(text)) {
      keywords.push({
        value: tag,
        confidence: 'high',
        reason
      })
    }
  }

  // Add document type tags
  if (/\b(sop|procedure|step|process|how to|instruction)\b/.test(text)) {
    keywords.push({ value: 'sop', confidence: 'high', reason: 'Standard operating procedure' })
  }
  if (/\b(form|template|application|request)\b/.test(text)) {
    keywords.push({ value: 'form', confidence: 'medium', reason: 'Form or template' })
  }
  if (/\b(report|analysis|summary|review)\b/.test(text)) {
    keywords.push({ value: 'report', confidence: 'medium', reason: 'Report document' })
  }
  if (/\b(checklist|verify|confirm|ensure|review|audit)\b/.test(text)) {
    keywords.push({ value: 'checklist', confidence: 'medium', reason: 'Contains verification steps' })
  }

  return keywords.slice(0, 8)
}
