/**
 * AI Course Engine Service
 * Orchestrates multi-stage generation, AI image generation, Supabase persistence, presets, and QA audits.
 */

import { aiCourseOrchestrator, CourseGenerationCancelledError } from '@/lib/ai/agents/orchestrator'
import { imageAgent } from '@/lib/ai/agents/imageAgent'
import {
  analyzeLessonVisualOpportunities,
  auditCourseQuality,
  DEFAULT_IMAGE_CONFIG,
  generateCourseBlueprint,
  generateExpandedQuiz,
  generateTemplatedLessonContent,
  refineCourseComponent,
  validateCourseBlueprint,
  validateQuizQuestions,
} from '@/lib/ai/courseEngine'
import { harmonizeCourseConfig } from '@/lib/ai/courseHarmonizer'
import {
  blueprintToBlockDrafts,
  buildQuizQuestionLinkRow,
  buildUnifiedOptionRows,
  buildUnifiedQuestionRow,
} from '@/lib/ai/blueprintToBlocks'
import { isPersistedAssetId, resolveProvider } from '@/lib/ai/agents/modelRegistry'
import { getPipelineTelemetry } from '@/lib/ai/observability'
import { aiPlatformConfigService } from '@/services/aiPlatformConfigService'
import { aiAgentPolicyService } from '@/services/aiAgentPolicyService'
import { supabase } from '@/lib/supabase'
import {
  cloudflareProvider,
  DEFAULT_CLOUDFLARE_IMAGE_MODEL,
} from '@/lib/ai/imageProviders/cloudflareProvider'
import type {
  CloudflareImageModel,
  CloudflareUsageStats,
  CourseBlueprint,
  CourseGenerationCheckpoint,
  CourseGenerationJob,
  CourseGenerationPreset,
  CourseQAQualityReport,
  CourseVisualAsset,
  FullCourseGenerationConfig,
  GeneratedUnifiedQuestion,
  LessonBlueprint,
  QuizBlueprint,
  VisualOpportunity,
} from '@/types/aiCourseEngine'

