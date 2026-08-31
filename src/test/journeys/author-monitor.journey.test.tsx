/**
 * Journey: AUTHOR-MONITOR
 * An author/manager assigns training, then monitors completion and quiz performance
 * across their team.
 *
 * Backend contract smoke-tested here. Dashboard UI depends on the learning analytics
 * work (branch feat/learning-analytics) and five-role RLS (branch feat/five-role-rls).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
        auth: {
            getUser: vi.fn(),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
    },
}))

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

    it.todo('assignment-rules builder targets a role/department/property with a due date')
    it.todo('the roster view shows each learner’s status: assigned / in progress / completed / overdue')
    it.todo('completion rate and average quiz score render per module')
    it.todo('an author only sees learners within their RLS scope')
    it.todo('exempting a learner removes them from the mandatory roster')
    it.todo('overdue counts on the manager view reconcile with the learner home badges')
})
