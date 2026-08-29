/**
 * schemaValidator — lightweight, dependency-free structural validators for the
 * JSON that AI agents produce.
 *
 * These check SHAPE only (is it an object / array, are the load-bearing fields
 * present and non-empty, are enums recognized). Exact counts, business rules,
 * and semantic quality are enforced elsewhere (agents, orchestrator, QA critic).
 *
 * The router uses these to decide whether a model returned well-formed-but-
 * wrong-shape JSON and it should retry / fall through to the next model.
 *
 * Every validator is defensive: it never throws, and it returns specific,
 * human-readable error strings (e.g. "modules[2].lessons is not an array").
 */

export type ValidationResult = { valid: boolean; errors: string[] }

export type SchemaName = 'blueprint' | 'questions' | 'kb_article' | 'visual_decision'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ok = (): ValidationResult => ({ valid: true, errors: [] })
const fail = (errors: string[]): ValidationResult => ({ valid: false, errors })

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Describe the runtime type of a non-object value for error messages. */
function describe(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

/**
 * Recognized `question_type` values — kept in sync with the `QuestionType`
 * union in `src/types/questions.ts`. Duplicated here (not imported) so the
 * validator stays a zero-coupling leaf module.
 */
export const RECOGNIZED_QUESTION_TYPES: readonly string[] = [
  'mcq',
  'mcq_multi',
  'true_false',
  'yes_no',
  'fill_blank',
  'short_answer',
  'long_answer',
  'matching',
  'ordering',
  'ranking',
  'scenario',
  'case_based',
  'numeric',
  'code_technical',
  'categorization',
  'hotspot_image',
]

/**
 * Question types that must ship a selectable `options` array with >=2 entries
 * and at least one `is_correct: true`. (Free-text / numeric / ordering / etc.
 * carry their answer in `correct_answer` instead and are not checked here.)
 */
export const OPTION_REQUIRING_QUESTION_TYPES: readonly string[] = [
  'mcq',
  'mcq_multi',
  'true_false',
  'yes_no',
  'scenario',
  'case_based',
]

// ---------------------------------------------------------------------------
// Blueprint (CourseBlueprint / ModuleBlueprint / LessonBlueprint)
// ---------------------------------------------------------------------------

/**
 * Shape check for a generated course blueprint.
 * Checks: is object; has `modules` array with >=1 entry; each module has a
 * non-empty `title` and a `lessons` array; each lesson has a non-empty `title`.
 */
export function validateBlueprint(obj: unknown): ValidationResult {
  try {
    if (!isPlainObject(obj)) {
      return fail([`blueprint is not an object (got ${describe(obj)})`])
    }

    const errors: string[] = []
    const modules = (obj as Record<string, unknown>).modules

    if (!Array.isArray(modules)) {
      return fail([`blueprint.modules is not an array (got ${describe(modules)})`])
    }
    if (modules.length < 1) {
      return fail(['blueprint.modules is empty (expected at least 1 module)'])
    }

    modules.forEach((mod, i) => {
      if (!isPlainObject(mod)) {
        errors.push(`modules[${i}] is not an object (got ${describe(mod)})`)
        return
      }
      if (!isNonEmptyString(mod.title)) {
        errors.push(`modules[${i}].title is missing or empty`)
      }
      const lessons = mod.lessons
      if (!Array.isArray(lessons)) {
        errors.push(`modules[${i}].lessons is not an array (got ${describe(lessons)})`)
        return
      }
      if (lessons.length < 1) {
        errors.push(`modules[${i}].lessons is empty (expected at least 1 lesson)`)
        return
      }
      lessons.forEach((lesson, j) => {
        if (!isPlainObject(lesson)) {
          errors.push(`modules[${i}].lessons[${j}] is not an object (got ${describe(lesson)})`)
          return
        }
        if (!isNonEmptyString(lesson.title)) {
          errors.push(`modules[${i}].lessons[${j}].title is missing or empty`)
        }
      })
    })

    return errors.length ? fail(errors) : ok()
  } catch (e) {
    return fail([`validateBlueprint threw unexpectedly: ${(e as Error)?.message ?? String(e)}`])
  }
}

// ---------------------------------------------------------------------------
// Question array (GeneratedUnifiedQuestion[])
// ---------------------------------------------------------------------------

/**
 * Shape check for a generated question array.
 * Checks: is array; >=1 entry; each item has non-empty `question_text`, a
 * recognized `question_type`, and — for option-based types — an `options`
 * array with >=2 entries and at least one `is_correct: true`.
 */
export function validateQuestionArray(obj: unknown): ValidationResult {
  try {
    if (!Array.isArray(obj)) {
      return fail([`questions is not an array (got ${describe(obj)})`])
    }
    if (obj.length < 1) {
      return fail(['questions array is empty (expected at least 1 question)'])
    }

    const errors: string[] = []

    obj.forEach((q, i) => {
      if (!isPlainObject(q)) {
        errors.push(`questions[${i}] is not an object (got ${describe(q)})`)
        return
      }

      if (!isNonEmptyString(q.question_text)) {
        errors.push(`questions[${i}].question_text is missing or empty`)
      }

      const qType = q.question_type
      if (typeof qType !== 'string' || qType.trim().length === 0) {
        errors.push(`questions[${i}].question_type is missing or empty`)
      } else if (!RECOGNIZED_QUESTION_TYPES.includes(qType)) {
        errors.push(
          `questions[${i}].question_type "${qType}" is not a recognized question type`,
        )
      }

      if (typeof qType === 'string' && OPTION_REQUIRING_QUESTION_TYPES.includes(qType)) {
        const options = q.options
        if (!Array.isArray(options)) {
          errors.push(
            `questions[${i}].options is not an array (required for question_type "${qType}")`,
          )
          return
        }
        if (options.length < 2) {
          errors.push(
            `questions[${i}].options has ${options.length} entr${options.length === 1 ? 'y' : 'ies'} (expected at least 2)`,
          )
        }
        const allObjects = options.every(isPlainObject)
        if (!allObjects) {
          errors.push(`questions[${i}].options contains a non-object entry`)
        }
        const hasCorrect = options.some(
          (o) => isPlainObject(o) && o.is_correct === true,
        )
        if (!hasCorrect) {
          errors.push(`questions[${i}].options has no entry marked is_correct: true`)
        }
      }
    })

    return errors.length ? fail(errors) : ok()
  } catch (e) {
    return fail([`validateQuestionArray threw unexpectedly: ${(e as Error)?.message ?? String(e)}`])
  }
}

// ---------------------------------------------------------------------------
// KB article (SopWriterOutput / *ArchitectAgent outputs / GeneratedKnowledgeArticle)
// ---------------------------------------------------------------------------

/**
 * Shape check for a generated knowledge-base article.
 * Checks: is object; `title` non-empty; has a non-empty `contentHtml` OR
 * `contentHtmlAr` string (also accepts the snake_case `content_html` /
 * `content_html_ar` aliases the orchestrator normalizes from).
 */
export function validateKbArticle(obj: unknown): ValidationResult {
  try {
    if (!isPlainObject(obj)) {
      return fail([`kb_article is not an object (got ${describe(obj)})`])
    }

    const errors: string[] = []
    const rec = obj as Record<string, unknown>

    const title = isNonEmptyString(rec.title) ? rec.title : rec.titleAr ?? rec.title_ar
    if (!isNonEmptyString(title)) {
      errors.push('kb_article.title is missing or empty')
    }

    const htmlEn = rec.contentHtml ?? rec.content_html
    const htmlAr = rec.contentHtmlAr ?? rec.content_html_ar
    if (!isNonEmptyString(htmlEn) && !isNonEmptyString(htmlAr)) {
      errors.push('kb_article has neither a non-empty contentHtml nor contentHtmlAr string')
    }

    return errors.length ? fail(errors) : ok()
  } catch (e) {
    return fail([`validateKbArticle threw unexpectedly: ${(e as Error)?.message ?? String(e)}`])
  }
}

// ---------------------------------------------------------------------------
// Visual decision (VisualAssetDecision / VisualOpportunity)
// ---------------------------------------------------------------------------

/**
 * Shape check for a generated visual-asset decision.
 * Checks: is object; `shouldGenerate` boolean present; when `shouldGenerate`
 * is true, `prompt` must be a non-empty string (also accepts the
 * `optimizedPrompt` alias used by `VisualOpportunity`).
 */
export function validateVisualDecision(obj: unknown): ValidationResult {
  try {
    if (!isPlainObject(obj)) {
      return fail([`visual_decision is not an object (got ${describe(obj)})`])
    }

    const errors: string[] = []
    const rec = obj as Record<string, unknown>

    if (typeof rec.shouldGenerate !== 'boolean') {
      errors.push(
        `visual_decision.shouldGenerate is missing or not a boolean (got ${describe(rec.shouldGenerate)})`,
      )
    }

    if (rec.shouldGenerate === true) {
      const prompt = isNonEmptyString(rec.prompt) ? rec.prompt : rec.optimizedPrompt
      if (!isNonEmptyString(prompt)) {
        errors.push('visual_decision.prompt is missing or empty while shouldGenerate is true')
      }
    }

    return errors.length ? fail(errors) : ok()
  } catch (e) {
    return fail([`validateVisualDecision threw unexpectedly: ${(e as Error)?.message ?? String(e)}`])
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch to the validator for `schema`. Unknown schema names fail closed
 * with a descriptive error rather than throwing.
 */
export function validateBySchema(schema: SchemaName, obj: unknown): ValidationResult {
  switch (schema) {
    case 'blueprint':
      return validateBlueprint(obj)
    case 'questions':
      return validateQuestionArray(obj)
    case 'kb_article':
      return validateKbArticle(obj)
    case 'visual_decision':
      return validateVisualDecision(obj)
    default:
      return fail([`validateBySchema: unknown schema "${String(schema)}"`])
  }
}
