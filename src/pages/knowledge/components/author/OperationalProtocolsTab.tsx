import { ChecklistBuilder, FAQBuilder, StringListBuilder } from '@/components/knowledge'
import type { ChecklistItem, FAQItem } from '@/types/knowledge'
import { LifeBuoy, ShieldAlert, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface OperationalProtocolsTabProps {
  checklistItems: ChecklistItem[]
  onChecklistChange: (items: ChecklistItem[]) => void
  criticalControlPoints: string[]
  onCriticalControlPointsChange: (items: string[]) => void
  serviceBenchmarks: string[]
  onServiceBenchmarksChange: (items: string[]) => void
  contingencyProtocols: string[]
  onContingencyProtocolsChange: (items: string[]) => void
  faqItems: FAQItem[]
  onFaqItemsChange: (items: FAQItem[]) => void
  title: string
  isGenerating: boolean
  onGenerateWithAI: (action: 'checklist' | 'faqs') => void
}

export function OperationalProtocolsTab({
  checklistItems,
  onChecklistChange,
  criticalControlPoints,
  onCriticalControlPointsChange,
  serviceBenchmarks,
  onServiceBenchmarksChange,
  contingencyProtocols,
  onContingencyProtocolsChange,
  faqItems,
  onFaqItemsChange,
  title,
  isGenerating,
  onGenerateWithAI,
}: OperationalProtocolsTabProps) {
  const { t } = useTranslation(['knowledge', 'common'])

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-4 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">
            {t('editor.operational_standards_title', 'Operational Protocols & Execution Standards')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              'editor.operational_standards_desc',
              'Structured checklists, brand benchmarks, critical control points, and contingency actions that ensure operational compliance.'
            )}
          </p>
        </div>
      </div>

      {/* 1. Interactive Execution Checklist Builder */}
      <div>
        <ChecklistBuilder
          items={checklistItems || []}
          onChange={onChecklistChange}
          onAIGenerate={() => onGenerateWithAI('checklist')}
          isGenerating={isGenerating}
          title={title}
        />
      </div>

      {/* 2. Critical Control Points */}
      <div>
        <StringListBuilder
          items={criticalControlPoints || []}
          onChange={onCriticalControlPointsChange}
          title={t('editor.critical_control_points', 'Critical Control Points (CCPs)')}
          description={t(
            'editor.ccp_desc',
            'Non-negotiable checkpoints where a failure has a serious operational, safety or compliance impact.'
          )}
          icon={<ShieldAlert className="h-4 w-4" />}
          accentClassName="text-red-500"
          placeholder={t(
            'editor.ccp_placeholder',
            'e.g. Verify guest identity before issuing a duplicate room key'
          )}
          addLabel={t('editor.add_ccp', 'Add CCP')}
        />
      </div>

      {/* 3. Five-Star Service Benchmarks */}
      <div>
        <StringListBuilder
          items={serviceBenchmarks || []}
          onChange={onServiceBenchmarksChange}
          title={t('editor.service_benchmarks', 'Five-Star Service Benchmarks')}
          description={t(
            'editor.luxury_desc',
            'Measurable luxury-service standards this procedure must meet.'
          )}
          icon={<Star className="h-4 w-4" />}
          accentClassName="text-amber-500"
          placeholder={t(
            'editor.luxury_placeholder',
            'e.g. Guest greeted by name within 15 seconds of approach'
          )}
          addLabel={t('editor.add_benchmark', 'Add benchmark')}
        />
      </div>

      {/* 4. Contingency Protocols */}
      <div>
        <StringListBuilder
          items={contingencyProtocols || []}
          onChange={onContingencyProtocolsChange}
          title={t('editor.contingency_protocols', 'Contingency & Fallback Protocols')}
          description={t(
            'editor.contingency_desc',
            'What to do when systems are offline or the standard path is blocked.'
          )}
          icon={<LifeBuoy className="h-4 w-4" />}
          accentClassName="text-blue-500"
          placeholder={t(
            'editor.contingency_placeholder',
            'e.g. If PMS is offline, use manual registration cards and reconcile later'
          )}
          addLabel={t('editor.add_protocol', 'Add protocol')}
        />
      </div>

      {/* 5. Operational FAQs & Edge Cases Builder */}
      <div>
        <FAQBuilder
          items={faqItems || []}
          onChange={onFaqItemsChange}
          onAIGenerate={() => onGenerateWithAI('faqs')}
          isGenerating={isGenerating}
          title={title}
        />
      </div>
    </div>
  )
}

export default OperationalProtocolsTab
