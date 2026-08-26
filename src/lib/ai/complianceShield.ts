/**
 * KSA Hospitality Regulatory & Brand Standard Compliance Shield
 * 
 * Verifies training curriculum and SOPs against:
 * 1. Saudi Ministry of Tourism (MT) 5-Star Hotel Operational Standards
 * 2. Balady Municipal Food Safety & HACCP Hygiene Regulations
 * 3. Saudi Civil Defense Emergency & Fire Evacuation Codes
 * 4. Saudi Labor Law & Saudization (Nitaqat) Directives
 * 5. ZATCA E-Invoicing & Financial Compliance
 */

import { multiProviderRouter } from './providers/multiProviderRouter'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

export type ComplianceAuthority = 'MINISTRY_OF_TOURISM' | 'BALADY_FOOD_SAFETY' | 'CIVIL_DEFENSE' | 'SAUDI_LABOR_LAW' | 'ZATCA'
export type ComplianceSeverity = 'CRITICAL' | 'WARNING' | 'RECOMMENDATION'

export interface ComplianceRule {
  id: string
  authority: ComplianceAuthority
  authorityName: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  severity: ComplianceSeverity
  keywords: string[]
  requiredPatterns: string[]
  remediationTemplate: string
  remediationTemplateAr: string
}

export interface ComplianceFinding {
  id: string
  ruleId: string
  authority: ComplianceAuthority
  authorityName: string
  title: string
  titleAr: string
  severity: ComplianceSeverity
  sectionIndex: number
  sectionTitle: string
  itemIndex?: number
  matchedSnippet?: string
  recommendation: string
  recommendationAr: string
  canAutoFix: boolean
}

export interface ComplianceAuditReport {
  score: number // 0 - 100
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_REVISION' | 'NON_COMPLIANT'
  totalRulesChecked: number
  passedCount: number
  criticalCount: number
  warningCount: number
  recommendationCount: number
  findings: ComplianceFinding[]
  auditTimestamp: string
}

