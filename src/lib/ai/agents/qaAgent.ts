/**
 * Independent Pedagogical & Operational QA Critic Agent
 * 
 * Conducts deep chain-of-thought quality auditing across 7 pedagogical dimensions,
 * applying adaptive threshold matrices per course type and surfacing actionable gaps.
 */

import type { CourseBlueprint, CourseType } from '@/types/aiCourseEngine'
import { aiPlatformConfigService } from '@/services/aiPlatformConfigService'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import {
  DEFAULT_QA_THRESHOLDS,
  type AgentExecutionResult,
  type AgentRole,
  type ComprehensiveQAReport,
  type QAFindingItem,
  type QAScoreCategory,
} from './types'

export interface QAAgentInput {
  blueprint: CourseBlueprint
  courseType?: CourseType
  targetLanguage?: string
  fullContentSummary?: string
}

export class QACriticAgent extends BaseAIAgent<QAAgentInput, ComprehensiveQAReport> {
  public readonly role: AgentRole = 'qa_critic'
  public readonly name = 'Independent Pedagogical QA Critic Agent'
  public readonly nameAr = 'المدقق الأكاديمي والرقابي المستقل للجودة'

  public readonly defaultSystemPrompt = `You are the Chief Academic Auditor and Forbes Standards Inspector for ALTUS Hospitality Group.
You evaluate hotel training curricula with uncompromising rigor.
Assess accuracy, time realism, Bloom's progression, dialogue quality, and KSA cultural etiquette.
Always output structured JSON.`

  public async process(
    input: QAAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<ComprehensiveQAReport>> {
    const courseType = input.courseType || input.blueprint.courseType || 'professional'
    const baseThresholds = DEFAULT_QA_THRESHOLDS[courseType] || DEFAULT_QA_THRESHOLDS.professional
    // Admin "Spend & QA Caps" tab overrides the pass/acceptable bars. The stricter
    // of (admin bar, course-type bar) wins so compliance courses can't be loosened.
    const cfg = aiPlatformConfigService.getCached()
    const thresholds = {
      ...baseThresholds,
      minimumProductionReady: Math.max(baseThresholds.minimumProductionReady, cfg.qaMinProductionReady || 0),
      minimumAcceptable: Math.max(baseThresholds.minimumAcceptable, cfg.qaMinAcceptable || 0),
    }

    const modulesSummary = (input.blueprint.modules || [])
      .map(
        (m, idx) =>
          `Module ${idx + 1}: "${m.title}" (${(m.lessons || []).length} lessons)\n` +
          (m.lessons || []).map((l) => `  - ${l.title} [Template: ${l.templateType}]`).join('\n')
      )
      .join('\n\n')

    const prompt = `Perform a comprehensive quality audit of the following hotel training course:
Course Title: "${input.blueprint.title}"
Course Type: ${courseType}
Total Modules: ${input.blueprint.modules.length}
Target Audience: ${input.blueprint.targetAudience}

Curriculum Structure:
${modulesSummary}

Evaluate across all 7 dimensions and provide structured findings:
{
  "overallScore": 92,
  "dimensionScores": {
    "pedagogy": 90,
    "operationalAccuracy": 95,
    "bloomsAlignment": 88,
    "culturalFit": 95,
    "forbesStandards": 92,
    "completeness": 90,
    "compliance": 95
  },
  "findings": [
    {
      "id": "gap-1",
      "dimension": "pedagogy",
      "severity": "minor",
      "moduleIndex": 0,
      "lessonIndex": 0,
      "itemTitle": "Title of affected section",
      "description": "Clear explanation of the quality issue in English",
      "descriptionAr": "شرح واضح للملاحظة بالعربية",
      "remediationSuggestion": "Actionable fix for the Revision Agent in English",
      "remediationSuggestionAr": "توجيه التصحيح باللغة العربية",
      "canAutoFix": true
    }
  ]
}`

    const rawResult = await this.executePrompt<{
      overallScore: number
      dimensionScores: ComprehensiveQAReport['dimensionScores']
      findings: QAFindingItem[]
    }>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.2,
    })

    const score = Math.max(0, Math.min(100, rawResult.data.overallScore || 85))

    // Categorize using adaptive threshold matrix
    let scoreCategory: QAScoreCategory = 'acceptable'
    let recommendation: ComprehensiveQAReport['recommendation'] = 'accept'

    if (score >= thresholds.minimumProductionReady) {
      scoreCategory = 'production_ready'
      recommendation = 'accept'
    } else if (score >= thresholds.minimumAcceptable) {
      scoreCategory = 'acceptable'
      recommendation = 'minor_polish'
    } else if (score >= thresholds.minimumTargetedRevision) {
      scoreCategory = 'targeted_revision'
      recommendation = 'targeted_revision'
    } else {
      scoreCategory = 'major_revision'
      recommendation = 'full_rebuild'
    }

    const report: ComprehensiveQAReport = {
      overallScore: score,
      scoreCategory,
      dimensionScores: rawResult.data.dimensionScores || {
        pedagogy: score,
        operationalAccuracy: score,
        bloomsAlignment: score,
        culturalFit: score,
        forbesStandards: score,
        completeness: score,
        compliance: score,
      },
      findings: rawResult.data.findings || [],
      recommendation,
      evaluatedByModel: rawResult.modelUsed,
      evaluatedAt: new Date().toISOString(),
    }

    return {
      ...rawResult,
      data: report,
    }
  }
}

export const qaCriticAgent = new QACriticAgent()
