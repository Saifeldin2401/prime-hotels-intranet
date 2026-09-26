/**
 * Public certificate verification - /verify/:code
 *
 * Anyone (an employer, an auditor) can check that a certificate is real.
 * The page answers one question first - is this certificate genuine and still
 * valid? - then shows who holds it, for what, issued by whom and when, with
 * the official PDF and a shareable link. No sign-in, no decoration.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { CheckCircle2, Copy, Download, Loader2, Printer, Search, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import {
  fetchAsDataUrl,
  generateCertificatePDF,
  loadLogoAsDataUrl,
  verifyCertificate,
  type Certificate,
} from '@/services/certificateService'
import { cn } from '@/lib/utils'

interface VerificationResult {
  isValid: boolean
  certificate?: Certificate & {
    organizationName?: string
    organizationLogoUrl?: string
    departmentName?: string
  }
  verifiedAt?: string
}

type Standing = 'valid' | 'expired' | 'revoked'

function standingOf(cert: NonNullable<VerificationResult['certificate']>): Standing {
  if (cert.status === 'revoked' || cert.status === 'superseded') return 'revoked'
  if (cert.status === 'expired') return 'expired'
  if (cert.expiryDate && new Date(cert.expiryDate).getTime() < Date.now()) return 'expired'
  return 'valid'
}

export default function VerifyCertificate() {
  const { code: urlCode } = useParams<{ code?: string }>()
  const { t, i18n } = useTranslation('public')
  const isArabic = i18n.language?.startsWith('ar')
  const dateLocale = isArabic ? ar : enUS

  const [code, setCode] = useState(urlCode ?? '')
  const [checking, setChecking] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [notFound, setNotFound] = useState(false)

  const check = useCallback(async (value: string) => {
    const q = value.trim()
    if (!q) return
    setChecking(true)
    setNotFound(false)
    setResult(null)
    try {
      const data = (await verifyCertificate(q)) as VerificationResult | null
      if (data?.isValid && data.certificate) setResult(data)
      else setNotFound(true)
    } catch (err) {
      console.error('Verification error:', err)
      setNotFound(true)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (urlCode) void check(urlCode)
  }, [urlCode, check])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = code.trim()
    if (!q) return
    // Keep the address shareable: /verify/<code>
    window.history.replaceState(null, '', `/verify/${encodeURIComponent(q)}`)
    void check(q)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/verify/${encodeURIComponent(code.trim())}`
    void navigator.clipboard.writeText(url)
    toast.success(t('verify.copied', 'Verification link copied'))
  }

  const downloadPdf = async () => {
    if (!result?.certificate) return
    setPdfBusy(true)
    try {
      const logo = result.certificate.organizationLogoUrl
        ? await fetchAsDataUrl(result.certificate.organizationLogoUrl)
        : null
      const blob = await generateCertificatePDF(result.certificate, logo || (await loadLogoAsDataUrl()) || undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Certificate_${result.certificate.certificateNumber || result.certificate.verificationCode}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast.error(t('verify.pdfFailed', 'The PDF could not be created. You can print this page instead.'))
    } finally {
      setPdfBusy(false)
    }
  }

  const fmt = (d?: Date | string | null) => {
    if (!d) return null
    try {
      return format(new Date(d), 'd MMMM yyyy', { locale: dateLocale })
    } catch {
      return String(d)
    }
  }

  const cert = result?.certificate
  const standing = cert ? standingOf(cert) : null
  const banner = standing && {
    valid: {
      icon: CheckCircle2,
      cls: 'border-ds-success/30 bg-ds-success-soft text-ds-success',
      title: t('verify.validTitle', 'This certificate is genuine and valid'),
    },
    expired: {
      icon: ShieldAlert,
      cls: 'border-ds-warning/30 bg-ds-warning-soft text-ds-warning',
      title: t('verify.expiredTitle', 'This certificate is genuine but has expired'),
    },
    revoked: {
      icon: XCircle,
      cls: 'border-ds-danger/30 bg-ds-danger-soft text-ds-danger',
      title: t('verify.revokedTitle', 'This certificate was issued but is no longer valid'),
    },
  }[standing]

  const details: [string, string | null | undefined][] = cert ? [
    [t('verify.issuer', 'Issued by'), cert.organizationName],
    [t('verify.department', 'Department'), cert.departmentName],
    [t('verify.issued', 'Issued on'), fmt(cert.completionDate)],
    [t('verify.expires', 'Valid until'), cert.expiryDate ? fmt(cert.expiryDate) : t('verify.noExpiry', 'Does not expire')],
    [t('verify.score', 'Score'), typeof cert.score === 'number' ? `${cert.score}%` : null],
    [t('verify.number', 'Certificate number'), cert.certificateNumber],
  ] : []

  return (
    <div className="min-h-screen bg-ds-background text-ds-ink" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="border-b border-ds-border bg-ds-surface print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="text-sm font-semibold tracking-tight">Altus Connect</span>
          <button
            type="button"
            onClick={() => void i18n.changeLanguage(isArabic ? 'en' : 'ar')}
            className="min-h-[40px] px-2 text-sm text-ds-muted hover:text-ds-ink"
            lang={isArabic ? 'en' : 'ar'}
          >
            {isArabic ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{t('verify.eyebrow', 'Certificate verification')}</p>
          <h1 className="font-editorial text-[32px] font-semibold leading-tight sm:text-[40px]">
            {t('verify.title', 'Check a certificate')}
          </h1>
          <p className="max-w-xl text-sm text-ds-muted">
            {t('verify.intro', 'Enter the code printed on the certificate. We will confirm whether it was issued through Altus Connect and whether it is still valid.')}
          </p>
        </div>

        <form role="search" onSubmit={submit} className="flex flex-col gap-2 sm:flex-row print:hidden">
          <label htmlFor="verify-code" className="sr-only">{t('verify.codeLabel', 'Verification code')}</label>
          <input
            id="verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('verify.placeholder', 'e.g. 7F3K-92QX')}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            className="min-h-[48px] flex-1 rounded-md border border-ds-border bg-ds-surface px-4 font-mono text-base tracking-wider text-ds-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-ds-muted focus:border-ds-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          />
          <button
            type="submit"
            disabled={checking || !code.trim()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-ds-ink px-5 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 disabled:opacity-50"
          >
            {checking ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Search aria-hidden="true" className="h-4 w-4" />}
            {checking ? t('verify.checking', 'Checking…') : t('verify.check', 'Check')}
          </button>
        </form>

        <div aria-live="polite">
          {notFound && (
            <section className="space-y-2 rounded-[6px] border border-ds-danger/30 bg-ds-danger-soft px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ds-danger">
                <XCircle aria-hidden="true" className="h-5 w-5" />
                {t('verify.notFoundTitle', 'No certificate matches this code')}
              </h2>
              <p className="text-sm text-ds-ink">
                {t('verify.notFoundBody', 'Check the code for typing mistakes. If it is correct, the certificate was not issued through Altus Connect or has been withdrawn. Contact the organization named on it.')}
              </p>
            </section>
          )}

          {cert && banner && (
            <article className="space-y-6">
              <div className={cn('flex items-start gap-3 rounded-[6px] border px-5 py-4', banner.cls)}>
                <banner.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <h2 className="text-base font-semibold">{banner.title}</h2>
                  {result?.verifiedAt && (
                    <p className="mt-0.5 text-sm text-ds-ink-secondary">
                      {t('verify.checkedAt', 'Checked {{when}}', { when: fmt(result.verifiedAt) })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {cert.organizationLogoUrl && (
                  <img src={cert.organizationLogoUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-ds-border bg-ds-surface object-contain p-1" />
                )}
                <div className="min-w-0">
                  <p className="font-editorial text-2xl font-semibold leading-tight">{cert.recipientName}</p>
                  <p className="text-sm text-ds-muted">{cert.title}</p>
                </div>
              </div>

              <dl className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
                {details.filter(([, v]) => !!v).map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                    <dt className="text-sm text-ds-muted sm:w-44 sm:shrink-0">{label}</dt>
                    <dd className="min-w-0 break-words text-sm text-ds-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              {cert.description && <p className="text-sm leading-relaxed text-ds-ink-secondary">{cert.description}</p>}

              <div className="flex flex-wrap gap-2 print:hidden">
                <button type="button" onClick={downloadPdf} disabled={pdfBusy}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 disabled:opacity-50">
                  {pdfBusy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
                  {t('verify.pdf', 'Download PDF')}
                </button>
                <button type="button" onClick={copyLink}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-ds-border bg-ds-surface px-4 text-sm font-medium text-ds-ink hover:border-ds-border-strong">
                  <Copy aria-hidden="true" className="h-4 w-4" />{t('verify.copy', 'Copy link')}
                </button>
                <button type="button" onClick={() => window.print()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-ds-border bg-ds-surface px-4 text-sm font-medium text-ds-ink hover:border-ds-border-strong">
                  <Printer aria-hidden="true" className="h-4 w-4" />{t('verify.print', 'Print')}
                </button>
              </div>
            </article>
          )}
        </div>

        <p className="border-t border-ds-border pt-6 text-xs text-ds-muted">
          {t('verify.footer', 'Verification reads the issuing organization’s records in Altus Connect at the moment you check.')}
        </p>
      </main>
    </div>
  )
}
