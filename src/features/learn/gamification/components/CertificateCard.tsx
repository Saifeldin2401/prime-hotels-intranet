import { useRef, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { AlertCircle, Copy, Download, Loader2, Share2, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/utils'

import { CertificateSeal } from './CertificateSeal'

export interface CertificateCardData {
  id: string
  title: string
  recipientName: string
  completionDate: Date | string
  expiryDate?: Date | string | null
  score?: number | null
  verificationCode: string
}

interface CertificateCardProps {
  certificate: CertificateCardData
  expiringSoon: boolean
  renewHref: string
  downloading: boolean
  onDownload: () => void
  onCopy: (value: string) => void
  onShare: () => void
}

/**
 * A certificate displayed as the object it represents: a framed document with
 * a seal. A gentle tilt follows the pointer (off when reduced motion is set).
 */
export function CertificateCard({ certificate: c, expiringSoon, renewHref, downloading, onDownload, onCopy, onShare }: CertificateCardProps) {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const reduce = useReducedMotion()
  const frame = useRef<HTMLDivElement>(null)
  const date = (d?: Date | string | null) =>
    d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse' || !frame.current) return
    const r = frame.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    frame.current.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`
  }
  const reset = () => {
    if (frame.current) frame.current.style.transform = ''
  }

  return (
    <article className="flex flex-col gap-3">
      <div
        ref={frame}
        onPointerMove={tilt}
        onPointerLeave={reset}
        className="relative overflow-hidden rounded-xl border border-ds-brass/40 bg-ds-surface p-1.5 shadow-sm transition-transform duration-200 ease-out will-change-transform"
      >
        <div className="relative flex min-h-[220px] flex-col items-center justify-between rounded-lg border border-ds-brass/30 bg-gradient-to-br from-ds-brass/10 via-ds-surface to-ds-accent/5 px-5 py-6 text-center">
          <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-md border border-dashed border-ds-brass/25" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-ds-brass">
            {t('certs.cardEyebrow', 'Certificate of completion')}
          </p>
          <div className="relative space-y-1.5">
            <h3 className="font-editorial text-xl font-semibold leading-snug text-ds-ink">{c.title}</h3>
            <p className="text-sm text-ds-ink-secondary">
              {t('certs.awardedTo', 'Awarded to')} <span className="font-semibold text-ds-ink">{c.recipientName}</span>
            </p>
          </div>
          <div className="relative flex w-full items-end justify-between gap-3">
            <div className="text-start">
              <p className="text-[10px] uppercase tracking-wider text-ds-muted">{t('certs.issuedLabel', 'Issued')}</p>
              <p className="text-xs font-medium text-ds-ink">{date(c.completionDate)}</p>
              {c.score != null && <p className="text-xs text-ds-muted">{t('certs.score', 'score {{score}}%', { score: Math.round(c.score) })}</p>}
            </div>
            <CertificateSeal size={64} />
            <div className="text-end">
              <p className="text-[10px] uppercase tracking-wider text-ds-muted">{t('certs.validLabel', 'Valid')}</p>
              <p className={cn('text-xs font-medium', expiringSoon ? 'text-ds-warning' : 'text-ds-ink')}>
                {c.expiryDate ? t('certs.untilDate', 'until {{date}}', { date: date(c.expiryDate) }) : t('certs.noExpiryShort', 'no expiry')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {expiringSoon && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-ds-warning">
          <AlertCircle aria-hidden="true" className="h-4 w-4" />
          {t('certs.renewSoon', 'Renew before it lapses')}
          <Link to={renewHref} className="ms-1 underline">{t('certs.openCourse', 'Open course')}</Link>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCopy(c.verificationCode)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-ds-border bg-ds-background px-3 font-mono text-xs tracking-wider text-ds-ink hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          aria-label={t('certs.copyCode', 'Copy verification code {{code}}', { code: c.verificationCode })}
        >
          {c.verificationCode}
          <Copy aria-hidden="true" className="h-3.5 w-3.5 text-ds-muted" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-ds-ink px-3 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
        >
          {downloading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
          {t('certs.download', 'PDF')}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-ds-border px-3 text-sm font-medium text-ds-ink hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t('certs.share', 'Share')}
        </button>
        <Link
          to={`/verify/${encodeURIComponent(c.verificationCode)}`}
          className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-sm font-semibold text-ds-accent hover:underline"
        >
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {t('certs.verify', 'Verify')}
        </Link>
      </div>
    </article>
  )
}
