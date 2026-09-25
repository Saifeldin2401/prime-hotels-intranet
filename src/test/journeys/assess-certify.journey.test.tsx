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

import { supabase } from '@/lib/supabase'

describe('journey: assess-certify', () => {
    it('exposes quiz-attempt submission and module-completion RPC wrappers', () => {
        expect(typeof learningService.getQuizForPlayerRPC).toBe('function')
        expect(typeof learningService.submitQuizAttemptRPC).toBe('function')
        expect(typeof learningService.completeTrainingModuleRPC).toBe('function')
    })

    it('submitting answers returns a score and pass/fail against the passing threshold', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: {
                session_id: 'sess-123',
                score_percentage: 85,
                passed: true,
                correct_count: 8,
                total_questions: 10,
            },
            error: null,
        } as never)

        const res = await learningService.submitQuizAttemptRPC('quiz-1', [
            { question_id: 'q1', selected_answer: 'A' },
            { question_id: 'q2', selected_answer: 'B' },
        ])

        expect(supabase.rpc).toHaveBeenCalledWith('submit_quiz_attempt', expect.objectContaining({
            p_quiz_id: 'quiz-1',
        }))
        expect(res.score_percentage).toBe(85)
        expect(res.passed).toBe(true)
    })

    it('a passing attempt marks training_progress completed via completeTrainingModuleRPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: {
                training_progress_id: 'tp-123',
                score_percentage: 85,
                passed: true,
                status: 'completed',
                completed_at: new Date().toISOString(),
            },
            error: null,
        } as never)

        const res = await learningService.completeTrainingModuleRPC('mod-1')

        expect(supabase.rpc).toHaveBeenCalledWith('complete_training_module', expect.objectContaining({
            p_module_id: 'mod-1',
        }))
        expect(res.status).toBe('completed')
        expect(res.passed).toBe(true)
    })
})
