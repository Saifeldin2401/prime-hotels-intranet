import { describe, expect, it } from 'vitest'
import { calculatePoTotals, KSA_VAT_RATE } from './procurementCalculations'

describe('procurementCalculations', () => {
    it('returns zero totals for empty item list', () => {
        const result = calculatePoTotals([])
        expect(result.subtotal).toBe(0)
        expect(result.vatAmount).toBe(0)
        expect(result.grandTotal).toBe(0)
        expect(result.itemTotals).toEqual([])
    })

    it('calculates single line item correctly', () => {
        const items = [{ item_description: 'Towels', quantity: 10, unit_price: 25 }]
        const result = calculatePoTotals(items)
        expect(result.itemTotals).toEqual([250])
        expect(result.subtotal).toBe(250)
        expect(result.vatAmount).toBe(37.5) // 250 * 0.15
        expect(result.grandTotal).toBe(287.5)
    })

    it('calculates multiple line items with 15% KSA VAT correctly', () => {
        const items = [
            { item_description: 'Sheets', quantity: 5, unit_price: 100 },
            { item_description: 'Pillowcases', quantity: 20, unit_price: 15 },
        ]
        const result = calculatePoTotals(items)
        expect(result.itemTotals).toEqual([500, 300])
        expect(result.subtotal).toBe(800)
        expect(result.vatAmount).toBe(120) // 800 * 0.15
        expect(result.grandTotal).toBe(920)
    })

    it('handles negative or invalid quantities gracefully', () => {
        const items = [{ item_description: 'Soap', quantity: -5, unit_price: 10 }]
        const result = calculatePoTotals(items)
        expect(result.subtotal).toBe(0)
    })
})
