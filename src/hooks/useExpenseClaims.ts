import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import type { ExpenseClaim } from '@/lib/types'
import { crudToasts } from '@/lib/toastHelpers'
import { scanFile } from '@/hooks/useVirusScan'
import { isRealPropertyId } from '@/lib/propertyScope'

export function useMyExpenseClaims() {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['expense-claims', 'my', user?.id, currentProperty?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          workflow:requests!workflow_request_id(id, request_no, status)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })

      if (isRealPropertyId(currentProperty?.id)) {
        query = query.eq('property_id', currentProperty.id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ExpenseClaim[]
    },
  })
}

export function useExpenseClaimsInbox() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['expense-claims', 'inbox', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('requests')
        .select('id, request_no, status, current_assignee_id, entity_id, created_at')
        .eq('entity_type', 'expense_claim')
        .eq('current_assignee_id', user.id)
        .in('status', ['pending_supervisor_approval', 'pending_hr_review'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  })
}

export function useSubmitExpenseClaim() {
  const queryClient = useQueryClient()
  const { user, properties, departments } = useAuth()
  const { currentProperty } = useProperty()

  return useMutation({
    mutationFn: async (payload: {
      category: ExpenseClaim['category']
      amount: number
      currency?: string
      expense_date: string
      vendor_name?: string
      description?: string
      receipt?: File | null
      property_id?: string | null
      department_id?: string | null
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const assignedPropertyIds = (properties || []).map((property) => property.id).filter(isRealPropertyId)
      const propertyId = isRealPropertyId(payload.property_id)
        ? payload.property_id
        : (isRealPropertyId(currentProperty?.id)
          ? currentProperty.id
          : (assignedPropertyIds.length === 1 ? assignedPropertyIds[0] : null))

      if (!propertyId && assignedPropertyIds.length > 1) {
        throw new Error('Select a specific property before submitting an expense claim')
      }
      if (!propertyId && assignedPropertyIds.length === 0) {
        throw new Error('No property access found for this account')
      }

      const departmentId = payload.department_id
        || departments?.[0]?.id
        || null

      const { data, error } = await supabase.rpc('submit_expense_claim', {
        p_category: payload.category,
        p_amount: payload.amount,
        p_currency: payload.currency || 'SAR',
        p_expense_date: payload.expense_date,
        p_vendor_name: payload.vendor_name || null,
        p_description: payload.description || null,
        p_property_id: propertyId,
        p_department_id: departmentId,
      })

      if (error) throw error
      if (!data?.claim_id || !data?.request_id) {
        throw new Error('Failed to create expense claim workflow')
      }

      const claimId = data.claim_id as string
      const requestId = data.request_id as string

      if (payload.receipt) {
        const scanResult = await scanFile(payload.receipt, {
          bucket: 'expense-receipts',
          context: 'expense_claim_receipt',
        })

        if (!scanResult.safe) {
          throw new Error(scanResult.message || 'Receipt file failed security scan')
        }

        const sanitized = payload.receipt.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${claimId}/${Date.now()}-${sanitized}`
        const { error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(storagePath, payload.receipt, { upsert: false })

        if (uploadError) throw uploadError

        const { error: claimUpdateError } = await supabase
          .from('expense_claims')
          .update({
            receipt_bucket: 'expense-receipts',
            receipt_path: storagePath,
          })
          .eq('id', claimId)

        if (claimUpdateError) throw claimUpdateError

        const { error: attachmentError } = await supabase
          .from('request_attachments')
          .insert({
            request_id: requestId,
            uploaded_by: user.id,
            storage_bucket: 'expense-receipts',
            storage_path: storagePath,
            file_name: payload.receipt.name,
            file_type: payload.receipt.type,
            file_size: payload.receipt.size,
          })

        if (attachmentError) {
          console.warn('Unable to create request attachment record for receipt:', attachmentError)
        }
      }

      return {
        claim_id: claimId,
        request_id: requestId,
        request_no: data.request_no as number | null,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] })
      queryClient.invalidateQueries({ queryKey: ['requests-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.submit.success('Expense claim')
    },
    onError: () => {
      crudToasts.submit.error('expense claim')
    },
  })
}
