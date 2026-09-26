/**
 * Data export - download everything your organization holds, in one file.
 *
 * Lists exactly what the archive contains (the `export_organization_archive`
 * RPC), then one action. No compliance badges: the page states facts.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useTenant } from '@/contexts/TenantContext'
import { exportService } from '@/services/exportService'
import { WorkspaceHeader, headerActionClass } from '@/ui'

const CONTENTS = [
  'structure',
  'people',
  'content',
  'assignments',
  'progress',
  'certificates',
] as const

export default function TenantDataExport() {
  const { t } = useTranslation('admin')
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id
  const [isExporting, setIsExporting] = useState(false)
  const [lastExport, setLastExport] = useState<Date | null>(null)

  const labels: Record<(typeof CONTENTS)[number], [string, string]> = {
    structure: [t('dataExport.item.structure', 'Organization structure'), t('dataExport.itemBody.structure', 'The organization, its hotels and departments.')],
    people: [t('dataExport.item.people', 'People'), t('dataExport.itemBody.people', 'Every membership with role, hotel and department.')],
    content: [t('dataExport.item.content', 'Content'), t('dataExport.itemBody.content', 'Courses, quizzes and knowledge articles.')],
    assignments: [t('dataExport.item.assignments', 'Assignments'), t('dataExport.itemBody.assignments', 'Who was asked to complete what, and by when.')],
    progress: [t('dataExport.item.progress', 'Progress and completions'), t('dataExport.itemBody.progress', 'Current progress and the full completion history.')],
    certificates: [t('dataExport.item.certificates', 'Certificates'), t('dataExport.itemBody.certificates', 'Every certificate issued, with its verification code.')],
  }

  const download = async () => {
    if (!orgId) return
    setIsExporting(true)
    try {
      const data = await exportService.exportOrganizationArchive(orgId)
      const slug = currentOrganization?.slug || 'organization'
      exportService.downloadFile(
        JSON.stringify(data, null, 2),
        `${slug}_data_archive_${new Date().toISOString().slice(0, 10)}.json`,
        'application/json;charset=utf-8;',
      )
      setLastExport(new Date())
      toast.success(t('dataExport.done', 'Archive downloaded'))
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : t('dataExport.failed', 'The archive could not be created. Try again.'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('dataExport.eyebrow', 'Organization')}
        title={t('dataExport.title', 'Export your data')}
        context={currentOrganization?.name
          ? t('dataExport.context', 'A complete copy of what {{org}} holds in Altus Connect, as one JSON file.', { org: currentOrganization.name })
          : null}
      />

      <section aria-labelledby="export-contents" className="space-y-3">
        <h2 id="export-contents" className="text-lg font-semibold text-ds-ink">{t('dataExport.contents', 'What the file contains')}</h2>
        <dl className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
          {CONTENTS.map((k) => (
            <div key={k} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="text-sm font-medium text-ds-ink sm:w-52 sm:shrink-0">{labels[k][0]}</dt>
              <dd className="text-sm text-ds-muted">{labels[k][1]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ds-muted">
          {t('dataExport.note', 'The file includes personal data. Store it securely and share it only with people entitled to see it.')}
        </p>
      </section>

      <div className="flex flex-col gap-3 border-t border-ds-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ds-muted" aria-live="polite">
          {lastExport ? t('dataExport.last', 'Downloaded at {{time}}', { time: format(lastExport, 'HH:mm') }) : null}
        </p>
        <button type="button" onClick={download} disabled={isExporting || !orgId} className={`${headerActionClass.primary} disabled:opacity-50`}>
          {isExporting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
          {isExporting ? t('dataExport.working', 'Preparing the archive…') : t('dataExport.download', 'Download archive')}
        </button>
      </div>
    </div>
  )
}
