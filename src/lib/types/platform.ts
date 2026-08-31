import type { Organization } from './tenant'

/**
 * Platform-operator roles — mirrors the DB `platform_role` enum
 * (migration 20260901230000). These are our internal staff, NOT tenant users.
 * system_owner ⊃ platform_admin ⊃ everything else.
 */
export type PlatformRole =
  | 'system_owner'
  | 'platform_admin'
  | 'platform_training_manager'
  | 'platform_knowledge_manager'
  | 'platform_support'
  | 'platform_operations'
  | 'platform_instructor'

/** Coarse permission slugs resolved by `platform_operator_can()` server-side. */
export type PlatformPermission =
  | 'operator.manage'
  | 'tenant.manage'
  | 'billing.manage'
  | 'master_content.manage'
  | 'ops.manage'
  | 'config.manage'
  | 'tenant.enter'
  | 'tenant.read'

export interface PlatformUser {
  user_id: string
  is_active: boolean
  employment_type: 'employee' | 'contractor' | 'service_account'
  notes: string | null
  created_at: string
  deactivated_at: string | null
}

export interface PlatformRoleAssignment {
  id: string
  platform_user_id: string
  platform_role: PlatformRole
  scope_type: 'global' | 'org_list'
  scope_org_ids: string[]
  granted_at: string
  revoked_at: string | null
}

export interface PlatformAccessSession {
  id: string
  admin_user_id: string
  target_organization_id: string
  target_organization?: Organization
  target_organization_name?: string
  acting_role: string
  access_reason: string
  is_active: boolean
  started_at: string
  ended_at?: string | null
  expires_at?: string
  created_at?: string
}

/** Shape returned by the `resolve_account_context()` RPC. */
export interface AccountContext {
  user_id?: string
  is_platform_operator: boolean
  platform_roles: PlatformRole[]
  platform_permissions: PlatformPermission[]
  active_platform_session: (PlatformAccessSession & { target_organization_name?: string }) | null
  tenant_memberships: Array<{
    organization_id: string
    organization_name: string
    role: string
    brand_id: string | null
    hotel_id: string | null
    hotel_name: string | null
    department_id: string | null
    department_name: string | null
    is_active: boolean
    lifecycle_status?: string | null
    operational?: boolean
  }>
  primary_organization_id: string | null
  is_multi_org: boolean
  all_orgs_suspended?: boolean
  recommended_destination: string
}

export type MasterContentType = 'course' | 'training_module' | 'document_sop' | 'assessment'

export interface MasterContentDeployment {
  id: string
  content_type: MasterContentType
  master_content_id: string
  target_organization_id: string
  target_organization?: Organization
  target_content_id: string
  deployed_version: number
  current_master_version: number
  has_update_available: boolean
  deployed_by?: string | null
  deployed_at: string
  last_synced_at: string
}

export interface PlatformAuditLog {
  id: string
  actor_id: string | null
  actor_name?: string
  target_organization_id: string | null
  target_organization_name?: string
  session_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface PlatformStats {
  totalOrganizations: number
  activeOrganizations: number
  trialOrganizations: number
  suspendedOrganizations: number
  totalHotels: number
  totalLearners: number
  totalMasterSops: number
  totalMasterCourses: number
  totalDeployments: number
  averageCompletionRate: number
}
