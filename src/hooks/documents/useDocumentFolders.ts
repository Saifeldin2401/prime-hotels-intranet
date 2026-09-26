import { useTenant } from '@/contexts/TenantContext'
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

export function useCreateDocumentFolder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentOrganization } = useTenant()

  return useMutation({
    mutationFn: async (folder: { name: string; description?: string | null; parent_id?: string | null; department_id?: string | null }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: folder.name,
          description: folder.description ?? null,
          parent_id: folder.parent_id ?? null,
          organization_id: currentOrganization?.id ?? null,
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
