/**
 * Universal Knowledge Article & SOP Multi-Agent Orchestrator
 * 
 * Coordinates the full multi-agent lifecycle for Knowledge Base creation:
 * Request → Research Agent + RAG Grounding → Specialized Content Agent (SOP/Policy/Checklist/FAQ) → Compliance Shield → Unified Output
 */

import { researchAgent } from '../researchAgent'
import { knowledgeAgent } from '../knowledgeAgent'
import { complianceShield } from '@/lib/ai/complianceShield'
import { sopWriterAgent } from './sopWriterAgent'
import { policyArchitectAgent } from './policyArchitectAgent'
import { checklistArchitectAgent } from './checklistArchitectAgent'
import { faqArchitectAgent } from './faqArchitectAgent'
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

    const emit = (
      phase: 'discovery' | 'synthesis' | 'translation' | 'qa_compliance' | 'completed',
      agentName: string,
      agentNameAr: string,
      progressPercentage: number,
      detail: string,
      detailAr: string
    ) => {
      if (onProgress) {
        onProgress({
          pipelineRunId,
          phase,
          agentName,
          agentNameAr,
          progressPercentage,
          detail,
          detailAr,
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
      20,
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
        })
        .catch(() => ({ data: undefined })),
      knowledgeAgent
        .process({
          query: `${config.title} ${config.department || ''} standard`,
          limit: 3,
        })
        .catch(() => ({ data: undefined })),
    ])

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

    // ========================================================================
    // 2. SPECIALIZED CONTENT AGENT SYNTHESIS
    // ========================================================================
    emit(
      'synthesis',
      'Specialized Content Architect Agent',
      'وكيل الصياغة التخصصية',
      50,
      `Synthesizing ${config.contentType.toUpperCase()} operational structure in English and Arabic...`,
      `صياغة وثيقة ${config.contentType.toUpperCase()} باللغتين العربية والإنجليزية...`
    )

    let generatedTitle = config.title
    let generatedTitleAr = config.title
    let generatedDesc = ''
    let generatedDescAr = ''
    let generatedSummary = ''
    let generatedSummaryAr = ''
    let generatedContentHtml = ''
    let generatedContentHtmlAr = ''
    let sopCode = ''
    let readTimeMinutes = 5
    let suggestedTags: string[] = ['Knowledge Base', config.department || 'Operations']
    let checklistItems: GeneratedKnowledgeArticle['checklist_items'] = undefined
    let faqItems: GeneratedKnowledgeArticle['faq_items'] = undefined
    let modelUsed = 'gemini-2.5-flash'
    let providerUsed = 'gemini' as const

    switch (config.contentType) {
      case 'policy': {
        const res = await policyArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        generatedTitle = res.data.title
        generatedTitleAr = res.data.titleAr
        generatedDesc = res.data.description
        generatedDescAr = res.data.descriptionAr
        generatedSummary = res.data.summary
        generatedSummaryAr = res.data.summaryAr
        generatedContentHtml = res.data.contentHtml
        generatedContentHtmlAr = res.data.contentHtmlAr
        sopCode = res.data.policyCode
        readTimeMinutes = res.data.estimatedReadTimeMinutes
        suggestedTags = res.data.suggestedTags
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'checklist': {
        const res = await checklistArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        generatedTitle = res.data.title
        generatedTitleAr = res.data.titleAr
        generatedDesc = res.data.description
        generatedDescAr = res.data.descriptionAr
        generatedSummary = res.data.summary
        generatedSummaryAr = res.data.summaryAr
        generatedContentHtml = res.data.contentHtml
        generatedContentHtmlAr = res.data.contentHtmlAr
        sopCode = res.data.code
        suggestedTags = res.data.suggestedTags
        checklistItems = res.data.checklistItems
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'faq': {
        const res = await faqArchitectAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        generatedTitle = res.data.title
        generatedTitleAr = res.data.titleAr
        generatedDesc = res.data.description
        generatedDescAr = res.data.descriptionAr
        generatedSummary = res.data.summary
        generatedSummaryAr = res.data.summaryAr
        generatedContentHtml = res.data.contentHtml
        generatedContentHtmlAr = res.data.contentHtmlAr
        sopCode = res.data.code
        suggestedTags = res.data.suggestedTags
        faqItems = res.data.faqItems
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }

      case 'sop':
      default: {
        const res = await sopWriterAgent.process(enrichedConfig, {
          preferredModel: config.preferredModel,
        })
        generatedTitle = res.data.title
        generatedTitleAr = res.data.titleAr
        generatedDesc = res.data.description
        generatedDescAr = res.data.descriptionAr
        generatedSummary = res.data.summary
        generatedSummaryAr = res.data.summaryAr
        generatedContentHtml = res.data.contentHtml
        generatedContentHtmlAr = res.data.contentHtmlAr
        sopCode = res.data.sopCode
        readTimeMinutes = res.data.estimatedReadTimeMinutes
        suggestedTags = res.data.suggestedTags
        checklistItems = res.data.checklistItems
        modelUsed = res.modelUsed
        providerUsed = res.providerUsed
        break
      }
    }

    // ========================================================================
    // 3. QA & REGULATORY COMPLIANCE AUDITING
    // ========================================================================
    emit(
      'qa_compliance',
      'KSA Regulatory Compliance Shield',
      'درع الامتثال للأنظمة السعودية',
      85,
      'Auditing document against Saudi Ministry of Tourism, Balady, and Civil Defense mandates...',
      'مطابقة الوثيقة مع لوائح وزارة السياحة والبلدية والدفاع المدني...'
    )

    const complianceMockSection = [
      {
        id: 'sec-1',
        title: generatedTitle,
        description: generatedDesc,
        items: [
          {
            id: 'item-1',
            type: 'text' as const,
            title: generatedTitle,
            content: generatedContentHtml,
            order: 0,
          },
        ],
      },
    ]

    const complianceReport = complianceShield.auditModule(complianceMockSection)
    const complianceNotes = complianceReport.findings.map((f) => `[${f.authorityName}] ${f.title}`)

    // ========================================================================
    // 4. COMPLETED & PACKAGED
    // ========================================================================
    const totalDurationMs = Date.now() - startTime

    emit(
      'completed',
      'Knowledge Base Orchestrator',
      'المنسق العام لقواعد المعرفة',
      100,
      `Document successfully created in ${(totalDurationMs / 1000).toFixed(1)}s with ${complianceReport.score}/100 compliance score.`,
      `تم إنجاز الوثيقة بنجاح خلال ${(totalDurationMs / 1000).toFixed(1)} ثانية وبدرجة امتثال ${complianceReport.score}/100.`
    )

    return {
      title: generatedTitle,
      title_ar: generatedTitleAr,
      description: generatedDesc,
      description_ar: generatedDescAr,
      summary: generatedSummary,
      summary_ar: generatedSummaryAr,
      content_html: generatedContentHtml,
      content_html_ar: generatedContentHtmlAr,
      content_type: config.contentType,
      sop_code: sopCode,
      estimated_read_time_minutes: readTimeMinutes,
      suggested_tags: suggestedTags,
      checklist_items: checklistItems,
      faq_items: faqItems,
      compliance_score: complianceReport.score,
      compliance_notes: complianceNotes,
      model_used: modelUsed,
      provider_used: providerUsed,
      cost_tier: 'free',
      total_duration_ms: totalDurationMs,
    }
  }
}

export const knowledgeArticleOrchestrator = KnowledgeArticleOrchestrator.getInstance()
