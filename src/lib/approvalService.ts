import { supabase } from './supabase'
import type { Profile } from './types'

export async function getApproverForDocument(
  documentId: string,
  propertyId: string | null
): Promise<Profile | null> {
  // Check for temporary approvers first
  const { data: tempApprovers } = await supabase
    .from('temporary_approvers')
    .select('delegate_id')
    .eq('scope_type', propertyId ? 'property' : 'all')
    .eq('scope_id', propertyId)
    .lte('start_at', new Date().toISOString())
    .gte('end_at', new Date().toISOString())
    .limit(1)

  if (tempApprovers && tempApprovers.length > 0) {
    const { data: delegate } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tempApprovers[0].delegate_id)
      .single()

    if (delegate) return delegate
  }

  // Default approver logic: Property HR or Property Manager
  const { data: approvers } = await supabase
    .from('profiles')
    .select('*, user_roles!inner(role)')
    .eq('user_roles.role', propertyId ? 'property_hr' : 'regional_admin')
    .eq('is_active', true)
    .limit(1)

  if (approvers && approvers.length > 0) {
    return approvers[0] as Profile
  }

  return null
}

export async function createApprovalRequest(
  entityType: string,
  entityId: string,
  approverId: string
) {
  const { error } = await supabase.from('approval_requests').insert({
    entity_type: entityType,
    entity_id: entityId,
    current_approver_id: approverId,
    status: 'pending',
  })

  if (error) {
    console.error('Error creating approval request:', error)
    throw error
  }
}

