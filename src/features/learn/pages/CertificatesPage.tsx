/**
 * Learn > My certificates.
 *
 * A proof wallet. What is valid now, what is about to lapse and how to renew
 * it, and for each certificate the three things people actually need: the
 * verification code, the PDF, and a public verification link. Lapsed and
 * replaced certificates stay available as history, out of the way.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Award, ChevronDown, Copy, Download, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { useDownloadCertificate, useMyCertificates } from '@/hooks/useCertificates'
import { cn } from '@/lib/utils'
import type { Certificate } from '@/services/certificateService'
import { EmptyState, ErrorState, Skeleton, WorkspaceHeader } from '@/ui'

const SOON_DAYS = 60
const DAY = 24 * 60 * 60 * 1000

export default function CertificatesPage() {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const navigate = useNavigate()
  const certs = useMyCertificates()
  const download = useDownloadCertificate()
  const [now] = useState(() => Date.now())
  const [showHistory, setShowHistory] = useState(false)
  const [code, setCode] = useState('')

  const date = (d?: Date | string | null) =>
    d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const { valid, expiring, past } = useMemo(() => {
    const all = certs.data ?? []
    const isValid = (c: Certificate) => c.status === 'active' && (!c.expiryDate || new Date(c.expiryDate).getTime() > now)
    const validList = all.filter(isValid).sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime())
    return {
      valid: validList,
      expiring: validList.filter((c) => c.expiryDate && new Date(c.expiryDate).getTime() - now < SOON_DAYS * DAY),
      past: all.filter((c) => !isValid(c)),
    }
  }, [certs.data, now])

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('certs.copied', 'Verification code copied'))
    } catch {
      toast.error(t('certs.copyFailed', 'Could not copy. Select the code and copy it manually.'))
    }
  }

  const renewHref = (c: Certificate) => (c.trainingModuleId ? `/learn/courses/${c.trainingModuleId}` : '/learn/courses')

  const Row = ({ c, muted = false }: { c: Certificate; muted?: boolean }) => {
    const expires = c.expiryDate ? new Date(c.expiryDate).getTime() : null
    const soon = expires !== null && expires - now < SOON_DAYS * DAY && expires > now
    return (
      <li className={cn('grid gap-4 px-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5', muted && 'opacity-80')}>
        <span className={cn('hidden h-11 w-11 items-center justify-center rounded-full border-2 sm:flex', muted ? 'border-ds-border text-ds-muted' : 'border-ds-accent text-ds-accent')} aria-hidden="true">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-semibold text-ds-ink">{c.title}</p>
          <p className="text-sm text-ds-muted">
            {[
              t('certs.issued', 'Issued {{date}}', { date: date(c.completionDate) }),
              c.expiryDate
                ? (expires! > now ? t('certs.validUntil', 'valid until {{date}}', { date: date(c.expiryDate) }) : t('certs.expiredOn', 'expired {{date}}', { date: date(c.expiryDate) }))
                : t('certs.noExpiry', 'does not expire'),
              c.score != null ? t('certs.score', 'score {{score}}%', { score: Math.round(c.score) }) : null,
            ].filter(Boolean).join(' · ')}
          </p>
          {muted && c.status !== 'active' && (
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ds-muted">{t(`certs.status.${c.status}`, c.status)}</p>
          )}
          {soon && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-ds-warning">
              <AlertCircle aria-hidden="true" className="h-4 w-4" />
              {t('certs.renewSoon', 'Renew before it lapses')}
              <Link to={renewHref(c)} className="ms-1 underline">{t('certs.openCourse', 'Open course')}</Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => void copy(c.verificationCode)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-ds-border bg-ds-background px-3 font-mono text-xs tracking-wider text-ds-ink hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
            aria-label={t('certs.copyCode', 'Copy verification code {{code}}', { code: c.verificationCode })}
          >
            {c.verificationCode}
            <Copy aria-hidden="true" className="h-3.5 w-3.5 text-ds-muted" />
          </button>
          <button
            type="button"
            onClick={() => download.mutate(c.id)}
            disabled={download.isPending}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-ds-ink px-3 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
          >
            {download.isPending && download.variables === c.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
            {t('certs.download', 'PDF')}
          </button>
          <Link
            to={`/verify/${encodeURIComponent(c.verificationCode)}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-sm font-semibold text-ds-accent hover:underline"
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {t('certs.verify', 'Verify')}
          </Link>
        </div>
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('certs.eyebrow', 'Learn')}
        title={t('certs.title', 'My certificates')}
        editorial
        context={certs.isLoading ? null : t('certs.summary', '{{valid}} valid · {{soon}} expiring within 60 days', { valid: valid.length, soon: expiring.length })}
      />

      {certs.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      ) : certs.isError ? (
        <ErrorState title={t('certs.errorTitle', 'Your certificates could not be loaded')} message={t('certs.errorHint', 'Check your connection and try again. Your certificates are safe.')} onRetry={() => void certs.refetch()} />
      ) : valid.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" aria-hidden="true" />}
          title={t('certs.emptyTitle', 'No certificates yet')}
          description={t('certs.emptyBody', 'Courses that award a certificate issue it automatically when you finish them.')}
          action={<Link to="/learn/courses" className="text-sm font-semibold text-ds-accent hover:underline">{t('certs.explore', 'Explore courses')}</Link>}
        />
      ) : (
        <>
          <section aria-labelledby="certs-valid" className="space-y-3">
            <h2 id="certs-valid" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{t('certs.validTitle', 'Valid now')}</h2>
            {valid.length > 0 ? (
              <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                {valid.map((c) => <Row key={c.id} c={c} />)}
              </ul>
            ) : (
              <p className="rounded-[6px] border border-dashed border-ds-border px-4 py-5 text-sm text-ds-muted">{t('certs.noneValid', 'None of your certificates are currently valid. Renew them from the course.')}</p>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="certs-history" className="space-y-3">
              <h2 id="certs-history">
                <button
                  type="button"
                  aria-expanded={showHistory}
                  onClick={() => setShowHistory((v) => !v)}
                  className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-ds-ink hover:underline"
                >
                  <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', showHistory && 'rotate-180')} />
                  {t('certs.history', 'Past certificates ({{count}})', { count: past.length })}
                </button>
              </h2>
              {showHistory && (
                <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                  {past.map((c) => <Row key={c.id} c={c} muted />)}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim()) navigate(`/verify/${encodeURIComponent(code.trim())}`)
        }}
        className="flex flex-col gap-3 border-t border-ds-border pt-6 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="verify-code" className="block text-sm font-medium text-ds-ink">{t('certs.checkLabel', 'Check someone else’s certificate')}</label>
          <input
            id="verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('certs.checkPlaceholder', 'Verification code')}
            className="mt-1.5 h-11 w-full rounded-md border border-ds-border-strong bg-ds-surface px-3 font-mono text-sm tracking-wider text-ds-ink focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30"
          />
        </div>
        <button type="submit" className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-ds-border-strong px-4 text-sm font-semibold text-ds-ink hover:bg-ds-surface-subtle">
          {t('certs.check', 'Check')}
        </button>
      </form>
    </div>
  )
}
