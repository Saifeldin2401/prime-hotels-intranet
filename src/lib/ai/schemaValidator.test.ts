import { describe, it, expect } from 'vitest'
import {
  validateBlueprint,
  validateQuestionArray,
  validateKbArticle,
  validateVisualDecision,
  validateBySchema,
  RECOGNIZED_QUESTION_TYPES,
  OPTION_REQUIRING_QUESTION_TYPES,
  type ValidationResult,
} from './schemaValidator'

const expectValid = (r: ValidationResult) => {
  expect(r.valid).toBe(true)
  expect(r.errors).toEqual([])
}

const expectInvalid = (r: ValidationResult, match?: RegExp) => {
  expect(r.valid).toBe(false)
  expect(r.errors.length).toBeGreaterThan(0)
  expect(r.errors.every((e) => typeof e === 'string' && e.length > 0)).toBe(true)
  if (match) expect(r.errors.some((e) => match.test(e))).toBe(true)
}

// ---------------------------------------------------------------------------
// validateBlueprint
// ---------------------------------------------------------------------------

describe('validateBlueprint', () => {
  const validBlueprint = {
    title: 'Front Desk Excellence',
    description: 'A course',
    modules: [
      {
        id: 'm1',
        title: 'Welcoming Guests',
        lessons: [
          { id: 'l1', title: 'The Arrival Ritual' },
          { id: 'l2', title: 'Handling VIPs' },
        ],
      },
    ],
  }

  it('passes a well-formed blueprint', () => {
    expectValid(validateBlueprint(validBlueprint))
  })

  it('rejects a non-object', () => {
    expectInvalid(validateBlueprint('nope' as unknown), /not an object/)
    expectInvalid(validateBlueprint(42 as unknown), /not an object/)
  })

  it('rejects null', () => {
    expectInvalid(validateBlueprint(null), /not an object/)
  })

  it('rejects an array (well-formed JSON, wrong shape)', () => {
    expectInvalid(validateBlueprint([]), /not an object/)
  })

  it('rejects a missing modules array', () => {
    expectInvalid(validateBlueprint({ title: 'x' }), /modules is not an array/)
  })

  it('rejects an empty modules array', () => {
    expectInvalid(validateBlueprint({ modules: [] }), /modules is empty/)
  })

  it('reports the index of a module with an empty title', () => {
    const bad = {
      modules: [
        { title: 'Good', lessons: [{ title: 'L' }] },
        { title: '   ', lessons: [{ title: 'L' }] },
      ],
    }
    expectInvalid(validateBlueprint(bad), /modules\[1\]\.title is missing or empty/)
  })

  it('reports when a module lessons field is not an array', () => {
    const bad = { modules: [{ title: 'M', lessons: 'oops' }] }
    expectInvalid(validateBlueprint(bad), /modules\[0\]\.lessons is not an array/)
  })

  it('reports an empty lessons array', () => {
    const bad = { modules: [{ title: 'M', lessons: [] }] }
    expectInvalid(validateBlueprint(bad), /modules\[0\]\.lessons is empty/)
  })

  it('reports a lesson with a missing title, with full path', () => {
    const bad = {
      modules: [{ title: 'M', lessons: [{ title: 'ok' }, { description: 'no title' }] }],
    }
    expectInvalid(validateBlueprint(bad), /modules\[0\]\.lessons\[1\]\.title is missing or empty/)
  })

  it('reports a non-object module entry', () => {
    const bad = { modules: [null] }
    expectInvalid(validateBlueprint(bad), /modules\[0\] is not an object/)
  })
})

// ---------------------------------------------------------------------------
// validateQuestionArray
// ---------------------------------------------------------------------------

