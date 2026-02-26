import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { escapeSearchQuery, formatDate, formatDateTime, formatFileSize, formatRelativeTime } from './utils'

describe('utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatDate', () => {
    it('formats date objects and strings', () => {
      const fromDate = formatDate(new Date('2023-01-15T12:00:00.000Z'))
      const fromString = formatDate('2023-12-25T12:00:00.000Z')

      expect(fromDate).toContain('2023')
      expect(fromString).toContain('2023')
    })

    it('returns empty string for nullish input', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('formats date and time output', () => {
      const formatted = formatDateTime('2023-01-15T12:30:00.000Z')
      expect(formatted).toContain('2023')
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })

    it('returns empty string for nullish input', () => {
      expect(formatDateTime(null)).toBe('')
      expect(formatDateTime(undefined)).toBe('')
    })
  })

  describe('formatRelativeTime', () => {
    it('returns just now for sub-minute values', () => {
      const now = new Date('2026-02-26T12:00:00.000Z')
      vi.setSystemTime(now)
      expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000))).toBe('just now')
    })

    it('returns minute/hour/day buckets for recent values', () => {
      const now = new Date('2026-02-26T12:00:00.000Z')
      vi.setSystemTime(now)

      expect(formatRelativeTime(new Date(now.getTime() - 30 * 60 * 1000))).toBe('30 minutes ago')
      expect(formatRelativeTime(new Date(now.getTime() - 5 * 60 * 60 * 1000))).toBe('5 hours ago')
      expect(formatRelativeTime(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))).toBe('3 days ago')
    })

    it('falls back to formatDate for older values', () => {
      const now = new Date('2026-02-26T12:00:00.000Z')
      const older = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      vi.setSystemTime(now)

      expect(formatRelativeTime(older)).toBe(formatDate(older))
    })

    it('returns empty string for nullish input', () => {
      expect(formatRelativeTime(null)).toBe('')
      expect(formatRelativeTime(undefined)).toBe('')
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes, KB, and MB values', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(100)).toBe('100 B')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
    })
  })

  describe('escapeSearchQuery', () => {
    it('escapes %, _, and backslash', () => {
      expect(escapeSearchQuery('test%_\\')).toBe('test\\%\\_\\\\')
    })

    it('keeps plain text unchanged', () => {
      expect(escapeSearchQuery('hello')).toBe('hello')
    })
  })
})
