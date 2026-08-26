/**
 * Interactive Activities & Operational Drills Agent
 * 
 * Generates interactive experiential activities, step-by-step physical drills,
 * supervisory spot-check checklists, and reflection prompts to embed into lessons.
 */

import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface ActivitiesAgentInput {
  lessonTitle: string
  moduleTitle: string
  lessonContentHtml: string
  activityType?: 'roleplay_drill' | 'inspection_checklist' | 'problem_solving_exercise' | 'speed_challenge'
  language?: 'en' | 'ar' | 'bilingual'
}

export interface OperationalActivity {
  id: string
  type: 'roleplay_drill' | 'inspection_checklist' | 'problem_solving_exercise' | 'speed_challenge'
  title: string
  titleAr: string
  estimatedMinutes: number
  instructions: string
  instructionsAr: string
  stepsOrItems: string[]
  stepsOrItemsAr: string[]
  successCriteria: string[]
  successCriteriaAr: string[]
  supervisorNotes?: string
  supervisorNotesAr?: string
}

export class ActivitiesAgent extends BaseAIAgent<ActivitiesAgentInput, OperationalActivity> {
  public readonly role: AgentRole = 'activities'
  public readonly name = 'Interactive Activities & Drills Agent'
  public readonly nameAr = 'وكيل الأنشطة التفاعلية والتدريبات الميدانية'

  public readonly defaultSystemPrompt = `You are the Lead Experiential Learning Designer for ALTUS 5-Star Hotel Academy.
Generate practical, hands-on hotel operational drills and activities in structured JSON.`

  public async process(
    input: ActivitiesAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<OperationalActivity>> {
    const isArabic =
      input.language === 'ar' || (input.language || '').toLowerCase().includes('arabic')

    const prompt = `Design an engaging frontline training activity for:
Lesson: "${input.lessonTitle}"
Module: "${input.moduleTitle}"
Activity Type: ${input.activityType || 'problem_solving_exercise'}
Language: ${isArabic ? 'Arabic' : 'English'}

Lesson Context:
${input.lessonContentHtml.replace(/<[^>]*>/g, ' ').slice(0, 1500)}

Respond with JSON adhering to this schema:
{
  "id": "act-${Date.now()}",
  "type": "${input.activityType || 'problem_solving_exercise'}",
  "title": "Clear Activity Title in English",
  "titleAr": "عنوان النشاط التدريبي بالعربية",
  "estimatedMinutes": 5,
  "instructions": "Step-by-step instructions for the trainee",
  "instructionsAr": "تعليمات واضحة للمتدرب لتنفيذ النشاط",
  "stepsOrItems": [
    "Step/Checkpoint 1",
    "Step/Checkpoint 2",
    "Step/Checkpoint 3"
  ],
  "stepsOrItemsAr": [
    "خطوة/نقطة تدريب 1",
    "خطوة/نقطة تدريب 2",
    "خطوة/نقطة تدريب 3"
  ],
  "successCriteria": [
    "Criterion 1 (e.g. Completed within 2 minutes)",
    "Criterion 2"
  ],
  "successCriteriaAr": [
    "معيار نجاح 1",
    "معيار نجاح 2"
  ],
  "supervisorNotes": "Guidance for shift supervisor during observation",
  "supervisorNotesAr": "توجيهات لمشرف الوردية أثناء تقييم المتدرب"
}`

    return this.executePrompt<OperationalActivity>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.4,
    })
  }
}

export const activitiesAgent = new ActivitiesAgent()
