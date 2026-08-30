/**
 * Research & Industry Benchmarks Agent
 * 
 * Conducts automated operational discovery for hospitality topics, extracting:
 * 1. 5-Star International Hospitality Benchmarks (Forbes Travel Guide standards)
 * 2. Saudi Vision 2030 & Ministry of Tourism Regulatory Requirements
 * 3. Essential frontline competencies, common failure modes, and safety touchpoints
 */

import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface ResearchAgentInput {
  topic: string
  courseType?: string
  targetAudience?: string
  department?: string
  hotelBrand?: string
  language?: 'en' | 'ar' | 'bilingual'
  rawSourceMaterial?: string
}

export interface ResearchFindings {
  topic: string
  executiveSummary: string
  executiveSummaryAr: string
  keyOperationalStandards: string[]
  keyOperationalStandardsAr: string[]
  commonFailureModes: string[]
  commonFailureModesAr: string[]
  forbesBenchmarks: string[]
  saudiRegulatoryDirectives: string[]
  suggestedPrerequisites: string[]
  recommendedModules: Array<{
    title: string
    titleAr: string
    focus: string
  }>
}

export class ResearchAgent extends BaseAIAgent<ResearchAgentInput, ResearchFindings> {
  public readonly role: AgentRole = 'research'
  public readonly name = 'Research & Industry Intelligence Agent'
  public readonly nameAr = 'وكيل البحث واستخبارات المعايير الفندقية'

  public readonly defaultSystemPrompt = `You are the Principal Hospitality Intelligence & Research Specialist for ALTUS Luxury Hotels & Resorts (KSA).
Your mission is to perform thorough operational research on hotel training subjects, synthesizing:
1. 5-Star Forbes Travel Guide luxury service benchmarks and time standards.
2. Saudi Ministry of Tourism (MT), Balady Food Safety, and Saudi Labor Law mandates.
3. Frontline execution workflows, subtle guest nuances, and common service failure points.
Always respond in structured, valid JSON matching the requested schema.`

  public async process(
    input: ResearchAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<ResearchFindings>> {
    const isArabic = input.language === 'ar' || (input.language || '').toLowerCase().includes('arabic')
    const sourceContext = input.rawSourceMaterial
      ? `\n\nSOURCE REFERENCE MATERIAL — extract the operational standards, procedures and terminology that a course on this document must teach:\n"""\n${input.rawSourceMaterial.slice(0, 20000)}\n"""`
      : ''

    const prompt = `Conduct comprehensive operational research for the following hotel training course:
Topic: "${input.topic}"
Course Type: ${input.courseType || 'Professional Frontline Operations'}
Target Department: ${input.department || 'Hotel Operations'}
Target Audience: ${input.targetAudience || 'Frontline Staff & Supervisors'}
Primary Language: ${isArabic ? 'Arabic' : 'English'}
${sourceContext}

Generate a comprehensive JSON research report adhering strictly to this schema:
{
  "topic": "${input.topic}",
  "executiveSummary": "Detailed English overview of operational importance and standards",
  "executiveSummaryAr": "ملخص تنفيذي باللغة العربية يوضح أهمية المعيار التشغيلي",
  "keyOperationalStandards": [
    "Standard 1 (e.g. 30-second greeting benchmark)",
    "Standard 2",
    "Standard 3"
  ],
  "keyOperationalStandardsAr": [
    "معيار تشغيلي 1",
    "معيار تشغيلي 2",
    "معيار تشغيلي 3"
  ],
  "commonFailureModes": [
    "Critical mistake or oversight frontline staff often make 1",
    "Mistake 2"
  ],
  "commonFailureModesAr": [
    "خطأ تشغيلي شائع 1",
    "خطأ تشغيلي شائع 2"
  ],
  "forbesBenchmarks": [
    "Forbes 5-star metric 1",
    "Forbes 5-star metric 2"
  ],
  "saudiRegulatoryDirectives": [
    "KSA regulatory touchpoint (e.g. Bilingual front-desk service mandate, VAT transparency)",
    "KSA directive 2"
  ],
  "suggestedPrerequisites": [
    "Prerequisite 1",
    "Prerequisite 2"
  ],
  "recommendedModules": [
    {
      "title": "Module 1 Title in English",
      "titleAr": "عنوان الوحدة الأولى بالعربية",
      "focus": "Core operational scope"
    },
    {
      "title": "Module 2 Title in English",
      "titleAr": "عنوان الوحدة الثانية بالعربية",
      "focus": "Advanced application & service recovery"
    }
  ]
}`

    return this.executePrompt<ResearchFindings>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.3,
    })
  }
}

export const researchAgent = new ResearchAgent()
