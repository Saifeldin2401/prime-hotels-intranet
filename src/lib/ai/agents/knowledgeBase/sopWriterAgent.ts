/**
 * Standard Operating Procedure (SOP) Writer Agent
 * 
 * Synthesizes publication-grade 5-star hotel operational SOPs formatted in semantic HTML
 * with mandatory operational purpose, scope, roles, procedural time limits, supervisory verification,
 * and LAST service recovery protocols.
 */

import { BaseAIAgent, type AgentExecutionOptions } from '../baseAgent'
import type { AgentExecutionResult, AgentRole } from '../types'
import type { GeneratedChecklistItem, KnowledgeArticleGenerationConfig } from './types'

export interface SopWriterOutput {
  sopCode: string
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

export class SopWriterAgent extends BaseAIAgent<KnowledgeArticleGenerationConfig, SopWriterOutput> {
  public readonly role: AgentRole = 'content_writer'
  public readonly name = 'Standard Operating Procedure (SOP) Writer Agent'
  public readonly nameAr = 'وكيل صياغة الإجراءات التشغيلية القياسية (SOP)'

  public readonly defaultSystemPrompt = `You are the Executive Vice President of Hotel Operational Standards & Quality Assurance for ALTUS Luxury Hotels.
You draft exhaustive, 5-star publication-ready Standard Operating Procedures (SOPs) for luxury hotel operations in the Kingdom of Saudi Arabia.
Always output valid JSON conforming to the requested schema.`

  public async process(
    input: KnowledgeArticleGenerationConfig,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<SopWriterOutput>> {
    const dept = input.department || 'Front Office & Guest Services'
    const deptPrefix = dept.slice(0, 3).toUpperCase()
    const generatedSopCode = `SOP-${deptPrefix}-${Math.floor(100 + Math.random() * 900)}`

    const sourceContext = input.sourceDocumentText
      ? `\nSOURCE REFERENCE MATERIAL:\n"""\n${input.sourceDocumentText.slice(0, 3000)}\n"""`
      : ''

    const prompt = `Draft a comprehensive 5-star luxury hotel Standard Operating Procedure (SOP) for:
Title: "${input.title}"
Department: ${dept}
Target Audience: ${input.targetAudience || 'Frontline Staff & Supervisors'}
SOP Code: ${generatedSopCode}
${sourceContext}

Requirements:
1. "contentHtml" must be structured HTML containing:
   - <h3>1. Purpose & Strategic Importance</h3>
   - <h3>2. Scope & Responsible Roles</h3>
   - <h3>3. Mandatory Equipment & System Prerequisites (PMS/POS)</h3>
   - <h3>4. Step-by-Step Execution Sequence (with numbered steps and time benchmarks)</h3>
   - <h3>5. Verbatim Professional Dialogue Scripts (English & Arabic greeting/phrasing)</h3>
   - <h3>6. Supervisory Quality Inspection Checklist</h3>
   - <h3>7. Service Recovery & Problem Escalation (LAST Framework)</h3>
   - <h3>8. Compliance & Regulatory Directives (Ministry of Tourism / Balady / Civil Defense)</h3>
2. "contentHtmlAr" must be the complete professional Arabic translation of the HTML SOP.
3. "checklistItems" must contain 4-6 key checkpoints supervisors inspect.

Output JSON ONLY:
{
  "sopCode": "${generatedSopCode}",
  "title": "${input.title}",
  "titleAr": "عنوان الإجراء بالعربية",
  "description": "Concise operational scope of this SOP",
  "descriptionAr": "النطاق التشغيلي للإجراء بالعربية",
  "summary": "TL;DR executive summary of the standard in 2-3 sentences",
  "summaryAr": "ملخص تنفيذي موجز للإجراء باللغة العربية",
  "contentHtml": "<div class=\\"space-y-4\\">...complete semantic HTML...</div>",
  "contentHtmlAr": "<div class=\\"space-y-4\\" dir=\\"rtl\\">...complete Arabic HTML...</div>",
  "estimatedReadTimeMinutes": 5,
  "suggestedTags": ["SOP", "${dept}", "5-Star Standard", "Quality"],
  "checklistItems": [
    {
      "id": "chk-1",
      "text": "Pre-service workstation and grooming inspection complete",
      "text_ar": "اكتمال فحص جاهزية محطة العمل والهندام الشخصي",
      "category": "Preparation",
      "required": true
    },
    {
      "id": "chk-2",
      "text": "Guest acknowledged within 30 seconds with eye contact and surname",
      "text_ar": "الترحيب بالنزيل خلال 30 ثانية مع التواصل البصري وذكر اللقب",
      "category": "Execution",
      "required": true
    },
    {
      "id": "chk-3",
      "text": "Transaction logged accurately in PMS with zero discrepancies",
      "text_ar": "توثيق المعاملة بدقة في نظام إدارة الفندق دون أي فروقات",
      "category": "Documentation",
      "required": true
    }
  ]
}`

    return this.executePrompt<SopWriterOutput>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
    })
  }
}

export const sopWriterAgent = new SopWriterAgent()
