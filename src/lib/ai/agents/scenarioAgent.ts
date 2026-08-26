/**
 * Guest Dilemma & Roleplay Scenario Specialist Agent
 * 
 * Generates high-stakes 5-star hotel scenarios, demanding VIP guest dilemmas,
 * allergen emergencies, and multi-turn service recovery simulations.
 */

import type { RoleplayScenario, HotelDepartmentRoleplay, GuestTemperament } from '@/lib/ai/roleplayEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface ScenarioAgentInput {
  department: HotelDepartmentRoleplay
  topic: string
  guestTemperament?: GuestTemperament
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  language?: 'en' | 'ar' | 'bilingual'
}

export class ScenarioAgent extends BaseAIAgent<ScenarioAgentInput, RoleplayScenario> {
  public readonly role: AgentRole = 'scenarios'
  public readonly name = 'Guest Dilemma & Roleplay Scenario Specialist Agent'
  public readonly nameAr = 'أخصائي سيناريوهات معضلات النزلاء والمحاكاة'

  public readonly defaultSystemPrompt = `You are the Forbes Hospitality Standards Director and Guest Experience Architect for ALTUS Luxury Hotels.
You craft emotionally authentic, nuanced guest dilemmas testing empathy, LAST recovery, and Saudi Karam etiquette.`

  public async process(
    input: ScenarioAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<RoleplayScenario>> {
    const isArabic =
      input.language === 'ar' || (input.language || '').toLowerCase().includes('arabic')

    const prompt = `Create a realistic 5-star hotel frontline roleplay scenario for:
Department: ${input.department}
Topic: "${input.topic}"
Guest Temperament: ${input.guestTemperament || 'FRUSTRATED'}
Difficulty: ${input.difficulty || 'intermediate'}
Language: ${isArabic ? 'Arabic' : 'English'}

Output JSON matching this exact structure:
{
  "id": "SCENARIO-${input.department.slice(0, 3)}-${Date.now()}",
  "department": "${input.department}",
  "title": "Scenario Title in English",
  "titleAr": "عنوان السيناريو بالعربية",
  "guestName": "Mr./Ms. Guest Name",
  "guestProfile": "Guest background, stay history, and urgency context",
  "guestProfileAr": "نبذة عن الضيف، تاريخ إقامته وسياق الموقف",
  "guestTemperament": "${input.guestTemperament || 'FRUSTRATED'}",
  "scenarioContext": "Operational background and root cause of the friction",
  "scenarioContextAr": "السياق التشغيلي والسبب الجذري للمشكلة",
  "initialGuestDialogue": "Exact opening statement from the guest in English",
  "initialGuestDialogueAr": "نص حديث الضيف الافتتاحي بالعربية",
  "learningObjectives": [
    "Learning outcome 1",
    "Learning outcome 2"
  ],
  "learningObjectivesAr": [
    "مخرج تعليمي 1",
    "مخرج تعليمي 2"
  ],
  "forbesStandardsTarget": [
    "Forbes benchmark 1 (e.g. Address guest by surname)",
    "Forbes benchmark 2 (e.g. Never blame other departments)"
  ]
}`

    return this.executePrompt<RoleplayScenario>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.5,
    })
  }
}

export const scenarioAgent = new ScenarioAgent()
