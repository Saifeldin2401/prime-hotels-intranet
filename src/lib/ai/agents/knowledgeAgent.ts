/**
 * Knowledge Base (RAG) Grounding Agent
 * 
 * Interrogates the published PostgreSQL hotel knowledge repository using full-text search,
 * extracts authentic Standard Operating Procedures (SOPs), and synthesizes grounded context blocks
 * with citation metadata for downstream curriculum and content synthesis.
 */

import { searchHotelKnowledge, buildGroundedContext, type ArticleSource } from '@/lib/ai/rag'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface KnowledgeAgentInput {
  query: string
  propertyId?: string | null
  departmentId?: string | null
  contentType?: string
  limit?: number
}

export interface GroundedKnowledgeResult {
  hasGroundedSources: boolean
  sources: ArticleSource[]
  groundedContextText: string
  keyProceduresExtracted: string[]
  keyProceduresExtractedAr: string[]
}

export class KnowledgeAgent extends BaseAIAgent<KnowledgeAgentInput, GroundedKnowledgeResult> {
  public readonly role: AgentRole = 'knowledge'
  public readonly name = 'Knowledge Base & RAG Grounding Agent'
  public readonly nameAr = 'وكيل استرجاع المعرفة والإجراءات القياسية (RAG)'

  public readonly defaultSystemPrompt = `You are the Master Knowledge Base Librarian for the hotel group.
Your role is to analyze hotel SOP articles, extract core procedural sequences, and formulate structured citations.`

  public async process(
    input: KnowledgeAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<GroundedKnowledgeResult>> {
    // 1. Fetch real PostgreSQL SOP documents using full-text search
    const sources = await searchHotelKnowledge(input.query, {
      limit: input.limit || 5,
      propertyId: input.propertyId,
      departmentId: input.departmentId,
      contentType: input.contentType,
    })

    const groundedContextText = buildGroundedContext(input.query, sources)

    if (sources.length === 0) {
      return {
        agentRole: this.role,
        success: true,
        data: {
          hasGroundedSources: false,
          sources: [],
          groundedContextText: '',
          keyProceduresExtracted: [],
          keyProceduresExtractedAr: [],
        },
        rawOutput: 'No existing knowledge base SOP articles matched this query.',
        modelUsed: 'local_postgres_fts',
        providerUsed: 'gemini',
        costTier: 'free',
        estimatedCostUSD: 0,
        latencyMs: 15,
      }
    }

    // 2. Synthesize procedural bullet points from real document sources
    const prompt = `Analyze these ${sources.length} hotel SOP documents and extract the top mandatory procedural rules and steps:

${groundedContextText}

Respond ONLY with a JSON object:
{
  "keyProceduresExtracted": [
    "Extracted SOP rule 1 with citation [SOURCE 1]",
    "Extracted SOP rule 2"
  ],
  "keyProceduresExtractedAr": [
    "قاعدة تشغيلية مستخرجة 1",
    "قاعدة تشغيلية مستخرجة 2"
  ]
}`

    const extractionResult = await this.executePrompt<{
      keyProceduresExtracted: string[]
      keyProceduresExtractedAr: string[]
    }>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.2,
    })

    return {
      agentRole: this.role,
      success: true,
      data: {
        hasGroundedSources: true,
        sources,
        groundedContextText,
        keyProceduresExtracted: extractionResult.data.keyProceduresExtracted || [],
        keyProceduresExtractedAr: extractionResult.data.keyProceduresExtractedAr || [],
      },
      rawOutput: extractionResult.rawOutput,
      modelUsed: extractionResult.modelUsed,
      providerUsed: extractionResult.providerUsed,
      costTier: extractionResult.costTier,
      estimatedCostUSD: extractionResult.estimatedCostUSD,
      latencyMs: extractionResult.latencyMs,
    }
  }
}

export const knowledgeAgent = new KnowledgeAgent()
