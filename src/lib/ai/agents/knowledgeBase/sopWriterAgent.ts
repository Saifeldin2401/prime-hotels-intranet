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
      ? `\nSOURCE REFERENCE MATERIAL (base the document on this — do not contradict or ignore it):\n"""\n${input.sourceDocumentText.slice(0, 3000)}\n"""`
      : ''

    // Honour the exact options the author chose in the studio.
    const depth = input.depthLevel || 'forbes_5star'
    const depthDirective =
      depth === 'concise'
        ? 'Keep it concise: short sentences, scannable bullet lists, minimal preamble.'
        : depth === 'standard'
          ? 'Standard operational detail — clear and practical without exhaustive edge cases.'
          : depth === 'regulatory_compliance'
            ? 'Maximum rigour: cite specific Saudi MoT / Balady / Civil Defense clauses, exact tolerances, logging requirements.'
            : 'Comprehensive Forbes 5-star depth with verbatim scripts, timing benchmarks and edge cases.'
    const lang = input.languagePreference || 'bilingual'
    const langDirective =
      lang === 'en' ? 'Write "contentHtml" in English only; set "contentHtmlAr" to an empty string.'
      : lang === 'ar' ? 'Write "contentHtmlAr" in Arabic only; set "contentHtml" to an empty string.'
      : 'Provide BOTH "contentHtml" (English) and "contentHtmlAr" (full Arabic translation).'

    const sections: string[] = ['<h3>1. Purpose & Strategic Importance</h3>', '<h3>2. Scope & Responsible Roles</h3>']
    let n = 3
    sections.push(`<h3>${n++}. Mandatory Equipment & System Prerequisites (PMS/POS)</h3>`)
    sections.push(`<h3>${n++}. Step-by-Step Execution Sequence (numbered steps with time benchmarks)</h3>`)
    sections.push(`<h3>${n++}. Verbatim Professional Dialogue Scripts</h3>`)
    if (input.includeChecklist !== false) sections.push(`<h3>${n++}. Supervisory Quality Inspection Checklist</h3>`)
    if (input.includeLastFramework !== false) sections.push(`<h3>${n++}. Service Recovery & Escalation (LAST Framework)</h3>`)
    if (input.includeEmergencyProtocols !== false) sections.push(`<h3>${n++}. Emergency & Contingency Protocols</h3>`)
    if (input.includeCriticalControlPoints !== false) sections.push(`<h3>${n++}. Critical Control Points</h3>`)
    sections.push(`<h3>${n++}. Compliance & Regulatory Directives (Ministry of Tourism / Balady / Civil Defense)</h3>`)

    const prompt = `Draft a 5-star luxury hotel Standard Operating Procedure (SOP) for:
Title: "${input.title}"
Department: ${dept}
Target Audience: ${input.targetAudience || 'Frontline Staff & Supervisors'}
SOP Code: ${generatedSopCode}
Depth requested: ${depth} — ${depthDirective}
Language: ${langDirective}
${sourceContext}

Requirements (follow EXACTLY — do not add or drop sections the author did not request):
1. "contentHtml" must be structured HTML containing these sections in order:
   ${sections.join('\n   ')}
2. Apply the language rule above for "contentHtmlAr".
3. "checklistItems" must contain ${input.includeChecklist === false ? '0 items (author disabled the checklist — return an empty array)' : '4-6 key checkpoints supervisors inspect'}.

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
      maxTokens: 7000,
    })
  }
}

export const sopWriterAgent = new SopWriterAgent()
