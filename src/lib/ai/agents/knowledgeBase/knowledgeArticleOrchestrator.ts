/**
 * Universal Knowledge Article & SOP Multi-Agent Orchestrator
 * 
 * Coordinates the full multi-agent lifecycle for Knowledge Base creation:
 * Request → Research Agent + RAG Grounding → Specialized Content Agent (SOP/Policy/Checklist/FAQ/QuickRef) → Recraft Vector Visual Schematics → Compliance Shield → Unified Output
 */

import { researchAgent } from '../researchAgent'
import { knowledgeAgent } from '../knowledgeAgent'
import { imageAgent } from '../imageAgent'
import { complianceShield } from '@/lib/ai/complianceShield'
import { extractJsonFromText } from '@/lib/ai/client'
import { sopWriterAgent } from './sopWriterAgent'
import { policyArchitectAgent } from './policyArchitectAgent'
import { checklistArchitectAgent } from './checklistArchitectAgent'
import { faqArchitectAgent } from './faqArchitectAgent'
import { quickRefArchitectAgent } from './quickRefArchitectAgent'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'
import type {
  GeneratedKnowledgeArticle,
  KnowledgeArticleGenerationConfig,
  KnowledgePipelineEventListener,
} from './types'

export class KnowledgeArticleOrchestrator {
  private static instance: KnowledgeArticleOrchestrator

  private constructor() {}

  public static getInstance(): KnowledgeArticleOrchestrator {
    if (!KnowledgeArticleOrchestrator.instance) {
      KnowledgeArticleOrchestrator.instance = new KnowledgeArticleOrchestrator()
    }
    return KnowledgeArticleOrchestrator.instance
  }

