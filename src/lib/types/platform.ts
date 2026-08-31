import type { Organization } from './tenant'

export type PlatformRole =
  | 'platform_owner'
  | 'platform_training_manager'
  | 'platform_knowledge_manager'
  | 'platform_instructor'
  | 'platform_customer_success'
  | 'platform_support'
  | 'platform_finance_admin'

export interface PlatformAccessSession {
  id: string
  admin_user_id: string
  target_organization_id: string
  target_organization?: Organization
  acting_role: string
  access_reason: string
  is_active: boolean
  started_at: string
  ended_at?: string | null
  created_at: string
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
