/**
 * Universal Multi-Agent AI Course Orchestrator
 * 
 * Coordinates the full multi-agent lifecycle matching the enterprise training platform architecture:
 * USER Request → AI Course Orchestrator
 *   ├── [Research Agent + Curriculum Agent + Knowledge Agent (RAG)]
 *   └── Content Engine:
 *         ├── Content Writer + Activities + Scenarios + Assessments
 *   └── Multimedia Engine:
 *         ├── Image AI (Free Recraft Vector First) + Audio AI + Video AI
 *   └── AI QA Critic (Adaptive Thresholds)
 *   └── AI Revision Loop (Targeted Auto-Remediation)
 *   └── Final QA Score & Supabase Persistence → Student / Admin
 */

import { harmonizeCourseConfig } from '@/lib/ai/courseHarmonizer'
import { getPipelineTelemetry } from '@/lib/ai/observability'
import { isDailySpendLockedOut, setDailySpendLockout } from './modelRegistry'
import { aiPlatformConfigService } from '@/services/aiPlatformConfigService'
import type {
  CourseBlueprint,
  CourseGenerationCheckpoint,
  CourseQAQualityReport,
  CourseVisualAsset,
  FullCourseGenerationConfig,
  GeneratedUnifiedQuestion,
  QuizBlueprint,
} from '@/types/aiCourseEngine'
import { researchAgent, type ResearchFindings } from './researchAgent'
import { curriculumAgent } from './curriculumAgent'
import { knowledgeAgent, type GroundedKnowledgeResult } from './knowledgeAgent'
import { contentWriterAgent } from './contentWriterAgent'
import { activitiesAgent, type OperationalActivity } from './activitiesAgent'
import { scenarioAgent } from './scenarioAgent'
import { assessmentAgent } from './assessmentAgent'
import { imageAgent } from './imageAgent'
import { audioAgent, type AudioNarrationResult } from './audioAgent'
import { videoAgent } from './videoAgent'
import { qaCriticAgent } from './qaAgent'
import { revisionAgent } from './revisionAgent'
import { complianceAgent } from './complianceAgent'
import {
  DEFAULT_QA_THRESHOLDS,
  type ComprehensiveQAReport,
  type PipelineEventListener,
  type PipelineProgressEvent,
} from './types'

export interface OrchestratorOptions {
  pipelineRunId?: string
  preferredModel?: string
  skipImages?: boolean
  skipAudio?: boolean
  maxConcurrency?: number
  /** Abort the pipeline between phases / lesson batches when this fires. */
  signal?: AbortSignal
  onProgress?: PipelineEventListener
  /**
   * Id of the `course_generation_jobs` row being resumed. Purely informational
   * for the orchestrator (it does not touch the DB) — the caller loads the
   * checkpoint and passes it as `resumeCheckpoint`.
   */
  resumeJobId?: string
  /**
   * A previously persisted checkpoint. When present and structurally valid the
   * orchestrator skips every phase/module already captured in it and re-runs
   * only what is missing. A corrupt or absent checkpoint => full run.
   */
  resumeCheckpoint?: CourseGenerationCheckpoint | null
  /**
   * Invoked after each phase / module with the up-to-date checkpoint so the
   * caller can persist it. Fire-and-forget; failures here never abort the run.
   */
  onCheckpoint?: (checkpoint: CourseGenerationCheckpoint) => void | Promise<void>
}

export class CourseGenerationCancelledError extends Error {
  readonly phase: string
  constructor(phase: string) {
    super(`Course generation cancelled during "${phase}"`)
    this.name = 'CourseGenerationCancelledError'
    this.phase = phase
  }
}

export interface OrchestratedCourseOutput {
  pipelineRunId: string
  blueprint: CourseBlueprint
  researchFindings?: ResearchFindings
  groundedKnowledge?: GroundedKnowledgeResult
  activities: Record<string, OperationalActivity>
  visualAssets: CourseVisualAsset[]
  audioNarrations: Record<string, AudioNarrationResult>
  qaReport: ComprehensiveQAReport
  legacyQaReport: CourseQAQualityReport
  complianceScore: number
  totalDurationMs: number
  totalEstimatedCostUSD: number
  revisionCyclesRun: number
  /** True when a valid `resumeCheckpoint` let the run skip completed work. */
  resumedFromCheckpoint: boolean
}

export class AICourseOrchestrator {
  private static instance: AICourseOrchestrator

  private constructor() {}

  public static getInstance(): AICourseOrchestrator {
    if (!AICourseOrchestrator.instance) {
      AICourseOrchestrator.instance = new AICourseOrchestrator()
    }
    return AICourseOrchestrator.instance
  }

