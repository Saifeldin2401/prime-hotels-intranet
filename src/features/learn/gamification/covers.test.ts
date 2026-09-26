import { describe, expect, it } from 'vitest'

import { coverFor, coverUrl } from './covers'

describe('course covers', () => {
  it('matches the topic in English and Arabic', () => {
    expect(coverFor({ id: 'a', title: 'Fire Safety Basics' })).toBe('hotel-security')
    expect(coverFor({ id: 'b', title: 'مساعدة النزلاء في حالات الاخلاء و الطوارئ' })).toBe('hotel-security')
    expect(coverFor({ id: 'c', title: 'VIP Guest Service Excellence' })).toBe('vip-butler')
    expect(coverFor({ id: 'd', title: 'الرد على الهاتف' })).toBe('reception-desk')
  })

  it('falls back to a safe, neutral cover per course and never niche operations', () => {
    const safeCovers = ['hospitality-welcome', 'accreditation-seal', 'mobile-learning', 'hafawah-hospitality']
    const one = coverFor({ id: '11111111-1111-1111-1111-111111111111', title: 'zzz' })
    expect(coverFor({ id: '11111111-1111-1111-1111-111111111111', title: 'zzz' })).toBe(one)
    expect(safeCovers).toContain(one)

    // Test a variety of generic/unknown topics to confirm they NEVER get cars or kitchen photos
    const genericTopics = ['Excel Fundamentals', 'Workplace Harmony', 'Employee Coaching', 'Annual Appraisal']
    for (let i = 0; i < genericTopics.length; i++) {
      const cover = coverFor({ id: `generic-id-${i}`, title: genericTopics[i] })
      expect(safeCovers).toContain(cover)
      expect(['valet-fleet', 'chef-mastery', 'luggage-trolley']).not.toContain(cover)
    }
  })

  it('rotates sibling courses in the same category across the category pool', () => {
    // Sibling courses in Food & Beverage
    const fnbCovers = new Set<string>()
    for (let i = 0; i < 10; i++) {
      const cover = coverFor({
        id: `fnb-course-uuid-${i}`,
        title: `Restaurant Operations Standard ${i}`,
        category: 'culinary',
      })
      fnbCovers.add(cover)
      // All must be valid culinary pool images
      expect(['culinary-fnb', 'chef-mastery', 'afternoon-tea']).toContain(cover)
    }
    // More than 1 distinct cover must be used across the 10 courses
    expect(fnbCovers.size).toBeGreaterThan(1)
  })

  it('respects explicit cover_image_url override when provided', () => {
    const customUrl = 'https://cdn.primehotels.com/covers/custom-presidential-suite.webp'
    expect(coverUrl({ id: 'custom-1', title: 'Any Title', cover_image_url: customUrl })).toBe(customUrl)
  })

  it('formats standard WebP URL for mapped covers', () => {
    expect(coverUrl({ id: 'x', title: 'Fire drill' })).toBe('/assets/altus/covers/hotel-security.webp')
  })
})
