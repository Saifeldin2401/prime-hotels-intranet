/**
 * Quick Reference & Pocket Guide Architect Agent
 * 
 * Synthesizes concise, high-impact emergency cheat sheets, troubleshooting flowcharts,
 * and frontline reference cards.
 */

import { BaseAIAgent, type AgentExecutionOptions } from '../baseAgent'
import type { AgentExecutionResult, AgentRole } from '../types'
import type { GeneratedChecklistItem, KnowledgeArticleGenerationConfig } from './types'

export interface QuickRefWriterOutput {
  code: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  summary: string
  summaryAr: string
  contentHtml: string
  contentHtmlAr: string
  estimatedReadTimeMinutes: number
  suggestedTags: string[]
  checklistItems: GeneratedChecklistItem[]
}

export class QuickRefArchitectAgent extends BaseAIAgent<KnowledgeArticleGenerationConfig, QuickRefWriterOutput> {
  public readonly role: AgentRole = 'content_writer'
  public readonly name = 'Quick Reference & Pocket Guide Architect Agent'
  public readonly nameAr = 'مهندس الأدلة المرجعية السريعة وبطاقات الطوارئ'

  public readonly defaultSystemPrompt = `You are the Lead Frontline Operations Quality Director for ALTUS Luxury Hospitality Group.
You synthesize ultra-clear, rapid-reference cheat sheets and emergency decision guides for hotel staff.`

  public async process(
    input: KnowledgeArticleGenerationConfig,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<QuickRefWriterOutput>> {
    const dept = input.department || 'Hotel Operations'
    const deptPrefix = dept.slice(0, 3).toUpperCase()
    const code = `REF-${deptPrefix}-${Math.floor(100 + Math.random() * 900)}`

    const prompt = `Draft an actionable 5-star Quick Reference Guide / Pocket Cheat Sheet for:
Title: "${input.title}"
Department: ${dept}
Target Audience: ${input.targetAudience || 'Frontline Staff & Shift Supervisors'}
Code: ${code}

Structure of "contentHtml":
- <h3>⚡ Fast-Action Summary (30-Second Rule)</h3>
- <h3>📋 Immediate Action Steps (Ordered Priority Sequence)</h3>
- <h3>🚨 Red-Flag Warnings & Do Not Do Rules</h3>
- <h3>📞 Emergency Contact & Department Escalation Matrix</h3>
- <h3>💡 Forbes 5-Star Pro-Tips for Service Distinction</h3>

Output JSON ONLY:
{
  "code": "${code}",
  "title": "${input.title}",
  "titleAr": "عنوان الدليل المرجعي السريع",
  "description": "Rapid reference cheat sheet and critical operational checklist",
  "descriptionAr": "دليل مرجعي سريع وقائمة تدقيق للإجراءات العاجلة",
  "summary": "Fast frontline actions and key safety/quality rules",
  "summaryAr": "ملخص الإجراءات الفورية وقواعد الجودة والسلامة",
  "contentHtml": "<div class=\\"space-y-4\\">...action-oriented HTML with highlight boxes and badges...</div>",
  "contentHtmlAr": "<div class=\\"space-y-4\\" dir=\\"rtl\\">...Arabic action HTML...</div>",
  "estimatedReadTimeMinutes": 3,
  "suggestedTags": ["Quick Reference", "${dept}", "Cheat Sheet", "Frontline Action"],
  "checklistItems": [
    {
      "id": "chk-1",
      "text": "Verify immediate area safety and alert shift supervisor",
      "text_ar": "التأكد الفوري من سلامة الموقع وإبلاغ مشرف الوردية",
      "category": "Immediate Response",
      "required": true
    },
    {
      "id": "chk-2",
      "text": "Execute primary standard protocol within 60 seconds",
      "text_ar": "تطبيق البروتوكول الأساسي خلال 60 ثانية",
      "category": "Execution",
      "required": true
    }
  ]
}`

    return this.executePrompt<QuickRefWriterOutput>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 3500,
    })
  }
}

export const quickRefArchitectAgent = new QuickRefArchitectAgent()