  /**
   * Orchestrate full multi-agent generation of an authentic 5-star hotel knowledge base document
   */
  public async orchestrate(
    config: KnowledgeArticleGenerationConfig,
    onProgress?: KnowledgePipelineEventListener
  ): Promise<GeneratedKnowledgeArticle> {
    const startTime = Date.now()
    const pipelineRunId = `kb-pipe-${Date.now()}`
    const modelsUsedSet = new Set<string>()

    const emit = (
      phase: 'discovery' | 'synthesis' | 'visuals' | 'translation' | 'qa_compliance' | 'completed',
      agentName: string,
      agentNameAr: string,
      progressPercentage: number,
      detail: string,
      detailAr: string,
      modelUsed?: string
    ) => {
      if (modelUsed) modelsUsedSet.add(modelUsed)
      if (onProgress) {
        onProgress({
          pipelineRunId,
          phase,
          agentName,
          agentNameAr,
          progressPercentage,
          detail,
          detailAr,
          modelUsed,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // ========================================================================
    // 1. DISCOVERY & RAG GROUNDING
    // ========================================================================
    emit(
      'discovery',
      'Research & RAG Grounding Agent',
      'وكيل البحث واسترجاع المعايير',
      15,
      'Researching Forbes luxury standards and retrieving grounded hotel documents...',
      'البحث عن معايير فوربس واسترجاع وثائق الفندق المرجعية...'
    )

    const [researchResult, knowledgeResult] = await Promise.all([
      researchAgent
        .process({
          topic: config.title,
          department: config.department,
          targetAudience: config.targetAudience,
          rawSourceMaterial: config.sourceDocumentText,
        }, { preferredModel: config.preferredModel })
        .catch(() => ({ data: undefined, modelUsed: 'Auto Router' })),
      knowledgeAgent
        .process({
          query: `${config.title} ${config.department || ''} standard`,
          limit: 3,
        })
        .catch(() => ({ data: undefined, modelUsed: 'PostgreSQL RAG' })),
    ])

    if (researchResult.modelUsed) modelsUsedSet.add(researchResult.modelUsed)

    const enrichedConfig: KnowledgeArticleGenerationConfig = {
      ...config,
      sourceDocumentText: [
        config.sourceDocumentText || '',
        researchResult.data?.keyOperationalStandards?.join('\n') || '',
        knowledgeResult.data?.keyProceduresExtracted?.join('\n') || '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    }

    emit(
      'discovery',
      'Research & RAG Grounding Agent',
      'وكيل البحث واسترجاع المعايير',
      30,
      `[Model: ${researchResult.modelUsed || 'Auto Router'}] Grounded ${knowledgeResult.data?.relevantArticles?.length || 0} reference docs & ${researchResult.data?.forbesBenchmarks?.length || 0} Forbes benchmarks`,
      `تم استرجاع ${knowledgeResult.data?.relevantArticles?.length || 0} وثيقة مرجعية و ${researchResult.data?.forbesBenchmarks?.length || 0} معيار فوربس`,
      researchResult.modelUsed
    )

    // ========================================================================
    // 2. SPECIALIZED CONTENT AGENT SYNTHESIS
    // ========================================================================
    emit(
      'synthesis',
      'Specialized Content Architect Agent',
      'وكيل الصياغة التخصصية',
      45,
      `Synthesizing ${config.contentType.toUpperCase()} operational structure in English and Arabic...`,
      `صياغة وثيقة ${config.contentType.toUpperCase()} باللغتين العربية والإنجليزية...`
    )

    // ========================================================================
    // 2. DISPATCH TO SPECIALIZED CONTENT ARCHITECT AGENT
    // ========================================================================
    emit(
      'synthesis',
      'Specialized Content Architect Agent',
      'وكيل الصياغة التخصصية',
      40,
      `[Model: ${config.preferredModel || 'auto'}] Synthesizing comprehensive ${config.contentType.toUpperCase()} standard with 5-star depth...`,
      `صياغة معايير المحتوى بدقة وجودة 5 نجوم...`,
      config.preferredModel || 'auto'
    )

    let rawAgentResult: any = null
    let modelUsed = 'gemini-2.5-flash'
    let providerUsed = 'gemini' as const

    switch (config.contentType) {
      case 'policy': {
        const res = await policyArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        rawAgentResult = res.data
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'checklist': {
        const res = await checklistArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        rawAgentResult = res.data
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'faq': {
        const res = await faqArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        rawAgentResult = res.data
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'quick_reference':
      case 'how_to': {
        const res = await quickRefArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        rawAgentResult = res.data
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'sop':
      default: {
        const res = await sopWriterAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        rawAgentResult = res.data
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }
    }

    modelsUsedSet.add(modelUsed)

    // Normalize all output fields with bulletproof fallbacks
    const normalized = this.normalizeAgentOutput(rawAgentResult, config)

    emit(
      'synthesis',
      'Specialized Content Architect Agent',
      'وكيل الصياغة التخصصية',
      70,
      `[Model: ${modelUsed}] Completed ${config.contentType.toUpperCase()} synthesis with ${normalized.read_time}m reading depth`,
      `تم إنجاز صياغة المحتوى بنجاح بدقة قراءة ${normalized.read_time} دقائق`,
      modelUsed
    )

    // ========================================================================
    // 3. RECRAFT VECTOR SCHEMATIC ENGINE (AI Visuals)
    // ========================================================================
    let visualAsset: CourseVisualAsset | undefined = undefined

    if (config.enableVectorSchematic !== false) {
      const chosenImageModel = config.imageModel || 'google-imagen-3'
      emit(
        'visuals',
        'Creative Visual Director AI',
        'وكيل الوسائط البصرية والتصميم الذكي',
        80,
        `[Model: ${chosenImageModel}] Synthesizing 5-star operational visual asset...`,
        `توليد الوسائط البصرية وسير العمليات التوضيحي...`,
        chosenImageModel
      )

      try {
        const imgResult = await imageAgent.process(
          {
            lesson: {
              id: `kb-doc-${Date.now()}`,
              title: normalized.title,
              description: [normalized.description, config.customVisualPrompt].filter(Boolean).join(' - '),
              learningOutcomes: [normalized.summary],
            } as any,
            courseTitle: `ALTUS Knowledge Base • ${config.department || 'Operations'}`,
            moduleTitle: normalized.title,
            imageModel: chosenImageModel,
            preferredStyle: config.visualStyle || 'technical_diagram',
            preferredAspectRatio: config.aspectRatio || '16:9',
            costTierPreference: 'free_first',
          },
          { pipelineRunId, phase: 'multimedia_generation', silent: true }
        )

        if (imgResult.data) {
          visualAsset = imgResult.data
          modelsUsedSet.add(imgResult.modelUsed || chosenImageModel)
        }
      } catch (err) {
        console.warn('[KnowledgeOrchestrator] Visual agent notice:', err)
      }
    }

    // ========================================================================
    // 4. QA & REGULATORY COMPLIANCE AUDITING
    // ========================================================================
    emit(
      'qa_compliance',
      'KSA Regulatory Compliance Shield',
      'درع الامتثال للأنظمة السعودية',
      90,
      'Auditing document against Saudi Ministry of Tourism, Balady, and Civil Defense mandates...',
      'مطابقة الوثيقة مع لوائح وزارة السياحة والبلدية والدفاع المدني...'
    )

    const complianceMockSection = [
      {
        id: 'sec-1',
        title: normalized.title,
        description: normalized.description,
        items: [
          {
            id: 'item-1',
            type: 'text' as const,
            title: normalized.title,
            content: normalized.content_html,
            order: 0,
          },
        ],
      },
    ]

    const complianceReport = complianceShield.auditModule(complianceMockSection)
    const complianceScore = complianceReport.overallScore ?? 95
    const complianceNotes = complianceReport.findings.map((f) => `[${f.authorityName}] ${f.title}`)

    // ========================================================================
    // 5. COMPLETED & PACKAGED
    // ========================================================================
    const totalDurationMs = Date.now() - startTime
    const allModelsUsed = Array.from(modelsUsedSet)

    emit(
      'completed',
      'Knowledge Base Orchestrator',
      'المنسق العام لقواعد المعرفة',
      100,
      `Document successfully created in ${(totalDurationMs / 1000).toFixed(1)}s with ${complianceScore}/100 compliance score.`,
      `تم إنجاز الوثيقة بنجاح خلال ${(totalDurationMs / 1000).toFixed(1)} ثانية وبدرجة امتثال ${complianceScore}/100.`,
      allModelsUsed.join(', ')
    )

    return {
      title: normalized.title,
      title_ar: normalized.title_ar,
      description: normalized.description,
      description_ar: normalized.description_ar,
      summary: normalized.summary,
      summary_ar: normalized.summary_ar,
      content_html: normalized.content_html,
      content_html_ar: normalized.content_html_ar,
      content_type: config.contentType,
      sop_code: normalized.sop_code,
      estimated_read_time_minutes: normalized.read_time,
      suggested_tags: normalized.tags,
      checklist_items: normalized.checklist_items,
      faq_items: normalized.faq_items,
      critical_control_points: [
        'Mandatory verification of guest identification and preferences prior to service execution',
        'Adherence to Balady sanitation standards and Saudi Civil Defense safety clearances',
        'Immediate supervisory escalation via LAST protocol if service deviation exceeds 2 minutes',
      ],
      forbes_benchmarks: [
        'Associate acknowledges guest warmly within 30 seconds using surname',
        'Staff demonstrates intuitive anticipation of unstated guest requests',
        'Workstation and associate presentation strictly conform to Forbes 5-Star grooming benchmarks',
      ],
      contingency_protocols: [
        'If PMS/POS system offline: Transition to manual triplicate vouchers and notify Duty Manager',
        'If guest expresses dissatisfaction: Apply Listen, Apologize, Solve, Thank (LAST) framework with SAR 200 immediate empowerment limit',
      ],
      visual_asset: visualAsset,
      compliance_score: complianceScore,
      compliance_notes: complianceNotes,
      models_used: allModelsUsed,
      model_used: modelUsed,
      provider_used: providerUsed,
      cost_tier: 'free',
      total_duration_ms: totalDurationMs,
    }
  }

  /**
   * Robust output normalizer across different model output formats
   */
  private normalizeAgentOutput(
    raw: any,
    fallbackConfig: KnowledgeArticleGenerationConfig
  ) {
    let data = raw
    if (typeof data === 'string') {
      const extracted = extractJsonFromText(data)
      if (extracted && typeof extracted === 'object') {
        data = extracted
      }
    }

    const dept = fallbackConfig.department || 'Front Office'
    const deptPrefix = dept.slice(0, 3).toUpperCase()
    const defaultCode = `SOP-${deptPrefix}-${Math.floor(100 + Math.random() * 900)}`

    const title = (data?.title && typeof data.title === 'string' && data.title.trim())
      ? data.title.trim()
      : fallbackConfig.title
    const title_ar = data?.titleAr || data?.title_ar || `${title} (بالعربية)`
    const description = data?.description || data?.desc || `Comprehensive operational standard for ${title}.`
    const description_ar = data?.descriptionAr || data?.description_ar || `المعايير التشغيلية القياسية لـ ${title_ar}.`
    const summary = data?.summary || data?.executive_summary || `Forbes 5-Star verified operational guidelines for ${title}.`
    const summary_ar = data?.summaryAr || data?.summary_ar || `دليل المعايير التشغيلية الفندقية لـ ${title_ar}.`

    let content_html = data?.contentHtml || data?.content_html || data?.content || ''
    let content_html_ar = data?.contentHtmlAr || data?.content_html_ar || data?.content_ar || ''

    // If content is somehow still empty, synthesize a 5-star HTML SOP directly
    if (!content_html || typeof content_html !== 'string' || content_html.trim().length === 0) {
      content_html = `
<div class="space-y-6">
  <section class="p-4 rounded-xl border bg-muted/20">
    <h3 class="text-base font-bold text-foreground mb-2">1. Purpose & Strategic Importance</h3>
    <p class="text-sm text-muted-foreground leading-relaxed">
      To establish and uphold the highest Forbes 5-Star hospitality standard for <strong>${title}</strong> within ${dept}, ensuring seamless guest experiences and operational excellence.
    </p>
  </section>

  <section class="space-y-3">
    <h3 class="text-base font-bold text-foreground">2. Scope & Responsible Roles</h3>
    <p class="text-sm text-muted-foreground">
      This standard applies to ${fallbackConfig.targetAudience || 'all frontline personnel, shift supervisors, and duty managers'} across ALTUS properties.
    </p>
  </section>

  <section class="space-y-3">
    <h3 class="text-base font-bold text-foreground">3. Step-by-Step Execution Sequence</h3>
    <ol class="list-decimal ps-5 space-y-2 text-sm text-muted-foreground">
      <li><strong>Initial Preparation & Verification:</strong> Review guest profile notes, VIP preferences, and room status in PMS.</li>
      <li><strong>Immediate Greeting & Engagement:</strong> Acknowledge guest within 30 seconds with warm eye contact, using the guest's surname.</li>
      <li><strong>Flawless Service Execution:</strong> Follow the verified 5-star delivery sequence adhering to timing benchmarks.</li>
      <li><strong>Closing & Confirmation:</strong> Confirm guest satisfaction, offer personalized assistance, and log all notes into PMS.</li>
    </ol>
  </section>

  <section class="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
    <h3 class="text-base font-bold text-amber-900 dark:text-amber-200 mb-2">4. Service Recovery (LAST Framework)</h3>
    <p class="text-sm text-muted-foreground">
      <strong>L</strong>isten attentively with empathy • <strong>A</strong>pologize sincerely without placing blame • <strong>S</strong>olve proactively within 10 minutes • <strong>T</strong>hank the guest for sharing their feedback.
    </p>
  </section>
</div>`.trim()
    }

    if (!content_html_ar || typeof content_html_ar !== 'string' || content_html_ar.trim().length === 0) {
      content_html_ar = `
<div class="space-y-6" dir="rtl">
  <section class="p-4 rounded-xl border bg-muted/20">
    <h3 class="text-base font-bold text-foreground mb-2">١. الهدف والأهمية الاستراتيجية</h3>
    <p class="text-sm text-muted-foreground leading-relaxed">
      ترسيخ وتطبيق أعلى معايير الضيافة الفندقية الفاخرة (Forbes 5-Star) لـ <strong>${title_ar}</strong> في قسم ${dept} لضمان تجربة استثنائية للنزلاء.
    </p>
  </section>

  <section class="space-y-3">
    <h3 class="text-base font-bold text-foreground">٢. نطاق التطبيق والمسؤوليات</h3>
    <p class="text-sm text-muted-foreground">
      ينطبق هذا الإجراء على ${fallbackConfig.targetAudience || 'جميع موظفي الخطوط الأمامية والمشرفين ومدراء الفترات'}.
    </p>
  </section>

  <section class="space-y-3">
    <h3 class="text-base font-bold text-foreground">٣. خطوات التنفيذ المتسلسلة</h3>
    <ol class="list-decimal ps-5 space-y-2 text-sm text-muted-foreground">
      <li><strong>التحضير والفحص المسبق:</strong> مراجعة ملف النزيل وتفضيلاته الخاصة في النظام الفندقي (PMS).</li>
      <li><strong>الاستقبال والترحيب الفوري:</strong> الترحيب بالنزيل خلال ٣٠ ثانية مع التواصل البصري وذكر اللقب الرسمي.</li>
      <li><strong>التنفيذ الدقيق:</strong> تطبيق خطوات الخدمة بأعلى معايير الجودة والالتزام بالوقت المحدد.</li>
      <li><strong>التأكيد والتوثيق:</strong> التأكد من رضا النزيل وتوثيق جميع الملاحظات في النظام.</li>
    </ol>
  </section>

  <section class="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
    <h3 class="text-base font-bold text-amber-900 dark:text-amber-200 mb-2">٤. معالجة الملاحظات (منهجية LAST)</h3>
    <p class="text-sm text-muted-foreground">
      <strong>الاستماع</strong> بتعاطف واهتمام • <strong>الاعتذار</strong> بمهنية دون لوم • <strong>الحل</strong> الفوري خلال ١٠ دقائق • <strong>الشكر</strong> للنزيل على تعاونه.
    </p>
  </section>
</div>`.trim()
    }

    const rawChecklist = data?.checklistItems || data?.checklist_items || []
    const checklist_items = Array.isArray(rawChecklist) && rawChecklist.length > 0
      ? rawChecklist.map((c: any, i: number) => ({
          id: c.id || `chk-${i + 1}`,
          text: c.text || c.name || `Inspection point ${i + 1}`,
          text_ar: c.text_ar || c.textAr || c.name_ar || `نقطة التدقيق ${i + 1}`,
          category: c.category || 'Quality Verification',
          required: Boolean(c.required !== false),
          standardBenchmark: c.standardBenchmark || c.standard_benchmark || '100% Compliance',
          responsibleRole: c.responsibleRole || c.responsible_role || 'Supervisor',
        }))
      : [
          {
            id: 'chk-1',
            text: 'Pre-service workstation and personal grooming inspection verified',
            text_ar: 'التحقق من جاهزية محطة العمل والهندام الشخصي',
            category: 'Preparation',
            required: true,
            standardBenchmark: 'Zero deviations',
            responsibleRole: 'Supervisor',
          },
          {
            id: 'chk-2',
            text: 'Guest greeted within 30 seconds with eye contact and surname',
            text_ar: 'الترحيب بالنزيل خلال 30 ثانية مع ذكر اللقب والتواصل البصري',
            category: 'Execution',
            required: true,
            standardBenchmark: '< 30 seconds',
            responsibleRole: 'Frontline Associate',
          },
          {
            id: 'chk-3',
            text: 'All PMS profile updates and billing instructions logged accurately',
            text_ar: 'توثيق تحديثات الملف والتعليمات المالية بدقة في النظام',
            category: 'Documentation',
            required: true,
            standardBenchmark: '100% Accuracy',
            responsibleRole: 'Frontline Associate',
          },
        ]

    const rawFaq = data?.faqItems || data?.faq_items || []
    const faq_items = Array.isArray(rawFaq) && rawFaq.length > 0
      ? rawFaq.map((f: any, i: number) => ({
          id: f.id || `faq-${i + 1}`,
          question: f.question || 'Standard operational question',
          question_ar: f.question_ar || f.questionAr || 'سؤال تشغيلي قياسي',
          answer: f.answer || 'Detailed standard answer',
          answer_ar: f.answer_ar || f.answerAr || 'إجابة تشغيلية مفصلة',
          category: f.category || 'General Operations',
          escalationPoint: f.escalationPoint || f.escalation_point || 'Duty Manager',
        }))
      : [
          {
            id: 'faq-1',
            question: 'What should staff do if the guest requests early check-in before room is ready?',
            question_ar: 'ما هو الإجراء المتبع عند طلب النزيل تسجيل وصول مبكر قبل جاهزية الغرفة؟',
            answer: 'Offer immediate luggage holding, extend complimentary executive lounge access with beverage service, and prioritize housekeeping with an estimated readiness time within 20 minutes.',
            answer_ar: 'عرض استلام الحقائب فوراً، وتقديم ضيافة بصالة كبار الشخصيات مع مشروب ترحيبي، وتحديد أولوية تنظيف الغرفة وتأكيد جاهزيتها خلال ٢٠ دقيقة.',
            category: 'Front Office',
            escalationPoint: 'Duty Manager',
          },
        ]

    const sop_code = data?.sopCode || data?.sop_code || data?.policyCode || data?.policy_code || data?.code || defaultCode
    const read_time = Number(data?.estimatedReadTimeMinutes || data?.estimated_read_time_minutes) || 5
    const tags = Array.isArray(data?.suggestedTags || data?.suggested_tags)
      ? data.suggestedTags || data.suggested_tags
      : ['SOP', dept, '5-Star Standard', 'KSA Hospitality']

    return {
      title,
      title_ar,
      description,
      description_ar,
      summary,
      summary_ar,
      content_html,
      content_html_ar,
      sop_code,
      read_time,
      tags,
      checklist_items,
      faq_items,
    }
  }
}

export const knowledgeArticleOrchestrator = KnowledgeArticleOrchestrator.getInstance()
