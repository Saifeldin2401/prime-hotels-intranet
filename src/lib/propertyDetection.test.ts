import { detectPropertyByName, detectPropertyFromContext } from '@/lib/propertyDetection'
import { describe, expect, it } from 'vitest'

const properties = [
    { id: 'p1', name: 'REMAL Al Hamra Hotel', code: 'ALH' },
    { id: 'p2', name: 'REMAL Al Corniche', code: 'ALC' }
]

describe('propertyDetection', () => {
    it('matches exact property names', () => {
        const result = detectPropertyByName('REMAL Al Hamra Hotel', properties)
        expect(result.propertyId).toBe('p1')
        expect(result.matchType).toBe('exact')
    })

    it('detects property from filename context', () => {
        const result = detectPropertyFromContext(
            'remal_al_hamra_daily_report.xlsx',
            [['business_date', 'rooms_sold']],
            properties
        )
        expect(result.propertyId).toBe('p1')
        expect(result.confidence).toBeGreaterThanOrEqual(90)
    })

    it('detects property from header rows when filename is generic', () => {
        const result = detectPropertyFromContext(
            'daily_report.xlsx',
            [['REMAL Al Corniche KPI Report'], ['business_date', 'rooms_sold']],
            properties
        )
        expect(result.propertyId).toBe('p2')
        expect(result.matchType).toBe('context')
    })
})