export const aiCourseEngineService = {
  /**
   * Orchestrates the full multi-agent course generation pipeline with live stage progress callbacks.
   */
  async executeCoursePipeline(
    rawConfig: FullCourseGenerationConfig,
    onProgress?: (stage: number, stageName: string, detail: string) => void,
    opts?: { signal?: AbortSignal; resumeJobId?: string }
  ): Promise<{
    blueprint: CourseBlueprint
    qaReport: CourseQAQualityReport
    jobId?: string
    durationMs: number
    resumedFromCheckpoint: boolean
  }> {
    const startTime = Date.now()
    const config = harmonizeCourseConfig(rawConfig)

    // Load admin platform config (routing mode, disabled models, free-only, …)
    // and apply it to the model registry before any agent runs.
    await aiPlatformConfigService.load().catch(() => undefined)
    // Per-agent policy overrides (Agent Policies tab) — cached for baseAgent.
    await aiAgentPolicyService.load().catch(() => undefined)

    // Per-user daily generation cap (admin "Spend & QA Caps" tab).
    const platformCfg = aiPlatformConfigService.getCached()
    let generatingUserId: string | null = null
    try {
      const { data: authData } = await supabase.auth.getUser()
      generatingUserId = authData?.user?.id ?? null
      if (generatingUserId && platformCfg.perUserDailyGenerations > 0) {
        const usedToday = await aiPlatformConfigService.getUserGenerationCountToday(generatingUserId)
        if (usedToday >= platformCfg.perUserDailyGenerations) {
          throw new Error(
            `Daily course generation limit reached (${usedToday}/${platformCfg.perUserDailyGenerations}). ` +
            `Try again after 00:00 UTC or ask an admin to raise the cap in AI Course Generator settings.`,
          )
        }
      }
    } catch (gateErr) {
      // A real cap-exceeded error must propagate; auth/query hiccups must not block generation.
      if (gateErr instanceof Error && gateErr.message.startsWith('Daily course generation limit reached')) {
        throw gateErr
      }
      console.warn('[aiCourseEngine] per-user daily cap check skipped:', gateErr)
    }

    // Map stage numbers from orchestrator progress events to the 6 studio UI cards
    const phaseToStageMap: Record<string, { stage: number; name: string }> = {
      discovery_and_research: { stage: 1, name: 'Pedagogical Blueprint Planning' },
      curriculum_architecture: { stage: 2, name: 'Curriculum Structure & Modules' },
      content_synthesis: { stage: 3, name: 'Lesson Text, SOPs & Dialogue Scripts' },
      assessment_generation: { stage: 4, name: 'Knowledge Checks & Assessment Pools' },
      multimedia_generation: { stage: 5, name: 'AI Visual Generation & Media' },
      quality_assurance: { stage: 6, name: 'Automated 5-Star Quality Audit' },
      revision_cycle: { stage: 6, name: 'Surgical Auto-Remediation' },
      final_scoring: { stage: 6, name: 'Final Packaging & Delivery' },
    }

    // ------------------------------------------------------------------
    // Job row lifecycle + resume-from-checkpoint.
    // The row is now created BEFORE the pipeline runs (status 'running') so
    // checkpoints can be persisted into metadata.checkpoint mid-flight. A
    // resumed run reuses the existing row and loads its checkpoint.
    // ------------------------------------------------------------------
    let jobId: string | undefined
    let priorMetadata: Record<string, unknown> = {}
    let resumeCheckpoint: CourseGenerationCheckpoint | null = null

    if (opts?.resumeJobId) {
      try {
        const { data: existing } = await supabase
          .from('course_generation_jobs')
          .select('id, metadata')
          .eq('id', opts.resumeJobId)
          .maybeSingle()
        if (existing?.id) {
          jobId = existing.id
          priorMetadata = ((existing.metadata as Record<string, unknown>) || {})
          const cp = priorMetadata.checkpoint
          if (cp && typeof cp === 'object' && (cp as { version?: number }).version === 1) {
            resumeCheckpoint = cp as CourseGenerationCheckpoint
          }
          await supabase
            .from('course_generation_jobs')
            .update({ status: 'running', updated_at: new Date().toISOString() })
            .eq('id', jobId)
        }
      } catch (resumeErr) {
        console.warn('[aiCourseEngine] resume checkpoint load failed — full run:', resumeErr)
      }
    }

    if (!jobId) {
      try {
        const { data: created } = await supabase
          .from('course_generation_jobs')
          .insert({
            mode: config.generationMode,
            status: 'running',
            config: config as any,
            created_by: generatingUserId,
          })
          .select('id')
          .single()
        jobId = created?.id
      } catch (createErr) {
        console.warn('[aiCourseEngine] could not pre-create job row:', createErr)
      }
    }

    const persistCheckpoint = (checkpoint: CourseGenerationCheckpoint) => {
      if (!jobId) return
      void supabase
        .from('course_generation_jobs')
        .update({
          status: 'running',
          metadata: { ...priorMetadata, checkpoint } as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .then(() => {})
    }

    let orchestrated: Awaited<ReturnType<typeof aiCourseOrchestrator.orchestrate>>
    try {
      orchestrated = await aiCourseOrchestrator.orchestrate(config, {
        preferredModel: config?.aiControls?.preferredModel,
        signal: opts?.signal,
        maxConcurrency: platformCfg.maxConcurrency,
        skipAudio: config.audioConfig?.enableAudio !== true,
        skipImages: config.imageConfig?.enableAIImages === false,
        resumeJobId: opts?.resumeJobId,
        resumeCheckpoint,
        onCheckpoint: persistCheckpoint,
        onProgress: (event) => {
          const stageInfo = phaseToStageMap[event.phase] || { stage: 3, name: event.title }
          onProgress?.(stageInfo.stage, stageInfo.name, `${event.title}: ${event.detail}`)
        },
      })
    } catch (pipelineErr) {
      // Mark the row so the history UI can offer "Resume". A cancellation (or any
      // error with a checkpoint already on the row) => 'interrupted'; otherwise
      // 'failed'. The checkpoint written mid-flight stays in metadata.
      if (jobId) {
        const cancelled = pipelineErr instanceof CourseGenerationCancelledError
        try {
          const { data: row } = await supabase
            .from('course_generation_jobs')
            .select('metadata')
            .eq('id', jobId)
            .maybeSingle()
          const hasCheckpoint = Boolean((row?.metadata as { checkpoint?: unknown } | null)?.checkpoint)
          await supabase
            .from('course_generation_jobs')
            .update({
              status: cancelled || hasCheckpoint ? 'interrupted' : 'failed',
              error_message: (pipelineErr as Error)?.message?.slice(0, 500) ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
        } catch (markErr) {
          console.warn('[aiCourseEngine] could not mark interrupted job:', markErr)
        }
      }
      throw pipelineErr
    }

    const blueprint = orchestrated.blueprint
    const qaReport = orchestrated.legacyQaReport
    blueprint.qaReport = qaReport
    blueprint.qualityScore = qaReport.overallScore

    const durationMs = Date.now() - startTime

    // Real telemetry from this run (models actually used, cost, fallbacks).
    const telemetry = getPipelineTelemetry(orchestrated.pipelineRunId)
    const modelsUsed = telemetry ? Object.keys(telemetry.byModel) : [config?.aiControls?.preferredModel || 'auto']

    // Finalise the job row (pre-created above as status 'running'). The
    // completed checkpoint (phase 'done') is left in metadata for provenance.
    const finalMetadata: Record<string, unknown> = {
      ...priorMetadata,
      ...(telemetry
        ? {
            ai_requests: telemetry.requests,
            ai_failures: telemetry.failures,
            ai_fallbacks: telemetry.totalFallbacks,
            free_requests: telemetry.freeRequests,
            paid_requests: telemetry.paidRequests,
            estimated_cost_usd: Number(telemetry.estimatedCostUSD.toFixed(4)),
            routing_mode: aiPlatformConfigService.activeRoutingMode,
          }
        : {}),
      resumed_from_checkpoint: orchestrated.resumedFromCheckpoint,
    }

    const jobPayload = {
      mode: config.generationMode,
      status: 'completed' as const,
      config: config as any,
      blueprint: blueprint as any,
      qa_report: qaReport as any,
      models_used: modelsUsed,
      duration_ms: durationMs,
      created_by: generatingUserId,
      metadata: finalMetadata as any,
      updated_at: new Date().toISOString(),
    }

    try {
      if (jobId) {
        await supabase.from('course_generation_jobs').update(jobPayload).eq('id', jobId)
      } else {
        const { data: jobData } = await supabase
          .from('course_generation_jobs')
          .insert(jobPayload)
          .select('id')
          .single()
        jobId = jobData?.id
      }
    } catch (jobErr) {
      console.warn('Could not record course_generation_jobs record:', jobErr)
    }

    return {
      blueprint,
      qaReport,
      jobId,
      durationMs,
      resumedFromCheckpoint: orchestrated.resumedFromCheckpoint,
    }
  },

  /**
   * Generates a single visual asset using Cloudflare Workers AI ($0.00 / step free tier) and persists it to Supabase Storage.
   */
  async generateLessonVisualAsset(params: {
    courseId: string
    moduleId: string
    lessonId: string
    opportunity: VisualOpportunity
    provider?: string
    costTier?: string
    model?: string
    visualStyle?: string
  }): Promise<CourseVisualAsset | null> {
    const selectedModel = params.model || DEFAULT_CLOUDFLARE_IMAGE_MODEL
    try {
      const resolvedProvider = resolveProvider(selectedModel)
      const inferredProvider =
        resolvedProvider === 'gemini'
          ? 'google'
          : resolvedProvider === 'openrouter' || resolvedProvider === 'recraft'
            ? 'openrouter'
            : 'cloudflare'

      const { data, error } = await supabase.functions.invoke<{
        success: boolean
        asset: CourseVisualAsset
        error?: string
      }>('generate-course-image', {
        body: {
          prompt: params.opportunity.optimizedPrompt,
          negative_prompt: params.opportunity.negativePrompt,
          visual_style: params.visualStyle || 'educational_illustration',
          visual_type: params.opportunity.visualType || 'educational_illustration',
          aspect_ratio: params.opportunity.aspectRatio || '16:9',
          course_id: params.courseId,
          module_id: params.moduleId,
          lesson_id: params.lessonId,
          title: params.opportunity.title,
          title_ar: params.opportunity.title_ar,
          alt_text: params.opportunity.altText,
          alt_text_ar: params.opportunity.altText_ar,
          caption: params.opportunity.caption,
          caption_ar: params.opportunity.caption_ar,
          educational_purpose: params.opportunity.purpose,
          visual_concept: params.opportunity.visualConcept,
          provider: params.provider || inferredProvider,
          cost_tier: 'free_only',
          model: selectedModel,
          num_steps: params.opportunity.numSteps || (selectedModel === DEFAULT_CLOUDFLARE_IMAGE_MODEL ? 6 : 20),
          guidance: params.opportunity.guidance || 7.5,
          seed: params.opportunity.seed,
        },
      })

      if (error || !data?.success) {
        let errDetail = error?.message || data?.error || 'Unknown error'
        const context = (error as { context?: Response })?.context
        if (context && typeof context.text === 'function') {
          try {
            const parsed = JSON.parse(await context.clone().text())
            if (parsed?.error) errDetail = parsed.error
          } catch {
            // Non-JSON response
          }
        }
        console.warn('%c[CourseEngine] ⚠️ generate-course-image failed, initiating multi-tier imageAgent fallback...%c', 'color: #f59e0b; font-weight: bold;', '', {
          errorDetail: errDetail,
          model: selectedModel,
          provider: inferredProvider,
        })
        cloudflareProvider.recordUsage(false)

        try {
          const agentFallback = await imageAgent.process({
            lesson: {
              id: params.lessonId,
              title: params.opportunity.title,
              description: params.opportunity.optimizedPrompt || params.opportunity.visualConcept || params.opportunity.title,
              learningOutcomes: [params.opportunity.educationalObjective || params.opportunity.title],
            } as any,
            courseTitle: params.opportunity.title,
            moduleTitle: params.opportunity.title,
            imageModel: selectedModel,
            preferredStyle: params.visualStyle,
            preferredAspectRatio: params.opportunity.aspectRatio,
          })

          if (agentFallback.success && agentFallback.data) {
            console.info('%c[CourseEngine] ✅ imageAgent fallback succeeded!%c', 'color: #10b981; font-weight: bold;', '', agentFallback.data)
            return agentFallback.data
          }
        } catch (agentErr) {
          console.error('%c[CourseEngine] ❌ imageAgent fallback also failed:%c', 'color: #ef4444;', '', agentErr)
        }

        return null
      }

      cloudflareProvider.recordUsage(true, selectedModel === DEFAULT_CLOUDFLARE_IMAGE_MODEL ? 6 : 20)
      return data.asset
    } catch (err) {
      console.warn('%c[CourseEngine] ⚠️ generateLessonVisualAsset Exception, attempting imageAgent fallback...%c', 'color: #f59e0b; font-weight: bold;', '', {
        error: err,
        model: params.model,
      })
      cloudflareProvider.recordUsage(false)

      try {
        const agentFallback = await imageAgent.process({
          lesson: {
            id: params.lessonId,
            title: params.opportunity.title,
            description: params.opportunity.optimizedPrompt || params.opportunity.visualConcept || params.opportunity.title,
            learningOutcomes: [params.opportunity.educationalObjective || params.opportunity.title],
          } as any,
          courseTitle: params.opportunity.title,
          moduleTitle: params.opportunity.title,
          imageModel: selectedModel,
          preferredStyle: params.visualStyle,
          preferredAspectRatio: params.opportunity.aspectRatio,
        })

        if (agentFallback.success && agentFallback.data) {
          return agentFallback.data
        }
      } catch (fallbackErr) {
        console.error('%c[CourseEngine] ❌ Fallback exception:%c', 'color: #ef4444;', '', fallbackErr)
      }

      return null
    }
  },

  /**
   * Regenerates a single visual asset with updated prompt/model using Cloudflare Workers AI.
   */
  async regenerateCourseVisualAsset(params: {
    assetId?: string
    courseId: string
    moduleId: string
    lessonId: string
    prompt: string
    negativePrompt?: string
    title: string
    altText?: string
    caption?: string
    provider?: string
    costTier?: string
    model?: string
    visualStyle?: string
    aspectRatio?: string
  }): Promise<CourseVisualAsset | null> {
    const opp: VisualOpportunity = {
      shouldGenerate: true,
      purpose: 'visual_refinement',
      educationalObjective: 'Refined educational illustration',
      subject: params.title,
      visualConcept: params.prompt,
      optimizedPrompt: params.prompt,
      negativePrompt: params.negativePrompt,
      placement: 'concept_explanation',
      aspectRatio: params.aspectRatio || '16:9',
      title: params.title,
      altText: params.altText || params.title,
      caption: params.caption,
    }

    return await this.generateLessonVisualAsset({
      courseId: params.courseId,
      moduleId: params.moduleId,
      lessonId: params.lessonId,
      opportunity: opp,
      provider: 'cloudflare',
      costTier: 'free_only',
      model: params.model || DEFAULT_CLOUDFLARE_IMAGE_MODEL,
      visualStyle: params.visualStyle,
    })
  },

  /**
   * Retrieves live Cloudflare Neurons usage and quota statistics
   */
  getCloudflareUsageStats(): CloudflareUsageStats {
    return cloudflareProvider.getUsageStats()
  },

  /**
   * Saves the reviewed blueprint into real Supabase training_modules, content blocks, quizzes, and visual assets.
   */
  async saveBlueprintToDatabase(
    blueprint: CourseBlueprint,
    config: FullCourseGenerationConfig,
    jobId?: string
  ): Promise<{ moduleId: string }> {
    const { data: userAuth } = await supabase.auth.getUser()
    const currentUserId = userAuth?.user?.id

    // 1. Fetch user organization & property
    let userPropertyId: string | null = null
    let userOrgId: string | null = null
    if (currentUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('property_id, organization_id')
        .eq('id', currentUserId)
        .single()
      userPropertyId = profile?.property_id || null
      userOrgId = (profile as any)?.organization_id || null

      if (!userOrgId) {
        const { data: member } = await supabase
          .from('organization_memberships')
          .select('organization_id')
          .eq('user_id', currentUserId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        userOrgId = member?.organization_id || 'e0000000-0000-0000-0000-000000000001'
      }
    }

    // 2. Insert or update training_module
    const { data: moduleData, error: moduleError } = await supabase
      .from('training_modules')
      .insert({
        title: blueprint.title,
        description: blueprint.description,
        estimated_duration_minutes: blueprint.estimatedDurationMinutes,
        passing_score_percentage: config.quizConfig.passingScore || 80,
        status: 'draft',
        difficulty_level: blueprint.difficulty,
        certificate_enabled: true,
        course_type: blueprint.courseType,
        instructional_strategy: blueprint.instructionalStrategy,
        target_audience: blueprint.targetAudience,
        experience_level: blueprint.experienceLevel,
        prior_knowledge: blueprint.priorKnowledge,
        generation_mode: config.generationMode,
        generation_job_id: jobId || null,
        blueprint: blueprint as any,
        quality_score: blueprint.qualityScore || 90,
        qa_report: blueprint.qaReport as any,
        created_by: currentUserId,
        organization_id: userOrgId,
        property_id: userPropertyId,
      })
      .select('id')
      .single()

    if (moduleError || !moduleData) {
      throw new Error(`Failed to create training module: ${moduleError?.message || 'Unknown error'}`)
    }

    const moduleId = moduleData.id

    // 3. Auto-attach every source document that grounded this generation. The
    //    files are stored once (documents rows) — this only records the link
    //    (course_source_documents). Idempotent, so a regeneration re-affirms the
    //    same links. Visibility follows the document; nothing is made public.
    try {
      const refs = Array.isArray(config.sourceDocuments) ? config.sourceDocuments : []
      const legacyId = config.sourceDocumentId
      const allRefs = legacyId && !refs.some((r) => r.documentId === legacyId)
        ? [...refs, { documentId: legacyId, originalFilename: 'Source document', uploaded: false }]
        : refs
      if (allRefs.length > 0) {
        const { linkSourceDocuments } = await import('@/lib/documentAttachments')
        await linkSourceDocuments(moduleId, allRefs, jobId)
      }
    } catch (docErr) {
      console.warn('Could not link source documents to the course:', docErr)
    }

    // 4. Emit faithful content blocks from the blueprint.
    //
    // A single source-of-truth mapping (src/lib/ai/blueprintToBlocks.ts) turns
    // the rich blueprint (per-component lesson structure, Arabic content,
    // learning outcomes, visual assets, lesson/module/final quizzes, course
    // objectives & takeaways) into ordered Training Builder blocks. Both this
    // save path and the builder's hydration read the same `documents` rows.
    const drafts = blueprintToBlockDrafts(blueprint, {
      defaultLessonDurationMinutes:
        typeof config.granularity?.lessonDuration === 'number' ? config.granularity.lessonDuration : 15,
    })

    /**
     * Create a real `learning_quizzes` row plus linked `unified_questions` /
     * `unified_question_options` / `unified_quiz_questions`. Returns the quiz id
     * and how many questions were actually linked (0 => caller must NOT attach a
     * mandatory quiz block, or module completion is permanently blocked).
     */
    const persistQuiz = async (
      quiz: QuizBlueprint,
      meta: { title: string; description: string; passingScore: number; timeLimitMinutes: number; maxAttempts: number },
    ): Promise<{ id: string; linked: number } | null> => {
      const { data: createdQuiz, error: quizError } = await supabase
        .from('learning_quizzes')
        .insert({
          title: meta.title,
          description: meta.description,
          training_module_id: moduleId,
          organization_id: userOrgId,
          passing_score_percentage: meta.passingScore,
          time_limit_minutes: meta.timeLimitMinutes,
          max_attempts: meta.maxAttempts,
          status: 'published',
          created_by: currentUserId,
        })
        .select('id')
        .single()

      if (quizError || !createdQuiz) {
        console.warn('Could not create learning_quizzes row:', quizError)
        return null
      }

      let linked = 0
      for (let qIdx = 0; qIdx < quiz.questions.length; qIdx++) {
        const q = quiz.questions[qIdx]
        const questionRow = {
          ...buildUnifiedQuestionRow(q, { trainingModuleId: moduleId, createdBy: currentUserId }),
          organization_id: userOrgId,
        }
        const { data: newQ, error: qErr } = await supabase
          .from('unified_questions')
          .insert(questionRow)
          .select('id')
          .single()

        if (qErr || !newQ) {
          console.warn('unified_questions insert failed:', qErr)
          continue
        }

        const optionRows = buildUnifiedOptionRows(q, newQ.id)
        if (optionRows.length > 0) {
          const { error: optErr } = await supabase.from('unified_question_options').insert(optionRows)
          if (optErr) {
            console.warn('unified_question_options insert failed:', optErr)
            continue
          }
        }

        const { error: linkErr } = await supabase
          .from('unified_quiz_questions')
          .insert(buildQuizQuestionLinkRow(createdQuiz.id, newQ.id, qIdx))
        if (linkErr) {
          console.warn('unified_quiz_questions link failed:', linkErr)
          continue
        }
        linked++
      }

      return { id: createdQuiz.id, linked }
    }

    let blockOrder = 0
    for (const draft of drafts) {
      let quizId: string | null = null

      if (draft.quiz) {
        const cd = draft.contentData as Record<string, unknown>
        const res = await persistQuiz(draft.quiz, {
          title: draft.title,
          description: cd.is_final_assessment
            ? `Certification exam for ${blueprint.title}`
            : `Verification assessment for ${(cd.topic as string) || draft.title}`,
          passingScore: (cd.passing_score as number) || (cd.is_final_assessment ? 85 : 80),
          timeLimitMinutes: cd.is_final_assessment ? 30 : 10,
          maxAttempts: cd.is_final_assessment ? 2 : 3,
        })
        // A mandatory quiz block whose quiz has no linked questions would
        // permanently block module completion — skip the block entirely.
        if (!res || res.linked === 0) {
          console.warn(`Skipping quiz block "${draft.title}" — no questions could be linked`)
          continue
        }
        quizId = res.id
      }

      blockOrder++

      const contentData: Record<string, unknown> = {
        ...draft.contentData,
        section_id: draft.section.id,
        section_title: draft.section.title,
        section_description: draft.section.description || '',
        section_order: draft.section.order,
      }
      if (draft.contentAr && draft.contentAr.trim()) {
        const existing = (contentData.translations && typeof contentData.translations === 'object'
          ? contentData.translations
          : {}) as Record<string, unknown>
        contentData.translations = { ...existing, ar: draft.contentAr }
      }
      if (quizId) contentData.quiz_id = quizId

      const { data: blockData, error: blockErr } = await supabase
        .from('documents')
        .insert({
          training_module_id: moduleId,
          content_type: 'training_block',
          block_type: draft.blockType,
          title: draft.title || 'Lesson block',
          content: draft.content || '',
          content_ar: draft.contentAr && draft.contentAr.trim() ? draft.contentAr : null,
          content_url: draft.contentUrl || null,
          block_order: blockOrder,
          is_mandatory: draft.isMandatory,
          duration_seconds: draft.durationSeconds ?? null,
          ai_generated: true,
          content_data: contentData,
        })
        .select('id')
        .single()

      if (blockErr) {
        console.warn(`Could not insert content block "${draft.title}":`, blockErr)
        continue
      }

      if (draft.visualAsset && blockData?.id) {
        const asset = draft.visualAsset
        try {
          await supabase.from('course_visual_assets').insert({
            course_id: moduleId,
            module_id: String(draft.contentData.module_id ?? asset.module_id ?? ''),
            lesson_id: String(draft.contentData.lesson_id ?? asset.lesson_id ?? ''),
            content_block_id: blockData.id,
            image_url: asset.image_url,
            storage_path: asset.storage_path,
            storage_bucket: asset.storage_bucket || 'content-media',
            title: asset.title,
            title_ar: asset.title_ar,
            alt_text: asset.alt_text,
            alt_text_ar: asset.alt_text_ar,
            caption: asset.caption,
            caption_ar: asset.caption_ar,
            educational_purpose: asset.educational_purpose,
            visual_concept: asset.visual_concept,
            prompt: asset.prompt,
            negative_prompt: asset.negative_prompt,
            aspect_ratio: asset.aspect_ratio || '16:9',
            visual_style: asset.visual_style || 'educational_illustration',
            placement: asset.placement || 'concept_explanation',
            provider: asset.provider || 'cloudflare',
            model: asset.model || DEFAULT_CLOUDFLARE_IMAGE_MODEL,
            status: 'completed',
            order_index: asset.order_index || 0,
            created_by: currentUserId,
          })
        } catch (assetErr) {
          console.warn('Could not persist course visual asset:', assetErr)
        }
      }
    }

    return { moduleId }
  },

  /**
   * Fetches visual assets for a course from Supabase.
   */
  async getCourseVisualAssets(courseId: string): Promise<CourseVisualAsset[]> {
    const { data, error } = await supabase
      .from('course_visual_assets')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (error) {
      console.warn('Error fetching course visual assets:', error)
      return []
    }
    return (data || []) as CourseVisualAsset[]
  },

  /**
   * Updates visual asset metadata (title, alt text, caption, placement).
   */
  async updateVisualAsset(
    assetId: string,
    updates: Partial<CourseVisualAsset>
  ): Promise<CourseVisualAsset> {
    // Draft assets live only in client state — never issue a DB UPDATE with a
    // non-UUID id (that caused the 404/"Not found" save failures). The caller
    // merges the returned object back into local state.
    if (!isPersistedAssetId(assetId)) {
      return {
        ...(updates as CourseVisualAsset),
        id: assetId,
        draft: true,
        updated_at: new Date().toISOString(),
      }
    }

    const { data, error } = await supabase
      .from('course_visual_assets')
      .update({
        title: updates.title,
        title_ar: updates.title_ar,
        alt_text: updates.alt_text,
        alt_text_ar: updates.alt_text_ar,
        caption: updates.caption,
        caption_ar: updates.caption_ar,
        placement: updates.placement,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to update visual asset: ${error?.message || 'Not found'}`)
    }
    return data as CourseVisualAsset
  },

  /**
   * Deletes a visual asset from database.
   */
  async deleteVisualAsset(assetId: string): Promise<void> {
    // Draft assets have no DB row — deletion is a client-state operation only.
    if (!isPersistedAssetId(assetId)) return

    const { error } = await supabase
      .from('course_visual_assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      throw new Error(`Failed to delete visual asset: ${error.message}`)
    }
  },

  /**
   * Fetches saved generation presets.
   */
  async getPresets(): Promise<CourseGenerationPreset[]> {
    const { data, error } = await supabase
      .from('course_generation_presets')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching course generation presets:', error)
      return []
    }
    return (data || []) as CourseGenerationPreset[]
  },

  /**
   * Saves a custom generation preset.
   */
  async saveCustomPreset(params: {
    name: string
    description?: string
    config: FullCourseGenerationConfig
  }): Promise<CourseGenerationPreset> {
    const { data: userAuth } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('course_generation_presets')
      .insert({
        name: params.name,
        description: params.description,
        is_system: false,
        preset_config: params.config as any,
        created_by: userAuth?.user?.id || null,
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to save preset: ${error?.message || 'Unknown error'}`)
    }
    return data as CourseGenerationPreset
  },

  /**
   * Fetches previous course generation jobs.
   */
  async getGenerationHistory(): Promise<CourseGenerationJob[]> {
    const { data, error } = await supabase
      .from('course_generation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.warn('Error fetching course generation jobs:', error)
      return []
    }
    return (data || []) as CourseGenerationJob[]
  },

  /**
   * Performs an in-place AI rewrite or transformation on a course component.
   */
  async refineComponent(params: {
    componentType: 'lesson' | 'quiz' | 'objective' | 'summary'
    currentContent: string
    action: string
    customInstruction?: string
    language?: string
    preferredModel?: string
  }): Promise<string> {
    return await refineCourseComponent(params)
  },
}