describe('validateQuestionArray', () => {
  const validQuestions = [
    {
      question_text: 'Which greeting meets the 10/5 rule?',
      question_type: 'mcq',
      difficulty: 'medium',
      points: 10,
      options: [
        { text: 'Make eye contact at 10ft, greet at 5ft', is_correct: true },
        { text: 'Ignore the guest until spoken to', is_correct: false },
        { text: 'Wave from across the lobby only', is_correct: false },
      ],
    },
    {
      question_text: 'Order the check-in steps.',
      question_type: 'ordering',
      difficulty: 'easy',
      points: 5,
      correct_answer: 'a -> b -> c',
    },
  ]

  it('passes a well-formed question array', () => {
    expectValid(validateQuestionArray(validQuestions))
  })

  it('rejects a non-array', () => {
    expectInvalid(validateQuestionArray({} as unknown), /not an array/)
    expectInvalid(validateQuestionArray('[]' as unknown), /not an array/)
  })

  it('rejects null', () => {
    expectInvalid(validateQuestionArray(null), /not an array/)
  })

  it('rejects an empty array', () => {
    expectInvalid(validateQuestionArray([]), /empty/)
  })

  it('reports a question with empty question_text', () => {
    const bad = [{ question_text: '  ', question_type: 'true_false', options: [
      { text: 'True', is_correct: true }, { text: 'False', is_correct: false },
    ] }]
    expectInvalid(validateQuestionArray(bad), /questions\[0\]\.question_text is missing or empty/)
  })

  it('reports an unrecognized question_type', () => {
    const bad = [{ question_text: 'Q', question_type: 'multiple_guess' }]
    expectInvalid(validateQuestionArray(bad), /question_type "multiple_guess" is not a recognized/)
  })

  it('reports a missing question_type', () => {
    const bad = [{ question_text: 'Q' }]
    expectInvalid(validateQuestionArray(bad), /question_type is missing or empty/)
  })

  it('reports missing options for an mcq', () => {
    const bad = [{ question_text: 'Q', question_type: 'mcq' }]
    expectInvalid(validateQuestionArray(bad), /questions\[0\]\.options is not an array/)
  })

  it('reports too few options', () => {
    const bad = [{ question_text: 'Q', question_type: 'scenario', options: [{ text: 'only one', is_correct: true }] }]
    expectInvalid(validateQuestionArray(bad), /expected at least 2/)
  })

  it('reports options with no correct answer', () => {
    const bad = [{
      question_text: 'Q',
      question_type: 'mcq',
      options: [
        { text: 'a', is_correct: false },
        { text: 'b', is_correct: false },
      ],
    }]
    expectInvalid(validateQuestionArray(bad), /no entry marked is_correct: true/)
  })

  it('reports a non-object question entry', () => {
    expectInvalid(validateQuestionArray(['just a string']), /questions\[0\] is not an object/)
  })

  it('accepts every recognized non-option question type without options', () => {
    const freeText = RECOGNIZED_QUESTION_TYPES.filter(
      (t) => !OPTION_REQUIRING_QUESTION_TYPES.includes(t),
    ).map((t) => ({ question_text: `Q for ${t}`, question_type: t, correct_answer: 'x' }))
    expectValid(validateQuestionArray(freeText))
  })
})

// ---------------------------------------------------------------------------
// validateKbArticle
// ---------------------------------------------------------------------------

describe('validateKbArticle', () => {
  it('passes an English-only article', () => {
    expectValid(validateKbArticle({
      title: 'Lost & Found SOP',
      contentHtml: '<div>steps</div>',
      contentHtmlAr: '',
    }))
  })

  it('passes an Arabic-only article', () => {
    expectValid(validateKbArticle({
      title: 'Lost & Found SOP',
      contentHtml: '',
      contentHtmlAr: '<div dir="rtl">خطوات</div>',
    }))
  })

  it('passes the snake_case orchestrator alias shape', () => {
    expectValid(validateKbArticle({
      title: 'x',
      content_html: '<p>hi</p>',
      content_html_ar: '',
    }))
  })

  it('rejects a non-object', () => {
    expectInvalid(validateKbArticle('<html/>' as unknown), /not an object/)
  })

  it('rejects null', () => {
    expectInvalid(validateKbArticle(null), /not an object/)
  })

  it('rejects an array', () => {
    expectInvalid(validateKbArticle([]), /not an object/)
  })

  it('rejects a missing title', () => {
    expectInvalid(validateKbArticle({ contentHtml: '<p>x</p>' }), /title is missing or empty/)
  })

  it('rejects when both html fields are empty', () => {
    expectInvalid(
      validateKbArticle({ title: 'x', contentHtml: '', contentHtmlAr: '   ' }),
      /neither a non-empty contentHtml nor contentHtmlAr/,
    )
  })

  it('rejects when html fields are missing entirely', () => {
    expectInvalid(validateKbArticle({ title: 'x' }), /neither a non-empty contentHtml/)
  })
})

