/**
 * Source Documents / Course Resources panel.
 *
 * Lists the document(s) linked to a course. Reads via
 * `get_course_source_documents` which runs under the caller's own RLS on
 * `public.documents`, so:
 *   - variant="admin"   — shows every link; a private file the admin can open
 *     is downloadable, one they can't shows as "restricted".
 *   - variant="learner" — a source file the learner has no read access to
 *     simply does not appear (never auto-exposed).
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, Lock, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getCourseSourceDocuments,
  unlinkSourceDocument,
  type CourseSourceDocument,
} from '@/lib/documentAttachments'
import { resolveDocumentUrl, openUrlInNewTab } from '@/lib/secureFileAccess'

interface Props {
  trainingModuleId: string
  variant?: 'admin' | 'learner'
  className?: string
}

const humanSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return ''
  const kb = bytes / 1024
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

export function CourseSourceDocuments({ trainingModuleId, variant = 'learner', className = '' }: Props) {
  const { t } = useTranslation('training')
  const [docs, setDocs] = useState<CourseSourceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getCourseSourceDocuments(trainingModuleId)
      .then(setDocs)
      .finally(() => setLoading(false))
  }

  useEffect(load, [trainingModuleId])

  const visible = variant === 'admin' ? docs : docs.filter((d) => d.callerCanAccess)
  if (loading) return null
  if (visible.length === 0) return null

  const open = async (d: CourseSourceDocument) => {
    if (!d.docFileUrl && !d.documentId) return
    setBusyId(d.id)
    try {
      const url = await resolveDocumentUrl(d.documentId, d.docFileUrl).catch(() => d.docFileUrl)
      openUrlInNewTab(url || d.docFileUrl)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (d: CourseSourceDocument) => {
    setBusyId(d.id)
    const ok = await unlinkSourceDocument(d.id)
    setBusyId(null)
    if (ok) setDocs((prev) => prev.filter((x) => x.id !== d.id))
  }

  return (
    <div className={`rounded-xl border bg-card ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          {variant === 'admin'
            ? t('sourceDocs.adminTitle', 'Source Documents')
            : t('sourceDocs.learnerTitle', 'Course Resources')}
        </h3>
        <Badge variant="outline" className="text-[10px] ms-auto">{visible.length}</Badge>
      </div>

      <ul className="divide-y">
        {visible.map((d) => {
          const restricted = variant === 'admin' && !d.callerCanAccess
          return (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground truncate">
                    {d.docTitle || d.originalFilename || t('sourceDocs.untitled', 'Document')}
                  </span>
                  {d.isPrimary && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                      <Star className="w-2.5 h-2.5" />{t('sourceDocs.primary', 'Primary')}
                    </Badge>
                  )}
                  {d.relationship === 'source' && variant === 'admin' && (
                    <Badge variant="outline" className="text-[9px]">{t('sourceDocs.sourceTag', 'AI source')}</Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                  {d.originalFilename && d.originalFilename !== d.docTitle && <span className="truncate">{d.originalFilename}</span>}
                  {d.fileType && <span className="uppercase">{d.fileType.split('/').pop()}</span>}
                  {humanSize(d.fileSize) && <span>{humanSize(d.fileSize)}</span>}
                  <span>{new Date(d.attachedAt).toLocaleDateString()}</span>
                  {variant === 'admin' && d.docVisibility && <span className="capitalize">· {d.docVisibility.replace('_', ' ')}</span>}
                </div>
              </div>

              {restricted ? (
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <Lock className="w-3 h-3" />{t('sourceDocs.restricted', 'Restricted')}
                </Badge>
              ) : d.docFileUrl ? (
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" disabled={busyId === d.id} onClick={() => open(d)}>
                  <Download className="w-3.5 h-3.5" />{t('sourceDocs.open', 'Open')}
                </Button>
              ) : null}

              {variant === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                  disabled={busyId === d.id}
                  title={t('sourceDocs.unlink', 'Remove from course (keeps the file)')}
                  onClick={() => remove(d)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {variant === 'admin' && (
        <p className="px-4 py-2 text-[10px] text-muted-foreground border-t">
          {t('sourceDocs.adminHint', 'Removing a document here only unlinks it from this course — the original file stays in the document repository.')}
        </p>
      )}
    </div>
  )
}