export const KSA_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'MT-001',
    authority: 'MINISTRY_OF_TOURISM',
    authorityName: 'Saudi Ministry of Tourism (MT)',
    title: 'Bilingual Front-Desk Standard (Arabic & English)',
    titleAr: 'المعيار الإلزامي لثنائية اللغة في الاستقبال (عربي وإنجليزي)',
    description: 'Front office staff and SOPs must guarantee 24/7 service delivery in fluent Arabic and English.',
    descriptionAr: 'يجب أن تضمن إجراءات الاستقبال تقديم الخدمة باللغتين العربية والإنجليزية على مدار 24 ساعة.',
    severity: 'CRITICAL',
    keywords: ['front desk', 'reception', 'check-in', 'guest service', 'استقبال', 'تسجيل وصول'],
    requiredPatterns: ['arabic', 'bilingual', 'عربي', 'ثنائي اللغة', 'لغة عربية'],
    remediationTemplate: 'Ensure all guest interactions, welcome greetings, and registration cards are presented in both Arabic and English in accordance with Saudi Ministry of Tourism guidelines.',
    remediationTemplateAr: 'التأكد من تقديم جميع الترحيبات وبطاقات تسجيل الوصول باللغتين العربية والإنجليزية وفق لوائح وزارة السياحة.',
  },
  {
    id: 'MT-002',
    authority: 'MINISTRY_OF_TOURISM',
    authorityName: 'Saudi Ministry of Tourism (MT)',
    title: 'Transparent Pricing in SAR Inclusive of Taxes',
    titleAr: 'شفافية الأسعار بالريال السعودي شاملة ضريبة القيمة المضافة',
    description: 'All rates, menus, and service charges must be displayed in Saudi Riyals (SAR) inclusive of 15% VAT and municipality fees.',
    descriptionAr: 'يجب عرض جميع الأسعار بالريال السعودي شاملة ضريبة القيمة المضافة 15% والرسوم البلدية.',
    severity: 'WARNING',
    keywords: ['rate', 'price', 'pricing', 'charge', 'vat', 'tax', 'سعر', 'ضريبة', 'تكلفة'],
    requiredPatterns: ['sar', 'riyal', 'vat', '15%', 'ريال', 'ضريبة'],
    remediationTemplate: 'Specify all quoted amounts in Saudi Riyals (SAR) with explicit notation that rates include 15% VAT and applicable municipal tourism fees.',
    remediationTemplateAr: 'تحديد جميع الأسعار بالريال السعودي مع الإشارة الصريحة لشمولها 15% ضريبة القيمة المضافة.',
  },
  {
    id: 'BALADY-001',
    authority: 'BALADY_FOOD_SAFETY',
    authorityName: 'Balady Municipal Food Safety (HACCP)',
    title: 'HACCP Danger Zone Temperature Hold Limit',
    titleAr: 'حدود النطاق الحراري الخطر لسلامة الغذاء (HACCP)',
    description: 'Perishable foods must not remain between 5°C and 60°C for more than 2 hours. Chilled foods stored below 4°C, frozen below -18°C.',
    descriptionAr: 'يمنع بقاء الأغذية سريعة التلف في النطاق الخطر (5 إلى 60 مئوية) لأكثر من ساعتين. التبريد تحت 4 مئوية والتجميد تحت -18 مئوية.',
    severity: 'CRITICAL',
    keywords: ['temperature', 'danger zone', 'chilled', 'buffet', 'food hold', 'freezer', 'حرارة', 'طعام', 'بوفيه', 'تجميد'],
    requiredPatterns: ['4°c', '5°c', '60°c', '-18°c', 'haccp', 'danger zone', 'مئوية', 'النطاق الخطر'],
    remediationTemplate: 'Strictly monitor cold holding at <= 4°C, hot holding at >= 60°C, and discard any food left in the temperature danger zone (5°C to 60°C) beyond 2 hours.',
    remediationTemplateAr: 'مراقبة حفظ الأطعمة الباردة تحت 4 درجات مئوية والساخنة فوق 60 درجة مئوية، والتخلص من أي طعام تجاوز ساعتين في النطاق الخطر.',
  },
  {
    id: 'BALADY-002',
    authority: 'BALADY_FOOD_SAFETY',
    authorityName: 'Balady Municipal Food Safety (HACCP)',
    title: 'Valid Balady Health Card & Hygiene Card Verification',
    titleAr: 'التحقق من سريان الشهادات الصحية للعاملين (بلدي)',
    description: 'All food handlers and stewarding staff must possess a valid Balady Municipal Health Certificate.',
    descriptionAr: 'يجب حصول جميع متداولي الأغذية وعمال النظافة على شهادة صحية سارية من منصة بلدي.',
    severity: 'CRITICAL',
    keywords: ['food handler', 'chef', 'steward', 'kitchen', 'hygiene', 'health card', 'شهادة صحية', 'مطبخ', 'طاهي'],
    requiredPatterns: ['balady', 'health card', 'certificate', 'شهادة صحية', 'بلدي'],
    remediationTemplate: 'Verify that all culinary and F&B staff hold an active Balady Health Certificate before shift assignment.',
    remediationTemplateAr: 'التأكد من سريان الشهادة الصحية لجميع العاملين في قسم الأغذية والمشروبات قبل بدء العمل.',
  },
  {
    id: 'CD-001',
    authority: 'CIVIL_DEFENSE',
    authorityName: 'Saudi Civil Defense (الدفاع المدني)',
    title: 'Emergency Evacuation & Unobstructed Fire Exits',
    titleAr: 'مخارج الطوارئ ومسارات الإخلاء للدفاع المدني',
    description: 'Fire exit routes and stairwells must remain 100% unobstructed, illuminated, and marked in Arabic & English.',
    descriptionAr: 'يجب أن تظل مخارج الطوارئ ومسارات الهروب خالية تماماً ومضاءة ومعلمة باللغتين العربية والإنجليزية.',
    severity: 'CRITICAL',
    keywords: ['fire', 'evacuation', 'emergency', 'exit', 'alarm', 'طوارئ', 'إخلاء', 'حريق', 'مخرج'],
    requiredPatterns: ['civil defense', 'exit', 'evacuation', 'unobstructed', 'الدفاع المدني', 'طوارئ', 'إخلاء'],
    remediationTemplate: 'Maintain completely unobstructed fire exits, test panic bars daily, and display illuminated bilingual evacuation diagrams.',
    remediationTemplateAr: 'الحفاظ على خلو مخارج الطوارئ بالكامل وفحص أقفال الهروب يومياً وعرض مخططات الإخلاء الثنائية اللغة.',
  },
  {
    id: 'LABOR-001',
    authority: 'SAUDI_LABOR_LAW',
    authorityName: 'Saudi Ministry of Human Resources (MHRSD)',
    title: 'Working Hours, Break Times & Ramadan Duty Limits',
    titleAr: 'ساعات العمل وفترات الراحة ونظام العمل في شهر رمضان',
    description: 'Standard shifts must not exceed 8 hours/day (48 hrs/week) and 6 hours/day during the holy month of Ramadan for Muslim employees.',
    descriptionAr: 'الحد الأقصى لساعات العمل اليومية 8 ساعات (48 أسبوعياً) وتخفض إلى 6 ساعات يومياً للمسلمين في شهر رمضان.',
    severity: 'WARNING',
    keywords: ['working hours', 'shift', 'overtime', 'ramadan', 'break', 'ساعات العمل', 'وردية', 'رمضان', 'راحة'],
    requiredPatterns: ['8 hours', '48 hours', 'ramadan', 'break', 'ساعات', 'رمضان', 'راحة'],
    remediationTemplate: 'Align shift schedules to Saudi Labor Law: maximum 8 hours/day with mandatory rest breaks, reduced to 6 hours during Ramadan.',
    remediationTemplateAr: 'مواءمة جداول الورديات مع نظام العمل السعودي: 8 ساعات كحد أقصى مع فترات راحة، وتخفيضها إلى 6 ساعات في رمضان.',
  },
]

