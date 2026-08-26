/**
 * Curriculum Architecture & Blueprint Agent
 * 
 * Synthesizes the end-to-end pedagogical blueprint:
 * 1. Cognitive progression across modules (Bloom's Taxonomy)
 * 2. High-retention instructional strategies (Explain-Example-Practice, Case-Based, Simulation)
 * 3. Granular lesson blueprints with explicit learning outcomes, duration benchmarks, and template types.
 */

import type { CourseBlueprint, FullCourseGenerationConfig, ModuleBlueprint, LessonBlueprint } from '@/types/aiCourseEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'
import type { ResearchFindings } from './researchAgent'
import type { GroundedKnowledgeResult } from './knowledgeAgent'

export interface CurriculumAgentInput {
  config: FullCourseGenerationConfig
  research?: ResearchFindings
  groundedKnowledge?: GroundedKnowledgeResult
}

export class CurriculumAgent extends BaseAIAgent<CurriculumAgentInput, CourseBlueprint> {
  public readonly role: AgentRole = 'curriculum'
  public readonly name = 'Curriculum Architect Agent'
  public readonly nameAr = 'مهندس المناهج والهيكل التعليمي'

  public readonly defaultSystemPrompt = `You are the Executive Vice President of Learning Design & Hospitality Academies for ALTUS 5-Star Hotels.
Your role is to formulate pedagogical blueprints with strict adherence to:
1. Clear cognitive progression from foundational standards to complex service recovery.
2. Forbes 5-star operational precision and Saudi Karam luxury hospitality.
3. Realistic module-to-lesson granularity and verifiable terminal learning objectives.
Always output valid structured JSON conforming to the CourseBlueprint schema.`

