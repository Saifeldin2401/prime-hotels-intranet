import { describe, expect, it } from 'vitest'
import { validateThreeWayMatch } from './financeValidation'

describe('financeValidation 3-Way Match', () => {
    it('confirms exact match when PO amount equals Invoice amount', () => {
        const result = validateThreeWayMatch({ poAmount: 5000, invoiceAmount: 5000 })
        expect(result.isMatched).toBe(true)
        expect(result.isFlagged).toBe(false)
        expect(result.varianceAmount).toBe(0)
    })

    it('allows minor variance within default 2% tolerance', () => {
        const result = validateThreeWayMatch({ poAmount: 1000, invoiceAmount: 1015 })
        expect(result.isMatched).toBe(false)
        expect(result.isFlagged).toBe(false) // 1.5% is within 2% tolerance
        expect(result.varianceAmount).toBe(15)
        expect(result.variancePercent).toBe(1.5)
    })

    it('flags variance exceeding tolerance threshold', () => {
        const result = validateThreeWayMatch({ poAmount: 1000, invoiceAmount: 1100 })
        expect(result.isMatched).toBe(false)
        expect(result.isFlagged).toBe(true) // 10% exceeds 2% tolerance
        expect(result.variancePercent).toBe(10)
    })

    it('handles invalid zero PO amount gracefully', () => {
        const result = validateThreeWayMatch({ poAmount: 0, invoiceAmount: 500 })
        expect(result.isMatched).toBe(false)
        expect(result.isFlagged).toBe(true)
    })
})
