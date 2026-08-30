/**
 * AI Surgical Revision & Auto-Remediation Agent
 * 
 * Ingests QA findings and executes surgical corrections on affected lessons or components
 * to elevate course quality to production-ready benchmarks.
 */

import type { CourseBlueprint, LessonBlueprint } from '@/types/aiCourseEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole, ComprehensiveQAReport, QAFindingItem } from './types'

export interface RevisionAgentInput {
  blueprint: CourseBlueprint
  qaReport: ComprehensiveQAReport
  targetLanguage?: string
}

export interface RevisionResult {
  revisedBlueprint: CourseBlueprint
  fixesAppliedCount: number
  remediatedFindingIds: string[]
  revisionLog: string[]
}

export class RevisionAgent extends BaseAIAgent<RevisionAgentInput, RevisionResult> {
  public readonly role: AgentRole = 'revision'
  public readonly name = 'Surgical Revision & Auto-Remediation Agent'
  public readonly nameAr = 'وكيل المراجعة والتصحيح التلقائي'

  public readonly defaultSystemPrompt = `You are the Master Editor and Curriculum Polisher for a five-star luxury hotel group.
Your role is to apply targeted, surgical improvements to training content based on quality auditor findings.`

  public async process(
    input: RevisionAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<RevisionResult>> {
    const { blueprint, qaReport } = input
    const actionableFindings = qaReport.findings.filter((f) => f.canAutoFix)

    if (actionableFindings.length === 0) {
      return {
        agentRole: this.role,
        success: true,
        data: {
          revisedBlueprint: blueprint,
          fixesAppliedCount: 0,
          remediatedFindingIds: [],
          revisionLog: ['No auto-fixable findings required intervention.'],
        },
        rawOutput: 'No fixes needed',
        modelUsed: 'none',
        providerUsed: 'gemini',
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: 10,
      }
    }

    const remediatedFindingIds: string[] = []
    const revisionLog: string[] = []
    const updatedBlueprint = JSON.parse(JSON.stringify(blueprint)) as CourseBlueprint

    // Apply surgical fixes to lessons
    for (const finding of actionableFindings.slice(0, 5)) {
      const mIdx = finding.moduleIndex ?? 0
      const lIdx = finding.lessonIndex ?? 0
      const targetLesson = updatedBlueprint.modules[mIdx]?.lessons[lIdx]

      if (targetLesson && targetLesson.renderedHtml) {
        const prompt = `You are revising a 5-star hotel lesson to fix this QA finding:
FINDING: ${finding.description}
REMEDIATION DIRECTIVE: ${finding.remediationSuggestion}

EXISTING LESSON HTML:
${targetLesson.renderedHtml.slice(0, 2500)}

Output the REVISED lesson HTML with the finding completely remediated.
Output clean HTML only, no markdown codeblocks.`

        try {
          const fixResult = await this.executePrompt<string>(prompt, {
            ...options,
            jsonMode: false,
            temperature: 0.3,
            maxTokens: 2500,
          })

          const cleanHtml = (fixResult.rawOutput || '')
            .replace(/^```html\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim()

          if (cleanHtml.length > 100) {
            targetLesson.renderedHtml = cleanHtml
            remediatedFindingIds.push(finding.id)
            revisionLog.push(`Remediated [${finding.dimension}]: ${finding.description.slice(0, 60)}...`)
          }
        } catch (err) {
          console.warn(`[RevisionAgent] Failed to remediate finding ${finding.id}:`, err)
        }
      }
    }

    return {
      agentRole: this.role,
      success: true,
      data: {
        revisedBlueprint: updatedBlueprint,
        fixesAppliedCount: remediatedFindingIds.length,
        remediatedFindingIds,
        revisionLog,
      },
      rawOutput: revisionLog.join('\n'),
      modelUsed: 'gemini-2.5-flash',
      providerUsed: 'gemini',
      costTier: 'free',
      estimatedCostUSD: 0,
      latencyMs: 800,
    }
  }
}

export const revisionAgent = new RevisionAgent()
