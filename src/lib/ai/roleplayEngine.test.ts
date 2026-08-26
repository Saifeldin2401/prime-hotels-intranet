import { describe, it, expect, vi } from 'vitest'
import { roleplayEngine, ROLEPLAY_SCENARIOS } from './roleplayEngine'

vi.mock('./providers/multiProviderRouter', () => ({
  multiProviderRouter: {
    execute: vi.fn().mockImplementation((prompt: string) => {
      if (prompt.includes('generate the Guest')) {
        return Promise.resolve({
          data: {
            guestReply: 'Thank you for handling this promptly.',
            nextTemperament: 'CALM',
          },
          rawText: '',
        })
      }
      return Promise.resolve({
        data: {
          empathyScore: 92,
          problemResolutionScore: 95,
          forbesStandardScore: 90,
          saudiKaramScore: 94,
          deescalationScore: 91,
          overallScore: 93,
          feedback: 'Outstanding active listening and instant empowerment.',
          feedbackAr: 'أداء استثنائي في الاستماع الفعال وحل المشكلة فوراً.',
          coachingTips: ['Maintain eye contact'],
          suggestedAlternativeResponse: 'Mr. Khalid, allow me to escort you.',
          suggestedAlternativeResponseAr: 'أهلاً بك أستاذ خالد.',
          guestNextTemperament: 'CALM',
          isResolved: true,
        },
        rawText: '',
      })
    }),
  },
}))

describe('RoleplayEngine', () => {
  it('should provide rich hospitality scenarios across hotel departments', () => {
    expect(ROLEPLAY_SCENARIOS.length).toBeGreaterThanOrEqual(4)
    const departments = ROLEPLAY_SCENARIOS.map((s) => s.department)
    expect(departments).toContain('FRONT_DESK')
    expect(departments).toContain('FOOD_AND_BEVERAGE')
    expect(departments).toContain('HOUSEKEEPING')
    expect(departments).toContain('CONCIERGE')
  })

  it('should generate guest response turn', async () => {
    const scenario = ROLEPLAY_SCENARIOS[0]
    const history = [
      { sender: 'guest' as const, text: scenario.initialGuestDialogue, timestamp: '12:00' },
      {
        sender: 'trainee' as const,
        text: 'Mr. Khalid, I completely understand and will escort you to the Executive Lounge right away.',
        timestamp: '12:01',
      },
    ]

    const nextTurn = await roleplayEngine.generateGuestTurn(scenario, history, 'en')
    expect(nextTurn.guestReply).toBeDefined()
    expect(nextTurn.nextTemperament).toBe('CALM')
  })

  it('should evaluate trainee response with 5-star rubric metrics', async () => {
    const scenario = ROLEPLAY_SCENARIOS[0]
    const evalResult = await roleplayEngine.evaluateTraineeTurn(
      scenario,
      [],
      'Good morning Mr. Khalid, allow me to escort you to our lounge while we prepare your suite immediately.',
      'en'
    )

    expect(evalResult.overallScore).toBeGreaterThanOrEqual(90)
    expect(evalResult.empathyScore).toBeGreaterThan(80)
    expect(evalResult.saudiKaramScore).toBeGreaterThan(80)
    expect(evalResult.isResolved).toBe(true)
  })
})
