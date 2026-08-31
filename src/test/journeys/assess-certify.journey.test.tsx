/**
 * Journey: ASSESS-CERTIFY
 * A learner takes a quiz, passes, completes the module, and earns a certificate.
 *
 * Backend contract smoke-tested here. UI steps depend on the assessment surface
 * consolidation (branch feat/assessment-surface-consolidation).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
    supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
}))

import { learningService } from '@/services/learningService'

describe('journey: assess-certify', () => {
    it('exposes quiz-attempt submission and module-completion RPC wrappers', () => {
        expect(typeof learningService.getQuizForPlayerRPC).toBe('function')
        expect(typeof learningService.submitQuizAttemptRPC).toBe('function')
        expect(typeof learningService.completeTrainingModuleRPC).toBe('function')
    })

    it.todo('quiz player renders questions one at a time with a progress indicator')
    it.todo('submitting answers returns a score and pass/fail against the passing threshold')
    it.todo('a failing attempt offers a retake when attempts remain')
    it.todo('a passing attempt marks training_progress completed')
    it.todo('completing a certificate-enabled module issues a certificate with a verification code')
    it.todo('the earned certificate appears in Certificates & skills on the learner home')
    it.todo('/verify/:code confirms an issued certificate as valid')
})