  public async process(
    input: CurriculumAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<CourseBlueprint>> {
    const { config, research, groundedKnowledge } = input
    const isArabic =
      (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('ar') ||
      (config?.aiControls?.targetLanguage || 'en').toLowerCase().includes('arabic')

    const moduleTarget =
      config.granularity.moduleCount === 'auto'
        ? 4
        : typeof config.granularity.moduleCount === 'number'
        ? config.granularity.moduleCount
        : config.granularity.customModuleCount || 4

    const lessonsPerModule =
      config.granularity.lessonsPerModule === 'auto' ? 3 : config.granularity.lessonsPerModule

    const lessonDuration = config.granularity.lessonDuration || 15
    const estimatedTotalMinutes = moduleTarget * lessonsPerModule * lessonDuration

    let contextualEnrichment = ''
    if (research) {
      const standards = (research.keyOperationalStandards || []).join('\n- ')
      const forbes = (research.forbesBenchmarks || []).join(', ')
      const ksa = (research.saudiRegulatoryDirectives || []).join(', ')
      contextualEnrichment += `\nRESEARCH STANDARDS:\n- ${standards}\n- Forbes: ${forbes}\n- KSA: ${ksa}`
    }
    if (groundedKnowledge && groundedKnowledge.hasGroundedSources) {
      const sops = (groundedKnowledge.keyProceduresExtracted || []).join('\n- ')
      contextualEnrichment += `\nGROUNDED HOTEL SOPS:\n- ${sops}`
    }

    const prompt = isArabic
      ? `أنت كبير مهندسي المناهج الفندقية لمجموعة فنادق ألتوس (5 نجوم).
قم بإنشاء مخطط هيكلي تعليمي متكامل (Course Blueprint) بصيغة JSON دقيقة للدورة:
- النمط: ${config.courseType}
- الاستراتيجية التعليمية: ${config.instructionalStrategy}
- الجمهور المستهدف: ${config.targetAudience}
- مستوى الصعوبة: ${config.difficulty} (${config.difficultyProgression})
- الهيكل المستهدف: بالضبط ${moduleTarget} وحدات، وكل وحدة تحتوي على ${lessonsPerModule} دروس.
- مدة الدرس: ${lessonDuration} دقيقة.
${contextualEnrichment}

أخرج كود JSON فقط بدون علامات markdown خارجية:
{
  "title": "عنوان الدورة بالعربية",
  "title_ar": "عنوان الدورة بالعربية",
  "subtitle": "عنوان فرعي احترافي",
  "subtitle_ar": "عنوان فرعي احترافي",
  "description": "وصف تشغيلي شامل للدورة ومعاييرها",
  "description_ar": "وصف تشغيلي شامل للدورة ومعاييرها",
  "courseType": "${config.courseType}",
  "instructionalStrategy": "${config.instructionalStrategy}",
  "targetAudience": "${config.targetAudience}",
  "experienceLevel": "${config.experienceLevel}",
  "difficulty": "${config.difficulty}",
  "difficultyProgression": "${config.difficultyProgression}",
  "estimatedDurationMinutes": ${estimatedTotalMinutes},
  "terminalObjectives": [
    "الهدف النهائي 1",
    "الهدف النهائي 2",
    "الهدف النهائي 3"
  ],
  "enablingObjectives": [
    "الهدف التمكيني 1",
    "الهدف التمكيني 2",
    "الهدف التمكيني 3",
    "الهدف التمكيني 4"
  ],
  "prerequisites": ["المتطلبات الأساسية"],
  "modules": [
    {
      "id": "mod-1",
      "title": "الوحدة 1: عنوان الوحدة",
      "title_ar": "الوحدة 1: عنوان الوحدة",
      "description": "وصف الوحدة وأهدافها",
      "durationMinutes": ${lessonsPerModule * lessonDuration},
      "difficultyLevel": "${config.difficulty}",
      "lessons": [
        {
          "id": "les-1-1",
          "title": "الدرس 1.1: عنوان الدرس",
          "title_ar": "الدرس 1.1: عنوان الدرس",
          "description": "وصف الدرس",
          "templateType": "${config.defaultLessonTemplate}",
          "durationMinutes": ${lessonDuration},
          "learningOutcomes": ["مخرج تعليمي 1", "مخرج تعليمي 2"],
          "suggestedBlockTypes": ["text", "scenario", "checklist"]
        }
      ]
    }
  ],
  "summaryTakeaways": [
    "خلاصة رئيسية 1",
    "خلاصة رئيسية 2"
  ]
}`
      : `You are the Senior Curriculum Architect at Altus Luxury Hotels.
Generate a structured, publication-grade Course Blueprint JSON:
- Course Type: ${config.courseType}
- Strategy: ${config.instructionalStrategy}
- Audience: ${config.targetAudience}
- Difficulty: ${config.difficulty} (${config.difficultyProgression})
- Structure: Exactly ${moduleTarget} modules with ${lessonsPerModule} lessons each.
- Lesson Duration: ${lessonDuration} minutes each.
${contextualEnrichment}

Output JSON ONLY conforming to this schema:
{
  "title": "Professional Course Title in English",
  "title_ar": "Arabic translation of title",
  "subtitle": "Executive Subtitle",
  "subtitle_ar": "Arabic subtitle",
  "description": "Comprehensive operational course overview",
  "description_ar": "Arabic description",
  "courseType": "${config.courseType}",
  "instructionalStrategy": "${config.instructionalStrategy}",
  "targetAudience": "${config.targetAudience}",
  "experienceLevel": "${config.experienceLevel}",
  "difficulty": "${config.difficulty}",
  "difficultyProgression": "${config.difficultyProgression}",
  "estimatedDurationMinutes": ${estimatedTotalMinutes},
  "terminalObjectives": [
    "Terminal Objective 1",
    "Terminal Objective 2",
    "Terminal Objective 3"
  ],
  "enablingObjectives": [
    "Enabling Skill 1",
    "Enabling Skill 2",
    "Enabling Skill 3",
    "Enabling Skill 4"
  ],
  "prerequisites": ["General operational awareness"],
  "modules": [
    {
      "id": "mod-1",
      "title": "Module 1: Module Title",
      "title_ar": "Module 1 Arabic Title",
      "description": "Module operational scope",
      "durationMinutes": ${lessonsPerModule * lessonDuration},
      "difficultyLevel": "${config.difficulty}",
      "lessons": [
        {
          "id": "les-1-1",
          "title": "Lesson 1.1: Lesson Title",
          "title_ar": "Lesson 1.1 Arabic Title",
          "description": "Lesson scope",
          "templateType": "${config.defaultLessonTemplate}",
          "durationMinutes": ${lessonDuration},
          "learningOutcomes": ["Outcome 1", "Outcome 2"],
          "suggestedBlockTypes": ["text", "scenario", "checklist"]
        }
      ]
    }
  ],
  "summaryTakeaways": [
    "Key Takeaway 1",
    "Key Takeaway 2"
  ]
}`

    const result = await this.executePrompt<CourseBlueprint>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.4,
    })

    // Ensure robust structural safety and guarantee array fields on all modules/lessons
    const bp = result.data || {} as CourseBlueprint
    if (!Array.isArray(bp.modules) || bp.modules.length === 0) {
      bp.modules = []
    } else {
      bp.modules.forEach((mod, mIdx) => {
        mod.id = mod.id || `mod-${mIdx + 1}`
        mod.title = mod.title || `Module ${mIdx + 1}`
        mod.lessons = Array.isArray(mod.lessons) ? mod.lessons : []
        mod.lessons.forEach((les, lIdx) => {
          les.id = les.id || `les-${mIdx + 1}-${lIdx + 1}`
          les.title = les.title || `Lesson ${mIdx + 1}.${lIdx + 1}`
          les.templateType = les.templateType || config.defaultLessonTemplate || 'standard_sop'
          les.learningOutcomes = Array.isArray(les.learningOutcomes) && les.learningOutcomes.length > 0
            ? les.learningOutcomes
            : ['5-Star Operational Mastery', 'Standard Procedural Compliance']
          les.suggestedBlockTypes = Array.isArray(les.suggestedBlockTypes) && les.suggestedBlockTypes.length > 0
            ? les.suggestedBlockTypes
            : ['text', 'scenario', 'checklist']
        })
      })
    }

    return {
      ...result,
      data: bp,
    }
  }
}

export const curriculumAgent = new CurriculumAgent()
