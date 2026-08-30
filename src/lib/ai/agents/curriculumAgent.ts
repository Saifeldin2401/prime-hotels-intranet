/**
 * Curriculum Architecture & Blueprint Agent
 * 
 * Synthesizes the end-to-end pedagogical blueprint:
 * 1. Cognitive progression across modules (Bloom's Taxonomy)
 * 2. High-retention instructional strategies (Explain-Example-Practice, Case-Based, Simulation)
 * 3. Granular lesson blueprints with explicit learning outcomes, duration benchmarks, and template types.
 */

import type { CourseBlueprint, FullCourseGenerationConfig, ModuleBlueprint, LessonBlueprint } from '@/types/aiCourseEngine'
import { extractJsonFromText } from '@/lib/ai/client'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'
import type { ResearchFindings } from './researchAgent'
import type { GroundedKnowledgeResult } from './knowledgeAgent'

export interface CurriculumAgentInput {
  config: FullCourseGenerationConfig
  research?: ResearchFindings
  groundedKnowledge?: GroundedKnowledgeResult
  /** Raw text of the user's uploaded / library source document, if any. The
   *  module + lesson structure should be derived from this when present. */
  sourceMaterial?: string
}

export class CurriculumAgent extends BaseAIAgent<CurriculumAgentInput, CourseBlueprint> {
  public readonly role: AgentRole = 'curriculum'
  public readonly name = 'Curriculum Architect Agent'
  public readonly nameAr = 'مهندس المناهج والهيكل التعليمي'

  public readonly defaultSystemPrompt = `You are the Executive Vice President of Learning Design & Hospitality Academies for a five-star hotel group.
Your role is to formulate pedagogical blueprints with strict adherence to:
1. Clear cognitive progression from foundational standards to complex service recovery.
2. Five-star operational precision and authentic Saudi Karam luxury hospitality.
3. Realistic module-to-lesson granularity and verifiable terminal learning objectives.
Always output valid structured JSON conforming to the CourseBlueprint schema.`

