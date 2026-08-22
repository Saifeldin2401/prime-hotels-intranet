import { describe, expect, it, vi, beforeEach } from 'vitest'
import { generateMissingField, buildAIImprovementPlan } from './trainingAICompletionEngine'
import { aiService } from '@/lib/gemini'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

vi.mock('@/lib/gemini', () => ({
  aiService: {
    generateText: vi.fn(),
  },
}))

describe('trainingAICompletionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates missing module description using AI response', async () => {
    vi.mocked(aiService.generateText).mockResolvedValueOnce(
      'Comprehensive operational training module covering standard procedures for VIP arrivals.'
    )

    const res = await generateMissingField('module_description', {
      courseTitle: 'Front Office VIP Arrival Protocol',
      department: 'Front Office',
      childLessonTitles: ['Luggage Handling', 'Registration & Key Issuance'],
      language: 'English',
    })

    expect(res.text).toContain('VIP arrivals')
    expect(res.confidence).toBe('HIGH')
  })

  it('generates missing section title using heuristic fallback when AI fails', async () => {
    vi.mocked(aiService.generateText).mockRejectedValueOnce(new Error('Network error'))

    const res = await generateMissingField('section_title', {
      courseTitle: 'Housekeeping Standards',
      department: 'Housekeeping',
      childLessonTitles: ['Linen Replacement', 'Bathroom Sanitization'],
      language: 'English',
    })

    expect(res.text).toBe('Linen Replacement Workflow & Guidelines')
    expect(res.confidence).toBe('MEDIUM')
  })

  it('generates missing section title in Arabic using heuristic fallback', async () => {
    vi.mocked(aiService.generateText).mockRejectedValueOnce(new Error('Network error'))

    const resAr = await generateMissingField('section_title', {
      courseTitle: 'معايير التدبير الفندقي',
      department: 'Housekeeping',
      childLessonTitles: ['تغيير المفارش', 'تعقيم الحمام'],
      language: 'Arabic',
    })

    expect(resAr.text).toBe('إجراءات تغيير المفارش')
    expect(resAr.confidence).toBe('MEDIUM')
  })

  it('builds an AI improvement plan for incomplete course structures without overwriting user content', async () => {
    vi.mocked(aiService.generateText).mockResolvedValue(
      'AI Generated Content'
    )

    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: '', // missing title
        description: '', // missing description
        items: [
          {
            id: 'blk-1',
            type: 'text',
            title: 'Guest Greeting & Welcome Script',
            content: '<p>Content</p>',
            content_url: '',
            is_mandatory: true,
            order: 0,
          }
        ]
      }
    ]

    const plan = await buildAIImprovementPlan({
      title: '', // missing title
      description: 'Custom user description that must be preserved', // user authored!
      category: 'Front Desk',
      sections,
      language: 'English',
    })

    expect(plan.totalSuggestions).toBeGreaterThan(0)
    // Protected user description must remain unchanged
    expect(plan.improvedDescription).toBe('Custom user description that must be preserved')
    // Missing title must be suggested
    expect(plan.improvedTitle).toBeDefined()
    expect(plan.improvedTitle!.length).toBeGreaterThan(0)
    // Section title must be populated in improvedSections
    expect(plan.improvedSections[0].title).toBeDefined()
    expect(plan.improvedSections[0].title.length).toBeGreaterThan(0)
  })
})