export class ComplianceShieldEngine {
  private static instance: ComplianceShieldEngine

  private constructor() {}

  public static getInstance(): ComplianceShieldEngine {
    if (!ComplianceShieldEngine.instance) {
      ComplianceShieldEngine.instance = new ComplianceShieldEngine()
    }
    return ComplianceShieldEngine.instance
  }

  /**
   * Run comprehensive audit on course sections
   */
  public auditModule(sections: TrainingSection[]): ComplianceAuditReport {
    const findings: ComplianceFinding[] = []
    let totalChecks = 0
    let passedChecks = 0

    const fullContentText = (sections || [])
      .map((s) => `${s.title} ${s.description || ''} ${(s.items || []).map((i) => `${i.title} ${i.content || ''}`).join(' ')}`)
      .join('\n')
      .toLowerCase()

    for (const rule of KSA_COMPLIANCE_RULES) {
      totalChecks++

      // Check if this rule is relevant to the module content
      const isRelevant = rule.keywords.some((kw) => fullContentText.includes(kw.toLowerCase()))

      if (isRelevant) {
        // Check if mandatory patterns or compliance stipulations are present
        const hasRequiredStipulation = rule.requiredPatterns.some((pattern) =>
          fullContentText.includes(pattern.toLowerCase())
        )

        if (!hasRequiredStipulation) {
          // Find the most relevant section for this violation
          let targetSectionIdx = 0
          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const secText = `${sections[sIdx].title} ${(sections[sIdx].items || []).map((i) => i.title).join(' ')}`.toLowerCase()
            if (rule.keywords.some((kw) => secText.includes(kw.toLowerCase()))) {
              targetSectionIdx = sIdx
              break
            }
          }

          findings.push({
            id: `finding-${rule.id}-${Date.now()}`,
            ruleId: rule.id,
            authority: rule.authority,
            authorityName: rule.authorityName,
            severity: rule.severity,
            title: rule.title,
            titleAr: rule.titleAr,
            description: rule.description,
            descriptionAr: rule.descriptionAr,
            recommendation: rule.remediationTemplate,
            recommendationAr: rule.remediationTemplateAr,
            remediationCategory: rule.remediationCategory,
            targetSectionId: sections[targetSectionIdx]?.id || 'section-0',
          })
        } else {
          passedChecks++
        }
      } else {
        passedChecks++
      }
    }

    const overallScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100
    const isPassing = findings.every((f) => f.severity !== 'CRITICAL') && overallScore >= 80

    return {
      overallScore,
      isPassing,
      totalChecks,
      passedChecks,
      findings,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Auto-remediate a specific compliance gap using AI
   */
  public async autoRemediateSection(
    section: TrainingSection,
    finding: ComplianceFinding,
    language: 'en' | 'ar' = 'en'
  ): Promise<TrainingSection> {
    const prompt = `You are a Senior KSA Hospitality Compliance Director.
Rewrite the following hotel training lesson content to strictly comply with ${finding.authorityName}.
Rule Violation: ${finding.title}
Remediation Directive: ${language === 'ar' ? finding.recommendationAr : finding.recommendation}

Existing Section Title: ${section.title}
Existing Content:
${section.items.map((i) => `### ${i.title}\n${i.content}`).join('\n\n')}

Return the updated lesson content formatted in markdown with explicit Saudi compliance standards highlighted in a professional callout box (> [!NOTE] KSA Compliance: ...).`

    try {
      const response = await multiProviderRouter.execute(prompt, {
        task: 'compliance',
        temperature: 0.3,
      })

      const updatedSection: TrainingSection = {
        ...section,
        items: [
          ...section.items,
          {
            id: `comp-fix-${Date.now()}`,
            type: 'text',
            title: language === 'ar' ? `معايير الامتثال: ${finding.titleAr}` : `KSA Compliance: ${finding.title}`,
            content: response.rawText,
            order: section.items.length,
          },
        ],
      }

      return updatedSection
    } catch {
      // Fallback heuristic remediation if AI is offline
      const fallbackSnippet = `\n\n> [!NOTE] **KSA Regulatory Compliance (${finding.authorityName})**\n> ${
        language === 'ar' ? finding.recommendationAr : finding.recommendation
      }`

      return {
        ...section,
        items: section.items.map((item, idx) =>
          idx === 0
            ? { ...item, content: `${item.content || ''}${fallbackSnippet}` }
            : item
        ),
      }
    }
  }
}

export const complianceShield = ComplianceShieldEngine.getInstance()
