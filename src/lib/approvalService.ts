import { supabase } from './supabase'
import type { Profile } from './types'

/**
 * Get the manager (reporting_to) of an employee
 * This is the primary approver for leave requests and HR matters
 */
export async function getManagerForEmployee(employeeId: string): Promise<Profile | null> {
  // Get the employee's reporting_to manager
  const { data: employee, error } = await supabase
    .from('profiles')
    .select('reporting_to')
    .eq('id', employeeId)
    .single()

  if (error || !employee?.reporting_to) {
    return null
  }

  // Fetch the manager's profile
  const { data: manager } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', employee.reporting_to)
    .eq('is_active', true)
    .single()

  return manager as Profile | null
}

/**
 * Get the appropriate approver for a leave/HR request
 * Priority:
 * 1. Check for temporary/delegated approvers
 * 2. Use the employee's direct manager (reporting_to)
 * 3. Fall back to role-based approver (property_hr, regional_admin)
 */
export async function getApproverForRequest(
  requesterId: string,
  propertyId: string | null
): Promise<Profile | null> {
  // 1. Check for temporary approvers first
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

    if (delegate) return delegate as Profile
  }

  // 2. Try to get the employee's direct manager
  const manager = await getManagerForEmployee(requesterId)
  if (manager) {
    // Check if manager has approval authority (not just a regular staff)
    const { data: managerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', manager.id)
      .single()

    // Manager must be at least department_head level to approve
    const approverRoles = ['department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin']
    if (managerRole && approverRoles.includes(managerRole.role)) {
      return manager
    }
  }

  // 3. Fall back to role-based approver
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

/**
 * Legacy function for document approvals (backwards compatible)
 */
export async function getApproverForDocument(
  documentId: string,
  propertyId: string | null
): Promise<Profile | null> {
  // For documents, use role-based approval directly
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

/**
 * Create an approval request for an entity
 */
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

/**
 * Get the reporting chain for escalation
 */
export async function getEscalationChain(employeeId: string): Promise<Profile[]> {
  const chain: Profile[] = []
  let currentId = employeeId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)

    const { data: employee } = await supabase
      .from('profiles')
      .select('id, full_name, email, job_title, reporting_to')
      .eq('id', currentId)
      .single()

    if (!employee) break

    chain.push(employee as Profile)

    if (!employee.reporting_to) break
    currentId = employee.reporting_to
  }

  return chain.slice(1) // Exclude the employee themselves
}
