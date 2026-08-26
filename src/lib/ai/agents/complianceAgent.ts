/**
 * KSA Hospitality Regulatory Compliance Auditor Agent
 * 
 * Audits synthesized training courses against:
 * 1. Saudi Ministry of Tourism (MT) 5-Star Hotel Operational Standards
 * 2. Balady Municipal Food Safety & HACCP Hygiene Codes
 * 3. Saudi Civil Defense Emergency & Evacuation Mandates
 * 4. Saudi Labor Law & Saudization Directives
 * 5. ZATCA E-Invoicing & Financial Transparency
 */

import { complianceShield, type ComplianceAuditReport } from '@/lib/ai/complianceShield'
import type { CourseBlueprint } from '@/types/aiCourseEngine'
import { BaseAIAgent, type AgentExecutionOptions } from './baseAgent'
import type { AgentExecutionResult, AgentRole } from './types'

export interface ComplianceAgentInput {
  blueprint: CourseBlueprint
  propertyId?: string
}

export class ComplianceAgent extends BaseAIAgent<ComplianceAgentInput, ComplianceAuditReport> {
  public readonly role: AgentRole = 'compliance'
  public readonly name = 'KSA Regulatory Compliance & Brand Shield Agent'
  public readonly nameAr = 'مدقق الامتثال للأنظمة واللوائح السعودية'

  public readonly defaultSystemPrompt = `You are the Chief Legal and Regulatory Compliance Officer for ALTUS Hospitality Group in the Kingdom of Saudi Arabia.
Audit operational workflows against Ministry of Tourism, Balady, Civil Defense, and Saudi Labor Law.`

  public async process(
    input: ComplianceAgentInput,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<ComplianceAuditReport>> {
    // Map blueprint modules into training sections format for compliance shield
    const sections = input.blueprint.modules.map((m, mIdx) => ({
      id: m.id || `sec-${mIdx}`,
      title: m.title,
      description: m.description,
      blocks: m.lessons.map((l, lIdx) => ({
        id: l.id || `blk-${mIdx}-${lIdx}`,
        title: l.title,
        content: l.renderedHtml || l.description || '',
        type: 'text' as const,
      })),
    }))

    // Execute 5-authority regulatory audit
    const report = complianceShield.auditModule(sections as any)

    return {
      agentRole: this.role,
      success: true,
      data: report,
      rawOutput: `Checked ${report.totalRulesChecked} KSA regulations. Score: ${report.score}/100. Status: ${report.status}`,
      modelUsed: 'allam-2-7b',
      providerUsed: 'groq',
      costTier: 'free',
      estimatedCostUSD: 0,
      latencyMs: 50,
    }
  }
}

export const complianceAgent = new ComplianceAgent()
