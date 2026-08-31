import { supabase } from '@/lib/supabase'
import type {
  PlatformAccessSession,
  MasterContentDeployment,
  PlatformAuditLog,
  PlatformStats
} from '@/lib/types/platform'
import type { Organization, Subscription, SubscriptionPlan } from '@/lib/types/tenant'

export interface MasterDeploymentProgress {
  orgId: string
  orgName?: string
  status: 'pending' | 'in_progress' | 'success' | 'error'
  message?: string
  current: number
  total: number
}

export interface MasterContentDiff {
  masterContentId: string
  targetContentId: string
  contentType: 'sop' | 'course'
  masterTitle: string
  targetTitle: string
  masterTitleAr?: string
  targetTitleAr?: string
  masterDescription?: string
  targetDescription?: string
  masterVersion: number
  deployedVersion: number
  hasUpdateAvailable: boolean
  lastSyncedAt?: string
  deployedAt?: string
  blueprintDifferences?: {
    masterSectionsCount?: number
    targetSectionsCount?: number
    estimatedDurationMinutes?: number
    category?: string
    difficultyLevel?: string
  }
}

export const platformService = {
  // ============================================================================
  // 1. PLATFORM METRICS & STATS
  // ============================================================================
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      // 1. Organizations counts (lifecycle_status is the source of truth; is_active
      //    is kept in sync by set_organization_status)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, is_active, is_deleted, lifecycle_status')

      const liveOrgs = (orgs || []).filter(o => !o.is_deleted)
      const totalOrganizations = liveOrgs.length
      const activeOrganizations = liveOrgs.filter(o => (o.lifecycle_status ?? (o.is_active ? 'active' : 'suspended')) === 'active').length
      const suspendedOrganizations = liveOrgs.filter(o => ['suspended', 'expired'].includes(o.lifecycle_status ?? '')).length
      const trialOrganizations = liveOrgs.filter(o => ['trial', 'prospect', 'onboarding'].includes(o.lifecycle_status ?? '')).length

      // 2. Hotels count
      const { count: totalHotels } = await supabase
        .from('hotels')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)

      // 3. Learners / Memberships count
      const { count: totalLearners } = await supabase
        .from('organization_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      // 4. Master SOPs count
      const { count: totalMasterSops } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_master_template', true)
        .eq('is_deleted', false)

      // 5. Master Courses count
      const { count: tmMasterCount } = await supabase
        .from('training_modules')
        .select('id', { count: 'exact', head: true })
        .eq('is_master_template', true)
        .eq('is_deleted', false)

      const { count: cMasterCount } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('is_master_template', true)
        .eq('is_deleted', false)

      const totalMasterCourses = (tmMasterCount || 0) > 0 ? (tmMasterCount || 0) : (cMasterCount || 0)

      // 6. Deployments count
      const { count: totalDeployments } = await supabase
        .from('master_content_deployments')
        .select('id', { count: 'exact', head: true })

      // 7. Real platform-wide completion rate from training_progress
      const { count: progressTotal } = await supabase
        .from('training_progress')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
      const { count: progressCompleted } = await supabase
        .from('training_progress')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .or('status.eq.completed,passed.eq.true')
      const averageCompletionRate = (progressTotal || 0) > 0
        ? Math.round(((progressCompleted || 0) / (progressTotal || 1)) * 1000) / 10
        : 0

      return {
        totalOrganizations,
        activeOrganizations,
        trialOrganizations,
        suspendedOrganizations,
        totalHotels: totalHotels || 0,
        totalLearners: totalLearners || 0,
        totalMasterSops: totalMasterSops || 0,
        totalMasterCourses,
        totalDeployments: totalDeployments || 0,
        averageCompletionRate
      }
    } catch (err) {
      console.error('Error in getPlatformStats:', err)
      // Do NOT fabricate plausible-looking numbers on failure — return zeros so
      // the UI can show an empty/error state rather than fake telemetry.
      return {
        totalOrganizations: 0,
        activeOrganizations: 0,
        trialOrganizations: 0,
        suspendedOrganizations: 0,
        totalHotels: 0,
        totalLearners: 0,
        totalMasterSops: 0,
        totalMasterCourses: 0,
        totalDeployments: 0,
        averageCompletionRate: 0
      }
    }
  },

  // ============================================================================
  // 2. ORGANIZATIONS MANAGEMENT (LEVEL 1 -> LEVEL 2)
  // ============================================================================
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('max_users', { ascending: true })

    if (error) {
      console.error('Error fetching subscription plans:', error)
      return []
    }
    return (data || []) as SubscriptionPlan[]
  },

  async getOrganizations(): Promise<(Organization & { hotelCount: number; userCount: number; subscription?: Subscription })[]> {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        *,
        hotels:hotels(count),
        memberships:organization_memberships(count),
        subscriptions:subscriptions(
          id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          plan:subscription_plans(*)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return []
    }

    return (orgs || []).map((o: any) => ({
      ...o,
      hotelCount: o.hotels?.[0]?.count || 0,
      userCount: o.memberships?.[0]?.count || 0,
      subscription: o.subscriptions?.[0] ? {
        ...o.subscriptions[0],
        plan: o.subscriptions[0]?.plan
      } : undefined
    }))
  },

  async createOrganization(params: {
    name: string
    nameAr?: string
    slug: string
    industry?: string
    planId?: string
    maxHotels?: number
    maxLearners?: number
    maxStorageGb?: number
    maxAiCreditsMonthly?: number
    billingEmail?: string
    lifecycleStatus?: 'prospect' | 'trial' | 'onboarding' | 'active' | 'renewal' | 'suspended' | 'archived'
    trialEndsAt?: string
    brandColors?: { primary: string; secondary: string; accent?: string }
    initialBrandName?: string
    initialHotelName?: string
    initialAdminEmail?: string
    initialAdminName?: string
    actorId?: string
  }): Promise<Organization> {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({
        name: params.name.trim(),
        name_ar: params.nameAr?.trim() || null,
        slug: params.slug.trim().toLowerCase(),
        industry: params.industry || 'hospitality',
        is_active: params.lifecycleStatus !== 'suspended',
        is_deleted: false,
        lifecycle_status: (params.lifecycleStatus || 'active') as any,
        trial_ends_at: params.trialEndsAt || null,
        max_hotels: params.maxHotels !== undefined ? params.maxHotels : 10,
        max_learners: params.maxLearners !== undefined ? params.maxLearners : 100,
        max_storage_gb: params.maxStorageGb !== undefined ? params.maxStorageGb : 50,
        max_ai_credits_monthly: params.maxAiCreditsMonthly !== undefined ? params.maxAiCreditsMonthly : 1000,
        billing_email: params.billingEmail?.trim() || null,
        brand_colors: params.brandColors || { primary: '#0f172a', secondary: '#2563eb', accent: '#d97706' }
      })
      .select()
      .single()

    if (error) throw error

    // Create subscription if plan specified
    if (params.planId) {
      await supabase.from('subscriptions').insert({
        organization_id: org.id,
        plan_id: params.planId,
        status: params.lifecycleStatus === 'trial' ? 'trialing' : 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    // Optional bootstrap: Create initial brand & hotel
    if (params.initialBrandName?.trim()) {
      const { data: brand } = await supabase
        .from('brands')
        .insert({
          organization_id: org.id,
          name: params.initialBrandName.trim(),
          is_active: true,
          is_deleted: false
        })
        .select()
        .single()

      if (brand && params.initialHotelName?.trim()) {
        await supabase
          .from('hotels')
          .insert({
            organization_id: org.id,
            brand_id: brand.id,
            name: params.initialHotelName.trim(),
            city: 'Riyadh',
            is_active: true,
            is_deleted: false
          })
      }
    } else if (params.initialHotelName?.trim()) {
      await supabase
        .from('hotels')
        .insert({
          organization_id: org.id,
          name: params.initialHotelName.trim(),
          city: 'Riyadh',
          is_active: true,
          is_deleted: false
        })
    }

    // Audit log
    await this.logPlatformAction({
      action: 'create_organization',
      resourceType: 'organization',
      resourceId: org.id,
      targetOrgId: org.id,
      actorId: params.actorId,
      metadata: {
        name: params.name,
        slug: params.slug,
        planId: params.planId,
        maxHotels: params.maxHotels,
        maxLearners: params.maxLearners,
        lifecycleStatus: params.lifecycleStatus
      }
    })

    return org
  },

  async updateOrganizationEntitlements(orgId: string, params: {
    maxHotels?: number
    maxLearners?: number
    maxStorageGb?: number
    maxAiCreditsMonthly?: number
    planId?: string
    billingEmail?: string
    actorId?: string
  }): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (params.maxHotels !== undefined) updateData.max_hotels = params.maxHotels
    if (params.maxLearners !== undefined) updateData.max_learners = params.maxLearners
    if (params.maxStorageGb !== undefined) updateData.max_storage_gb = params.maxStorageGb
    if (params.maxAiCreditsMonthly !== undefined) updateData.max_ai_credits_monthly = params.maxAiCreditsMonthly
    if (params.billingEmail !== undefined) updateData.billing_email = params.billingEmail.trim() || null

    const { error: orgErr } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)

    if (orgErr) throw orgErr

    if (params.planId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            plan_id: params.planId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSub.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            organization_id: orgId,
            plan_id: params.planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          })
      }
    }

    await this.logPlatformAction({
      action: 'update_organization_entitlements',
      resourceType: 'organization',
      resourceId: orgId,
      targetOrgId: orgId,
      actorId: params.actorId,
      metadata: params
    })
  },

  async updateOrganizationDetails(orgId: string, params: {
    name?: string
    nameAr?: string
    slug?: string
    industry?: string
    logoUrl?: string
    faviconUrl?: string
    brandColors?: { primary: string; secondary: string; accent?: string }
    billingEmail?: string
    actorId?: string
  }): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (params.name !== undefined) updateData.name = params.name.trim()
    if (params.nameAr !== undefined) updateData.name_ar = params.nameAr.trim() || null
    if (params.slug !== undefined) updateData.slug = params.slug.trim().toLowerCase()
    if (params.industry !== undefined) updateData.industry = params.industry
    if (params.logoUrl !== undefined) updateData.logo_url = params.logoUrl
    if (params.faviconUrl !== undefined) updateData.favicon_url = params.faviconUrl
    if (params.brandColors !== undefined) updateData.brand_colors = params.brandColors
    if (params.billingEmail !== undefined) updateData.billing_email = params.billingEmail.trim() || null

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)

    if (error) throw error

    await this.logPlatformAction({
      action: 'update_organization_details',
      resourceType: 'organization',
      resourceId: orgId,
      targetOrgId: orgId,
      actorId: params.actorId,
      metadata: params
    })
  },

  async toggleOrganizationStatus(orgId: string, isActive: boolean, actorId?: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', orgId)

    if (error) throw error

    await this.logPlatformAction({
      action: isActive ? 'activate_organization' : 'suspend_organization',
      resourceType: 'organization',
      resourceId: orgId,
      targetOrgId: orgId,
      actorId,
      metadata: { is_active: isActive }
    })
  },

  // ============================================================================
  // 3. SECURE CROSS-TENANT IMPERSONATION ("ACT AS")
  // ============================================================================
  async startPlatformAccessSession(params: {
    adminUserId?: string
    targetOrganizationId: string
    actingRole?: string
    accessReason: string
    ttlMinutes?: number
  }): Promise<PlatformAccessSession> {
    // 1. Call Phase 10 server-enforced operator RPC
    const { data: sessionId, error: rpcErr } = await (supabase.rpc as any)('start_platform_session', {
      p_org_id: params.targetOrganizationId,
      p_reason: params.accessReason,
      p_acting_role: params.actingRole || 'organization_admin',
      p_ttl_minutes: params.ttlMinutes || 60
    })

    if (rpcErr) throw rpcErr

    // 2. Fetch the newly created and populated session
    const { data: session, error: fetchErr } = await supabase
      .from('platform_access_sessions')
      .select('*, target_organization:organizations(*)')
      .eq('id', sessionId)
      .single()

    if (fetchErr) throw fetchErr

    return session as PlatformAccessSession
  },

  async endPlatformAccessSession(sessionId: string, _actorId?: string): Promise<void> {
    // Call Phase 10 server-enforced operator exit RPC
    const { error: rpcErr } = await (supabase.rpc as any)('end_platform_session', {
      p_session_id: sessionId
    })

    if (rpcErr) {
      console.error('Error ending platform session via RPC:', rpcErr)
      throw rpcErr
    }
  },

  // ============================================================================
  // 4. MASTER CONTENT DISTRIBUTION (GLOBAL LIBRARY -> TENANTS)
  // ============================================================================
  async getMasterSops(): Promise<any[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_master_template', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching master SOPs:', error)
      return []
    }
    return data || []
  },

  async getMasterCourses(): Promise<any[]> {
    const { data: tmData, error: tmError } = await supabase
      .from('training_modules')
      .select('*')
      .eq('is_master_template', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (!tmError && tmData && tmData.length > 0) {
      return tmData
    }

    const { data: cData, error: cError } = await supabase
      .from('courses')
      .select('*')
      .eq('is_master_template', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (cError) {
      console.error('Error fetching master courses:', cError)
      return tmData || []
    }

    return cData || []
  },

  async createMasterSop(params: {
    title: string
    titleAr?: string
    description?: string
    descriptionAr?: string
    content?: string
    contentAr?: string
    documentNumber?: string
    actorId?: string
  }): Promise<any> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: params.title.trim(),
        title_ar: params.titleAr?.trim() || null,
        description: params.description?.trim() || null,
        description_ar: params.descriptionAr?.trim() || null,
        content: params.content || '',
        content_ar: params.contentAr || null,
        document_number: params.documentNumber?.trim() || `SOP-MST-${Date.now().toString().slice(-4)}`,
        is_master_template: true,
        scope_type: 'global',
        status: 'PUBLISHED',
        current_version: 1,
        is_deleted: false,
        created_by: params.actorId || null
      })
      .select()
      .single()

    if (error) throw error

    await this.logPlatformAction({
      action: 'create_master_sop',
      resourceType: 'document_sop',
      resourceId: data.id,
      actorId: params.actorId,
      metadata: { title: data.title, document_number: data.document_number, version: 1 }
    })

    return data
  },

  async createMasterCourse(params: {
    title: string
    description?: string
    category?: string
    difficultyLevel?: string
    estimatedDurationMinutes?: number
    blueprint?: any
    actorId?: string
  }): Promise<any> {
    const { data, error } = await supabase
      .from('training_modules')
      .insert({
        title: params.title.trim(),
        description: params.description?.trim() || null,
        category: params.category || 'Hospitality & Standards',
        difficulty_level: params.difficultyLevel || 'intermediate',
        estimated_duration_minutes: params.estimatedDurationMinutes || 45,
        blueprint: params.blueprint || { version: 1, sections: [] },
        is_master_template: true,
        scope_type: 'global',
        status: 'published',
        validity_period_days: 365,
        is_deleted: false,
        created_by: params.actorId || null
      })
      .select()
      .single()

    if (error) throw error

    await this.logPlatformAction({
      action: 'create_master_course',
      resourceType: 'course',
      resourceId: data.id,
      actorId: params.actorId,
      metadata: { title: data.title, category: data.category, version: 1 }
    })

    return data
  },

  async updateMasterSop(
    sopId: string,
    params: {
      title?: string
      titleAr?: string
      description?: string
      descriptionAr?: string
      content?: string
      contentAr?: string
      incrementVersion?: boolean
      actorId?: string
    }
  ): Promise<any> {
    const { data: currentSop, error: fetchErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', sopId)
      .single()

    if (fetchErr || !currentSop) throw new Error('Master SOP not found')

    const newVersion = params.incrementVersion ? (currentSop.current_version || 1) + 1 : (currentSop.current_version || 1)

    const { data: updatedSop, error: updateErr } = await supabase
      .from('documents')
      .update({
        title: params.title !== undefined ? params.title : currentSop.title,
        title_ar: params.titleAr !== undefined ? params.titleAr : currentSop.title_ar,
        description: params.description !== undefined ? params.description : currentSop.description,
        description_ar: params.descriptionAr !== undefined ? params.descriptionAr : currentSop.description_ar,
        content: params.content !== undefined ? params.content : currentSop.content,
        content_ar: params.contentAr !== undefined ? params.contentAr : currentSop.content_ar,
        current_version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', sopId)
      .select()
      .single()

    if (updateErr) throw updateErr

    if (params.incrementVersion) {
      // Flag existing tenant deployments that an update is available
      await this.notifyMasterUpdateAvailable(sopId, newVersion, 'sop', params.actorId)
    }

    await this.logPlatformAction({
      action: 'update_master_sop',
      resourceType: 'document_sop',
      resourceId: sopId,
      actorId: params.actorId,
      metadata: { title: updatedSop.title, version: newVersion, incremented: Boolean(params.incrementVersion) }
    })

    return updatedSop
  },

  async updateMasterCourse(
    courseId: string,
    params: {
      title?: string
      description?: string
      category?: string
      difficultyLevel?: string
      estimatedDurationMinutes?: number
      blueprint?: any
      incrementVersion?: boolean
      actorId?: string
    }
  ): Promise<any> {
    const { data: currentCourse, error: fetchErr } = await supabase
      .from('training_modules')
      .select('*')
      .eq('id', courseId)
      .single()

    if (fetchErr || !currentCourse) throw new Error('Master Course not found')

    const currentBp = (currentCourse.blueprint as any) || {}
    const currentVersion = Number(currentBp.version || 1)
    const newVersion = params.incrementVersion ? currentVersion + 1 : currentVersion
    const updatedBlueprint = params.blueprint ? { ...params.blueprint, version: newVersion } : { ...currentBp, version: newVersion }

    const { data: updatedCourse, error: updateErr } = await supabase
      .from('training_modules')
      .update({
        title: params.title !== undefined ? params.title : currentCourse.title,
        description: params.description !== undefined ? params.description : currentCourse.description,
        category: params.category !== undefined ? params.category : currentCourse.category,
        difficulty_level: params.difficultyLevel !== undefined ? params.difficultyLevel : currentCourse.difficulty_level,
        estimated_duration_minutes: params.estimatedDurationMinutes !== undefined ? params.estimatedDurationMinutes : currentCourse.estimated_duration_minutes,
        blueprint: updatedBlueprint,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single()

    if (updateErr) throw updateErr

    if (params.incrementVersion) {
      await this.notifyMasterUpdateAvailable(courseId, newVersion, 'course', params.actorId)
    }

    await this.logPlatformAction({
      action: 'update_master_course',
      resourceType: 'course',
      resourceId: courseId,
      actorId: params.actorId,
      metadata: { title: updatedCourse.title, version: newVersion, incremented: Boolean(params.incrementVersion) }
    })

    return updatedCourse
  },

  async notifyMasterUpdateAvailable(
    masterId: string,
    newVersion: number,
    contentType: 'sop' | 'course',
    actorId?: string
  ): Promise<number> {
    const { data: deployments, error } = await supabase
      .from('master_content_deployments')
      .update({
        has_update_available: true,
        current_master_version: newVersion
      })
      .eq('master_content_id', masterId)
      .select()

    if (error) {
      console.error('Error notifying master update available:', error)
      return 0
    }

    await this.logPlatformAction({
      action: 'notify_master_update_available',
      resourceType: contentType === 'sop' ? 'document_sop' : 'course',
      resourceId: masterId,
      actorId,
      metadata: { new_version: newVersion, affected_deployments: deployments?.length || 0 }
    })

    return deployments?.length || 0
  },

  async deployMasterSop(params: {
    masterDocId: string
    targetOrgIds: string[]
    deployedBy: string
    onProgress?: (progress: MasterDeploymentProgress) => void
  }): Promise<{ deployedCount: number; errors: Array<{ orgId: string; error: string }> }> {
    const errors: Array<{ orgId: string; error: string }> = []
    let count = 0
    const total = params.targetOrgIds.length

    for (let i = 0; i < total; i++) {
      const orgId = params.targetOrgIds[i]
      params.onProgress?.({
        orgId,
        status: 'in_progress',
        current: i + 1,
        total
      })

      try {
        await this.deployMasterContentViaRPC({
          masterId: params.masterDocId,
          contentType: 'document',
          targetOrgId: orgId
        })

        count++
        params.onProgress?.({
          orgId,
          status: 'success',
          current: i + 1,
          total
        })
      } catch (err: any) {
        console.error(`Error deploying SOP to org ${orgId}:`, err)
        errors.push({ orgId, error: err?.message || 'Deployment error' })
        params.onProgress?.({
          orgId,
          status: 'error',
          message: err?.message || 'Failed',
          current: i + 1,
          total
        })
      }
    }

    return { deployedCount: count, errors }
  },

  async deployMasterCourse(params: {
    masterCourseId: string
    targetOrgIds: string[]
    deployedBy: string
    onProgress?: (progress: MasterDeploymentProgress) => void
  }): Promise<{ deployedCount: number; errors: Array<{ orgId: string; error: string }> }> {
    const errors: Array<{ orgId: string; error: string }> = []
    let count = 0
    const total = params.targetOrgIds.length

    for (let i = 0; i < total; i++) {
      const orgId = params.targetOrgIds[i]
      params.onProgress?.({
        orgId,
        status: 'in_progress',
        current: i + 1,
        total
      })

      try {
        await this.deployMasterContentViaRPC({
          masterId: params.masterCourseId,
          contentType: 'course',
          targetOrgId: orgId
        })

        count++
        params.onProgress?.({
          orgId,
          status: 'success',
          current: i + 1,
          total
        })
      } catch (err: any) {
        console.error(`Error deploying Course to org ${orgId}:`, err)
        errors.push({ orgId, error: err?.message || 'Deployment error' })
        params.onProgress?.({
          orgId,
          status: 'error',
          message: err?.message || 'Failed',
          current: i + 1,
          total
        })
      }
    }

    return { deployedCount: count, errors }
  },

  async getDeploymentsForTenant(orgId: string): Promise<MasterContentDeployment[]> {
    if (!orgId) return []
    const { data, error } = await supabase
      .from('master_content_deployments')
      .select('*')
      .eq('target_organization_id', orgId)

    if (error) {
      console.error('Error fetching tenant deployments:', error)
      return []
    }
    return (data || []) as MasterContentDeployment[]
  },

  async getAllDeployments(): Promise<any[]> {
    const { data, error } = await supabase
      .from('master_content_deployments')
      .select(`
        *,
        target_organization:organizations(id, name, slug)
      `)
      .order('deployed_at', { ascending: false })

    if (error) {
      console.error('Error fetching all deployments:', error)
      return []
    }
    return data || []
  },

  async getMasterContentDiff(
    targetContentId: string,
    contentType: 'sop' | 'course'
  ): Promise<MasterContentDiff | null> {
    try {
      // 1. Fetch deployment record
      const { data: deployment } = await supabase
        .from('master_content_deployments')
        .select('*')
        .eq('target_content_id', targetContentId)
        .maybeSingle()

      if (contentType === 'sop') {
        // Fetch target SOP
        const { data: targetDoc } = await supabase
          .from('documents')
          .select('*')
          .eq('id', targetContentId)
          .single()

        if (!targetDoc) return null

        const masterId = deployment?.master_content_id || targetDoc.master_source_id
        if (!masterId) return null

        const { data: masterDoc } = await supabase
          .from('documents')
          .select('*')
          .eq('id', masterId)
          .single()

        if (!masterDoc) return null

        const masterVersion = masterDoc.current_version || 1
        const deployedVersion = deployment?.deployed_version || targetDoc.current_version || 1
        const hasUpdateAvailable = deployment?.has_update_available || masterVersion > deployedVersion

        return {
          masterContentId: masterDoc.id,
          targetContentId: targetDoc.id,
          contentType: 'sop',
          masterTitle: masterDoc.title,
          targetTitle: targetDoc.title,
          masterTitleAr: masterDoc.title_ar,
          targetTitleAr: targetDoc.title_ar,
          masterDescription: masterDoc.description,
          targetDescription: targetDoc.description,
          masterVersion,
          deployedVersion,
          hasUpdateAvailable,
          lastSyncedAt: deployment?.last_synced_at,
          deployedAt: deployment?.deployed_at
        }
      } else {
        // Fetch target Course / Module
        const { data: targetModule } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', targetContentId)
          .single()

        if (!targetModule) return null

        const masterId = deployment?.master_content_id || targetModule.master_source_id
        if (!masterId) return null

        let masterModule: any = null
        const { data: tmMaster } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', masterId)
          .maybeSingle()

        if (tmMaster) {
          masterModule = tmMaster
        } else {
          const { data: cMaster } = await supabase
            .from('courses')
            .select('*')
            .eq('id', masterId)
            .maybeSingle()
          masterModule = cMaster
        }

        if (!masterModule) return null

        const masterBp = (masterModule.blueprint as any) || {}
        const targetBp = (targetModule.blueprint as any) || {}
        const masterVersion = Number(masterBp.version || 1)
        const deployedVersion = Number(deployment?.deployed_version || targetBp.version || 1)
        const hasUpdateAvailable = deployment?.has_update_available || masterVersion > deployedVersion

        return {
          masterContentId: masterModule.id,
          targetContentId: targetModule.id,
          contentType: 'course',
          masterTitle: masterModule.title,
          targetTitle: targetModule.title,
          masterDescription: masterModule.description,
          targetDescription: targetModule.description,
          masterVersion,
          deployedVersion,
          hasUpdateAvailable,
          lastSyncedAt: deployment?.last_synced_at,
          deployedAt: deployment?.deployed_at,
          blueprintDifferences: {
            masterSectionsCount: Array.isArray(masterBp.sections) ? masterBp.sections.length : 0,
            targetSectionsCount: Array.isArray(targetBp.sections) ? targetBp.sections.length : 0,
            estimatedDurationMinutes: masterModule.estimated_duration_minutes,
            category: masterModule.category,
            difficultyLevel: masterModule.difficulty_level
          }
        }
      }
    } catch (err) {
      console.error('Error calculating master content diff:', err)
      return null
    }
  },

  async syncContentWithMaster(params: {
    deploymentId?: string
    targetContentId: string
    contentType: 'sop' | 'course'
    triggerRetraining?: boolean
    updatedBy?: string
  }): Promise<{ success: boolean; updatedVersion: number; message?: string }> {
    try {
      // 1. Fetch deployment record if exists
      const { data: deployment } = await supabase
        .from('master_content_deployments')
        .select('*')
        .eq('target_content_id', params.targetContentId)
        .maybeSingle()

      if (params.contentType === 'sop') {
        const { data: targetDoc, error: targetErr } = await supabase
          .from('documents')
          .select('*')
          .eq('id', params.targetContentId)
          .single()

        if (targetErr || !targetDoc) throw new Error('Target SOP not found')

        const masterId = deployment?.master_content_id || targetDoc.master_source_id
        if (!masterId) throw new Error('No master template associated with this document')

        const { data: masterDoc, error: masterErr } = await supabase
          .from('documents')
          .select('*')
          .eq('id', masterId)
          .single()

        if (masterErr || !masterDoc) throw new Error('Master SOP not found')

        const masterVersion = masterDoc.current_version || 1

        // Update target document
        await supabase
          .from('documents')
          .update({
            title: masterDoc.title,
            title_ar: masterDoc.title_ar,
            description: masterDoc.description,
            description_ar: masterDoc.description_ar,
            content: masterDoc.content,
            content_ar: masterDoc.content_ar,
            current_version: masterVersion,
            status: 'PUBLISHED',
            updated_at: new Date().toISOString(),
            updated_by: params.updatedBy || null
          })
          .eq('id', targetDoc.id)

        // Update deployment record if exists
        if (deployment) {
          await supabase
            .from('master_content_deployments')
            .update({
              has_update_available: false,
              deployed_version: masterVersion,
              current_master_version: masterVersion,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', deployment.id)
        }

        // Audit log
        await this.logPlatformAction({
          action: 'sync_master_sop',
          resourceType: 'document_sop',
          resourceId: targetDoc.id,
          targetOrgId: targetDoc.organization_id || deployment?.target_organization_id,
          actorId: params.updatedBy,
          metadata: { master_id: masterDoc.id, new_version: masterVersion }
        })

        return { success: true, updatedVersion: masterVersion }
      } else {
        // Course / Training Module sync
        const { data: targetModule, error: targetErr } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', params.targetContentId)
          .single()

        if (targetErr || !targetModule) throw new Error('Target training module not found')

        const masterId = deployment?.master_content_id || targetModule.master_source_id
        if (!masterId) throw new Error('No master course associated with this module')

        let masterModule: any = null
        const { data: tmMaster } = await supabase
          .from('training_modules')
          .select('*')
          .eq('id', masterId)
          .maybeSingle()

        if (tmMaster) {
          masterModule = tmMaster
        } else {
          const { data: cMaster } = await supabase
            .from('courses')
            .select('*')
            .eq('id', masterId)
            .maybeSingle()
          masterModule = cMaster
        }

        if (!masterModule) throw new Error('Master Course not found')

        const masterBp = (masterModule.blueprint as any) || {}
        const masterVersion = Number(masterBp.version || 1)

        // Update target module
        await supabase
          .from('training_modules')
          .update({
            title: masterModule.title,
            description: masterModule.description,
            category: masterModule.category,
            difficulty_level: masterModule.difficulty_level,
            estimated_duration_minutes: masterModule.estimated_duration_minutes,
            blueprint: masterModule.blueprint,
            status: 'published',
            updated_at: new Date().toISOString(),
            updated_by: params.updatedBy || null
          })
          .eq('id', targetModule.id)

        // Update deployment record
        if (deployment) {
          await supabase
            .from('master_content_deployments')
            .update({
              has_update_available: false,
              deployed_version: masterVersion,
              current_master_version: masterVersion,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', deployment.id)
        }

        // Retraining propagation
        if (params.triggerRetraining) {
          // Reset progress in training_progress for enrolled learners
          const { error: resetErr } = await supabase
            .from('training_progress')
            .update({
              status: 'in_progress',
              progress_percentage: 0,
              passed: false,
              completed_at: null,
              updated_at: new Date().toISOString(),
              metadata: {
                mandatory_retraining_required: true,
                retrained_at: new Date().toISOString(),
                synced_version: masterVersion,
                reason: 'Upstream master curriculum updated'
              }
            })
            .eq('training_id', targetModule.id)

          if (resetErr) {
            console.warn('Warning resetting learner progress:', resetErr)
          }

          await this.logPlatformAction({
            action: 'trigger_mandatory_retraining',
            resourceType: 'course',
            resourceId: targetModule.id,
            targetOrgId: targetModule.organization_id || deployment?.target_organization_id,
            actorId: params.updatedBy,
            metadata: {
              master_id: masterModule.id,
              version: masterVersion,
              module_title: targetModule.title
            }
          })
        }

        // Audit log
        await this.logPlatformAction({
          action: 'sync_master_course',
          resourceType: 'course',
          resourceId: targetModule.id,
          targetOrgId: targetModule.organization_id || deployment?.target_organization_id,
          actorId: params.updatedBy,
          metadata: {
            master_id: masterModule.id,
            version: masterVersion,
            retraining_triggered: Boolean(params.triggerRetraining)
          }
        })

        return { success: true, updatedVersion: masterVersion }
      }
    } catch (err: any) {
      console.error('Error syncing content with master:', err)
      return { success: false, updatedVersion: 1, message: err?.message || 'Sync failed' }
    }
  },

  // ============================================================================
  // 5. CROSS-TENANT AUDIT LOGGING & VIEWING
  // ============================================================================
  async logPlatformAction(params: {
    action: string
    resourceType: string
    resourceId?: string | null
    targetOrgId?: string | null
    sessionId?: string | null
    actorId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await supabase.from('platform_audit_logs').insert({
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId || null,
        target_organization_id: params.targetOrgId || null,
        session_id: params.sessionId || null,
        actor_id: params.actorId || null,
        metadata: params.metadata || {}
      })
    } catch (err) {
      console.warn('Failed to write platform audit log:', err)
    }
  },

  async getPlatformAuditLogs(limit = 100): Promise<PlatformAuditLog[]> {
    const { data, error } = await supabase
      .from('platform_audit_logs')
      .select(`
        *,
        actor:profiles(full_name),
        target_org:organizations(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching platform audit logs:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      actor_id: row.actor_id,
      actor_name: row.actor?.full_name || 'System Admin',
      target_organization_id: row.target_organization_id,
      target_organization_name: row.target_org?.name || 'Global Platform',
      session_id: row.session_id,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      metadata: row.metadata || {},
      created_at: row.created_at
    }))
  },

  // ============================================================================
  // 6. GLOBAL USER DIRECTORY & ACCESS CONTROL
  // ============================================================================
  async getPlatformUserDirectory(params?: {
    search?: string
    organizationId?: string
    role?: string
    limit?: number
    offset?: number
  }): Promise<{
    id: string
    email: string
    full_name: string
    avatar_url?: string
    is_active: boolean
    is_platform_user: boolean
    platform_role?: string
    primary_organization_id?: string
    primary_organization_name?: string
    membership_count: number
    memberships: Array<{
      organization_id: string
      organization_name: string
      role: string
      hotel_id?: string
      hotel_name?: string
      department_id?: string
      department_name?: string
      is_active: boolean
    }>
    created_at: string
  }[]> {
    const { data, error } = await (supabase.rpc as any)('get_platform_user_directory', {
      p_search: params?.search || null,
      p_org_id: params?.organizationId || null,
      p_role: params?.role || null,
      p_limit: params?.limit || 50,
      p_offset: params?.offset || 0
    })

    if (error) {
      console.error('Error in getPlatformUserDirectory:', error)
      throw error
    }

    return data || []
  },

  // ---- Platform operator identity management (platform_users / platform_role_assignments) ----

  /** List internal platform operators with their active role assignments. */
  async listPlatformUsers(): Promise<Array<{
    user_id: string
    email: string
    full_name: string
    is_active: boolean
    employment_type: string
    roles: string[]
    created_at: string
  }>> {
    const sb = supabase as any
    const { data: pu, error } = await sb
      .from('platform_users')
      .select('user_id, is_active, employment_type, created_at, profile:profiles!platform_users_user_id_fkey(email, full_name)')
      .order('created_at', { ascending: true })
    if (error) { console.error('listPlatformUsers:', error); throw error }

    const ids = (pu || []).map((r: any) => r.user_id)
    const { data: pra } = ids.length
      ? await sb
          .from('platform_role_assignments')
          .select('platform_user_id, platform_role')
          .is('revoked_at', null)
          .in('platform_user_id', ids)
      : { data: [] as any[] }

    const rolesByUser = new Map<string, string[]>()
    for (const a of (pra || []) as any[]) {
      const list = rolesByUser.get(a.platform_user_id) || []
      list.push(a.platform_role)
      rolesByUser.set(a.platform_user_id, list)
    }

    return (pu || []).map((r: any) => ({
      user_id: r.user_id,
      email: r.profile?.email || '',
      full_name: r.profile?.full_name || '',
      is_active: r.is_active,
      employment_type: r.employment_type,
      roles: rolesByUser.get(r.user_id) || [],
      created_at: r.created_at,
    }))
  },

  /** Grant a platform role (creates the platform_users row if needed, revokes the same role first). */
  async assignPlatformRole(params: {
    userId: string
    role: string
    scopeType?: 'global' | 'org_list'
    scopeOrgIds?: string[]
  }): Promise<void> {
    const { error } = await (supabase.rpc as any)('assign_platform_role', {
      p_user_id: params.userId,
      p_role: params.role,
      p_scope_type: params.scopeType || 'global',
      p_scope_org_ids: params.scopeOrgIds || [],
    })
    if (error) throw error
  },

  async revokePlatformRole(params: { userId: string; role: string }): Promise<void> {
    const { error } = await (supabase.rpc as any)('revoke_platform_role', {
      p_user_id: params.userId,
      p_role: params.role,
    })
    if (error) throw error
  },

  async setPlatformUserActive(params: { userId: string; active: boolean }): Promise<void> {
    const { error } = await (supabase.rpc as any)('set_platform_user_active', {
      p_user_id: params.userId,
      p_active: params.active,
    })
    if (error) throw error
  },

  async toggleUserActiveStatus(params: {
    userId: string
    isActive: boolean
    actorId?: string
  }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: params.isActive, updated_at: new Date().toISOString() })
      .eq('id', params.userId)

    if (error) throw error

    await this.logPlatformAction({
      action: params.isActive ? 'activate_user' : 'suspend_user',
      resourceType: 'user',
      resourceId: params.userId,
      actorId: params.actorId,
      metadata: { is_active: params.isActive }
    })
  },

  // ============================================================================
  // 7. PLATFORM OPERATIONS, BACKGROUND JOBS & HEALTH
  // ============================================================================
  async getPlatformOperationsSummary(): Promise<{
    active_jobs: number
    completed_jobs: number
    failed_jobs: number
    total_jobs: number
    recent_jobs: Array<{
      id: string
      mode: string
      status: string
      created_at: string
      updated_at: string
      duration_ms?: number
      error_message?: string
      models_used?: string[]
    }>
  }> {
    const { data, error } = await (supabase.rpc as any)('get_platform_operations_summary')
    if (error) {
      console.error('Error fetching operations summary:', error)
      return {
        active_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        total_jobs: 0,
        recent_jobs: []
      }
    }
    return data
  },

  async retryFailedJob(jobId: string): Promise<boolean> {
    const { data, error } = await (supabase.rpc as any)('retry_failed_job', {
      p_job_id: jobId
    })
    if (error) throw error
    return !!data
  },

  // ============================================================================
  // 8. GLOBAL SEARCH ACROSS ALL TENANTS
  // ============================================================================
  async getPlatformGlobalSearch(query: string): Promise<{
    organizations: Array<{ id: string; name: string; slug: string; is_active: boolean; hotel_count: number }>
    hotels: Array<{ id: string; name: string; city: string; organization_id: string; organization_name: string }>
    users: Array<{ id: string; full_name: string; email: string; primary_org?: string }>
    master_sops: Array<{ id: string; title: string; category: string; version: number }>
    master_courses: Array<{ id: string; title: string; category: string; difficulty_level: string }>
  }> {
    if (!query || query.trim().length === 0) {
      return { organizations: [], hotels: [], users: [], master_sops: [], master_courses: [] }
    }

    const { data, error } = await (supabase.rpc as any)('get_platform_global_search', {
      p_query: query.trim()
    })

    if (error) {
      console.error('Error in getPlatformGlobalSearch:', error)
      return { organizations: [], hotels: [], users: [], master_sops: [], master_courses: [] }
    }

    return data || { organizations: [], hotels: [], users: [], master_sops: [], master_courses: [] }
  },

  // ============================================================================
  // 9. PLATFORM SYSTEM SETTINGS & FEATURE FLAGS
  // ============================================================================
  async getSystemSettings(): Promise<Array<{
    id: string
    key: string
    value: any
    category: string
    description?: string
    updated_at: string
  }>> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching system settings:', error)
      return []
    }
    return data || []
  },

  async updateSystemSetting(params: {
    key: string
    value: any
    actorId?: string
  }): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: params.key,
        value: params.value,
        updated_at: new Date().toISOString(),
        updated_by: params.actorId || null
      }, { onConflict: 'key' })

    if (error) throw error

    await this.logPlatformAction({
      action: 'update_system_setting',
      resourceType: 'system_setting',
      resourceId: params.key,
      actorId: params.actorId,
      metadata: { key: params.key, new_value: params.value }
    })
  },

  // ============================================================================
  // 10. FEATURE FLAGS & ENTITLEMENTS (migration 20260901231000)
  // ============================================================================
  async getFeatureMatrix(): Promise<{
    flags: Array<{ key: string; label: string; description: string | null; category: string; default_enabled: boolean; min_plan_code: string | null }>
    organizations: Array<{ id: string; name: string; lifecycle_status: string | null; features: Record<string, { effective: boolean; override: boolean | null }> }>
  }> {
    const { data, error } = await (supabase.rpc as any)('get_platform_feature_matrix')
    if (error) throw error
    return data || { flags: [], organizations: [] }
  },

  // ---- Organization lifecycle & profile ----
  async setOrganizationStatus(orgId: string, status: string, reason?: string): Promise<void> {
    const { error } = await (supabase.rpc as any)('set_organization_status', {
      p_org_id: orgId, p_status: status, p_reason: reason ?? null,
    })
    if (error) throw error
  },

  async getOrganizationProfile(orgId: string): Promise<any> {
    const { data, error } = await (supabase.rpc as any)('get_organization_profile', { p_org_id: orgId })
    if (error) throw error
    return data
  },


  async getPlatformUsageAnalytics(): Promise<{
    generated_at: string
    totals: Record<string, number>
    ai_credits: { used: number; limit: number }
    organizations: Array<{
      id: string; name: string; lifecycle_status: string | null; plan: string | null
      hotels: number; members: number; courses: number; documents: number
      ai_credits_used: number; ai_credits_limit: number
      max_hotels: number; max_learners: number
      training_completion_pct: number | null
    }>
  }> {
    const { data, error } = await (supabase.rpc as any)('get_platform_usage_analytics')
    if (error) throw error
    return data
  },

  async setFeatureFlagDefault(key: string, enabled: boolean): Promise<void> {
    const { error } = await (supabase.rpc as any)('set_feature_flag_default', { p_key: key, p_enabled: enabled })
    if (error) throw error
  },

  async setOrgFeatureOverride(orgId: string, key: string, enabled: boolean, note?: string): Promise<void> {
    const { error } = await (supabase.rpc as any)('set_org_feature_override', {
      p_org_id: orgId, p_key: key, p_enabled: enabled, p_note: note ?? null,
    })
    if (error) throw error
  },

  async clearOrgFeatureOverride(orgId: string, key: string): Promise<void> {
    const { error } = await (supabase.rpc as any)('clear_org_feature_override', { p_org_id: orgId, p_key: key })
    if (error) throw error
  },

  // ---- Platform session-governance config (platform_config) ----
  async getPlatformConfig(): Promise<{
    legacy_role_fallback_enabled: boolean
    default_session_ttl_minutes: number
    max_session_ttl_minutes: number
    min_session_reason_length: number
    require_session_reason: boolean
  } | null> {
    const { data, error } = await (supabase as any)
      .from('platform_config')
      .select('legacy_role_fallback_enabled, default_session_ttl_minutes, max_session_ttl_minutes, min_session_reason_length, require_session_reason')
      .limit(1)
      .maybeSingle()
    if (error) { console.error('getPlatformConfig:', error); return null }
    return data as any
  },

  async updatePlatformConfig(patch: Partial<{
    default_session_ttl_minutes: number
    max_session_ttl_minutes: number
    min_session_reason_length: number
    require_session_reason: boolean
  }>, actorId?: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('platform_config')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', true)
    if (error) throw error
    await this.logPlatformAction({
      action: 'update_platform_config',
      resourceType: 'platform_config',
      actorId,
      metadata: patch,
    })
  },

  async getEffectiveEntitlements(orgId: string): Promise<{
    plan: string
    plan_code: string | null
    max_hotels: number
    max_learners: number
    max_storage_gb: number
    ai_credits_monthly: number
    ai_credits_used: number
    plan_features: Record<string, any>
    usage: {
      hotels: number
      learners: number
    }
  } | null> {
    const { data, error } = await (supabase.rpc as any)('effective_entitlements', { p_org_id: orgId })
    if (error) {
      console.error('getEffectiveEntitlements error:', error)
      return null
    }
    return data
  },

  async evaluateOrganizationQuotas(orgId: string): Promise<{
    org_id: string
    billing_period: string
    utilization: {
      hotels: { used: number; max: number; pct: number }
      learners: { used: number; max: number; pct: number }
      storage: { used: number; max: number; pct: number; used_gb?: number; max_gb?: number }
      ai_credits: { used: number; max: number; pct: number }
    }
    warnings_triggered: Array<{
      quota_type: string
      threshold_pct: number
      current_pct: number
      recipients_count: number
    }>
  } | null> {
    const { data, error } = await (supabase.rpc as any)('evaluate_organization_quotas', { p_org_id: orgId })
    if (error) {
      console.error('evaluateOrganizationQuotas error:', error)
      return null
    }
    return data
  },

  async deployMasterContentViaRPC(params: {
    masterId: string
    contentType: 'course' | 'document' | 'assessment' | 'question_bank'
    targetOrgId: string
  }): Promise<string> {
    const { data, error } = await (supabase.rpc as any)('deploy_master_content', {
      p_master_id: params.masterId,
      p_content_type: params.contentType,
      p_org_id: params.targetOrgId
    })
    if (error) throw error
    return data as string
  },

  async getNotificationPolicies(): Promise<Array<{
    key: string
    name: string
    name_ar: string | null
    description: string | null
    description_ar: string | null
    category: string
    default_enabled: boolean
    allow_tenant_override: boolean
    channels: string[]
    created_at: string
    updated_at: string
  }>> {
    const { data, error } = await (supabase as any)
      .from('platform_notification_policies')
      .select('*')
      .order('category', { ascending: true })
    if (error) throw error
    return data || []
  },

  async updateNotificationPolicy(key: string, patch: Partial<{
    default_enabled: boolean
    allow_tenant_override: boolean
    channels: string[]
  }>): Promise<void> {
    const { error } = await (supabase as any)
      .from('platform_notification_policies')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('key', key)
    if (error) throw error
  },

  async getOrgNotificationOverrides(orgId: string): Promise<Array<{
    id: string
    organization_id: string
    policy_key: string
    is_enabled: boolean
    channels: string[] | null
    updated_at: string
  }>> {
    const { data, error } = await (supabase as any)
      .from('organization_notification_overrides')
      .select('*')
      .eq('organization_id', orgId)
    if (error) throw error
    return data || []
  },

  async upsertOrgNotificationOverride(params: {
    orgId: string
    policyKey: string
    isEnabled: boolean
    channels?: string[]
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from('organization_notification_overrides')
      .upsert({
        organization_id: params.orgId,
        policy_key: params.policyKey,
        is_enabled: params.isEnabled,
        channels: params.channels || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,policy_key' })
    if (error) throw error
  },

  async getPlatformAiOperations(): Promise<{
    summary: {
      total_jobs: number
      failed_jobs: number
      processing_jobs: number
      completed_jobs: number
    }
    recent_jobs: Array<{
      id: string
      mode: string
      course_id: string | null
      status: string
      error_message: string | null
      duration_ms: number | null
      models_used: string[] | null
      created_at: string
      updated_at: string
    }>
    cron_jobs: Array<{
      jobid: number
      jobname: string
      schedule: string
      active: boolean
    }>
    recent_cron_runs: Array<{
      jobid: number
      jobname: string | null
      runid: number
      status: string
      return_message: string | null
      start_time: string
      end_time: string | null
    }>
  } | null> {
    const { data, error } = await (supabase.rpc as any)('get_platform_ai_operations')
    if (error) {
      console.error('getPlatformAiOperations error:', error)
      return null
    }
    return data
  },

  async retryCourseGenerationJob(jobId: string): Promise<boolean> {
    const { data, error } = await (supabase.rpc as any)('retry_course_generation_job', { p_job_id: jobId })
    if (error) throw error
    return !!data
  },

  async getOrgStructure(orgId: string): Promise<{
    organization: {
      id: string
      name: string
      lifecycle_status: string
    }
    brands: Array<{
      id: string
      name: string
      hotels: Array<{
        id: string
        name: string
        city: string | null
        member_count: number
        departments: Array<{
          id: string
          name: string
        }>
      }>
    }>
    hotels: Array<{
      id: string
      name: string
      city: string | null
      brand_id: string | null
      member_count: number
      departments: Array<{
        id: string
        name: string
      }>
    }>
  } | null> {
    const { data, error } = await (supabase.rpc as any)('get_org_structure', { p_org_id: orgId })
    if (error) {
      console.error('getOrgStructure error:', error)
      return null
    }
    return data
  }
}


