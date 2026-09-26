import { describe, expect, it } from 'vitest'

import { levelFromPoints, pointsForLevel } from './levels'

describe('levels', () => {
  it('uses a gently rising curve', () => {
    expect([1, 2, 3, 4, 5, 6].map(pointsForLevel)).toEqual([0, 100, 250, 450, 700, 1000])
  })

  it('places points inside the right level', () => {
    expect(levelFromPoints(0)).toMatchObject({ level: 1, floor: 0, ceiling: 100, percent: 0, toNext: 100, titleKey: 'newcomer' })
    expect(levelFromPoints(99).level).toBe(1)
    expect(levelFromPoints(100)).toMatchObject({ level: 2, percent: 0, titleKey: 'explorer' })
    expect(levelFromPoints(170)).toMatchObject({ level: 2, percent: 47, toNext: 80 })
    expect(levelFromPoints(1000).level).toBe(6)
  })

  it('caps the title and tolerates bad input', () => {
    expect(levelFromPoints(1_000_000).titleKey).toBe('master')
    expect(levelFromPoints(-5).level).toBe(1)
    expect(levelFromPoints(Number.NaN).level).toBe(1)
  })
})
