import { describe, expect, it } from 'vitest'
import {
  type ArticleSource,
  buildGroundedContext,
  extractCitations,
  extractSearchKeywords,
} from './rag'

describe('Altus AI RAG & Knowledge Grounding Engine', () => {
  describe('extractSearchKeywords', () => {
    it('extracts meaningful keywords and strips stop words in English', () => {
      const query = 'What is our standard procedure for guest luggage delivery?'
      const keywords = extractSearchKeywords(query)
      expect(keywords).toContain('standard')
      expect(keywords).toContain('procedure')
      expect(keywords).toContain('guest')
      expect(keywords).toContain('luggage')
      expect(keywords).toContain('delivery')
      expect(keywords).not.toContain('what')
      expect(keywords).not.toContain('is')
    })

    it('extracts meaningful keywords and strips stop words in Arabic', () => {
      const query = 'ما هو المعيار التشغيلي لاستقبال كبار الشخصيات؟'
      const keywords = extractSearchKeywords(query)
      expect(keywords).toContain('المعيار')
      expect(keywords).toContain('التشغيلي')
      expect(keywords).toContain('لاستقبال')
      expect(keywords).toContain('كبار')
      expect(keywords).toContain('الشخصيات')
      expect(keywords).not.toContain('ما')
      expect(keywords).not.toContain('هو')
    })
  })

  describe('buildGroundedContext', () => {
    it('constructs formatted grounded context with source markers', () => {
      const mockSources: ArticleSource[] = [
        {
          id: 'sop-101',
          title: 'Front Office VIP Arrival Protocol',
          snippet: 'Escort VIP directly to presidential suite within 3 minutes.',
          url: '/knowledge/sop-101',
        },
      ]

      const context = buildGroundedContext('VIP arrival', mockSources)
      expect(context).toContain('GROUNDED HOTEL KNOWLEDGE BASE')
      expect(context).toContain('[SOURCE 1: "Front Office VIP Arrival Protocol" (ID: sop-101)]')
      expect(context).toContain('Escort VIP directly to presidential suite within 3 minutes.')
    })

    it('returns empty string if sources array is empty', () => {
      expect(buildGroundedContext('test', [])).toBe('')
    })
  })

  describe('extractCitations', () => {
    it('extracts citations referenced via [SOURCE 1] or title', () => {
      const mockSources: ArticleSource[] = [
        {
          id: 'sop-101',
          title: 'VIP Arrival Protocol',
          url: '/knowledge/sop-101',
        },
        {
          id: 'sop-202',
          title: 'Lost & Found Procedures',
          url: '/knowledge/sop-202',
        },
      ]

      const responseText = 'According to [SOURCE 1], the guest must be greeted by name upon arrival.'
      const citations = extractCitations(responseText, mockSources)

      expect(citations).toHaveLength(1)
      expect(citations[0].id).toBe('sop-101')
    })
  })
})
