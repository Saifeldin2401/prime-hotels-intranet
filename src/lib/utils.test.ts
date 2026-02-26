import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { formatDate, formatDateTime, formatRelativeTime, formatFileSize, escapeSearchQuery } from './utils'

describe('utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDate', () => {
    it('formats a date object correctly', () => {
      const date = new Date('2023-01-01T12:00:00Z')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/January|Jan/)
      expect(formatted).toMatch(/1|01/)
      expect(formatted).toMatch(/2023/)
    })

    it('formats a date string correctly', () => {
      const dateStr = '2023-12-25T10:30:00Z'
      const formatted = formatDate(dateStr)
      expect(formatted).toMatch(/December|Dec/)
      expect(formatted).toMatch(/25/)
      expect(formatted).toMatch(/2023/)
    })

    it('returns empty string for null', () => {
      expect(formatDate(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('formats date time correctly', () => {
      const date = new Date('2023-01-01T12:00:00Z')
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/January|Jan/)
      expect(formatted).toMatch(/2023/)
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    it('returns empty string for null', () => {
      expect(formatDateTime(null)).toBe('')
    })
  })

  describe('formatRelativeTime', () => {
    it('returns "just now" for less than 60 seconds ago', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const past = new Date(now.getTime() - 30 * 1000) // 30 seconds ago
      expect(formatRelativeTime(past)).toBe('just now')
    })

    it('returns "X minutes ago" for less than 1 hour ago', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const past = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      expect(formatRelativeTime(past)).toBe('30 minutes ago')
    })

    it('returns "X hours ago" for less than 24 hours ago', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const past = new Date(now.getTime() - 5 * 60 * 60 * 1000) // 5 hours ago
      expect(formatRelativeTime(past)).toBe('5 hours ago')
    })

    it('returns "X days ago" for less than 7 days ago', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      expect(formatRelativeTime(past)).toBe('3 days ago')
    })

    it('returns formatted date for older dates', () => {
      const now = new Date('2023-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const formatted = formatRelativeTime(past)
      expect(formatted).toMatch(/December|Dec/)
      expect(formatted).toMatch(/2022/)
    })

    it('returns empty string for null', () => {
        expect(formatRelativeTime(null)).toBe('')
    })
  })

  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('formats bytes', () => {
      expect(formatFileSize(100)).toBe('100 B')
    })

    it('formats KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
    })

    it('formats MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
    })
  })

  describe('escapeSearchQuery', () => {
    it('escapes special characters', () => {
      // Input: test%_\ -> Expect: test\%\_\\
      // In TS string literals, backslash needs to be escaped.
      // Input string: 'test%_\\'
      // Expected string: 'test\\%\\_\\\\\\'
      // Wait, let's look at the function again.
      // replace(/\\/g, '\\\\') -> \ becomes \\
      // replace(/%/g, '\\%') -> % becomes \%
      // replace(/_/g, '\\_') -> _ becomes \_

      // So test%_\ -> test\%_\\ (if \ is last)
      // Actually order matters? No, they are chained.
      // But replacing backslash first avoids double escaping.

      // 'test%_\\' -> 'test%_\\\\' -> 'test\\%_\\\\' -> 'test\\%\\_\\\\'
      // So input 'test%_\\' becomes 'test\\%\\_\\\\'

      // In test code:
      expect(escapeSearchQuery('test%_\\')).toBe('test\\%\\_\\\\')
    })

    it('handles normal string', () => {
      expect(escapeSearchQuery('hello')).toBe('hello')
    })
  })
})