// ---------------------------------------------------------------------------
// validateVisualDecision
// ---------------------------------------------------------------------------

describe('validateVisualDecision', () => {
  it('passes a shouldGenerate:true decision with a prompt', () => {
    expectValid(validateVisualDecision({
      shouldGenerate: true,
      prompt: 'Isometric illustration of a hotel front desk',
      strategy: 'educational_illustration',
    }))
  })

  it('passes a shouldGenerate:false decision with no prompt', () => {
    expectValid(validateVisualDecision({ shouldGenerate: false, justification: 'text is enough' }))
  })

  it('passes the optimizedPrompt alias (VisualOpportunity)', () => {
    expectValid(validateVisualDecision({ shouldGenerate: true, optimizedPrompt: 'a diagram' }))
  })

  it('rejects a non-object', () => {
    expectInvalid(validateVisualDecision('yes' as unknown), /not an object/)
  })

  it('rejects null', () => {
    expectInvalid(validateVisualDecision(null), /not an object/)
  })

  it('rejects an array', () => {
    expectInvalid(validateVisualDecision([]), /not an object/)
  })

  it('rejects a missing shouldGenerate', () => {
    expectInvalid(validateVisualDecision({ prompt: 'x' }), /shouldGenerate is missing or not a boolean/)
  })

  it('rejects a non-boolean shouldGenerate', () => {
    expectInvalid(validateVisualDecision({ shouldGenerate: 'true', prompt: 'x' }), /not a boolean/)
  })

  it('rejects shouldGenerate:true with an empty prompt', () => {
    expectInvalid(
      validateVisualDecision({ shouldGenerate: true, prompt: '   ' }),
      /prompt is missing or empty while shouldGenerate is true/,
    )
  })

  it('rejects shouldGenerate:true with no prompt at all', () => {
    expectInvalid(validateVisualDecision({ shouldGenerate: true }), /prompt is missing or empty/)
  })
})

// ---------------------------------------------------------------------------
// validateBySchema dispatcher
// ---------------------------------------------------------------------------

describe('validateBySchema', () => {
  it('routes to blueprint', () => {
    expectValid(validateBySchema('blueprint', { modules: [{ title: 'M', lessons: [{ title: 'L' }] }] }))
    expectInvalid(validateBySchema('blueprint', {}), /modules/)
  })

  it('routes to questions', () => {
    expectInvalid(validateBySchema('questions', []), /empty/)
  })

  it('routes to kb_article', () => {
    expectInvalid(validateBySchema('kb_article', {}), /title/)
  })

  it('routes to visual_decision', () => {
    expectInvalid(validateBySchema('visual_decision', {}), /shouldGenerate/)
  })

  it('fails closed on an unknown schema name', () => {
    expectInvalid(
      validateBySchema('bogus' as unknown as 'blueprint', {}),
      /unknown schema "bogus"/,
    )
  })

  it('never throws on hostile input', () => {
    const hostile: unknown[] = [undefined, null, NaN, () => {}, Symbol('x'), 0, '', [], {}]
    for (const schema of ['blueprint', 'questions', 'kb_article', 'visual_decision'] as const) {
      for (const input of hostile) {
        expect(() => validateBySchema(schema, input)).not.toThrow()
      }
    }
  })
})