  /**
   * Execute the full end-to-end multi-agent course synthesis pipeline
   */
  public async orchestrate(
    rawConfig: FullCourseGenerationConfig,
    options: OrchestratorOptions = {}
  ): Promise<OrchestratedCourseOutput> {
    const startTime = Date.now()
    const pipelineRunId = options.pipelineRunId || `pipe-${Date.now()}`
    
    // Preserve all explicit user parameters with absolute priority over auto-harmonizer defaults
    const harmonized = harmonizeCourseConfig(rawConfig)
    const config: FullCourseGenerationConfig = {
      ...harmonized,
      ...rawConfig,
      granularity: {
        ...harmonized.granularity,
        ...(rawConfig.granularity || {}),
      },
      imageConfig: {
        ...harmonized.imageConfig,
        ...(rawConfig.imageConfig || {}),
      },
      quizConfig: {
        ...harmonized.quizConfig,
        ...(rawConfig.quizConfig || {}),
      },
      depthConfig: {
        ...harmonized.depthConfig,
        ...(rawConfig.depthConfig || {}),
      },
      aiControls: {
        ...harmonized.aiControls,
        ...(rawConfig.aiControls || {}),
      },
    }

    const onProgress = options.onProgress
    let totalEstimatedCostUSD = 0

    // ========================================================================
    // RESUME-FROM-CHECKPOINT
    // A corrupt / structurally-invalid checkpoint is ignored => full run.
    // ========================================================================
    const CHECKPOINT_PHASE_ORDER: CourseGenerationCheckpoint['phase'][] = [
      'discovery_and_research',
      'curriculum_architecture',
      'content_synthesis',
      'assessment_generation',
      'multimedia_generation',
      'quality_assurance',
      'done',
    ]
    const parseCheckpoint = (raw: unknown): CourseGenerationCheckpoint | null => {
      try {
        if (!raw || typeof raw !== 'object') return null
        const cp = raw as Partial<CourseGenerationCheckpoint>
        if (cp.version !== 1) return null
        if (!cp.phase || !CHECKPOINT_PHASE_ORDER.includes(cp.phase)) return null
        // A checkpoint past curriculum is only usable with a partial blueprint.
        if (
          CHECKPOINT_PHASE_ORDER.indexOf(cp.phase) >
            CHECKPOINT_PHASE_ORDER.indexOf('curriculum_architecture') &&
          (!cp.partialBlueprint || !Array.isArray(cp.partialBlueprint.modules))
        ) {
          return null
        }
        return cp as CourseGenerationCheckpoint
      } catch {
        return null
      }
    }
    const resume = parseCheckpoint(options.resumeCheckpoint)
    const resumedFromCheckpoint = Boolean(resume)
    const phaseReached = (phase: CourseGenerationCheckpoint['phase']) =>
      resume
        ? CHECKPOINT_PHASE_ORDER.indexOf(resume.phase) >= CHECKPOINT_PHASE_ORDER.indexOf(phase)
        : false
    if (resume) {
      totalEstimatedCostUSD = Number(resume.totalEstimatedCostUSD) || 0
    }
    const completedLessonIds = new Set<string>(resume?.completedLessonIds ?? [])
    const completedQuizModuleIds = new Set<string>(resume?.completedQuizModuleIds ?? [])

    let checkpointResearchOutput: unknown = resume?.researchOutput
    let checkpointKnowledgeOutput: unknown = resume?.knowledgeOutput
    const emitCheckpoint = (
      phase: CourseGenerationCheckpoint['phase'],
      partialBlueprint?: CourseBlueprint,
    ) => {
      if (!options.onCheckpoint) return
      const cp: CourseGenerationCheckpoint = {
        version: 1,
        phase,
        updatedAt: new Date().toISOString(),
        researchOutput: checkpointResearchOutput,
        knowledgeOutput: checkpointKnowledgeOutput,
        partialBlueprint,
        completedLessonIds: [...completedLessonIds],
        completedQuizModuleIds: [...completedQuizModuleIds],
        totalEstimatedCostUSD,
      }
      try {
        void Promise.resolve(options.onCheckpoint(cp)).catch((err) =>
          console.warn('[Orchestrator] checkpoint persist failed:', err),
        )
      } catch (err) {
        console.warn('[Orchestrator] checkpoint persist threw:', err)
      }
    }

    // Admin "Spend & QA Caps" tab — concurrency + daily USD ceiling.
    const platformCfg = aiPlatformConfigService.getCached()
    const concurrency = Math.max(1, Math.min(10, options.maxConcurrency ?? platformCfg.maxConcurrency ?? 3))

    const enforceDailySpendCap = async (checkpoint: string) => {
      if (!(platformCfg.premiumDailyUsdCap > 0)) {
        setDailySpendLockout(false)
        return
      }
      const spent = await aiPlatformConfigService.getDailySpendUSD().catch(() => 0)
      const locked = spent >= platformCfg.premiumDailyUsdCap
      setDailySpendLockout(locked)
      if (locked) {
        emit({
          phase: 'multimedia_generation',
          status: 'running',
          progressPercentage: 74,
          title: 'Daily spend cap reached — free models only',
          titleAr: 'تم بلوغ سقف الإنفاق اليومي — النماذج المجانية فقط',
          detail: `Platform AI spend today ($${spent.toFixed(2)}) ≥ cap ($${platformCfg.premiumDailyUsdCap.toFixed(2)}). Forcing free tier for ${checkpoint}.`,
          detailAr: `تجاوز الإنفاق اليومي الحد المسموح. سيتم استخدام النماذج المجانية فقط.`,
        })
      }
    }

    const checkCancelled = (phase: string) => {
      if (options.signal?.aborted) {
        emit({
          phase: 'final_scoring',
          status: 'failed',
          progressPercentage: 100,
          title: 'Generation cancelled by user',
          titleAr: 'تم إلغاء التوليد من قبل المستخدم',
          detail: `Stopped during ${phase}.`,
          detailAr: `تم الإيقاف أثناء ${phase}.`,
        })
        throw new CourseGenerationCancelledError(phase)
      }
    }

    const emit = (event: Partial<PipelineProgressEvent>) => {
      if (onProgress) {
        onProgress({
          pipelineRunId,
          phase: event.phase || 'discovery_and_research',
          agentRole: event.agentRole || 'curriculum',
          status: event.status || 'running',
          progressPercentage: event.progressPercentage || 0,
          title: event.title || 'Orchestrator',
          titleAr: event.titleAr || 'المنسق العام',
          detail: event.detail || '',
          detailAr: event.detailAr || '',
          modelUsed: event.modelUsed,
          providerUsed: event.providerUsed,
          latencyMs: event.latencyMs,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Enforce the platform daily spend ceiling before any paid model can run.
    await enforceDailySpendCap('the full pipeline')

    // ========================================================================
    // PHASE 1: DISCOVERY, RESEARCH & KNOWLEDGE RETRIEVAL (Parallel)
    // ========================================================================
    emit({
      phase: 'discovery_and_research',
      agentRole: 'research',
      status: 'running',
      progressPercentage: 5,
      title: 'Operational Discovery & Grounding',
      titleAr: 'استكشاف المعايير واسترجاع إجراءات المعرفة',
      detail: 'Initiating parallel operational research and PostgreSQL SOP retrieval...',
      detailAr: 'بدء البحث عن المعايير الفندقية واسترجاع وثائق الإجراءات التشغيلية...',
    })

    const resumeResearchPhase = phaseReached('curriculum_architecture')
    const [researchResult, knowledgeResult] = resumeResearchPhase
      ? [
          { data: checkpointResearchOutput as ResearchFindings | undefined, estimatedCostUSD: 0 } as any,
          { data: checkpointKnowledgeOutput as GroundedKnowledgeResult | undefined, estimatedCostUSD: 0 } as any,
        ]
      : await Promise.all([
      researchAgent
        .process(
          {
            topic: config.title || config.topic || 'Hotel Frontline Operations',
            courseType: config.courseType,
            targetAudience: config.targetAudience,
            language: (config.aiControls?.targetLanguage || 'en').startsWith('ar') ? 'ar' : 'en',
            rawSourceMaterial: config.sourceContent,
          },
          { pipelineRunId, phase: 'discovery_and_research', preferredModel: options.preferredModel, onProgress }
        )
        .catch((err) => {
          console.warn('[Orchestrator] Research agent error:', err)
          return { data: undefined, estimatedCostUSD: 0 } as any
        }),

      knowledgeAgent
        .process(
          {
            query: `${config.title || ''} ${config.topic || ''} SOP standard`,
            limit: 4,
          },
          { pipelineRunId, phase: 'discovery_and_research', onProgress }
        )
        .catch((err) => {
          console.warn('[Orchestrator] Knowledge agent error:', err)
          return { data: undefined, estimatedCostUSD: 0 } as any
        }),
    ])

    totalEstimatedCostUSD += (researchResult?.estimatedCostUSD || 0) + (knowledgeResult?.estimatedCostUSD || 0)

    emit({
      phase: 'discovery_and_research',
      agentRole: 'research',
      status: 'completed',
      progressPercentage: 15,
      title: 'Discovery & SOPs Grounded',
      titleAr: 'تم استرجاع معايير الجودة والإجراءات',
      detail: `[Model: ${researchResult?.modelUsed || 'Auto Router'}] Grounded ${knowledgeResult?.data?.relevantArticles?.length || 0} internal SOP articles & ${researchResult?.data?.serviceBenchmarks?.length || 0} service benchmarks`,
      detailAr: `تم استرجاع ${knowledgeResult?.data?.relevantArticles?.length || 0} وثيقة SOP و ${researchResult?.data?.serviceBenchmarks?.length || 0} معايير الخدمة العالمية`,
      modelUsed: researchResult?.modelUsed,
    })

    if (!resumeResearchPhase) {
      checkpointResearchOutput = researchResult?.data
      checkpointKnowledgeOutput = knowledgeResult?.data
      emitCheckpoint('discovery_and_research')
    }

    checkCancelled("curriculum architecture")

    // ========================================================================
    // PHASE 2: CURRICULUM ARCHITECTURE & MODULE DECOMPOSITION
    // ========================================================================
    emit({
      phase: 'curriculum_architecture',
      agentRole: 'curriculum',
      status: 'running',
      progressPercentage: 20,
      title: 'Pedagogical Curriculum Architecture',
      titleAr: 'هندسة المنهج والمصفوفة التدريبية',
      detail: `Designing modular curriculum structure (${config.granularity?.moduleCount || 4} modules, ${config.granularity?.lessonsPerModule || 3} lessons/mod)...`,
      detailAr: 'بناء هيكل الوحدات والدروس التعليمية...',
    })

    const resumeCurriculumPhase = phaseReached('content_synthesis')
    const curriculumResult = resumeCurriculumPhase
      ? ({ data: resume!.partialBlueprint as CourseBlueprint, estimatedCostUSD: 0, modelUsed: undefined } as any)
      : await curriculumAgent.process(
      {
        config,
        research: researchResult?.data as ResearchFindings,
        groundedKnowledge: knowledgeResult?.data as GroundedKnowledgeResult,
        sourceMaterial: config.sourceContent,
      },
      { pipelineRunId, phase: 'curriculum_architecture', preferredModel: options.preferredModel, onProgress }
    )

    let blueprint: CourseBlueprint = curriculumResult.data
    totalEstimatedCostUSD += curriculumResult.estimatedCostUSD || 0

    emit({
      phase: 'curriculum_architecture',
      agentRole: 'curriculum',
      status: 'completed',
      progressPercentage: 35,
      title: 'Curriculum Architecture Completed',
      titleAr: 'اكتمل بناء هيكل الوحدات والدروس',
      detail: `[Model: ${curriculumResult.modelUsed || 'Auto Router'}] Structured ${blueprint.modules.length} modules and ${blueprint.modules.reduce((s, m) => s + m.lessons.length, 0)} interactive lessons`,
      detailAr: `تم إنشاء ${blueprint.modules.length} وحدات بإجمالي ${blueprint.modules.reduce((s, m) => s + m.lessons.length, 0)} درس`,
      modelUsed: curriculumResult.modelUsed,
    })

    if (!resumeCurriculumPhase) {
      emitCheckpoint('curriculum_architecture', blueprint)
    }

    checkCancelled("content synthesis")

    // ========================================================================
    // PHASE 3: CONTENT ENGINE (Lessons, SOPs, Dialogue Scripts & Drills)
    // ========================================================================
    const totalLessonCount = blueprint.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    let completedLessonCount = Math.min(completedLessonIds.size, totalLessonCount)

    emit({
      phase: 'content_synthesis',
      agentRole: 'content_writer',
      status: 'running',
      progressPercentage: 35,
      title: 'Lesson Text, SOPs & Dialogue Scripts',
      titleAr: 'صياغة نصوص الدروس والإجراءات التشغيلية',
      detail: `Synthesizing lesson procedures, dialogue scripts, and drills (0/${totalLessonCount} lessons)...`,
      detailAr: `توليد نصوص الدروس والحوارات والتدريبات العملية (0/${totalLessonCount} دروس)...`,
    })

    const allActivities: Record<string, OperationalActivity> = {}
    const visualAssets: CourseVisualAsset[] = []
    const audioNarrations: Record<string, AudioNarrationResult> = {}

    // Concurrency helper for high-throughput parallel execution
    const pMap = async <T, R>(
      items: T[],
      fn: (item: T, index: number) => Promise<R>,
      concurrency: number = 3
    ): Promise<R[]> => {
      const results = new Array<R>(items.length)
      let currentIndex = 0
      const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (currentIndex < items.length) {
          const idx = currentIndex++
          results[idx] = await fn(items[idx], idx)
        }
      })
      await Promise.all(workers)
      return results
    }

    const researchContextStr = Array.isArray(researchResult?.data?.keyOperationalStandards)
      ? researchResult.data.keyOperationalStandards.join(', ')
      : ''
    const groundedSopsContextStr = Array.isArray(knowledgeResult?.data?.keyProceduresExtracted)
      ? knowledgeResult.data.keyProceduresExtracted.join(', ')
      : ''

    interface LessonTask {
      mod: typeof blueprint.modules[0]
      les: typeof blueprint.modules[0]['lessons'][0]
    }

    const lessonTasks: LessonTask[] = []
    for (const mod of blueprint.modules) {
      for (const les of mod.lessons) {
        // Skip lessons already synthesised in a prior (interrupted) run.
        if (completedLessonIds.has(les.id) && les.renderedHtml) continue
        lessonTasks.push({ mod, les })
      }
    }

    await pMap(
      lessonTasks,
      async ({ mod, les }) => {
        // Content Writer & Activities Agent in parallel
        const [contentRes, actRes] = await Promise.all([
          contentWriterAgent.process(
            {
              courseTitle: blueprint.title,
              moduleTitle: mod.title,
              lesson: les,
              config,
              researchContext: researchContextStr,
              groundedSopsContext: groundedSopsContextStr,
              sourceMaterial: config.sourceContent,
            },
            { pipelineRunId, phase: 'content_synthesis', preferredModel: options.preferredModel, silent: true }
          ),
          config.subsystems?.activities !== false
            ? activitiesAgent
                .process(
                  {
                    lessonTitle: les.title,
                    moduleTitle: mod.title,
                    lessonContentHtml: les.description || les.title,
                    activityType: 'problem_solving_exercise',
                  },
                  { pipelineRunId, phase: 'content_synthesis', preferredModel: options.preferredModel, silent: true }
                )
                .catch((e) => {
                  console.warn('[Orchestrator] Activities agent skipped for lesson:', les.id, e)
                  return { data: null }
                })
            : Promise.resolve({ data: null }),
        ])

        les.renderedHtml = contentRes.data
        totalEstimatedCostUSD += contentRes.estimatedCostUSD || 0
        if (actRes && actRes.data) {
          allActivities[les.id] = actRes.data
        }

        completedLessonIds.add(les.id)
        completedLessonCount++
        // Persist progress after every lesson so a crash resumes near where it died.
        emitCheckpoint('content_synthesis', blueprint)

        emit({
          phase: 'content_synthesis',
          agentRole: 'content_writer',
          status: 'running',
          progressPercentage: Math.round(35 + (completedLessonCount / totalLessonCount) * 25),
          title: 'Lesson Text, SOPs & Dialogue Scripts',
          titleAr: 'صياغة نصوص الدروس والإجراءات التشغيلية',
          detail: `[Model: ${contentRes.modelUsed || 'Auto Router'}] Completed (${completedLessonCount}/${totalLessonCount}) lessons: "${les.title}"`,
          detailAr: `تم إنجاز (${completedLessonCount}/${totalLessonCount}) دروس: "${les.title}"`,
          modelUsed: contentRes.modelUsed,
        })
      },
      concurrency // admin "Max Parallel Generation Streams"
    )

    emitCheckpoint('assessment_generation', blueprint)

    checkCancelled("assessment generation")

    // ========================================================================
    // PHASE 4: ASSESSMENT ENGINE (Psychometric Quizzes & Knowledge Checks)
    // ========================================================================
    const totalQuizCount = blueprint.modules.length
    let completedQuizCount = Math.min(completedQuizModuleIds.size, totalQuizCount)
    // Where the author wants assessments. `per_module` / `checkpoints` / `mid_course`
    // -> a moduleQuiz on each module. `final_assessment` / `standalone` -> one
    // comprehensive blueprint.finalAssessment pooled from every module.
    const quizPlacement = config.quizConfig?.placement || 'per_module'
    const wantsFinalOnly = quizPlacement === 'final_assessment' || quizPlacement === 'standalone'
    const targetQuestionCount = config.quizConfig?.questionCount || 3
    const wrapQuiz = (title: string, questions: GeneratedUnifiedQuestion[]): QuizBlueprint => ({
      id: crypto.randomUUID(),
      title,
      placement: quizPlacement,
      questionCount: questions.length,
      passingScore: config.quizConfig?.passingScore || 80,
      questions,
    })
    const assessmentPool: GeneratedUnifiedQuestion[] = []
    let modulesWithNoQuestions = 0

    emit({
      phase: 'assessment_generation',
      agentRole: 'assessments',
      status: 'running',
      progressPercentage: 62,
      title: 'Knowledge Checks & Assessment Pools',
      titleAr: 'بناء بنك الأسئلة والتقييمات الذكية',
      detail: `Synthesizing psychometric question pools (0/${totalQuizCount} quizzes)...`,
      detailAr: `صياغة بنوك التقييم والاختبارات (0/${totalQuizCount} اختبارات)...`,
    })

    await pMap(
      blueprint.modules.filter((mod) => !completedQuizModuleIds.has(mod.id)),
      async (mod) => {
        try {
          const modCombinedContent = (mod.lessons || []).map((l) => l.renderedHtml || l.description || '').join('\n')
          const quizRes = await assessmentAgent.process(
            {
              title: mod.title,
              contextContent: modCombinedContent,
              count: config.quizConfig?.questionCount || 3,
              questionTypes:
                Array.isArray(config.questionTypes) && config.questionTypes.length > 0
                  ? config.questionTypes
                  : ['mcq', 'scenario', 'ordering', 'matching'],
              difficulty: mod.difficultyLevel as any,
            },
            { pipelineRunId, phase: 'assessment_generation', preferredModel: options.preferredModel, silent: true }
          )
          const questions = Array.isArray(quizRes.data) ? (quizRes.data as GeneratedUnifiedQuestion[]) : []
          if (questions.length > 0) {
            // The save path (blueprintToBlocks / saveBlueprintToDatabase) reads
            // `mod.moduleQuiz` (a QuizBlueprint) and `blueprint.finalAssessment` —
            // NOT `mod.quizzes`. Write the real shape so the questions actually
            // become learning_quizzes + unified_questions rows.
            if (!wantsFinalOnly) {
              mod.moduleQuiz = wrapQuiz(mod.moduleQuiz?.title || `${mod.title} — Knowledge Check`, questions)
            }
            assessmentPool.push(...questions)
          } else {
            modulesWithNoQuestions++
          }
          completedQuizModuleIds.add(mod.id)
          completedQuizCount++
          emitCheckpoint('assessment_generation', blueprint)

          emit({
            phase: 'assessment_generation',
            agentRole: 'assessments',
            status: 'running',
            progressPercentage: Math.round(62 + (completedQuizCount / totalQuizCount) * 12),
            title: 'Knowledge Checks & Assessment Pools',
            titleAr: 'بناء بنك الأسئلة والتقييمات الذكية',
            detail: `[Model: ${quizRes.modelUsed || 'Auto Router'}] Completed (${completedQuizCount}/${totalQuizCount}) quizzes for module: "${mod.title}"`,
            detailAr: `تم إنجاز (${completedQuizCount}/${totalQuizCount}) اختبارات للوحدة: "${mod.title}"`,
            modelUsed: quizRes.modelUsed,
          })
        } catch (e) {
          modulesWithNoQuestions++
          console.warn('[Orchestrator] Assessment agent error for module:', mod.id, e)
        }
      },
      concurrency // admin "Max Parallel Generation Streams"
    )

    // Build the comprehensive final exam when the author asked for one (or a
    // final-only placement), pooling from every module's questions.
    if (
      (wantsFinalOnly || quizPlacement === 'mid_course') &&
      assessmentPool.length > 0
    ) {
      const finalCount = Math.max(targetQuestionCount, Math.min(assessmentPool.length, targetQuestionCount * 2))
      blueprint.finalAssessment = wrapQuiz(
        `${blueprint.title} — Final Comprehensive Assessment`,
        assessmentPool.slice(0, finalCount),
      )
    }

    if (modulesWithNoQuestions > 0) {
      emit({
        phase: 'assessment_generation',
        agentRole: 'assessments',
        status: 'running',
        progressPercentage: 74,
        title: 'Assessment coverage warning',
        titleAr: 'تنبيه بشأن تغطية التقييم',
        detail: `${modulesWithNoQuestions}/${totalQuizCount} module(s) produced no questions (provider failure or empty output). Those modules will have no knowledge check.`,
        detailAr: `${modulesWithNoQuestions} من ${totalQuizCount} وحدة لم تُنتج أسئلة — لن تحتوي على اختبار.`,
      })
    }

    emitCheckpoint('multimedia_generation', blueprint)

    checkCancelled("multimedia generation")

    // ========================================================================
    // PHASE 5: MULTIMEDIA ENGINE (Visuals & Audio Shift Briefings)
    // NOTE: multimedia + QA + revision always re-run on resume — visual assets
    // are not individually checkpointed and QA must score the final blueprint.
    // ========================================================================
    // Re-check the daily spend ceiling now that text/assessment phases have accrued cost.
    await enforceDailySpendCap('image generation')
    if (!options.skipImages && config.imageConfig?.enableAIImages !== false) {
      const userMaxImages = typeof config.imageConfig?.maxImagesPerCourse === 'number'
        ? config.imageConfig.maxImagesPerCourse
        : 6
      const userImageModel = config.imageConfig?.imageModel || 'recraft-vector'
      const userStyle = config.imageConfig?.preferredStyle || 'technical_diagram'
      const userAspectRatio = config.imageConfig?.preferredAspectRatio || '16:9'
      // Spend-cap enforcement: once this course's estimated AI spend exceeds the
      // per-course cap, force free-only for the rest of the run.
      const runCost = () => getPipelineTelemetry(pipelineRunId)?.estimatedCostUSD ?? 0

      const allLessons = blueprint.modules.flatMap((m) => m.lessons.map((l) => ({ mod: m, les: l })))
      const maxVisuals = Math.min(userMaxImages, allLessons.length)
      const targetLessons = allLessons.slice(0, maxVisuals)
      let generatedVisualCount = 0

      emit({
        phase: 'multimedia_generation',
        agentRole: 'image_ai',
        status: 'running',
        progressPercentage: 75,
        title: `AI Visual Generation (${userImageModel})`,
        titleAr: 'توليد الصور التوضيحية والوسائط التعليمية',
        detail: `[Model: ${userImageModel}] Synthesizing educational visuals (0/${maxVisuals} images)...`,
        detailAr: `توليد الرسوم البيانية والصور التوضيحية (0/${maxVisuals} صور)...`,
        modelUsed: userImageModel,
      })

      await pMap(
        targetLessons,
        async ({ mod, les }) => {
          try {
            const overCap = runCost() >= platformCfg.perCourseUsdCap
            const forceFree = overCap || platformCfg.freeOnlyMode || isDailySpendLockedOut()
            const premiumAllowed =
              !platformCfg.freeOnlyMode &&
              platformCfg.allowPremiumImages &&
              config.imageConfig?.costTier !== 'free_only' &&
              !forceFree
            const imgRes = await imageAgent.process(
              {
                lesson: les,
                courseTitle: blueprint.title,
                moduleTitle: mod.title,
                imageModel: forceFree ? 'auto' : userImageModel,
                preferredStyle: userStyle,
                preferredAspectRatio: userAspectRatio,
                costTierPreference: premiumAllowed ? 'premium' : 'free_first',
              },
              { pipelineRunId, phase: 'multimedia_generation', silent: true }
            )
            if (imgRes.data) {
              visualAssets.push(imgRes.data)
              les.visualAssets = [imgRes.data]
              ;(les as any).visualAsset = imgRes.data
              generatedVisualCount++

              emit({
                phase: 'multimedia_generation',
                agentRole: 'image_ai',
                status: 'running',
                progressPercentage: Math.round(75 + (generatedVisualCount / maxVisuals) * 8),
                title: `AI Visual Generation (${imgRes.data.model || userImageModel})`,
                titleAr: 'توليد الصور التوضيحية والوسائط التعليمية',
                detail: `[Model: ${imgRes.data.model || userImageModel}] Completed (${generatedVisualCount}/${maxVisuals}) visuals for lesson: "${les.title}"`,
                detailAr: `تم إنجاز (${generatedVisualCount}/${maxVisuals}) صور للدرس: "${les.title}"`,
                modelUsed: imgRes.data.model || userImageModel,
              })
            }
          } catch (e) {
            console.warn('[Orchestrator] Image agent skipped for lesson:', les.id, e)
          }

          // Audio Briefing (Strictly disabled by default, only runs if explicitly enabled)
          if (!options.skipAudio && config.audioConfig?.enableAudio === true) {
            try {
              const audRes = await audioAgent.process(
                {
                  lessonTitle: les.title,
                  lessonContentHtml: les.renderedHtml,
                },
                { pipelineRunId, phase: 'multimedia_generation', silent: true }
              )
              if (audRes.data) {
                audioNarrations[les.id] = audRes.data
              }
            } catch (e) {
              console.warn('[Orchestrator] Audio agent skipped for lesson:', les.id, e)
            }
          }
        },
        concurrency // admin "Max Parallel Generation Streams"
      )
      blueprint.visualAssets = visualAssets
    }

    checkCancelled("quality assurance")

    // ========================================================================
    // PHASE 4: QUALITY ASSURANCE AUDITING
    // ========================================================================
    emit({
      phase: 'quality_assurance',
      agentRole: 'qa_critic',
      status: 'running',
      progressPercentage: 80,
      title: 'Pedagogical & Regulatory QA Audit',
      titleAr: 'التدقيق الأكاديمي والرقابي الشامل',
      detail: 'Auditing accuracy, Bloom alignment, service benchmarks, and KSA regulations...',
      detailAr: 'تقييم دقة المعايير والتدرج المعرفي واللوائح السعودية...',
    })

    const [qaResult, complianceResult] = await Promise.all([
      qaCriticAgent.process(
        {
          blueprint,
          courseType: config.courseType,
        },
        { pipelineRunId, phase: 'quality_assurance', preferredModel: options.preferredModel, onProgress }
      ),
      complianceAgent.process(
        {
          blueprint,
        },
        { pipelineRunId, phase: 'quality_assurance' }
      ),
    ])

    let qaReport: ComprehensiveQAReport = qaResult.data
    const complianceReport = complianceResult.data
    let revisionCyclesRun = 0

    // ========================================================================
    // PHASE 5: REVISION CYCLE (Targeted Auto-Remediation)
    // ========================================================================
    const thresholds = DEFAULT_QA_THRESHOLDS[config.courseType] || DEFAULT_QA_THRESHOLDS.professional

    if (
      (qaReport.scoreCategory === 'targeted_revision' || qaReport.scoreCategory === 'major_revision') &&
      revisionCyclesRun < thresholds.maxRevisionCycles
    ) {
      emit({
        phase: 'revision_cycle',
        agentRole: 'revision',
        status: 'running',
        progressPercentage: 90,
        title: 'Surgical Auto-Remediation',
        titleAr: 'المراجعة والتصحيح التلقائي للثغرات',
        detail: `Executing targeted remediation for ${qaReport.findings.length} findings...`,
        detailAr: `معالجة ${qaReport.findings.length} ملاحظة جودة...`,
      })

      const revisionRes = await revisionAgent.process(
        {
          blueprint,
          qaReport,
        },
        { pipelineRunId, phase: 'revision_cycle', preferredModel: options.preferredModel, onProgress }
      )

      if (revisionRes.data?.revisedBlueprint) {
        blueprint = revisionRes.data.revisedBlueprint
        revisionCyclesRun++

        // Rescore after revision
        const rescore = await qaCriticAgent.process(
          {
            blueprint,
            courseType: config.courseType,
          },
          { pipelineRunId, phase: 'final_scoring' }
        )
        qaReport = rescore.data
      }
    }

    // ========================================================================
    // PHASE 6: FINAL SCORING & PACKAGE
    // ========================================================================
    const totalDurationMs = Date.now() - startTime

    emit({
      phase: 'final_scoring',
      agentRole: 'qa_critic',
      status: 'completed',
      progressPercentage: 100,
      title: 'Course Pipeline Successfully Orchestrated',
      titleAr: 'اكتمل توليد الدورة التدريبية بنجاح',
      detail: `Final QA Score: ${qaReport.overallScore}/100 (${qaReport.scoreCategory.toUpperCase()}) • Completed in ${(totalDurationMs / 1000).toFixed(1)}s`,
      detailAr: `درجة الجودة النهائية: ${qaReport.overallScore}/100 • تم الإنجاز في ${(totalDurationMs / 1000).toFixed(1)} ثانية`,
    })

    const legacyQaReport: CourseQAQualityReport = {
      overallScore: qaReport.overallScore,
      pedagogicalCoherence: qaReport.dimensionScores.pedagogy,
      operationalAccuracy: qaReport.dimensionScores.operationalAccuracy,
      bloomsDistributionScore: qaReport.dimensionScores.bloomsAlignment,
      assessmentAlignmentScore: qaReport.dimensionScores.operationalAccuracy,
      serviceStandardScore: qaReport.dimensionScores.serviceStandards,
      repetitionScore: 95,
      distractorDiscriminationScore: 90,
      identifiedGaps: qaReport.findings.map((f) => ({
        area: f.dimension,
        severity: f.severity === 'critical' ? 'critical' : f.severity === 'major' ? 'high' : 'medium',
        issue: f.description,
        issue_ar: f.descriptionAr,
        suggestedFix: f.remediationSuggestion,
        suggestedFix_ar: f.remediationSuggestionAr,
        canAutoRegenerate: f.canAutoFix,
      })),
      timestamp: qaReport.evaluatedAt,
      auditedBy: qaReport.evaluatedByModel,
    }

    emitCheckpoint('done', blueprint)

    return {
      pipelineRunId,
      blueprint,
      researchFindings: researchResult?.data,
      groundedKnowledge: knowledgeResult?.data,
      activities: allActivities,
      visualAssets,
      audioNarrations,
      qaReport,
      legacyQaReport,
      complianceScore: complianceReport.score,
      totalDurationMs,
      totalEstimatedCostUSD,
      revisionCyclesRun,
      resumedFromCheckpoint,
    }
  }
}

export const aiCourseOrchestrator = AICourseOrchestrator.getInstance()
