/**
 * Shared prompt directives for the Knowledge Base architect agents (SOP, policy,
 * checklist, FAQ, quick-reference). Every agent injects these so the studio's
 * depth / language / source-material choices are actually honoured instead of
 * the model picking its own.
 */

import type { KnowledgeArticleGenerationConfig } from './types'

export interface ArticleDirectives {
  /** One line describing how deep/verbose the document should be. */
  depthDirective: string
  /** One line describing which language field(s) to fill. */
  langDirective: string
  /** Fenced block with the author's source material (empty string if none). */
  sourceContext: string
  /** Token budget scaled to the requested depth. */
  maxTokens: number
}

export function buildArticleDirectives(input: KnowledgeArticleGenerationConfig): ArticleDirectives {
  const depth = input.depthLevel || 'five_star_comprehensive'
  const depthDirective =
    depth === 'concise'
      ? 'DEPTH: concise — short sentences, scannable bullet lists, no preamble.'
      : depth === 'standard'
        ? 'DEPTH: standard — clear and practical, no exhaustive edge cases.'
        : depth === 'regulatory_compliance'
          ? 'DEPTH: regulatory — cite specific Saudi MoT / Balady / Civil Defense / Labor Law clauses, exact tolerances and logging requirements.'
          : 'DEPTH: five-star comprehensive — verbatim scripts, timing benchmarks, edge cases.'

  const lang = input.languagePreference || 'bilingual'
  const langDirective =
    lang === 'en'
      ? 'LANGUAGE: English only. Fill "contentHtml"; set every *_ar / *Ar field to an empty string "".'
      : lang === 'ar'
        ? 'LANGUAGE: Arabic only. Fill the *_ar / *Ar fields; set "contentHtml" and other English fields to an empty string "".'
        : 'LANGUAGE: bilingual — fill BOTH the English fields and their full Arabic (*_ar / *Ar) translations.'

  const src = (input.sourceDocumentText || '').trim()
  const sourceContext = src
    ? `\nSOURCE REFERENCE MATERIAL — base the document on this, do not contradict or ignore it:\n"""\n${src.slice(0, 3000)}\n"""\n`
    : ''

  const maxTokens = depth === 'concise' ? 3500 : depth === 'standard' ? 5000 : 7000

  return { depthDirective, langDirective, sourceContext, maxTokens }
}
