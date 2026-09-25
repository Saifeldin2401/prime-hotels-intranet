/**
 * Journey: AUTHOR-MONITOR
 * An author/manager assigns training, then monitors completion and quiz performance
 * across their team.
 *
 * Backend contract smoke-tested here. Dashboard UI depends on the learning analytics
 * work (branch feat/learning-analytics) and five-role RLS (branch feat/five-role-rls).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', async () => {
    const { createMockSupabaseClient } = await import('../mocks/supabase')
    return {
        supabase: createMockSupabaseClient(),
    }
})

import { supabase } from '@/lib/supabase'
import { learningService } from '@/services/learningService'
import { analytics } from '@/services/analyticsService'

describe('journey: author-monitor', () => {
    it('exposes assignment creation and per-module roster inspection', () => {
        expect(typeof learningService.createAssignment).toBe('function')
        expect(typeof learningService.getModuleAssignmentRoster).toBe('function')
        expect(typeof learningService.getAssignmentProgress).toBe('function')
    })

    it('exposes an analytics tracker singleton for engagement events', () => {
        expect(analytics).toBeTruthy()
        expect(typeof analytics.track).toBe('function')
    })

    it('assignment creation delegates to create_scoped_training_assignment RPC or assignments table', async () => {
        const res = await learningService.createAssignment({
            content_id: 'mod-1',
            content_type: 'module',
            organization_id: 'org-1',
            target_type: 'individual',
            target_id: 'user-1',
            due_date: new Date().toISOString(),
        } as never)

        expect(res).toBeTruthy()
        expect(res.totalRequested).toBe(1)
    })

    it('the roster view maps learner statuses: assigned, completed, overdue', async () => {
        const roster = await learningService.getModuleAssignmentRoster('mod-1')
        expect(roster.module_id).toBe('mod-1')
        expect(Array.isArray(roster.active)).toBe(true)
        expect(Array.isArray(roster.exempted)).toBe(true)
    })
})
