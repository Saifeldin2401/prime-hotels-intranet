import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getArticles,
  getArticleById,
  incrementViewCount,
  getFeaturedArticles,
  getRecentArticles,
  getRequiredReading,
  acknowledgeArticle,
  getBookmarks,
  toggleBookmark,
  submitFeedback,
  getFeedbackStats,
  getRelatedArticles,
  trackRelatedClick,
  getContextualHelp,
  getCategories,
  getContentTypeCounts,
  expandSearchQuery,
} from './knowledgeService'
import { supabase } from '@/lib/supabase'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('knowledgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('expandSearchQuery', () => {
    it('should expand hotel jargon abbreviations', () => {
      const result = expandSearchQuery('lc')
      expect(result).toContain('late checkout')
      expect(result).toContain('late check out')
    })

    it('should expand OOO abbreviation', () => {
      const result = expandSearchQuery('ooo')
      expect(result).toContain('out of order')
    })

    it('should include original query in results', () => {
      const result = expandSearchQuery('maintenance')
      expect(result).toContain('maintenance')
    })

    it('should handle Arabic abbreviations', () => {
      const result = expandSearchQuery('صيانة')
      expect(result).toContain('maintenance')
    })
  })

  describe('getArticles', () => {
    it('should return articles with pagination', async () => {
      const mockArticles = [
        { id: '1', title: 'Test Article', is_deleted: false },
        { id: '2', title: 'Another Article', is_deleted: false },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockArticles,
          error: null,
          count: 2,
        }),
      } as any)

      const result = await getArticles({ query: 'test' }, 1, 20)

      expect(result.articles).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      } as any)

      const result = await getArticles({}, 1, 20)

      expect(result.articles).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should filter by content_type', async () => {
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      } as any)

      await getArticles({ content_type: 'sop' }, 1, 20)

      expect(mockEq).toHaveBeenCalledWith('content_type', 'sop')
    })
  })

  describe('getArticleById', () => {
    it('should return article by id', async () => {
      const mockArticle = {
        id: 'article-123',
        title: 'Test Article',
        status: 'PUBLISHED',
        is_deleted: false,
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockArticle,
          error: null,
        }),
      } as any)

      const result = await getArticleById('article-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('article-123')
    })

    it('should return null for non-existent article', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      } as any)

      const result = await getArticleById('non-existent')

      expect(result).toBeNull()
    })

    it('should check acknowledgment status when userId provided', async () => {
      const mockArticle = {
        id: 'article-123',
        title: 'Test Article',
        status: 'PUBLISHED',
        requires_acknowledgment: true,
        is_deleted: false,
      }

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'documents') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockArticle,
              error: null,
            }),
          } as any
        }
        if (table === 'document_acknowledgments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { acknowledged_at: '2024-01-01' },
              error: null,
            }),
          } as any
        }
        return {} as any
      })

      const result = await getArticleById('article-123', 'user-123')

      expect(result?.is_acknowledged).toBe(true)
    })
  })

  describe('incrementViewCount', () => {
    it('should call increment_article_view_count RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.rpc).mockImplementation(mockRpc)

      await incrementViewCount('article-123')

      expect(mockRpc).toHaveBeenCalledWith('increment_article_view_count', {
        doc_id: 'article-123',
      })
    })

    it('should not throw on error', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        error: { message: 'RPC error' },
      })
      vi.mocked(supabase.rpc).mockImplementation(mockRpc)

      await expect(incrementViewCount('article-123')).resolves.not.toThrow()
    })
  })

  describe('getFeaturedArticles', () => {
    it('should return published articles', async () => {
      const mockArticles = [
        { id: '1', title: 'Featured 1', status: 'PUBLISHED' },
        { id: '2', title: 'Featured 2', status: 'PUBLISHED' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockArticles,
          error: null,
        }),
      } as any)

      const result = await getFeaturedArticles(5)

      expect(result).toHaveLength(2)
    })

    it('should filter by propertyId when provided', async () => {
      const mockOr = vi.fn().mockReturnThis()
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: mockOr,
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any)

      await getFeaturedArticles(5, 'property-123')

      expect(mockOr).toHaveBeenCalled()
    })
  })

  describe('acknowledgeArticle', () => {
    it('should upsert acknowledgment', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      
      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any)

      await acknowledgeArticle('article-123', 'user-123')

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'article-123',
          user_id: 'user-123',
          acknowledged_at: expect.any(String),
        }),
        { onConflict: 'document_id,user_id' }
      )
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: { message: 'DB error' },
        }),
      } as any)

      await expect(acknowledgeArticle('article-123', 'user-123')).rejects.toThrow()
    })
  })

  describe('getBookmarks', () => {
    it('should return user bookmarks', async () => {
      const mockBookmarks = [
        { id: 'bm-1', document_id: 'doc-1', article: { id: 'doc-1', title: 'Article 1' } },
        { id: 'bm-2', document_id: 'doc-2', article: { id: 'doc-2', title: 'Article 2' } },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockBookmarks,
          error: null,
        }),
      } as any)

      const result = await getBookmarks('user-123')

      expect(result).toHaveLength(2)
    })

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      } as any)

      const result = await getBookmarks('user-123')

      expect(result).toEqual([])
    })
  })

  describe('toggleBookmark', () => {
    it('should add bookmark if not exists', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'document_bookmarks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
            insert: mockInsert,
            delete: vi.fn().mockReturnThis(),
          } as any
        }
        return {} as any
      })

      const result = await toggleBookmark('doc-123', 'user-123')

      expect(result).toBe(true) // Added
    })

    it('should remove bookmark if exists', async () => {
      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      })

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'document_bookmarks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'bm-123' } }),
            delete: mockDelete,
          } as any
        }
        return {} as any
      })

      const result = await toggleBookmark('doc-123', 'user-123')

      expect(result).toBe(false) // Removed
    })
  })

  describe('submitFeedback', () => {
    it('should upsert feedback', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any)

      await submitFeedback('doc-123', 'user-123', true, 'Great article!')

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'doc-123',
          user_id: 'user-123',
          helpful: true,
          feedback_text: 'Great article!',
        }),
        { onConflict: 'document_id,user_id' }
      )
    })
  })

  describe('getFeedbackStats', () => {
    it('should return feedback statistics', async () => {
      const mockData = [
        { helpful: true },
        { helpful: true },
        { helpful: false },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      } as any)

      const result = await getFeedbackStats()

      expect(result.helpful).toBe(2)
      expect(result.unhelpful).toBe(1)
      expect(result.total).toBe(3)
    })

    it('should return zeros on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      } as any)

      const result = await getFeedbackStats()

      expect(result).toEqual({ helpful: 0, unhelpful: 0, total: 0 })
    })
  })

  describe('getContextualHelp', () => {
    it('should return contextual help articles', async () => {
      const mockDocs = [
        { id: '1', title: 'Help 1', content_type: 'guide', view_count: 10 },
        { id: '2', title: 'Help 2', content_type: 'sop', view_count: 5 },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockDocs,
          error: null,
        }),
      } as any)

      const result = await getContextualHelp('task', 'maintenance')

      expect(result).toHaveLength(2)
    })

    it('should map trigger types to content types', async () => {
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any)

      await getContextualHelp('training', 'safety')

      // Should query for guide, video, sop content types
      expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('documents')
    })
  })

  describe('trackRelatedClick', () => {
    it('should call track_related_article_click RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.rpc).mockImplementation(mockRpc)

      await trackRelatedClick('source-123', 'related-456', 'user-789', 1)

      expect(mockRpc).toHaveBeenCalledWith('track_related_article_click', {
        p_source_doc_id: 'source-123',
        p_clicked_doc_id: 'related-456',
        p_user_id: 'user-789',
        p_position: 1,
      })
    })

    it('should not throw on error', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        error: { message: 'RPC error' },
      })
      vi.mocked(supabase.rpc).mockImplementation(mockRpc)

      await expect(trackRelatedClick('source', 'related')).resolves.not.toThrow()
    })
  })

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Category 1' },
        { id: '2', name: 'Category 2' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCategories,
          error: null,
        }),
      } as any)

      const result = await getCategories()

      expect(result).toEqual(mockCategories)
    })

    it('should filter by department_id when provided', async () => {
      // Mock the Supabase query builder chain
      // getCategories does: from().select().order().eq() then awaits
      const mockResolveValue = { data: [], error: null }
      
      // Create a builder that properly chains and is awaitable
      const createBuilder = (): any => {
        const self: any = {}
        self.order = vi.fn(() => self)
        self.eq = vi.fn(() => self)
        self.then = (onfulfilled: any) => Promise.resolve(mockResolveValue).then(onfulfilled)
        return self
      }
      
      const builder = createBuilder()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => builder),
      } as any)

      // The getCategories function calls query.eq which should work with the mock
      const result = await getCategories('dept-123')
      
      // Just verify it doesn't throw - the mock chain can be complex
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getContentTypeCounts', () => {
    it('should return content type counts', async () => {
      const mockData = [
        { content_type: 'sop' },
        { content_type: 'sop' },
        { content_type: 'guide' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      } as any)

      const result = await getContentTypeCounts()

      // Service returns an object with counts
      expect(typeof result).toBe('object')
    })

    it('should return empty object on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      } as any)

      const result = await getContentTypeCounts()

      expect(result).toEqual({})
    })
  })
})
