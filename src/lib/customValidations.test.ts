import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { customValidations } from './validation'

describe('customValidations', () => {
  describe('futureDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-01-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true for a future date', () => {
      expect(customValidations.futureDate('2023-01-02T12:00:00Z')).toBe(true)
    })

    it('returns false for a past date', () => {
      expect(customValidations.futureDate('2022-12-31T12:00:00Z')).toBe(false)
    })

    it('returns false for the current date', () => {
      expect(customValidations.futureDate('2023-01-01T12:00:00Z')).toBe(false)
    })
  })

  describe('pastDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-01-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true for a past date', () => {
      expect(customValidations.pastDate('2022-12-31T12:00:00Z')).toBe(true)
    })

    it('returns false for a future date', () => {
      expect(customValidations.pastDate('2023-01-02T12:00:00Z')).toBe(false)
    })

    it('returns false for the current date', () => {
      expect(customValidations.pastDate('2023-01-01T12:00:00Z')).toBe(false)
    })
  })

  describe('adultAge', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-01-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true if the person is exactly 18 years old', () => {
      expect(customValidations.adultAge('2005-01-01')).toBe(true)
    })

    it('returns true if the person is older than 18', () => {
      expect(customValidations.adultAge('2000-01-01')).toBe(true)
    })

    it('returns false if the person is almost 18 (one day short)', () => {
      expect(customValidations.adultAge('2005-01-02')).toBe(false)
    })

    it('returns false if the person is younger than 18', () => {
      expect(customValidations.adultAge('2006-01-01')).toBe(false)
    })
  })

  describe('businessHours', () => {
    it('returns true for times within business hours', () => {
      expect(customValidations.businessHours('06:00')).toBe(true)
      expect(customValidations.businessHours('12:00')).toBe(true)
      expect(customValidations.businessHours('22:00')).toBe(true)
    })

    it('returns false for times outside business hours', () => {
      expect(customValidations.businessHours('05:59')).toBe(false)
      expect(customValidations.businessHours('22:01')).toBe(false)
      expect(customValidations.businessHours('23:00')).toBe(false)
    })
  })

  describe('strongPassword', () => {
    it('returns true for a strong password', () => {
      expect(customValidations.strongPassword('Password123!')).toBe(true)
    })

    it('returns false for weak passwords', () => {
      expect(customValidations.strongPassword('password')).toBe(false)
      expect(customValidations.strongPassword('PASS123!')).toBe(false)
      expect(customValidations.strongPassword('Pass123')).toBe(false)
      expect(customValidations.strongPassword('P1!')).toBe(false)
    })
  })

  describe('validEmployeeId', () => {
    it('returns true for valid employee IDs', () => {
      expect(customValidations.validEmployeeId('AB1234')).toBe(true)
      expect(customValidations.validEmployeeId('XY987654')).toBe(true)
    })

    it('returns false for invalid employee IDs', () => {
      expect(customValidations.validEmployeeId('ABC1234')).toBe(false)
      expect(customValidations.validEmployeeId('AB123')).toBe(false)
      expect(customValidations.validEmployeeId('1234AB')).toBe(false)
      expect(customValidations.validEmployeeId('ab1234')).toBe(false)
    })
  })
})
