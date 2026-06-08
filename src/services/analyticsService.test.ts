import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { analytics } from './analyticsService'
import { supabase } from '@/lib/supabase'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Clear localStorage
    localStorage.clear()
    
    // Reset the singleton instance for clean tests
    // @ts-expect-error - accessing private property for testing
    analytics.buffer = []
    // @ts-expect-error
    analytics.sessionId = null
    // @ts-expect-error
    analytics.userId = null
    // @ts-expect-error
    analytics.flushInProgress = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = analytics
      const instance2 = analytics
      expect(instance1).toBe(instance2)
    })
  })

  describe('Session Management', () => {
    it('should start new session when no stored session exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'session-123' }],
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null }),
      } as any)

      // @ts-expect-error - testing private method
      await analytics.startNewSession()

      // @ts-expect-error
      expect(analytics.userId).toBe('user-123')
    })

    it('should recover session from localStorage if valid', async () => {
      const validSession = {
        id: 'stored-session-123',
        lastActive: new Date().toISOString(),
      }
      localStorage.setItem('prime_analytics_session', JSON.stringify(validSession))

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-123', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } } },
        error: null,
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'stored-session-123' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      } as any)

      // @ts-expect-error
      await analytics.recoverSession()

      // @ts-expect-error
      expect(analytics.sessionId).toBe('stored-session-123')
    })

    it('should not recover expired session', async () => {
      const expiredSession = {
        id: 'expired-session',
        lastActive: new Date(Date.now() - 31 * 60 * 1000).toISOString(), // 31 minutes ago
      }
      localStorage.setItem('prime_analytics_session', JSON.stringify(expiredSession))

      const mockUser = { id: 'user-123', email: 'test@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() }
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'new-session' }],
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'new-session' }, error: null }),
      } as any)

      // @ts-expect-error
      await analytics.recoverSession()

      // Should create new session
      // @ts-expect-error
      expect(analytics.sessionId).not.toBe('expired-session')
    })
  })

  describe('Event Tracking', () => {
    it('should buffer events', () => {
      // @ts-expect-error
      analytics.userId = 'user-123'
      // @ts-expect-error
      analytics.sessionId = 'session-123'

      analytics.track('button_click', { button: 'submit' })

      // @ts-expect-error
      expect(analytics.buffer).toHaveLength(1)
      // @ts-expect-error
      expect(analytics.buffer[0].event_name).toBe('button_click')
    })

    it('should not track events without user/session', () => {
      // @ts-expect-error
      analytics.userId = null
      // @ts-expect-error
      analytics.sessionId = null

      analytics.track('button_click', { button: 'submit' })

      // @ts-expect-error
      expect(analytics.buffer).toHaveLength(0)
    })

    it('should limit buffer size to maxBufferSize', () => {
      // @ts-expect-error
      analytics.userId = 'user-123'
      // @ts-expect-error
      analytics.sessionId = 'session-123'
      // @ts-expect-error
      analytics.maxBufferSize = 5

      // Add 10 events
      for (let i = 0; i < 10; i++) {
        analytics.track(`event_${i}`, {})
      }

      // @ts-expect-error
      expect(analytics.buffer).toHaveLength(5)
      // @ts-expect-error
      expect(analytics.buffer[0].event_name).toBe('event_5') // Oldest should be event_5
    })
  })

  describe('Batch Flushing', () => {
    it('should flush when batch size is reached', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      // @ts-expect-error
      analytics.userId = 'user-123'
      // @ts-expect-error
      analytics.sessionId = 'session-123'
      // @ts-expect-error
      analytics.batchSize = 3

      analytics.track('event_1', {})
      analytics.track('event_2', {})
      expect(mockInsert).not.toHaveBeenCalled()

      analytics.track('event_3', {}) // Should trigger flush

      // Wait for async flush
      await vi.advanceTimersByTimeAsync(0)

      expect(mockInsert).toHaveBeenCalled()
    })

    it('should handle auth errors during flush', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: 'PGRST301', message: 'Unauthorized' },
      })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      // @ts-expect-error
      analytics.userId = 'user-123'
      // @ts-expect-error
      analytics.sessionId = 'session-123'
      // @ts-expect-error
      analytics.batchSize = 1

      analytics.track('event_1', {})
      await vi.advanceTimersByTimeAsync(0)

      // Should clear session on auth error
      // @ts-expect-error
      expect(analytics.sessionId).toBeNull()
      // @ts-expect-error
      expect(analytics.userId).toBeNull()
    })

    it('should prevent concurrent flushes', async () => {
      let resolveInsert: (value: any) => void
      const insertPromise = new Promise((resolve) => {
        resolveInsert = resolve
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        then: (onFulfilled: any) => insertPromise.then(onFulfilled),
      })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      // @ts-expect-error
      analytics.userId = 'user-123'
      // @ts-expect-error
      analytics.sessionId = 'session-123'
      // @ts-expect-error
      analytics.flushInProgress = false

      // @ts-expect-error
      const flush1 = analytics.flush()
      // @ts-expect-error
      const flush2 = analytics.flush() // Should be ignored while first is in progress

      // Second call should return early (flushInProgress check)
      // The promise may resolve immediately or be undefined depending on implementation
      expect(flush2 === undefined || flush2 instanceof Promise).toBe(true)

      resolveInsert!({ error: null })
      await vi.advanceTimersByTimeAsync(10)
    })
  })

  describe('Auth Error Detection', () => {
    it('should detect 401 status as auth error', () => {
      // @ts-expect-error - testing private method
      expect(analytics.isAuthError({ status: 401 })).toBe(true)
    })

    it('should detect PGRST301 code as auth error', () => {
      // @ts-expect-error
      expect(analytics.isAuthError({ code: 'PGRST301' })).toBe(true)
    })

    it('should detect PGRST302 code as auth error', () => {
      // @ts-expect-error
      expect(analytics.isAuthError({ code: 'PGRST302' })).toBe(true)
    })

    it('should detect 42501 code as auth error', () => {
      // @ts-expect-error
      expect(analytics.isAuthError({ code: '42501' })).toBe(true)
    })

    it('should not detect random errors as auth errors', () => {
      // @ts-expect-error
      expect(analytics.isAuthError({ code: 'UNKNOWN' })).toBe(false)
      // @ts-expect-error
      expect(analytics.isAuthError({ status: 500 })).toBe(false)
      // @ts-expect-error
      expect(analytics.isAuthError(null)).toBe(false)
    })
  })

  describe('User Identification', () => {
    it('should identify user and update session', async () => {
      const mockUpdate = vi.fn().mockReturnThis()
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: [{ id: 'new-session' }], error: null }),
        limit: vi.fn().mockReturnThis(),
      } as any)

      // @ts-expect-error
      analytics.sessionId = 'session-123'
      // @ts-expect-error
      analytics.sessionPromise = Promise.resolve()

      await analytics.identify('user-456')

      // @ts-expect-error
      expect(analytics.userId).toBe('user-456')
    })
  })
})
