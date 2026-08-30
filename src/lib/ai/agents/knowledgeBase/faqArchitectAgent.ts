/**
 * Knowledge Base FAQ Architect Agent
 * 
 * Synthesizes comprehensive bilingual FAQ question-and-answer databases
 * for employee onboarding, guest service queries, and operational troubleshooting.
 */

import { BaseAIAgent, type AgentExecutionOptions } from '../baseAgent'
import type { AgentExecutionResult, AgentRole } from '../types'
import type { GeneratedFAQItem, KnowledgeArticleGenerationConfig } from './types'
import { buildArticleDirectives } from './articleDirectives'

export interface FAQWriterOutput {
  code: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  summary: string
  summaryAr: string
  contentHtml: string
  contentHtmlAr: string
  faqItems: GeneratedFAQItem[]
  suggestedTags: string[]
}

export class FAQArchitectAgent extends BaseAIAgent<KnowledgeArticleGenerationConfig, FAQWriterOutput> {
  public readonly role: AgentRole = 'content_writer'
  public readonly name = 'Knowledge Base FAQ Architect Agent'
  public readonly nameAr = 'وكيل صياغة الأسئلة الشائعة وقواعد المعرفة'

  public readonly defaultSystemPrompt = `You are the Lead Frontline Knowledge Specialist for ALTUS Luxury Hotels.
You formulate clear, concise, and helpful FAQ databases answering common employee and guest inquiries.`

  public async process(
    input: KnowledgeArticleGenerationConfig,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<FAQWriterOutput>> {
    const dept = input.department || 'All Departments'
    const code = `FAQ-${dept.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    const { depthDirective, langDirective, sourceContext, maxTokens } = buildArticleDirectives(input)

    const prompt = `Generate an FAQ database for:
Topic: "${input.title}"
Department: ${dept}
Target Audience: ${input.targetAudience || 'Hotel Staff'}
${depthDirective}
${langDirective}
${sourceContext}
Requirements:
1. "faqItems" must contain 6-10 realistic operational questions with detailed, helpful 5-star answers.
2. "contentHtml" should render an accordion-style overview of the questions with quick answers.

Output JSON ONLY:
{
  "code": "${code}",
  "title": "${input.title}",
  "titleAr": "عنوان الأسئلة الشائعة بالعربية",
  "description": "Scope of this FAQ guide",
  "descriptionAr": "نطاق دليل الأسئلة الشائعة",
  "summary": "Quick summary of topics covered in this FAQ",
  "summaryAr": "ملخص سريع للموضوعات المشمولة",
  "contentHtml": "<div class=\\"space-y-4\\">...HTML guide...</div>",
  "contentHtmlAr": "<div class=\\"space-y-4\\" dir=\\"rtl\\">...Arabic HTML guide...</div>",
  "suggestedTags": ["FAQ", "${dept}", "Quick Answers", "Help"],
  "faqItems": [
    {
      "id": "faq-1",
      "question": "Clear realistic question in English?",
      "question_ar": "سؤال تشغيلي واضح باللغة العربية؟",
      "answer": "Comprehensive, actionable answer in English adhering to hotel standards.",
      "answer_ar": "إجابة شاملة وعملية باللغة العربية متوافقة مع معايير الفندق."
    }
  ]
}`

    return this.executePrompt<FAQWriterOutput>(prompt, {
      ...options,
      jsonMode: true,
      // Wrong-shape output (missing contentHtml/contentHtmlAr) cascades to the next model.
      schema: 'kb_article',
      temperature: 0.3,
      maxTokens,
    })
  }
}

export const faqArchitectAgent = new FAQArchitectAgent()
