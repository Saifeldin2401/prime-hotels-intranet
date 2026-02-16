import { describe, expect, it } from 'vitest'
import { detectPropertyByName, detectPropertyFromContext } from '@/lib/propertyDetection'

const properties = [
    { id: 'p1', name: 'Prime Al Hamra Hotel', code: 'ALH' },
    { id: 'p2', name: 'Prime Al Corniche', code: 'ALC' }
]

describe('propertyDetection', () => {
    it('matches exact property names', () => {
        const result = detectPropertyByName('Prime Al Hamra Hotel', properties)
        expect(result.propertyId).toBe('p1')
        expect(result.matchType).toBe('exact')
    })

    it('detects property from filename context', () => {
        const result = detectPropertyFromContext(
            'prime_al_hamra_daily_report.xlsx',
            [['business_date', 'rooms_sold']],
            properties
        )
        expect(result.propertyId).toBe('p1')
        expect(result.confidence).toBeGreaterThanOrEqual(90)
    })

    it('detects property from header rows when filename is generic', () => {
        const result = detectPropertyFromContext(
            'daily_report.xlsx',
            [['Prime Al Corniche KPI Report'], ['business_date', 'rooms_sold']],
            properties
        )
        expect(result.propertyId).toBe('p2')
        expect(result.matchType).toBe('context')
    })
})

