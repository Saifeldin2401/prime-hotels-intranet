/**
 * Corporate & Hotel Policy Architect Agent
 * 
 * Synthesizes formal hotel governance policies, employee codes of conduct,
 * food hygiene protocols, and security policies aligned with Saudi Labor Law and Ministry of Tourism.
 */

import { BaseAIAgent, type AgentExecutionOptions } from '../baseAgent'
import type { AgentExecutionResult, AgentRole } from '../types'
import type { KnowledgeArticleGenerationConfig } from './types'

export interface PolicyWriterOutput {
  policyCode: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  summary: string
  summaryAr: string
  contentHtml: string
  contentHtmlAr: string
  estimatedReadTimeMinutes: number
  suggestedTags: string[]
  enforcementMechanism: string
  enforcementMechanismAr: string
}

export class PolicyArchitectAgent extends BaseAIAgent<KnowledgeArticleGenerationConfig, PolicyWriterOutput> {
  public readonly role: AgentRole = 'content_writer'
  public readonly name = 'Corporate & Hotel Policy Architect Agent'
  public readonly nameAr = 'مهندس السياسات الفندقية والحوكمة المؤسسية'

  public readonly defaultSystemPrompt = `You are the Chief Legal & Corporate Governance Officer for ALTUS Hospitality Group in KSA.
You draft authoritative, fair, and legally compliant hotel policies.`

  public async process(
    input: KnowledgeArticleGenerationConfig,
    options: AgentExecutionOptions = {}
  ): Promise<AgentExecutionResult<PolicyWriterOutput>> {
    const dept = input.department || 'Human Resources & Corporate Governance'
    const deptPrefix = dept.slice(0, 3).toUpperCase()
    const policyCode = `POL-${deptPrefix}-${Math.floor(100 + Math.random() * 900)}`

    const prompt = `Draft a formal corporate/hotel policy document for:
Policy Title: "${input.title}"
Department: ${dept}
Target Audience: ${input.targetAudience || 'All Hotel Employees'}
Policy Code: ${policyCode}

Structure of "contentHtml":
- <h3>1. Policy Statement & Organizational Objective</h3>
- <h3>2. Scope & Applicability</h3>
- <h3>3. Governance Definitions & Acronyms</h3>
- <h3>4. Policy Standards & Employee Obligations</h3>
- <h3>5. Prohibited Conduct & Critical Exceptions</h3>
- <h3>6. Compliance Monitoring & Auditing Procedures</h3>
- <h3>7. Disciplinary Actions & Non-Compliance Escalation (Saudi Labor Law Alignment)</h3>
- <h3>8. Policy Administration & Annual Review Date</h3>

Output JSON ONLY:
{
  "policyCode": "${policyCode}",
  "title": "${input.title}",
  "titleAr": "عنوان السياسة بالعربية",
  "description": "Formal executive scope of this policy",
  "descriptionAr": "النطاق التنفيذي للسياسة بالعربية",
  "summary": "Executive summary of key employee rules in 2-3 sentences",
  "summaryAr": "ملخص تنفيذي لأهم القواعد باللغة العربية",
  "contentHtml": "<div class=\\"space-y-4\\">...complete semantic policy HTML...</div>",
  "contentHtmlAr": "<div class=\\"space-y-4\\" dir=\\"rtl\\">...complete Arabic policy HTML...</div>",
  "estimatedReadTimeMinutes": 6,
  "suggestedTags": ["Policy", "${dept}", "Compliance", "Governance"],
  "enforcementMechanism": "Monitored via quarterly HR compliance audits and department head reviews.",
  "enforcementMechanismAr": "تتم المتابعة عبر التدقيق الربع سنوي للموارد البشرية ومراجعة رؤساء الأقسام."
}`

    return this.executePrompt<PolicyWriterOutput>(prompt, {
      ...options,
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
    })
  }
}

export const policyArchitectAgent = new PolicyArchitectAgent()
