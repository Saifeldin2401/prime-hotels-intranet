import type { RoleBlueprint, RoleLevel } from '@/lib/types/wizard'
import { platformOperatorBlueprint } from './platformOperatorBlueprint'
import { tenantOwnerBlueprint } from './tenantOwnerBlueprint'
import { tenantAdminBlueprint } from './tenantAdminBlueprint'
import { trainingManagerBlueprint } from './trainingManagerBlueprint'
import { knowledgeManagerBlueprint } from './knowledgeManagerBlueprint'
import { departmentManagerBlueprint } from './departmentManagerBlueprint'
import { learnerBlueprint } from './learnerBlueprint'
import { viewerBlueprint } from './viewerBlueprint'

export const ROLE_BLUEPRINTS: Record<string, RoleBlueprint> = {
  platform_operator: platformOperatorBlueprint,
  system_owner: platformOperatorBlueprint,
  platform_admin: platformOperatorBlueprint,
  platform_support: platformOperatorBlueprint,
  organization_owner: tenantOwnerBlueprint,
  tenant_owner: tenantOwnerBlueprint,
  organization_admin: tenantAdminBlueprint,
  tenant_admin: tenantAdminBlueprint,
  administrator: tenantAdminBlueprint,
  admin: tenantAdminBlueprint,
  super_admin: tenantAdminBlueprint,
  corporate_admin: tenantAdminBlueprint,
  training_manager: trainingManagerBlueprint,
  knowledge_manager: knowledgeManagerBlueprint,
  author: knowledgeManagerBlueprint,
  department_manager: departmentManagerBlueprint,
  department_head: departmentManagerBlueprint,
  general_manager: departmentManagerBlueprint,
  property_manager: departmentManagerBlueprint,
  property_hr: departmentManagerBlueprint,
  regional_admin: departmentManagerBlueprint,
  regional_hr: departmentManagerBlueprint,
  manager: departmentManagerBlueprint,
  learner: learnerBlueprint,
  employee: learnerBlueprint,
  staff: learnerBlueprint,
  viewer: viewerBlueprint
}

export function getRoleBlueprint(roleName: string, isPlatformOperator: boolean = false): RoleBlueprint {
  if (isPlatformOperator) {
    return platformOperatorBlueprint
  }

  const normalized = roleName?.toLowerCase()?.trim() || 'learner'
  return ROLE_BLUEPRINTS[normalized] || learnerBlueprint
}

export {
  platformOperatorBlueprint,
  tenantOwnerBlueprint,
  tenantAdminBlueprint,
  trainingManagerBlueprint,
  knowledgeManagerBlueprint,
  departmentManagerBlueprint,
  learnerBlueprint,
  viewerBlueprint
}
