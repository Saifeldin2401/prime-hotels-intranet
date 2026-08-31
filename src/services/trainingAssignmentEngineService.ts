import { supabase } from '@/lib/supabase'

export interface CallerAssignmentScopes {
  is_platform_admin: boolean
  effective_org_id?: string
  can_assign_org: boolean
  can_assign_brand: boolean
  can_assign_hotel: boolean
  can_assign_dept: boolean
  can_assign_role: boolean
  can_assign_individual: boolean
  authorized_brand_ids?: string[] | null
  authorized_hotel_ids?: string[] | null
  authorized_dept_ids?: string[] | null
  primary_role: string
  primary_hotel_id?: string | null
  primary_department_id?: string | null
}

export interface AssignableLearner {
  id: string
  full_name: string
  email: string
  avatar_url?: string | null
  hotel_id?: string | null
  hotel_name?: string | null
  brand_id?: string | null
  brand_name?: string | null
  department_id?: string | null
  department_name?: string | null
  role: string
  job_title?: string | null
}

export interface AssignableRecipientsSummary {
  recipient_count: number
  hotel_count: number
  dept_count: number
}

export type AssignmentScopeType = 'organization' | 'brand' | 'hotel' | 'department' | 'role' | 'individual'

export interface CreateScopedAssignmentParams {
  courseId: string
  scopeType: AssignmentScopeType
  organizationId: string
  brandId?: string | null
  hotelId?: string | null
  departmentId?: string | null
  targetRole?: string | null
  targetUserIds?: string[] | null
  dueDate?: string | null
  priority?: 'normal' | 'high' | 'compliance'
  instructions?: string | null
  requiresAcknowledgement?: boolean
  notifyOnDue?: boolean
  reminderDaysBefore?: number[]
}

export const trainingAssignmentEngineService = {
  /**
   * Retrieves the current caller's authorized assignment scopes and boundaries.
   */
  async getCallerAssignmentScopes(organizationId?: string): Promise<CallerAssignmentScopes> {
    const { data, error } = await supabase.rpc('get_caller_assignment_scopes', {
      p_org_id: organizationId || null,
    })
    if (error) {
      console.error('Failed to get caller assignment scopes:', error)
      return {
        is_platform_admin: false,
        can_assign_org: false,
        can_assign_brand: false,
        can_assign_hotel: false,
        can_assign_dept: false,
        can_assign_role: false,
        can_assign_individual: false,
        primary_role: 'learner',
      }
    }
    return data as CallerAssignmentScopes
  },

  /**
   * Queries assignable learners strictly within the actor's authorized scope and filters.
   * Server-side paginated and searched.
   */
  async getAssignableLearners(params: {
    organizationId: string
    brandId?: string | null
    hotelId?: string | null
    departmentId?: string | null
    role?: string | null
    search?: string | null
    limit?: number
    offset?: number
  }): Promise<AssignableLearner[]> {
    const { data, error } = await supabase.rpc('get_assignable_learners', {
      p_org_id: params.organizationId,
      p_brand_id: params.brandId || null,
      p_hotel_id: params.hotelId || null,
      p_dept_id: params.departmentId || null,
      p_role: params.role && params.role !== 'all' ? params.role : null,
      p_search: params.search ? params.search.trim() : null,
      p_limit: params.limit || 50,
      p_offset: params.offset || 0,
    })
    if (error) {
      console.error('Failed to query assignable learners:', error)
      throw error
    }
    return (data || []) as AssignableLearner[]
  },

  /**
   * Computes the exact recipient count and organizational footprint for a given scope.
   */
  async getAssignableRecipientsCount(params: {
    organizationId: string
    brandId?: string | null
    hotelId?: string | null
    departmentId?: string | null
    role?: string | null
    search?: string | null
    individualUserIds?: string[] | null
    scopeType: AssignmentScopeType
  }): Promise<AssignableRecipientsSummary> {
    const { data, error } = await supabase.rpc('get_assignable_recipients_count', {
      p_org_id: params.organizationId,
      p_brand_id: params.brandId || null,
      p_hotel_id: params.hotelId || null,
      p_dept_id: params.departmentId || null,
      p_role: params.role && params.role !== 'all' ? params.role : null,
      p_search: params.search ? params.search.trim() : null,
      p_individual_user_ids: params.individualUserIds || null,
      p_scope_type: params.scopeType,
    })
    if (error) {
      console.error('Failed to compute recipient count:', error)
      return { recipient_count: 0, hotel_count: 0, dept_count: 0 }
    }
    return data as AssignableRecipientsSummary
  },

  /**
   * Executes atomic assignment creation with server-side authorization verification,
   * snapshot recording, progress instantiation, and notification dispatch.
   */
  async createScopedAssignment(params: CreateScopedAssignmentParams): Promise<{
    success: boolean
    rule_id: string
    course_id: string
    recipient_count: number
    scope_type: string
  }> {
    const { data, error } = await supabase.rpc('create_scoped_training_assignment', {
      p_course_id: params.courseId,
      p_scope_type: params.scopeType,
      p_organization_id: params.organizationId,
      p_brand_id: params.brandId || null,
      p_hotel_id: params.hotelId || null,
      p_department_id: params.departmentId || null,
      p_target_role: params.targetRole && params.targetRole !== 'all' ? params.targetRole : null,
      p_target_user_ids: params.targetUserIds || null,
      p_due_date: params.dueDate || null,
      p_priority: params.priority || 'normal',
      p_instructions: params.instructions || null,
      p_requires_acknowledgement: params.requiresAcknowledgement ?? false,
      p_notify_on_due: params.notifyOnDue ?? true,
      p_reminder_days_before: params.reminderDaysBefore || [7, 3, 1],
    })
    if (error) {
      console.error('Failed to create scoped assignment:', error)
      throw error
    }
    return data as {
      success: boolean
      rule_id: string
      course_id: string
      recipient_count: number
      scope_type: string
    }
  },

  /**
   * Fetches active assignment rules scoped to organization and optional hotel.
   */
  async getScopedAssignmentRules(organizationId: string, hotelId?: string) {
    let query = supabase
      .from('training_assignment_rules')
      .select(`
        *,
        course:training_modules(id, title, description, estimated_duration_minutes, passing_score_percentage),
        hotel:hotels(id, name),
        department:departments(id, name),
        brand:brands(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (hotelId && hotelId !== 'all') {
      query = query.or(`hotel_id.eq.${hotelId},scope_type.eq.organization`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch assignment rules:', error)
      throw error
    }
    return data || []
  },
}
