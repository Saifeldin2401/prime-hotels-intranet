/**
 * Operational Checklist Architect Agent
 * 
 * Synthesizes structured operational inspection checklists for shift handovers,
 * opening/closing procedures, room turn-down checks, and hygiene audits.
 */

import { BaseAIAgent, type AgentExecutionOptions } from '../baseAgent'
import type { AgentExecutionResult, AgentRole } from '../types'
import type { GeneratedChecklistItem, KnowledgeArticleGenerationConfig } from './types'
import { buildArticleDirectives } from './articleDirectives'

export interface ChecklistWriterOutput {
  code: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  summary: string
  summaryAr: string
  contentHtml: string
  contentHtmlAr: string
  checklistItems: GeneratedChecklistItem[]
  suggestedTags: string[]
}

export class ChecklistArchitectAgent extends BaseAIAgent<KnowledgeArticleGenerationConfig, ChecklistWriterOutput> {
  public readonly role: AgentRole = 'activities'
  public readonly name = 'Operational Checklist Architect Agent'
  public readonly nameAr = 'وكيل صياغة قوائم التدقيق والفحص التشغيلي'

  public readonly defaultSystemPrompt = `You are the Lead Operational Quality Inspector for ALTUS Luxury Hotels.
You formulate rigorous, step-by-step checklists that frontline teams and supervisors execute during shifts.`

  public async process(
    input: KnowledgeArticleGenerationConfig,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<ChecklistWriterOutput>> {
    const dept = input.department || 'Operations'
    const code = `CHK-${dept.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    const { depthDirective, langDirective, sourceContext, maxTokens } = buildArticleDirectives(input)

    const prompt = `Create an operational inspection checklist for:
Title: "${input.title}"
Department: ${dept}
Target Role: ${input.targetAudience || 'Shift Supervisor & Duty Manager'}
${depthDirective}
${langDirective}
${sourceContext}
Requirements:
1. "checklistItems" must contain 8-12 comprehensive inspection items categorized into phases (Pre-Shift, Active Inspection, Closing/Verification).
2. "contentHtml" should render a formatted printable visual guide explaining the inspection criteria for each phase.

Output JSON ONLY:
{
  "code": "${code}",
  "title": "${input.title}",
  "titleAr": "عنوان قائمة التدقيق بالعربية",
  "description": "Operational scope of this checklist",
  "descriptionAr": "النطاق التشغيلي لقائمة التدقيق",
  "summary": "Quick summary of mandatory inspection items",
  "summaryAr": "ملخص سريع للنقاط الإلزامية",
  "contentHtml": "<div class=\\"space-y-4\\">...formatted visual checklist guide HTML...</div>",
  "contentHtmlAr": "<div class=\\"space-y-4\\" dir=\\"rtl\\">...Arabic HTML...</div>",
  "suggestedTags": ["Checklist", "${dept}", "Quality Inspection", "Shift Audit"],
  "checklistItems": [
    {
      "id": "chk-1",
      "text": "Check item in English",
      "text_ar": "بند الفحص بالعربية",
      "category": "Phase 1: Setup",
      "required": true
    }
  ]
}`

    return this.executePrompt<ChecklistWriterOutput>(prompt, {
      ...options,
      jsonMode: true,
      // Wrong-shape output (missing contentHtml/contentHtmlAr) cascades to the next model.
      schema: 'kb_article',
      temperature: 0.3,
      maxTokens,
    })
  }
}

export const checklistArchitectAgent = new ChecklistArchitectAgent()
