import { supabase } from '@/lib/supabase'
import type { WizardDefinition, WizardUserProgress, WizardStatus } from '@/lib/types/wizard'

interface RpcResponse<T> {
  data: T | null
  error: Error | null
}

export class WizardService {
  /**
   * Get or initialize wizard progress for the current authenticated user.
   */
  static async getOrCreateProgress(
    wizardId: string,
    orgId?: string | null,
    currentRole: string = 'learner'
  ): Promise<WizardUserProgress | null> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_user_wizard_progress', {
        p_wizard_id: wizardId,
        p_org_id: orgId || null,
        p_current_role: currentRole
      })

      if (error) {
        console.error('[WizardService] getOrCreateProgress error:', error)
        // Fallback: direct select if RPC fails or permissions difference
        const { data: selectData, error: selectErr } = await supabase
          .from('wizard_user_progress')
          .select('*')
          .eq('wizard_id', wizardId)
          .maybeSingle()

        if (selectErr) {
          console.warn('[WizardService] Fallback select error:', selectErr)
          return null
        }
        return selectData as WizardUserProgress | null
      }

      return data as WizardUserProgress | null
    } catch (err) {
      console.error('[WizardService] Unexpected error in getOrCreateProgress:', err)
      return null
    }
  }

  /**
   * Update step completion and current step index.
   */
  static async updateStepProgress(
    wizardId: string,
    stepId: string,
    stepIndex: number,
    completed: boolean = true,
    orgId?: string | null
  ): Promise<WizardUserProgress | null> {
    try {
      const { data, error } = await supabase.rpc('update_wizard_step_progress', {
        p_wizard_id: wizardId,
        p_step_id: stepId,
        p_step_index: stepIndex,
        p_completed: completed,
        p_org_id: orgId || null
      })

      if (error) {
        console.error('[WizardService] updateStepProgress error:', error)
        return null
      }

      return data as WizardUserProgress | null
    } catch (err) {
      console.error('[WizardService] Unexpected error in updateStepProgress:', err)
      return null
    }
  }

  /**
   * Skip or mark wizard as completed.
   */
  static async skipOrComplete(
    wizardId: string,
    status: 'skipped' | 'completed' | 'in_progress',
    orgId?: string | null
  ): Promise<WizardUserProgress | null> {
    try {
      const { data, error } = await supabase.rpc('skip_or_complete_wizard', {
        p_wizard_id: wizardId,
        p_status: status,
        p_org_id: orgId || null
      })

      if (error) {
        console.error('[WizardService] skipOrComplete error:', error)
        return null
      }

      return data as WizardUserProgress | null
    } catch (err) {
      console.error('[WizardService] Unexpected error in skipOrComplete:', err)
      return null
    }
  }

  /**
   * Reset wizard progress for a specific user (admin or self).
   */
  static async resetProgress(
    targetUserId: string,
    wizardId: string,
    orgId?: string | null
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_user_wizard_progress', {
        p_target_user_id: targetUserId,
        p_wizard_id: wizardId,
        p_org_id: orgId || null
      })

      if (error) {
        console.error('[WizardService] resetProgress error:', error)
        return false
      }

      return Boolean(data)
    } catch (err) {
      console.error('[WizardService] Unexpected error in resetProgress:', err)
      return false
    }
  }

  /**
   * Dismiss a contextual tip banner for the current user.
   */
  static async dismissTip(tipId: string, orgId?: string | null): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('dismiss_contextual_tip', {
        p_tip_id: tipId,
        p_org_id: orgId || null
      })

      if (error) {
        console.error('[WizardService] dismissTip error:', error)
        return false
      }

      return Boolean(data)
    } catch (err) {
      console.error('[WizardService] Unexpected error in dismissTip:', err)
      return false
    }
  }

  /**
   * Fetch all active wizard definitions.
   */
  static async getDefinitions(): Promise<WizardDefinition[]> {
    try {
      const { data, error } = await supabase
        .from('wizard_definitions')
        .select('*')
        .eq('is_active', true)
        .order('target_level', { ascending: true })

      if (error) {
        console.error('[WizardService] getDefinitions error:', error)
        return []
      }

      return (data || []) as WizardDefinition[]
    } catch (err) {
      console.error('[WizardService] Unexpected error in getDefinitions:', err)
      return []
    }
  }

  /**
   * Fetch onboarding analytics for an organization or platform.
   */
  static async getOnboardingAnalytics(orgId?: string | null): Promise<{
    totalUsers: number
    completedCount: number
    inProgressCount: number
    skippedCount: number
    notStartedCount: number
    byRole: Record<string, { total: number; completed: number }>
  }> {
    try {
      let query = supabase
        .from('wizard_user_progress')
        .select('id, user_id, role_at_onboarding, status')

      if (orgId) {
        query = query.eq('organization_id', orgId)
      }

      const { data, error } = await query

      if (error) {
        console.error('[WizardService] getOnboardingAnalytics error:', error)
        return {
          totalUsers: 0,
          completedCount: 0,
          inProgressCount: 0,
          skippedCount: 0,
          notStartedCount: 0,
          byRole: {}
        }
      }

      const rows = data || []
      const byRole: Record<string, { total: number; completed: number }> = {}

      let completedCount = 0
      let inProgressCount = 0
      let skippedCount = 0
      let notStartedCount = 0

      for (const row of rows) {
        const role = row.role_at_onboarding || 'learner'
        if (!byRole[role]) {
          byRole[role] = { total: 0, completed: 0 }
        }
        byRole[role].total += 1

        if (row.status === 'completed') {
          completedCount += 1
          byRole[role].completed += 1
        } else if (row.status === 'in_progress') {
          inProgressCount += 1
        } else if (row.status === 'skipped') {
          skippedCount += 1
        } else {
          notStartedCount += 1
        }
      }

      return {
        totalUsers: rows.length,
        completedCount,
        inProgressCount,
        skippedCount,
        notStartedCount,
        byRole
      }
    } catch (err) {
      console.error('[WizardService] Unexpected error in getOnboardingAnalytics:', err)
      return {
        totalUsers: 0,
        completedCount: 0,
        inProgressCount: 0,
        skippedCount: 0,
        notStartedCount: 0,
        byRole: {}
      }
    }
  }
}