  public async process(
    input: CurriculumAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<CourseBlueprint>> {
    const { config, research, groundedKnowledge, sourceMaterial } = input
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
    const lpm = typeof lessonsPerModule === 'number' ? lessonsPerModule : 3
    const estimatedTotalMinutes = moduleTarget * lpm * lessonDuration
    const totalLessons = moduleTarget * lpm

    const selectedComponents = Array.isArray(config.lessonComponents) && config.lessonComponents.length
      ? config.lessonComponents.join(', ')
      : 'intro, objectives, explanation, examples, step_procedure, checklist, summary, knowledge_check'
    const depthWord = config.overallDepth || 'comprehensive'

    // Repeated at the top AND tail of the prompt — models honour structure far
    // more reliably when the exact counts are restated as hard rules.
    const structureMandate = isArabic
      ? `قواعد إلزامية للهيكل (غير قابلة للتفاوض):
- يجب أن تحتوي مصفوفة "modules" على ${moduleTarget} وحدة بالضبط — ليس أقل ولا أكثر.
- يجب أن تحتوي مصفوفة "lessons" في كل وحدة على ${lpm} درس بالضبط.
- المجموع: ${moduleTarget} × ${lpm} = ${totalLessons} درساً.
- مستوى الصعوبة: "${config.difficulty}" مع تدرّج "${config.difficultyProgression}".
- عمق المحتوى: "${depthWord}". مكوّنات الدرس المطلوبة: ${selectedComponents}.`
      : `MANDATORY STRUCTURE RULES (non-negotiable — the output is rejected otherwise):
- The "modules" array MUST contain EXACTLY ${moduleTarget} module objects — not ${moduleTarget - 1}, not ${moduleTarget + 1}.
- EACH module's "lessons" array MUST contain EXACTLY ${lpm} lesson objects.
- Total lessons across the course: ${moduleTarget} × ${lpm} = ${totalLessons}.
- Do NOT merge, split, add or omit modules or lessons to "improve" the structure — follow the numbers exactly.
- Difficulty baseline "${config.difficulty}" following a "${config.difficultyProgression}" progression across modules.
- Content depth: "${depthWord}". Each lesson's suggestedBlockTypes should reflect these requested components: ${selectedComponents}.`

    let contextualEnrichment = ''
    const trimmedSource = (sourceMaterial || '').trim()
    if (trimmedSource.length > 40) {
      // The user grounded this course on a real document. Its structure and
      // terminology must drive the blueprint — not a generic hospitality outline.
      contextualEnrichment += isArabic
        ? `\n\nالمستند المصدر الأساسي (اشتق الوحدات والدروس والمصطلحات من هذا المحتوى مباشرةً؛ لا تخترع إجراءات تخالفه):\n"""\n${trimmedSource.slice(0, 24000)}\n"""`
        : `\n\nPRIMARY SOURCE DOCUMENT — derive the modules, lessons, terminology and sequence directly from this. Do NOT invent procedures that contradict it; cover what it actually contains:\n"""\n${trimmedSource.slice(0, 24000)}\n"""`
    }
    if (research) {
      const standards = (research.keyOperationalStandards || []).join('\n- ')
      const benchmarks = (research.serviceBenchmarks || []).join(', ')
      const ksa = (research.saudiRegulatoryDirectives || []).join(', ')
      contextualEnrichment += `\nRESEARCH STANDARDS:\n- ${standards}\n- Service benchmarks: ${benchmarks}\n- KSA: ${ksa}`
    }
    if (groundedKnowledge && groundedKnowledge.hasGroundedSources) {
      const sops = (groundedKnowledge.keyProceduresExtracted || []).join('\n- ')
      contextualEnrichment += `\nGROUNDED HOTEL SOPS:\n- ${sops}`
    }

    const prompt = isArabic
      ? `أنت كبير مهندسي المناهج الفندقية لمجموعة فنادق فاخرة.
قم بإنشاء مخطط هيكلي تعليمي متكامل (Course Blueprint) بصيغة JSON دقيقة للدورة:
- النمط: ${config.courseType}
- الاستراتيجية التعليمية: ${config.instructionalStrategy}
- الجمهور المستهدف: ${config.targetAudience}
- مستوى الصعوبة: ${config.difficulty} (${config.difficultyProgression})
- مدة الدرس: ${lessonDuration} دقيقة.

${structureMandate}
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
      : `You are the Senior Curriculum Architect at a five-star luxury hotel group.
Generate a structured, publication-grade Course Blueprint JSON:
- Course Type: ${config.courseType}
- Strategy: ${config.instructionalStrategy}
- Audience: ${config.targetAudience}
- Difficulty: ${config.difficulty} (${config.difficultyProgression})
- Lesson Duration: ${lessonDuration} minutes each.

${structureMandate}
${contextualEnrichment}

Output JSON ONLY conforming to this schema (the "modules" array below shows ONE example object — you must output ${moduleTarget} of them, each with ${lpm} lessons):
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
}

${structureMandate}
Return exactly ${moduleTarget} modules and ${totalLessons} lessons total. Nothing else.`

    const result = await this.executePrompt<CourseBlueprint>(prompt, {
      ...options,
      jsonMode: true,
      // Structurally validate the blueprint (modules[].lessons[].title) — a
      // well-formed-but-wrong-shape response cascades to the next model.
      schema: 'blueprint',
      temperature: 0.4,
      // The bilingual blueprint (modules + lessons in EN & AR) is large — a low
      // token cap truncates the JSON, which then fails to parse and arrives as a
      // raw string. Give it room.
      maxTokens: options.maxTokens ?? 8000,
    })

    // The provider chain occasionally returns the JSON as an unparsed string
    // (truncation, trailing prose, markdown fences). Coerce it to an object here
    // so the structural normalisation below can never run against a primitive.
    let rawData: unknown = result.data
    if (typeof rawData === 'string') {
      rawData = extractJsonFromText<CourseBlueprint>(rawData)
    }
    if (!rawData || typeof rawData !== 'object') {
      throw new Error(
        'Curriculum blueprint could not be parsed as JSON (the model likely returned truncated or malformed output). Retrying with the next model.'
      )
    }

    // Ensure robust structural safety and guarantee array fields on all modules/lessons
    const bp = rawData as CourseBlueprint
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
          les.templateType = les.templateType || config.defaultLessonTemplate || 'sop_standard'
          les.learningOutcomes = Array.isArray(les.learningOutcomes) && les.learningOutcomes.length > 0
            ? les.learningOutcomes
            : ['5-Star Operational Mastery', 'Standard Procedural Compliance']
          les.suggestedBlockTypes = Array.isArray(les.suggestedBlockTypes) && les.suggestedBlockTypes.length > 0
            ? les.suggestedBlockTypes
            : ['text', 'scenario', 'checklist']
        })
      })
    }

    // ── ENFORCE the requested structure ────────────────────────────────────
    // Models still under/over-deliver despite the mandate. The user's chosen
    // module / lesson counts are a hard contract, so trim excess and pad any
    // shortfall with a titled stub (better a thin module the author fills in
    // than silently ignoring the setting).
    const makeLesson = (mIdx: number, lIdx: number): LessonBlueprint => ({
      id: `les-${mIdx + 1}-${lIdx + 1}`,
      title: `Lesson ${mIdx + 1}.${lIdx + 1}`,
      title_ar: `الدرس ${mIdx + 1}.${lIdx + 1}`,
      description: 'Additional lesson to meet the requested course structure — expand as needed.',
      templateType: config.defaultLessonTemplate || 'sop_standard',
      durationMinutes: lessonDuration,
      learningOutcomes: ['5-Star Operational Mastery'],
      suggestedBlockTypes: ['text', 'scenario', 'checklist'],
    } as LessonBlueprint)

    if (bp.modules.length > moduleTarget) {
      bp.modules = bp.modules.slice(0, moduleTarget)
    }
    while (bp.modules.length < moduleTarget) {
      const mIdx = bp.modules.length
      bp.modules.push({
        id: `mod-${mIdx + 1}`,
        title: `Module ${mIdx + 1}`,
        title_ar: `الوحدة ${mIdx + 1}`,
        description: 'Additional module to meet the requested course structure — expand as needed.',
        durationMinutes: lpm * lessonDuration,
        difficultyLevel: config.difficulty,
        lessons: [],
      } as unknown as ModuleBlueprint)
    }
    bp.modules.forEach((mod, mIdx) => {
      if (!Array.isArray(mod.lessons)) mod.lessons = []
      if (mod.lessons.length > lpm) mod.lessons = mod.lessons.slice(0, lpm)
      while (mod.lessons.length < lpm) mod.lessons.push(makeLesson(mIdx, mod.lessons.length))
    })

    if (bp.modules.length !== moduleTarget) {
      console.warn(`[CurriculumAgent] structure enforced to ${moduleTarget}×${lpm} (model returned a different shape)`)
    }

    return {
      ...result,
      data: bp,
    }
  }
}

export const curriculumAgent = new CurriculumAgent()
