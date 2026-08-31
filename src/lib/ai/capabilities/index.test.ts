import { describe, expect, it } from 'vitest'
import {
  AI_CAPABILITIES,
  aiCapabilities,
  chunkDocument,
  recommendCourses,
  KnowledgeQAResultSchema,
  GapAnalysisResultSchema,
} from './index'

describe('AI capability layer', () => {
  it('exposes exactly the six named capabilities', () => {
    const ids = Object.keys(AI_CAPABILITIES).sort()
    expect(ids).toEqual(
      [
        'assessmentAuthoring',
        'courseGeneration',
        'gapAnalysis',
        'ingestion',
        'knowledgeQA',
        'recommendations',
      ].sort(),
    )
    for (const id of ids) {
      expect(typeof aiCapabilities[id as keyof typeof aiCapabilities]).toBe('function')
      expect(AI_CAPABILITIES[id as keyof typeof AI_CAPABILITIES].grounding.mode).toBeDefined()
      expect(AI_CAPABILITIES[id as keyof typeof AI_CAPABILITIES].grounding.rlsEnforcedBy).toBeTruthy()
    }
  })

  it('knowledgeQA is strict-rag grounded', () => {
    expect(AI_CAPABILITIES.knowledgeQA.grounding.mode).toBe('strict-rag')
    expect(AI_CAPABILITIES.knowledgeQA.grounding.retrievalSource).toBe('knowledge_chunks')
  })
})

describe('ingestion.chunkDocument', () => {
  it('returns [] for empty input', () => {
    expect(chunkDocument('')).toEqual([])
  })

  it('splits on headings and produces bounded, section-aware chunks', () => {
    const doc = [
      '# Check-in Procedure',
      'Greet the guest within ten seconds of arrival. Confirm the reservation.',
      '',
      '## VIP Handling',
      'Escort VIP guests to their room. Offer a welcome amenity.',
    ].join('\n')
    const chunks = chunkDocument(doc, { targetTokens: 40, overlapTokens: 4 })
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0].section).toBe('Check-in Procedure')
    expect(chunks.some((c) => c.section === 'VIP Handling')).toBe(true)
    for (const c of chunks) {
      expect(c.content.length).toBeGreaterThan(0)
      expect(c.tokenCount).toBeGreaterThan(0)
      expect(c.embedding).toBeNull()
    }
  })
})

describe('recommendations.recommendCourses', () => {
  it('ranks by weighted signal strength and returns validated output', () => {
    const result = recommendCourses({
      userId: 'user-1',
      signals: [
        { courseId: 'c-popular', kind: 'popularity', strength: 1 },
        { courseId: 'c-gap', kind: 'skill_gap', strength: 0.9, detail: 'failed "greet guest" 3x' },
        { courseId: 'c-gap', kind: 'role_match', strength: 1 },
      ],
    })
    expect(result.recommendations[0].courseId).toBe('c-gap')
    expect(result.recommendations[0].signals).toContain('skill_gap')
    expect(result.recommendations[0].rationale).toContain('struggled')
    expect(result.userId).toBe('user-1')
  })

  it('returns an empty list when there are no signals', () => {
    expect(recommendCourses({ userId: 'u', signals: [] }).recommendations).toEqual([])
  })
})

describe('capability output schemas', () => {
  it('accepts a well-formed knowledgeQA result', () => {
    const parsed = KnowledgeQAResultSchema.parse({
      answer: 'See [PASSAGE 1].',
      citations: [{ documentId: 'd1', title: 'SOP', passage: 'text', confidence: 0.8 }],
      groundedness: 0.9,
      outOfScope: false,
    })
    expect(parsed.citations).toHaveLength(1)
  })

  it('accepts a well-formed gapAnalysis result', () => {
    const parsed = GapAnalysisResultSchema.parse({
      quizId: 'q1',
      summary: 's',
      failingObjectives: [],
      misleadingQuestions: [],
      recommendedActions: [],
    })
    expect(parsed.quizId).toBe('q1')
  })
})
