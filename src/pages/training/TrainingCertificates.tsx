import { Link } from 'react-router-dom'
import { WorkspaceHeader, headerActionClass } from '@/ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from '@/hooks/useAuth'
import {
    useAllCertificates,
    useDownloadCertificate,
    useOrganizationLogo
} from '@/hooks/useCertificates'
import { usePermissions } from '@/hooks/usePermissions'
import { createQRCodeDataUrl, type Certificate } from '@/services/certificateService'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    Award,
    Copy,
    Download,
    ExternalLink,
    Printer,
    Search,
    Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

type RegisterFilter = 'all' | 'valid' | 'expiring' | 'expired' | 'revoked'

export default function TrainingCertificates() {
  const { profile: _profile } = useAuth()
  const { hasPermission } = usePermissions()
  const { t, i18n } = useTranslation(['training', 'public', 'common'])
  const { toast } = useToast()
  const dateLocale = i18n.language === 'ar' ? ar : enUS

  // State
  const [search, setSearch] = useState('')
  const [registerFilter, setRegisterFilter] = useState<RegisterFilter>('all')
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [showCertificateDialog, setShowCertificateDialog] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // The on-screen preview previously always rendered the static ALTUS logo regardless
  // of which tenant issued the certificate. Resolves that tenant's own uploaded logo,
  // falling back to the ALTUS default further below when there isn't one.
  const { data: certOrgLogoUrl } = useOrganizationLogo(selectedCertificate?.organizationId)
  const certLogoSrc = certOrgLogoUrl || '/altus-logo-web.png'

  useEffect(() => {
    if (selectedCertificate?.verificationCode) {
      createQRCodeDataUrl(`${window.location.origin}/verify/${selectedCertificate.verificationCode}`)
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''))
    } else {
      setQrCodeDataUrl('')
    }
  }, [selectedCertificate])

  // Hooks
  const { data: allCertificates, isLoading: allLoading } = useAllCertificates()
  const downloadMutation = useDownloadCertificate()

  const handleDownload = async (certId: string) => {
    await downloadMutation.mutateAsync(certId)
  }

  const handleView = (cert: Certificate) => {
    setSelectedCertificate(cert)
    setShowCertificateDialog(true)
  }

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/verify/${code}`
    navigator.clipboard.writeText(url)
    toast({
      title: t('common:actions.copy_success', 'Link copied'),
      description: t('common:actions.link_copied_desc', 'Verification link copied to clipboard')
    })
  }

  const isAdmin = hasPermission('training.report')

  const now = Date.now()
  const SOON = 60 * 24 * 60 * 60 * 1000
  const stateOf = (c: Certificate): Exclude<RegisterFilter, 'all'> => {
    if (c.status === 'revoked' || c.status === 'superseded') return 'revoked'
    const exp = c.expiryDate ? new Date(c.expiryDate).getTime() : null
    if (c.status === 'expired' || (exp !== null && exp < now)) return 'expired'
    if (exp !== null && exp - now < SOON) return 'expiring'
    return 'valid'
  }
  const register = allCertificates ?? []
  const counts = register.reduce<Record<string, number>>((acc, c) => { const s = stateOf(c); acc[s] = (acc[s] ?? 0) + 1; return acc }, {})
  const q = search.trim().toLowerCase()
  const rows = register
    .filter((c) => registerFilter === 'all' || stateOf(c) === registerFilter)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.recipientName.toLowerCase().includes(q) || c.certificateNumber.toLowerCase().includes(q))
  const stateTag: Record<Exclude<RegisterFilter, 'all'>, { label: string; cls: string }> = {
    valid: { label: t('certRegister.valid', 'Valid'), cls: 'text-ds-muted' },
    expiring: { label: t('certRegister.expiring', 'Expiring soon'), cls: 'rounded-[3px] bg-ds-warning-soft px-1.5 py-0.5 font-medium text-ds-warning' },
    expired: { label: t('certRegister.expired', 'Expired'), cls: 'rounded-[3px] bg-ds-danger-soft px-1.5 py-0.5 font-medium text-ds-danger' },
    revoked: { label: t('certRegister.revoked', 'Revoked'), cls: 'text-ds-muted line-through' },
  }
  const filterList: { id: RegisterFilter; label: string; count: number }[] = [
    { id: 'all', label: t('certRegister.all', 'All'), count: register.length },
    { id: 'expiring', label: stateTag.expiring.label, count: counts.expiring ?? 0 },
    { id: 'expired', label: stateTag.expired.label, count: counts.expired ?? 0 },
    { id: 'valid', label: stateTag.valid.label, count: counts.valid ?? 0 },
    { id: 'revoked', label: stateTag.revoked.label, count: counts.revoked ?? 0 },
  ]
  const fmt = (d?: Date | string | null) => (d ? format(new Date(d), 'd MMM yyyy', { locale: dateLocale }) : '—')

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <WorkspaceHeader eyebrow={t('certRegister.eyebrow', 'Manage')} title={t('certRegister.title', 'Certificates')} />
        <p className="text-sm text-ds-muted">
          {t('certRegister.noAccess', 'You can issue certificates, but the full register needs reporting access.')}{' '}
          <Link to="/learn/certificates" className="font-medium text-ds-accent hover:underline">{t('certRegister.mine', 'See your own certificates')}</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspaceHeader
        eyebrow={t('certRegister.eyebrow', 'Manage')}
        title={t('certRegister.title', 'Certificates')}
        context={(counts.expiring ?? 0) > 0
          ? t('certRegister.contextExpiring', '{{count}} expire in the next 60 days.', { count: counts.expiring })
          : t('certRegister.context', 'Every certificate issued in your organization.')}
        actions={
          <Link to="/manage/certificates/issue" className={headerActionClass.primary}>
            <Award aria-hidden="true" className="h-4 w-4" />{t('certRegister.issue', 'Issue a certificate')}
          </Link>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={t('certRegister.filterLabel', 'Show certificates')} className="flex flex-wrap gap-2">
          {filterList.filter((f) => f.id === 'all' || f.count > 0).map((f) => (
            <button key={f.id} type="button" aria-pressed={registerFilter === f.id} onClick={() => setRegisterFilter(f.id)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${registerFilter === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'}`}>
              {f.label}<span className="font-mono text-xs tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <label htmlFor="cert-search" className="sr-only">{t('searchCertificates')}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
          <Input id="cert-search" placeholder={t('certRegister.search', 'Name, course or number')} value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-[40px] ps-9" />
        </div>
      </div>

      {allLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-[6px] bg-ds-surface-subtle" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-ds-border px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-ds-ink">
            {register.length === 0 ? t('certRegister.emptyTitle', 'No certificates issued yet') : t('certRegister.noMatch', 'No certificates match')}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ds-muted">
            {register.length === 0
              ? t('certRegister.emptyBody', 'Certificates are issued automatically when someone passes a course that awards one. You can also issue one by hand.')
              : t('certRegister.noMatchBody', 'Try another filter or search.')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-ds-border bg-ds-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ds-border text-start text-xs text-ds-muted">
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('certRegister.holder', 'Holder')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('certRegister.course', 'Course')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('certRegister.issued', 'Issued')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('certRegister.expires', 'Expires')}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('certRegister.status', 'Status')}</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">{t('certRegister.actions', 'Actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {rows.map((cert) => {
                const st = stateOf(cert)
                return (
                  <tr key={cert.id} className="hover:bg-ds-surface-subtle">
                    <td className="px-4 py-3 font-medium text-ds-ink">{cert.recipientName}</td>
                    <td className="px-4 py-3">
                      <span className="block text-ds-ink">{cert.title}</span>
                      <span className="block font-mono text-xs text-ds-muted">{cert.certificateNumber}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ds-ink-secondary">{fmt(cert.completionDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ds-ink-secondary">{cert.expiryDate ? fmt(cert.expiryDate) : t('certRegister.noExpiry', 'Does not expire')}</td>
                    <td className="px-4 py-3"><span className={`text-xs ${stateTag[st].cls}`}>{stateTag[st].label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="min-h-[36px]" onClick={() => handleView(cert)}>
                          {t('certRegister.view', 'View')}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyLink(cert.verificationCode)} aria-label={t('accessibility.copyLink', 'Copy verification link')}>
                          <Copy aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(cert.id)} disabled={downloadMutation.isPending} aria-label={t('download')}>
                          <Download aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-5xl bg-[#FAF8F5] p-0 overflow-hidden border-4 border-[#C5A059] shadow-2xl rounded-lg print:border-none print:shadow-none print:p-0">
          {selectedCertificate && (
            <div className="flex flex-col h-full print:m-0">
              {/* Outer Golden Foil Border Container */}
              <div className="p-2 bg-gradient-to-br from-[#C5A059] via-[#F2D888] to-[#8C6B28] m-3 rounded shadow-xl print:m-0 print:p-1">
                <div className="px-6 pt-6 pb-16 md:px-10 md:pt-8 md:pb-20 bg-[#FDFBF7] border-2 border-[#0B1C3E] relative shadow-inner overflow-hidden select-none rounded-sm">
                  
                  {/* Subtle Background Watermark Motif */}
                  <div className="absolute inset-0 opacity-[0.045] pointer-events-none flex items-center justify-center">
                    <img src={certLogoSrc} alt="Watermark" className="w-[650px] md:w-[720px] max-w-none object-contain" />
                  </div>

                  {/* Corner Art-Deco Ornaments (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
                  <div className="absolute top-2 start-2 w-10 h-10 border-t-2 border-s-2 border-[#0B1C3E] pointer-events-none p-1">
                    <div className="w-4 h-4 border-t border-s border-[#C5A059]" />
                    <div className="absolute top-1 start-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute top-2 end-2 w-10 h-10 border-t-2 border-e-2 border-[#0B1C3E] pointer-events-none p-1 flex justify-end">
                    <div className="w-4 h-4 border-t border-e border-[#C5A059]" />
                    <div className="absolute top-1 end-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute bottom-2 start-2 w-10 h-10 border-b-2 border-s-2 border-[#0B1C3E] pointer-events-none p-1 flex items-end">
                    <div className="w-4 h-4 border-b border-s border-[#C5A059]" />
                    <div className="absolute bottom-1 start-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute bottom-2 end-2 w-10 h-10 border-b-2 border-e-2 border-[#0B1C3E] pointer-events-none p-1 flex items-end justify-end">
                    <div className="w-4 h-4 border-b border-e border-[#C5A059]" />
                    <div className="absolute bottom-1 end-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>

                  {/* Inner Fine Gold Inset Line */}
                  <div className="absolute inset-2 border border-[#E8D29B]/80 pointer-events-none rounded-sm" />

                  <div className="text-center space-y-5 relative z-10 py-3 px-3">
                    
                    {/* Header Logo & Subheader */}
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <img src={certLogoSrc} alt="Certificate issuer logo" className="h-12 md:h-14 w-auto object-contain" />
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <div className="h-[1px] w-16 bg-[#C5A059]" />
                        <span className="text-[#C5A059] text-[9px]">◆</span>
                        <span className="text-[#75531B] text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase">
                          PROFESSIONAL STANDARD CERTIFICATION
                        </span>
                        <span className="text-[#C5A059] text-[9px]">◆</span>
                        <div className="h-[1px] w-16 bg-[#C5A059]" />
                      </div>
                    </div>

                    {/* Title Block with Ornate Gold Divider */}
                    <div className="space-y-2 pt-1 max-w-3xl mx-auto">
                      <h1 className="text-[#0B1C3E] font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.1em] uppercase">
                        CERTIFICATE OF COMPLETION
                      </h1>
                    </div>

                    {/* Middle Section: Left Laurel Wreath Shield + Right Recipient & Course Area */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-2 max-w-4xl mx-auto">
                      
                      {/* Left: Gold Laurel Wreath Shield Emblem */}
                      <div className="md:col-span-3 flex items-center justify-center border-b md:border-b-0 md:border-e border-[#C5A059]/40 pe-0 md:pe-6 py-2">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full fill-none">
                            <path d="M30 75 C 22 65 20 45 32 30 C 26 38 27 52 35 62 Z" fill="#C5A059" />
                            <path d="M25 60 C 18 50 18 36 28 22 C 22 30 22 42 30 52 Z" fill="#C5A059" />
                            <path d="M32 40 C 28 30 30 18 42 10 C 34 16 33 28 38 36 Z" fill="#C5A059" />
                            <path d="M70 75 C 78 65 80 45 68 30 C 74 38 73 52 65 62 Z" fill="#C5A059" />
                            <path d="M75 60 C 82 50 82 36 72 22 C 78 30 78 42 70 52 Z" fill="#C5A059" />
                            <path d="M68 40 C 72 30 70 18 58 10 C 66 16 67 28 62 36 Z" fill="#C5A059" />
                            <path d="M50 22 L66 28 V46 C66 60 58 70 50 75 C42 70 34 60 34 46 V28 L50 22 Z" fill="#FAF6F0" stroke="#C5A059" strokeWidth="2" />
                            <rect x="42" y="32" width="16" height="3" fill="#C5A059" />
                            <rect x="44" y="37" width="2.5" height="22" fill="#0B1C3E" />
                            <rect x="48.75" y="37" width="2.5" height="22" fill="#0B1C3E" />
                            <rect x="53.5" y="37" width="2.5" height="22" fill="#0B1C3E" />
                            <rect x="42" y="61" width="16" height="3" fill="#C5A059" />
                            <polygon points="50,25 44,30 56,30" fill="#C5A059" />
                          </svg>
                        </div>
                      </div>

                      {/* Right: Recipient & Course Credentials */}
                      <div className="md:col-span-9 space-y-3 text-center ps-0 md:ps-2">
                        
                        {/* Recipient */}
                        <div className="space-y-1">
                          <p className="text-slate-600 font-serif italic text-sm md:text-base">
                            This official certificate is proudly presented to
                          </p>
                          <h2 className="text-[#0B1C3E] text-3xl md:text-4xl lg:text-5xl font-bold font-serif tracking-wider uppercase py-1">
                            {selectedCertificate.recipientName}
                          </h2>
                          <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                            <div className="h-[1.25px] w-full bg-[#C5A059]" />
                            <span className="text-[#C5A059] text-[10px]">◆</span>
                            <div className="h-[1.25px] w-full bg-[#C5A059]" />
                          </div>
                        </div>

                        {/* Course Achievement */}
                        <div className="space-y-1 pt-1">
                          <p className="text-slate-600 font-serif italic text-xs md:text-sm">
                            has successfully completed and demonstrated mastery in
                          </p>
                          <h3 className="text-[#0B1C3E] text-xl md:text-2xl font-bold font-serif tracking-wider uppercase">
                            {selectedCertificate.title}
                          </h3>
                          
                          {/* Grade Honor Ribbon Badge */}
                          <div className="pt-0.5">
                            {((selectedCertificate.score ?? 100) >= 95) ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#FFF0C2] via-[#E2B653] to-[#C5A059] text-[#573C11] border border-[#75531B] shadow-xs">
                                ★ HONORS WITH DISTINCTION · {Math.round(selectedCertificate.score ?? 100)}% ★
                              </span>
                            ) : ((selectedCertificate.score ?? 100) >= 85) ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-slate-100 to-slate-300 text-slate-900 border border-slate-400 shadow-xs">
                                ★ EXCELLENCE IN MASTERY · {Math.round(selectedCertificate.score ?? 100)}% ★
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#E8D29B] text-[#75531B] border border-[#C5A059]">
                                ★ EXECUTIVE CERTIFIED ★
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Completion Date */}
                        <p className="text-xs font-serif italic text-slate-500 pt-0.5">
                          Completed on {format(new Date(selectedCertificate.completionDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Dual Signatures (Left & Right), Verification Card (Center) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-end pt-3 border-t border-[#C5A059]/50 max-w-4xl mx-auto gap-3 mt-1">
                      
                      {/* Left Signature: Saifeldin M. */}
                      <div className="md:col-span-3 text-center md:text-start space-y-0.5">
                        <div className="font-serif italic font-bold text-[#0B1C3E] text-2xl ps-0.5 tracking-wide leading-relaxed mb-1" style={{ fontFamily: "'Alex Brush', 'Cormorant Garamond', cursive" }}>
                          Saifeldin M.
                        </div>
                        <div className="flex items-center gap-1 w-32 my-1">
                          <div className="h-[1.25px] w-full bg-[#C5A059]" />
                          <span className="text-[#C5A059] text-[7px]">◆</span>
                          <div className="h-[1.25px] w-full bg-[#C5A059]" />
                        </div>
                        <p className="text-[10px] font-black text-[#0B1C3E] uppercase tracking-wider">SAIFELDIN M.</p>
                        <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-wider">VP OF LEARNING & QUALITY</p>
                        <p className="text-[9px] text-slate-600 font-semibold">Altus Advisory</p>
                        <p className="text-[8.5px] font-mono text-slate-500 pt-0.5">Cert ID: {selectedCertificate.certificateNumber}</p>
                      </div>

                      {/* Center: Structured Secure Verification Card */}
                      <div className="md:col-span-5 flex justify-center">
                        <div className="w-full max-w-md p-2 bg-white/95 border-1.5 border-[#C5A059] rounded-xl shadow-sm flex items-center gap-2.5 text-start">
                          {/* QR Image */}
                          <div className="p-1 bg-white border border-[#C5A059] rounded flex-shrink-0">
                            {qrCodeDataUrl ? (
                              <img 
                                src={qrCodeDataUrl}
                                alt="QR Verification"
                                className="w-14 h-14 object-contain"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">QR</div>
                            )}
                          </div>
                          {/* Card Verification Details */}
                          <div className="space-y-0.5 text-[9.5px] text-slate-700 min-w-0">
                            <span className="text-[9.5px] font-black text-[#0B1C3E] uppercase tracking-wider block border-b border-slate-200 pb-0.5 mb-0.5">
                              SECURE VERIFICATION
                            </span>
                            <div className="flex items-center gap-1 text-[9px]">
                              <span className="text-green-600 font-bold">☑</span>
                              <span className="font-semibold text-slate-600">ID:</span>
                              <span className="font-mono font-bold text-[#0B1C3E] truncate">{selectedCertificate.certificateNumber}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px]">
                              <span className="text-blue-600">📅</span>
                              <span className="font-semibold text-slate-600">Issued:</span>
                              <span className="font-medium text-[#0B1C3E]">{format(new Date(selectedCertificate.completionDate), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px]">
                              <span className="text-amber-600">🌐</span>
                              <span className="font-semibold text-slate-600">Verify:</span>
                              <span className="font-mono text-blue-700 underline text-[8.5px]">verify.altusadvisory.com</span>
                            </div>
                            <div className="pt-0.5">
                              <span className="text-[8px] font-bold text-slate-500 block">🔒 Code:</span>
                              <span className="font-mono font-bold text-[8.5px] text-[#0B1C3E] tracking-tighter block truncate">
                                {selectedCertificate.verificationCode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Signatory + 3D Gold Seal Stamp Medallion */}
                      <div className="md:col-span-4 flex items-end justify-end gap-2 text-end">
                        <div className="space-y-0.5 text-end hidden md:block">
                          <div className="font-serif italic font-bold text-[#0B1C3E] text-2xl pe-0.5 tracking-wide leading-relaxed mb-1" style={{ fontFamily: "'Alex Brush', 'Cormorant Garamond', cursive" }}>
                            Dr. Khalid Al-Mansoor
                          </div>
                          <div className="flex items-center gap-1 w-32 ms-auto my-1">
                            <div className="h-[1.25px] w-full bg-[#C5A059]" />
                            <span className="text-[#C5A059] text-[7px]">◆</span>
                            <div className="h-[1.25px] w-full bg-[#C5A059]" />
                          </div>
                          <p className="text-[10px] font-black text-[#0B1C3E] uppercase tracking-wider">DR. KHALID AL-MANSOOR</p>
                          <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-wider">EXECUTIVE DIRECTOR</p>
                          <p className="text-[9px] text-slate-600 font-semibold">Altus Advisory</p>
                        </div>

                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#F5D88A] via-[#C5A059] to-[#75531B] p-0.5 shadow-xl flex items-center justify-center border border-[#75531B] flex-shrink-0">
                          {/* Outer Serrated Ring Detail */}
                          <div className="w-full h-full rounded-full border border-dashed border-[#0B1C3E]/70 flex flex-col items-center justify-center text-center p-0.5 bg-gradient-to-br from-[#FAF4E6] via-[#EAD096] to-[#C5A059] text-[#0B1C3E] shadow-inner">
                            <span className="text-[7px] font-black uppercase tracking-widest text-[#0B1C3E]">OFFICIAL SEAL</span>
                            <span className="text-[6.5px] font-extrabold text-[#75531B] uppercase tracking-wider mt-0.5">ALTUS VERIFIED</span>
                            <span className="text-[5.5px] font-bold text-[#0B1C3E] uppercase tracking-tighter leading-none mt-0.5">EXCELLENCE IN EDUCATION</span>
                            <span className="text-[6.5px] font-bold text-[#75531B] pt-0.5">★ ★ ★</span>
                            <span className="text-[6px] font-black text-[#75531B] uppercase tracking-widest mt-0.5">ALTUS ADVISORY</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white/90 backdrop-blur p-4 flex flex-wrap justify-center gap-3 border-t border-[#C5A059]/30">
                <Button className="bg-[#C5A059] text-white hover:bg-[#A37F38] shadow-md font-semibold px-5" onClick={() => handleDownload(selectedCertificate.id)} disabled={downloadMutation.isPending}>
                  <Download className="w-4 h-4 me-2" />
                  {t('download')}
                </Button>
                <Button 
                  className="bg-[#0A66C2] text-white hover:bg-[#084e96] shadow-md font-semibold px-5" 
                  onClick={() => {
                    const issueDate = new Date(selectedCertificate.completionDate)
                    const year = issueDate.getFullYear()
                    const month = issueDate.getMonth() + 1
                    const certUrl = `https://verify.altusadvisory.com?code=${encodeURIComponent(selectedCertificate.verificationCode)}`
                    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(selectedCertificate.title)}&organizationName=${encodeURIComponent('Altus Advisory')}&issueYear=${year}&issueMonth=${month}&certUrl=${encodeURIComponent(certUrl)}&certId=${encodeURIComponent(selectedCertificate.certificateNumber)}`
                    window.open(linkedInUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <ExternalLink className="w-4 h-4 me-2" />
                  Add to LinkedIn Profile
                </Button>
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 me-2" />
                  {t('printCertificate')}
                </Button>
                <Button variant="outline" className="border-slate-300" onClick={() => setShowCertificateDialog(false)}>
                  {t('common:actions.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
