import { describe, it, expect, vi } from 'vitest'
import { complianceShield, KSA_COMPLIANCE_RULES, type ComplianceFinding } from './complianceShield'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

vi.mock('./providers/multiProviderRouter', () => ({
  multiProviderRouter: {
    execute: vi.fn().mockResolvedValue({
      rawText: '> [!NOTE] KSA Compliance: Verified Balady Health certification included.',
    }),
  },
}))

describe('ComplianceShieldEngine', () => {
  it('should have predefined KSA compliance rules for major authorities', () => {
    expect(KSA_COMPLIANCE_RULES.length).toBeGreaterThanOrEqual(5)
    const authorities = KSA_COMPLIANCE_RULES.map((r) => r.authority)
    expect(authorities).toContain('MINISTRY_OF_TOURISM')
    expect(authorities).toContain('BALADY_FOOD_SAFETY')
    expect(authorities).toContain('CIVIL_DEFENSE')
    expect(authorities).toContain('SAUDI_LABOR_LAW')
  })

  it('should flag Balady food safety temperature danger zone omission in kitchen training', () => {
    const kitchenSections = [
      {
        id: 'sec-1',
        title: 'Buffet Setup & Food Presentation',
        description: 'Managing the hot and cold buffet station items',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Holding food on the display line',
            content: 'Keep the buffet food on display for 4 hours during lunch peak.',
            order: 0,
          },
        ],
      },
    ]

    const report = complianceShield.auditModule(kitchenSections as unknown as TrainingSection[])
    expect(report.score).toBeLessThan(100)
    expect(report.findings.length).toBeGreaterThan(0)
    const baladyFinding = report.findings.find((f) => f.authority === 'BALADY_FOOD_SAFETY')
    expect(baladyFinding).toBeDefined()
  })

  it('should pass audit with 100 score when compliant terms and bilingual SOPs are present', () => {
    const compliantSections = [
      {
        id: 'sec-2',
        title: 'Front Office VIP Arrival & Reception Check-in',
        description: 'Bilingual Saudi Arabic & English luxury check-in process',
        order: 0,
        items: [
          {
            id: 'item-2',
            type: 'text',
            title: 'Registration Card and Rates in SAR',
            content:
              'Display rates in SAR with 15% VAT. Welcome guest in Arabic and English following Ministry of Tourism bilingual guidelines.',
            order: 0,
          },
        ],
      },
    ]

    const report = complianceShield.auditModule(compliantSections as unknown as TrainingSection[])
    expect(report.status).toBe('EXCELLENT')
    expect(report.criticalCount).toBe(0)
  })

  it('should auto-remediate non-compliant section by appending compliance standard', async () => {
    const section = {
      id: 'sec-3',
      title: 'Kitchen Hygiene & Food Prep',
      order: 0,
      items: [
        {
          id: 'item-3',
          type: 'text',
          title: 'Daily Line Check',
          content: 'Check inventory.',
          order: 0,
        },
      ],
    }

    const finding = {
      id: 'f-1',
      ruleId: 'BALADY-001',
      authority: 'BALADY_FOOD_SAFETY' as const,
      authorityName: 'Balady Municipal Food Safety',
      title: 'HACCP Danger Zone',
      titleAr: 'النطاق الحراري الخطر',
      severity: 'CRITICAL' as const,
      sectionIndex: 0,
      sectionTitle: 'Kitchen Hygiene',
      recommendation: 'Monitor cold holding <= 4°C.',
      recommendationAr: 'مراقبة التبريد تحت 4 مئوية.',
      canAutoFix: true,
    }

    const remediated = await complianceShield.autoRemediateSection(
      section as unknown as TrainingSection,
      finding as unknown as ComplianceFinding,
      'en',
    )
    expect(remediated.items.length).toBeGreaterThan(1)
    expect(remediated.items[1].title).toContain('KSA Compliance')
  })
})
