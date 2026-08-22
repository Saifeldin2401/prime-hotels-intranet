/**
 * Training Builder Rules Engine
 *
 * Generic dependency and conditional configuration engine for the Training Builder.
 * Analyzes module structure in real-time, determines active content types,
 * and dynamically calculates field visibility, mandatory requirements, and scope provenance.
 */

import type { ContentBlockForm, TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface BuilderContentAnalysis {
  totalSections: number
  totalItems: number
  quizCount: number
  videoCount: number
  audioCount: number
  interactiveCount: number
  documentCount: number
  sopCount: number
  practicalCount: number
  assignmentCount: number
  textLessonCount: number
  mandatoryItemCount: number
  optionalItemCount: number
  hasAssessments: boolean
  contentTypesPresent: Set<string>
}

export type ConfigScopeProvenance = 'training_default' | 'module_override' | 'section_override' | 'block_override'

export interface ScopeProvenanceInfo {
  field: string
  source: ConfigScopeProvenance
  sourceLabel: string
  isOverridden: boolean
}

export interface BuilderVisibilityRules {
  // Section visibility flags
  showQuizRules: boolean
  showMediaRules: boolean
  showPracticalRules: boolean
  showAssignmentRules: boolean
  showCertificateRules: boolean
  showDurationOverride: boolean

  // Individual field flags
  showPassingScore: boolean
  showMaxAttempts: boolean
  showAllowRetake: boolean
  showAutoAdvance: boolean
  showFeedback: boolean
  showRandomizeQuestions: boolean
  showShowAnswers: boolean
  showTimeLimit: boolean
  showVideoWatchThreshold: boolean

  // Required field checks
  requiredFields: string[]

  // Inactivity reasons for hidden/disabled sections
  reasons: Record<string, string>
}

// ---------------------------------------------------------------------------
// Content Analysis
// ---------------------------------------------------------------------------

/**
 * Analyzes the given training sections and computes comprehensive content metrics.
 */
export function analyzeBuilderContent(sections: TrainingSection[]): BuilderContentAnalysis {
  let totalItems = 0
  let quizCount = 0
  let videoCount = 0
  let audioCount = 0
  let interactiveCount = 0
  let documentCount = 0
  let sopCount = 0
  let practicalCount = 0
  let assignmentCount = 0
  let textLessonCount = 0
  let mandatoryItemCount = 0
  let optionalItemCount = 0
  const contentTypesPresent = new Set<string>()

  for (const section of sections || []) {
    for (const item of section.items || []) {
      totalItems++
      contentTypesPresent.add(item.type)

      if (item.is_mandatory !== false) {
        mandatoryItemCount++
      } else {
        optionalItemCount++
      }

      switch (item.type) {
        case 'quiz':
          quizCount++
          break
        case 'video':
          videoCount++
          break
        case 'audio':
          audioCount++
          break
        case 'interactive':
          interactiveCount++
          break
        case 'document_link':
          documentCount++
          break
        case 'sop_reference':
          sopCount++
          break
        case 'text':
          textLessonCount++
          break
        default:
          if ((item as any).type === 'practical' || (item as any).type === 'exercise') {
            practicalCount++
          } else if ((item as any).type === 'assignment') {
            assignmentCount++
          }
          break
      }

      // Check content_data for custom flags
      const cd = item.content_data as Record<string, unknown> | undefined
      if (cd?.is_practical || cd?.practical_eval) {
        practicalCount++
      }
      if (cd?.is_assignment || cd?.requires_submission) {
        assignmentCount++
      }
    }
  }

  return {
    totalSections: (sections || []).length,
    totalItems,
    quizCount,
    videoCount,
    audioCount,
    interactiveCount,
    documentCount,
    sopCount,
    practicalCount,
    assignmentCount,
    textLessonCount,
    mandatoryItemCount,
    optionalItemCount,
    hasAssessments: quizCount > 0,
    contentTypesPresent,
  }
}

// ---------------------------------------------------------------------------
// Visibility & Conditional Rules
// ---------------------------------------------------------------------------

/**
 * Evaluates which configuration controls should be visible, enabled, or required
 * based on the actual content present in the training.
 */
export function evaluateBuilderVisibility(
  analysis: BuilderContentAnalysis,
  overrides?: {
    certificateEnabled?: boolean
    allowRetake?: boolean
  }
): BuilderVisibilityRules {
  const hasQuizzes = analysis.quizCount > 0
  const hasMedia = analysis.videoCount > 0 || analysis.audioCount > 0 || analysis.interactiveCount > 0
  const hasVideos = analysis.videoCount > 0
  const hasPractical = analysis.practicalCount > 0
  const hasAssignments = analysis.assignmentCount > 0
  const certEnabled = overrides?.certificateEnabled ?? true
  const retakeAllowed = overrides?.allowRetake ?? true

  const reasons: Record<string, string> = {}

  if (!hasQuizzes) {
    reasons.quizRules = 'No quizzes or assessments exist in this module. Quiz configuration is inactive.'
    reasons.passingScore = 'Passing score applies only when quizzes are included in the course.'
    reasons.maxAttempts = 'Attempt limits apply only to modules with quizzes.'
  }

  if (!hasVideos) {
    reasons.videoWatchThreshold = 'No video blocks exist in this course.'
  }

  if (!hasPractical) {
    reasons.practicalRules = 'No practical or hands-on tasks exist in this module.'
  }

  if (!hasAssignments) {
    reasons.assignmentRules = 'No file submission assignments exist in this module.'
  }

  const requiredFields: string[] = ['title', 'category']
  if (hasQuizzes) {
    requiredFields.push('passingScore')
  }

  return {
    // Section flags
    showQuizRules: hasQuizzes,
    showMediaRules: hasMedia,
    showPracticalRules: hasPractical,
    showAssignmentRules: hasAssignments,
    showCertificateRules: certEnabled || hasQuizzes,
    showDurationOverride: analysis.totalItems > 0,

    // Individual field flags
    showPassingScore: hasQuizzes,
    showMaxAttempts: hasQuizzes && retakeAllowed,
    showAllowRetake: hasQuizzes,
    showAutoAdvance: hasQuizzes || analysis.totalItems > 1,
    showFeedback: hasQuizzes,
    showRandomizeQuestions: hasQuizzes,
    showShowAnswers: hasQuizzes,
    showTimeLimit: hasQuizzes,
    showVideoWatchThreshold: hasVideos,

    requiredFields,
    reasons,
  }
}

// ---------------------------------------------------------------------------
// Provenance & Scope Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the origin of a configuration value (e.g. Training Default vs Module Override).
 */
export function resolveConfigProvenance(
  field: string,
  moduleValue: unknown,
  defaultValue: unknown,
  customBlockOverrideCount = 0
): ScopeProvenanceInfo {
  if (customBlockOverrideCount > 0) {
    return {
      field,
      source: 'block_override',
      sourceLabel: `${customBlockOverrideCount} block-level override${customBlockOverrideCount > 1 ? 's' : ''}`,
      isOverridden: true,
    }
  }

  if (moduleValue !== undefined && moduleValue !== null && String(moduleValue) !== String(defaultValue)) {
    return {
      field,
      source: 'module_override',
      sourceLabel: 'Module Override',
      isOverridden: true,
    }
  }

  return {
    field,
    source: 'training_default',
    sourceLabel: 'Global Default (80% / 5-Star Hotel Benchmark)',
    isOverridden: false,
  }
}
