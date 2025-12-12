import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface EmployeeDocument {
    id: string
    user_id: string
    title: string
    category: 'cv' | 'certificate' | 'contract' | 'other'
    file_path: string
    file_type: string
    file_size: number
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

export function useUploadEmployeeDocument() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({
            file,
            category,
            title
        }: {
            file: File,
            category: string,
            title?: string
        }) => {
            if (!user) throw new Error('User must be authenticated')

            // 1. Upload file to storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('employee-documents')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Insert record into database
            const { data, error: dbError } = await supabase
                .from('employee_documents')
                .insert({
                    user_id: user.id,
                    title: title || file.name,
                    category,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size
                })
                .select()
                .single()

            if (dbError) throw dbError
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
