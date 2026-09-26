/**
 * Manage > Evidence - where to get proof for an audit or an owner's review.
 *
 * A short index of the places that already produce evidence, each saying
 * what it proves and where to export it, plus the knowledge status summary
 * that only lives here. Links are shown only to people who can open them.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, Download } from 'lucide-react'

import { useCapabilities, type Capability } from '@/hooks/useCapabilities'
import { useDocuments } from '@/hooks/useDocuments'
import { downloadCSV } from '@/lib/exportUtils'
import { Skeleton, WorkspaceHeader, headerActionClass } from '@/ui'

interface Source {
  key: string
  to: string
  caps: Capability[]
  title: string
  proves: string
}

export default function ReportsDashboard() {
  const { t } = useTranslation('training')
  const { canAny } = useCapabilities()
  const { data: documents, isLoading } = useDocuments()

  const docs = {
    published: documents?.filter((d) => d.status === 'PUBLISHED').length ?? 0,
    pending: documents?.filter((d) => d.status === 'PENDING_REVIEW').length ?? 0,
    returned: documents?.filter((d) => d.status === 'REJECTED').length ?? 0,
    total: documents?.length ?? 0,
  }

  const sources: Source[] = ([
    { key: 'team', to: '/manage/team', caps: ['reports.view', 'assignment.manage'],
      title: t('evidence.team', 'Training compliance by department'),
      proves: t('evidence.teamBody', 'Completion rate, overdue count and SOP acknowledgement per department. Export as CSV.') },
    { key: 'risk', to: '/manage/risk', caps: ['reports.view', 'assignment.manage'],
      title: t('evidence.risk', 'Open compliance risk'),
      proves: t('evidence.riskBody', 'Who is overdue, who failed a quiz and which certificates are about to expire.') },
    { key: 'certs', to: '/manage/certificates', caps: ['certificate.issue'],
      title: t('evidence.certs', 'Certificates issued'),
      proves: t('evidence.certsBody', 'Every certificate with its holder, issue date, expiry and verification code.') },
    { key: 'audit', to: '/admin/audit', caps: ['audit.view'],
      title: t('evidence.audit', 'Audit trail'),
      proves: t('evidence.auditBody', 'Who changed what, and when: publishing, assignments, roles and settings. Export as CSV.') },
    { key: 'builder', to: '/manage/reports/builder', caps: ['reports.view'],
      title: t('evidence.builder', 'Custom report'),
      proves: t('evidence.builderBody', 'Choose the columns and filters yourself when none of the above fits.') },
  ] as Source[]).filter((s) => canAny(...s.caps))

  const exportKnowledge = () => {
    downloadCSV(
      [
        { Metric: 'Published articles', Value: docs.published },
        { Metric: 'Waiting for review', Value: docs.pending },
        { Metric: 'Returned to authors', Value: docs.returned },
        { Metric: 'All articles', Value: docs.total },
      ],
      [{ key: 'Metric', header: 'Metric' }, { key: 'Value', header: 'Value' }],
      `knowledge_status_${format(new Date(), 'yyyy-MM-dd')}`,
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <WorkspaceHeader
        eyebrow={t('evidence.eyebrow', 'Manage')}
        title={t('evidence.title', 'Evidence')}
        context={t('evidence.context', 'Where to get proof of training and compliance for an audit or an owner’s review.')}
      />

      <section aria-labelledby="evidence-sources" className="space-y-3">
        <h2 id="evidence-sources" className="text-lg font-semibold text-ds-ink">{t('evidence.sources', 'Sources')}</h2>
        <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
          {sources.map((s) => (
            <li key={s.key}>
              <Link to={s.to} className="group flex items-start gap-4 px-4 py-4 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ds-ink">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-ds-muted">{s.proves}</span>
                </span>
                <ArrowRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ds-muted group-hover:text-ds-ink rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="evidence-knowledge" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="evidence-knowledge" className="text-lg font-semibold text-ds-ink">{t('evidence.knowledge', 'Knowledge status')}</h2>
            <p className="text-sm text-ds-muted">{t('evidence.knowledgeBody', 'How many procedures are live, and how many are still in review.')}</p>
          </div>
          <button type="button" onClick={exportKnowledge} disabled={isLoading} className={headerActionClass.secondary}>
            <Download aria-hidden="true" className="h-4 w-4" />{t('evidence.exportCsv', 'Export CSV')}
          </button>
        </div>
        {isLoading ? (
          <Skeleton variant="card" className="h-20" />
        ) : (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-4">
            {[
              [t('evidence.published', 'Published'), docs.published],
              [t('evidence.inReview', 'In review'), docs.pending],
              [t('evidence.returned', 'Returned'), docs.returned],
              [t('evidence.all', 'All articles'), docs.total],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-ds-surface px-4 py-3">
                <dt className="text-xs text-ds-muted">{label}</dt>
                <dd className="mt-0.5 font-mono text-xl tabular-nums text-ds-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
