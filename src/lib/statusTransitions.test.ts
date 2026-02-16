import { describe, expect, it } from 'vitest'
import {
    StatusHelpers,
    getTransitionErrorMessage,
    getValidNextStatuses,
    isTerminalStatus,
    isValidTransition,
    validateTransition
} from '@/lib/statusTransitions'

describe('statusTransitions business rules', () => {
    it('allows valid transitions and blocks invalid ones', () => {
        expect(isValidTransition('leave_request', 'pending', 'approved')).toBe(true)
        expect(isValidTransition('leave_request', 'approved', 'rejected')).toBe(false)
    })

    it('exposes valid next states for workflow UIs', () => {
        expect(getValidNextStatuses('job_posting', 'open')).toEqual(['filled', 'closed', 'on_hold', 'cancelled'])
    })

    it('throws for invalid transitions', () => {
        expect(() => validateTransition('task', 'completed', 'open')).toThrow(/Invalid status transition/i)
    })

    it('identifies terminal states and helper capabilities', () => {
        expect(isTerminalStatus('maintenance_ticket', 'closed')).toBe(true)
        expect(StatusHelpers.canCancel('maintenance_ticket', 'open')).toBe(true)
        expect(StatusHelpers.canReopen('maintenance_ticket', 'on_hold')).toBe(true)
    })

    it('returns user-facing transition errors', () => {
        expect(getTransitionErrorMessage('leave_request', 'cancelled', 'approved'))
            .toContain('final state')
    })
})

