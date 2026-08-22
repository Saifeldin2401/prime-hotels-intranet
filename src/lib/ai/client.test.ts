import { describe, expect, it, vi } from 'vitest'
import { extractJsonFromText, AltusAIClient } from './client'
import {
  AIHotelChecklistSchema,
  AIQuizGenerationSchema,
  ModuleOutlineSchema,
} from './schemas'

describe('PRIME AI SDK & Client Architecture', () => {
  describe('extractJsonFromText', () => {
    it('extracts valid JSON from markdown code blocks', () => {
      const raw = '```json\n{"title": "Front Office SOP", "sections": []}\n```'
      const parsed = extractJsonFromText<{ title: string }>(raw)
      expect(parsed?.title).toBe('Front Office SOP')
    })

    it('extracts JSON arrays with trailing commas and unescaped newlines', () => {
      const raw = `[
        {"question_text": "What is the LAST protocol?", "correct_answer": "Listen, Apologize, Solve, Thank", "points": 10},
      ]`
      const parsed = extractJsonFromText<Array<{ points: number }>>(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed?.[0]?.points).toBe(10)
    })
  })

  describe('Zod Output Schemas', () => {
    it('validates a complete ModuleOutlineSchema', () => {
      const mockOutline = {
        title: 'VIP Arrival & Butler Services Masterclass',
        description: 'Comprehensive 5-star standard operational procedure for VIP arrivals.',
        sections: [
          {
            heading: 'Pre-Arrival Coordination',
            suggestedBlockType: 'text',
            summary: 'Review guest profile and preferences 24h prior.',
            rich_content: '<h3>Pre-Arrival</h3><p>Verify preferences.</p>',
          },
        ],
        suggestedQuizCheckpoints: ['VIP Verification', 'Room Readiness'],
      }

      const result = ModuleOutlineSchema.safeParse(mockOutline)
      expect(result.success).toBe(true)
    })

    it('validates AIQuizGenerationSchema', () => {
      const mockQuiz = [
        {
          question_text: 'What is the required response time for guest luggage delivery?',
          question_type: 'mcq',
          options: ['Within 5 mins', 'Within 10 mins', 'Within 20 mins', 'Within 30 mins'],
          correct_answer: 'Within 10 mins',
          points: 10,
          explanation: 'Standard delivery time for Forbes 5-star suites is 10 minutes.',
          difficulty_level: 'intermediate',
        },
      ]

      const result = AIQuizGenerationSchema.safeParse(mockQuiz)
      expect(result.success).toBe(true)
    })

    it('validates AIHotelChecklistSchema', () => {
      const mockChecklist = [
        {
          id: '1',
          text: 'Verify VIP profile in Opera PMS.',
          text_ar: 'التحقق من ملف النزيل في نظام PMS.',
          is_required: true,
          order: 0,
        },
      ]

      const result = AIHotelChecklistSchema.safeParse(mockChecklist)
      expect(result.success).toBe(true)
    })
  })

  describe('AltusAIClient', () => {
    it('initializes cleanly and exposes streaming and execution APIs', () => {
      const client = new AltusAIClient()
      expect(typeof client.streamPrompt).toBe('function')
      expect(typeof client.executePrompt).toBe('function')
      expect(typeof client.executeStructured).toBe('function')
    })
  })
})
