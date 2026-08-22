/**
 * Training Builder Validator & Pre-Publish Audit Engine
 *
 * Scans training modules for publication blockers (critical errors),
 * instructional quality warnings, and AI completion opportunities.
 * Synchronized with the runtime Progression Engine.
 */

import type { ContentBlockForm, TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'
import { analyzeBuilderContent } from './trainingBuilderRulesEngine'

// ---------------------------------------------------------------------------
// Audit Types
// ---------------------------------------------------------------------------

export type AuditSeverity = 'error' | 'warning' | 'opportunity'

export interface AuditIssue {
  id: string
  severity: AuditSeverity
  category: 'structure' | 'content' | 'quiz' | 'metadata' | 'compliance'
  title: string
  description: string
  sectionId?: string
  sectionTitle?: string
  blockId?: string
  blockTitle?: string
  canAutoFixWithAI: boolean
  suggestedAction?: string
}

export interface TrainingAuditResult {
  isPublishReady: boolean
  healthScore: number // 0 - 100
  errors: AuditIssue[]
  warnings: AuditIssue[]
  opportunities: AuditIssue[]
  summary: {
    totalIssues: number
    errorCount: number
    warningCount: number
    opportunityCount: number
    autoFixableCount: number
  }
}

export interface AuditInputContext {
  title: string
  description?: string
  category?: string
  difficultyLevel?: string
  audience?: string
  sections: TrainingSection[]
  passingScore?: string | number
  certificateEnabled?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHtmlContentEmpty(html?: string | null): boolean {
  if (!html) return true
  const stripped = html.replace(/<[^>]*>/g, '').trim()
  return stripped.length === 0
}

// ---------------------------------------------------------------------------
// Audit Function
// ---------------------------------------------------------------------------

export function auditTrainingModule(ctx: AuditInputContext): TrainingAuditResult {
  const issues: AuditIssue[] = []
  const { sections, title, description, category } = ctx

  // 1. Module-level checks
  if (!title || title.trim().length === 0 || title.trim().toLowerCase() === 'new training course') {
    issues.push({
      id: 'err-mod-title',
      severity: 'error',
      category: 'metadata',
      title: 'Missing or Generic Course Title',
      description: 'A clear, descriptive course title is required before publishing.',
      canAutoFixWithAI: true,
      suggestedAction: 'Generate a professional title from course content',
    })
  }

  if (!category || category.trim().length === 0) {
    issues.push({
      id: 'err-mod-cat',
      severity: 'error',
      category: 'metadata',
      title: 'Department / Category Not Set',
      description: 'Assign a primary department or operational category for accurate assignment tracking.',
      canAutoFixWithAI: false,
      suggestedAction: 'Select a department in Course Setup',
    })
  }

  if (!description || description.trim().length < 20) {
    issues.push({
      id: 'opp-mod-desc',
      severity: 'opportunity',
      category: 'metadata',
      title: 'Missing or Brief Course Overview',
      description: 'A comprehensive summary helps associates understand learning objectives.',
      canAutoFixWithAI: true,
      suggestedAction: 'Generate 5-star course summary with learning outcomes',
    })
  }

  // 2. Structural checks
  if (!sections || sections.length === 0) {
    issues.push({
      id: 'err-no-sections',
      severity: 'error',
      category: 'structure',
      title: 'No Sections Found',
      description: 'Training must contain at least one section with learning content.',
      canAutoFixWithAI: true,
      suggestedAction: 'Draft structured curriculum with AI',
    })
  }

  const analysis = analyzeBuilderContent(sections)

  if (analysis.totalItems === 0 && sections.length > 0) {
    issues.push({
      id: 'err-no-items',
      severity: 'error',
      category: 'structure',
      title: 'Sections Contain No Content',
      description: 'All sections are currently empty. Add lessons, SOP references, or activities.',
      canAutoFixWithAI: true,
      suggestedAction: 'Generate lesson content and operating workflows',
    })
  }

  // 3. Section and Block-level checks
  let consecutiveLessonsWithoutQuiz = 0

  sections.forEach((section, sIdx) => {
    const sTitle = section.title || `Section ${sIdx + 1}`

    if (!section.title || section.title.trim().length === 0 || section.title.toLowerCase().startsWith('untitled')) {
      issues.push({
        id: `opp-sec-title-${section.id}`,
        severity: 'opportunity',
        category: 'structure',
        title: `Untitled Section #${sIdx + 1}`,
        description: 'Section is missing a descriptive name.',
        sectionId: section.id,
        sectionTitle: sTitle,
        canAutoFixWithAI: true,
        suggestedAction: 'Infer title from section lessons',
      })
    }

    if (!section.description || section.description.trim().length === 0) {
      issues.push({
        id: `opp-sec-desc-${section.id}`,
        severity: 'opportunity',
        category: 'content',
        title: `Section "${sTitle}" Missing Overview`,
        description: 'Adding a brief section introduction improves learner comprehension.',
        sectionId: section.id,
        sectionTitle: sTitle,
        canAutoFixWithAI: true,
        suggestedAction: 'Generate section overview and key objectives',
      })
    }

    const items = section.items || []
    if (items.length === 1 && items[0].type !== 'quiz') {
      issues.push({
        id: `warn-single-item-${section.id}`,
        severity: 'warning',
        category: 'structure',
        title: `Section "${sTitle}" Has Only 1 Item`,
        description: 'Consider combining with adjacent sections or adding practical activities.',
        sectionId: section.id,
        sectionTitle: sTitle,
        canAutoFixWithAI: false,
      })
    }

    items.forEach((item, bIdx) => {
      const bTitle = item.title || `Lesson ${bIdx + 1}`

      // Check text lessons
      if (item.type === 'text') {
        consecutiveLessonsWithoutQuiz++
        if (isHtmlContentEmpty(item.content)) {
          issues.push({
            id: `err-empty-block-${item.id}`,
            severity: 'error',
            category: 'content',
            title: `Empty Lesson: "${bTitle}"`,
            description: `Lesson #${bIdx + 1} in "${sTitle}" has no written content.`,
            sectionId: section.id,
            sectionTitle: sTitle,
            blockId: item.id,
            blockTitle: bTitle,
            canAutoFixWithAI: true,
            suggestedAction: 'Expand with comprehensive 5-star standard operating procedure',
          })
        }
      }

      // Check video / media links
      if (['video', 'audio'].includes(item.type)) {
        if (!item.content_url || item.content_url.trim().length === 0) {
          issues.push({
            id: `err-missing-url-${item.id}`,
            severity: 'error',
            category: 'content',
            title: `Missing Media URL: "${bTitle}"`,
            description: 'Media block requires a valid video/audio stream URL or file upload.',
            sectionId: section.id,
            sectionTitle: sTitle,
            blockId: item.id,
            blockTitle: bTitle,
            canAutoFixWithAI: false,
          })
        }
      }

      // Check quiz blocks
      if (item.type === 'quiz') {
        consecutiveLessonsWithoutQuiz = 0
        const quizId = (item.content_data as any)?.quiz_id
        if (!quizId) {
          issues.push({
            id: `err-unlinked-quiz-${item.id}`,
            severity: 'error',
            category: 'quiz',
            title: `Unlinked Checkpoint Quiz: "${bTitle}"`,
            description: 'Quiz block is missing question items or an associated assessment ID.',
            sectionId: section.id,
            sectionTitle: sTitle,
            blockId: item.id,
            blockTitle: bTitle,
            canAutoFixWithAI: true,
            suggestedAction: 'Generate assessment questions from section material',
          })
        }
      }
    })
  })

  // 4. Pedagogical flow warning
  if (consecutiveLessonsWithoutQuiz >= 8) {
    issues.push({
      id: 'warn-many-lessons-no-quiz',
      severity: 'warning',
      category: 'quiz',
      title: 'Long Learning Sequence Without Checkpoint',
      description: `Course contains ${consecutiveLessonsWithoutQuiz} consecutive lessons without a knowledge check. Adding intermediate checkpoint quizzes boosts retention.`,
      canAutoFixWithAI: true,
      suggestedAction: 'Insert AI Checkpoint Quiz',
    })
  }

  // Calculate stats
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  const opportunities = issues.filter((i) => i.severity === 'opportunity')
  const autoFixableCount = issues.filter((i) => i.canAutoFixWithAI).length

  // Health score calculation (100 minus weighted penalties)
  const penalty = errors.length * 25 + warnings.length * 8 + opportunities.length * 3
  const healthScore = Math.max(0, Math.min(100, 100 - penalty))

  return {
    isPublishReady: errors.length === 0 && analysis.totalItems > 0,
    healthScore,
    errors,
    warnings,
    opportunities,
    summary: {
      totalIssues: issues.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      opportunityCount: opportunities.length,
      autoFixableCount,
    },
  }
}
