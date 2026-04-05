import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { type Mock, vi } from 'vitest'

// Mock Supabase client for testing
export type MockSupabaseClient = {
  from: Mock
  auth: {
    getSession: Mock
    getUser: Mock
    signInWithPassword: Mock
    signOut: Mock
    onAuthStateChange: Mock
  }
  realtime: {
    channel: Mock
    removeChannel: Mock
  }
  rpc: Mock
  storage: {
    from: Mock
  }
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }

  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      csv: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    realtime: {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        download: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
        remove: vi.fn(),
        list: vi.fn(),
      }),
    },
  }
}

// Helper to mock successful query response
export const mockQueryResponse = <T>(data: T) => ({
  data,
  error: null,
  count: Array.isArray(data) ? data.length : 1,
  status: 200,
  statusText: 'OK',
})

// Helper to mock error response
export const mockQueryError = (message: string, code: string = 'ERROR') => ({
  data: null,
  error: { message, code, details: '', hint: '' },
  count: 0,
  status: 400,
  statusText: 'Bad Request',
})
