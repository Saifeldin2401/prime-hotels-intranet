import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface EmployeeDocument {
    id: string
    user_id: string
    title: string
    category: 'cv' | 'certificate' | 'contract' | 'other'
    file_path: string
    file_type: string
    file_size: number
    expiry_date: string | null
    document_number: string | null
    status: 'active' | 'expired' | 'expiring_soon' | 'pending_verification'
    created_at: string
    updated_at: string
}

export function useEmployeeDocuments(userId?: string) {
    const { user } = useAuth()
    const targetUserId = userId || user?.id

    return useQuery({
        queryKey: ['employee-documents', targetUserId],
        enabled: !!targetUserId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employee_documents')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as EmployeeDocument[]
        },
    })
}

/**
 * Mirrors the DB's can_view_employee_document/can_manage_employee_document RLS
 * helpers so the UI can gate the Upload/Delete affordances before the user even
 * tries the action, rather than surfacing an RLS error after the fact.
 */
export function useEmployeeDocumentPermissions(targetUserId?: string) {
    const { user } = useAuth()
    const isSelf = !!user?.id && !!targetUserId && user.id === targetUserId

    return useQuery({
        queryKey: ['employee-documents-permissions', targetUserId, user?.id],
        enabled: !!targetUserId && !!user?.id,
        queryFn: async () => {
            // canDelete mirrors the DB's DELETE policy, which - unlike SELECT/INSERT -
            // was intentionally left self-only (no HR/admin override exists today).
            if (isSelf) return { canView: true, canManage: true, canDelete: true, isSelf: true }

            const [{ data: canView, error: viewError }, { data: canManage, error: manageError }] = await Promise.all([
                supabase.rpc('can_view_employee_document', { p_target_user_id: targetUserId }),
                supabase.rpc('can_manage_employee_document', { p_target_user_id: targetUserId }),
            ])

            if (viewError) throw viewError
            if (manageError) throw manageError
            return { canView: Boolean(canView), canManage: Boolean(canManage), canDelete: false, isSelf: false }
        },
        // Self is always fully permitted without a round trip; everyone else defaults
        // to "no access" while the RPCs resolve, matching the DB's own default-deny.
        initialData: isSelf
            ? { canView: true, canManage: true, canDelete: true, isSelf: true }
            : { canView: false, canManage: false, canDelete: false, isSelf: false },
    })
}

export function useUploadEmployeeDocument() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({
            file,
            category,
            title,
            expiry_date,
            document_number,
            targetUserId
        }: {
            file: File,
            category: string,
            title?: string,
            expiry_date?: string,
            document_number?: string,
            targetUserId?: string
        }) => {
            if (!user) throw new Error('User must be authenticated')
            const ownerId = targetUserId || user.id

            // 1. Upload file to storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${ownerId}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('employee-documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Insert record into database
            const { data, error: dbError } = await supabase
                .from('employee_documents')
                .insert({
                    user_id: ownerId,
                    title: title || file.name,
                    category,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    expiry_date: expiry_date || null,
                    document_number: document_number || null,
                    status: 'active'
                })
                .select()
                .single()

            if (dbError) {
                // Upload succeeded but the insert was rejected (e.g. RLS denied an
                // unauthorized on-behalf-of upload) - don't leave an orphaned file.
                await supabase.storage.from('employee-documents').remove([filePath])
                throw dbError
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
        },
    })
}

export function useDeleteEmployeeDocument() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (document: EmployeeDocument) => {
            if (!user) throw new Error('User must be authenticated')

            // 1. Delete from storage
            const { error: storageError } = await supabase.storage
                .from('employee-documents')
                .remove([document.file_path])

            if (storageError) throw storageError

            // 2. Delete from database
            const { error: dbError } = await supabase
                .from('employee_documents')
                .delete()
                .eq('id', document.id)

            if (dbError) throw dbError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
        },
    })
}

export function useDownloadEmployeeDocument() {
    return useMutation({
        mutationFn: async (path: string) => {
            const { data, error } = await supabase.storage
                .from('employee-documents')
                .createSignedUrl(path, 60) // Signed URL valid for 60 seconds

            if (error) throw error
            return data.signedUrl
        },
    })
}
