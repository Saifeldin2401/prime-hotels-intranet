import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts } from '@/lib/toastHelpers'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentFolder } from './types'

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

      const foldersWithCount = (data || []).map(folder => ({
        ...folder,
        document_count: (folder.document_count as Array<{ count: number }> | undefined)?.[0]?.count || 0
      }))

      return foldersWithCount as DocumentFolder[]
    },
  })
}

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

      const folders = (data || []).map(folder => ({
        ...folder,
        document_count: (folder.document_count as Array<{ count: number }> | undefined)?.[0]?.count || 0
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

export function useCreateDocumentFolder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (folder: { name: string; description?: string | null; parent_id?: string | null; property_id?: string | null; department_id?: string | null }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: folder.name,
          description: folder.description ?? null,
          parent_id: folder.parent_id ?? null,
          property_id: folder.property_id ?? null,
          department_id: folder.department_id ?? null,
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
