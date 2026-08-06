import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from '@/hooks/useAuth'
import {
    useAllCertificates,
    useDownloadCertificate,
    useMyCertificates,
    useVerifyCertificate
} from '@/hooks/useCertificates'
import { usePermissions } from '@/hooks/usePermissions'
import { createQRCodeDataUrl, type Certificate } from '@/services/certificateService'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    AlertTriangle,
    Award,
    CheckCircle,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Printer,
    Search,
    Shield
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function TrainingCertificates() {
  const { profile: _profile } = useAuth()
  const { hasPermission } = usePermissions()
  const { t, i18n } = useTranslation(['training', 'public', 'common'])
  const { toast } = useToast()
  const isRTL = i18n.language === 'ar'
  const dateLocale = i18n.language === 'ar' ? ar : enUS

  // State
  const [search, setSearch] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [showCertificateDialog, setShowCertificateDialog] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  useEffect(() => {
    if (selectedCertificate?.verificationCode) {
      createQRCodeDataUrl(`https://altus-advisory.com/verify?code=${selectedCertificate.verificationCode}`)
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''))
    } else {
      setQrCodeDataUrl('')
    }
  }, [selectedCertificate])

  // Hooks
  const { data: myCertificates, isLoading: myLoading } = useMyCertificates()
  const { data: allCertificates, isLoading: allLoading } = useAllCertificates()
  const downloadMutation = useDownloadCertificate()
  const verifyMutation = useVerifyCertificate()

  // Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'revoked': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleVerify = async () => {
    if (!verificationCode.trim()) return
    await verifyMutation.mutateAsync(verificationCode.trim())
  }

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

  // Filter
  const filteredMy = myCertificates?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateNumber.toLowerCase().includes(search.toLowerCase())
  ) || []

  const filteredAll = allCertificates?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateNumber.toLowerCase().includes(search.toLowerCase())
  ) || []

  const isAdmin = hasPermission('training.report')

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t('certificates')}
        description={t('certificateDescription')}
      />

      <Tabs defaultValue="my-certificates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-certificates">{t('myCertificates')}</TabsTrigger>
          <TabsTrigger value="verify">{t('verifyCertificate')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="all-certificates">{t('allCertificates')}</TabsTrigger>}
        </TabsList>

        {/* My Certificates */}
        <TabsContent value="my-certificates" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pe-10' : 'ps-10'}
              />
            </div>
          </div>

          {myLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hotel-gold"></div></div>
          ) : filteredMy.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMy.map((cert) => (
                <Card key={cert.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Award className="w-8 h-8 text-yellow-500" />
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2">{cert.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(cert.completionDate), 'PPP', { locale: dateLocale })}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(cert.status)}>{t(`status.${cert.status}`, cert.status)}</Badge>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t('certificateNumber', 'Number')}:</span>
                        <span className="font-mono">{cert.certificateNumber}</span>
                      </div>
                      {cert.score !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t('score')}:</span>
                          <span className="font-medium">{cert.score}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleView(cert)}>
                        <FileText className="w-4 h-4 me-2" />
                        {t('viewCertificate')}
                      </Button>
                      <Button size="sm" className="flex-1 bg-hotel-gold hover:bg-hotel-gold-dark text-white" onClick={() => handleDownload(cert.id)} disabled={downloadMutation.isPending}>
                        <Download className="w-4 h-4 me-2" />
                        {t('download')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t('noCertificates')}</CardContent></Card>
          )}
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-hotel-navy" />
                {t('verifyCertificate')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <Label>{t('enterVerificationCode')}</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder={t('enterCodeToVerify')}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                        className="font-mono text-center text-lg tracking-wider uppercase"
                    />
                    <Button className="bg-hotel-navy hover:bg-hotel-navy-light text-white" onClick={handleVerify} disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending ? t('common:actions.processing') : t('verifyButton')}
                  </Button>
                </div>
              </div>

              {verifyMutation.data && (
                <div className={`p-4 rounded-lg border ${verifyMutation.data.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {verifyMutation.data.isValid ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <h4 className={`font-bold ${verifyMutation.data.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {verifyMutation.data.isValid ? t('public:verification.valid_title') : t('public:verification.invalid_title')}
                    </h4>
                  </div>

                  {verifyMutation.data.isValid && verifyMutation.data.certificate && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('public:verification.recipient')}</p>
                        <p className="font-bold">{verifyMutation.data.certificate.recipientName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('public:verification.course')}</p>
                        <p className="font-bold">{verifyMutation.data.certificate.title}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('public:verification.issued_on')}</p>
                        <p className="font-bold">{verifyMutation.data.certificate.completionDate?.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('public:verification.id')}</p>
                        <p className="font-mono font-bold">{verifyMutation.data.certificate.certificateNumber}</p>
                      </div>
                    </div>
                  )}
                  {!verifyMutation.data.isValid && (
                    <p className="text-sm text-red-700">{t('public:verification.invalid_code')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Certificates (Admin) */}
        {isAdmin && (
          <TabsContent value="all-certificates" className="space-y-4">
            <div className="relative flex-1">
              <Search className={`absolute ${isRTL ? 'end-3' : 'start-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pe-10' : 'ps-10'}
              />
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {allLoading ? (
                    <div className="p-8 text-center">{t('common:common.loading')}</div>
                  ) : filteredAll.length > 0 ? (
                    filteredAll.map(cert => (
                      <div key={cert.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Award className="w-10 h-10 text-hotel-gold" />
                          <div>
                            <p className="font-bold text-sm">{cert.title}</p>
                            <p className="text-xs text-muted-foreground">{cert.recipientName} • {cert.certificateNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(cert.status)}>{cert.status}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => copyLink(cert.verificationCode)} title={t('copyLink')} aria-label={t('accessibility.copyLink', 'Copy verification link')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleView(cert)} aria-label={t('accessibility.viewCertificate', 'View certificate')}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">{t('common:common.no_data')}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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
                    <img src="/altus-logo-web.png" alt="Altus Watermark" className="w-[650px] md:w-[720px] max-w-none object-contain" />
                  </div>

                  {/* Corner Art-Deco Ornaments (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
                  <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-[#0B1C3E] pointer-events-none p-1">
                    <div className="w-4 h-4 border-t border-l border-[#C5A059]" />
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[#0B1C3E] pointer-events-none p-1 flex justify-end">
                    <div className="w-4 h-4 border-t border-r border-[#C5A059]" />
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[#0B1C3E] pointer-events-none p-1 flex items-end">
                    <div className="w-4 h-4 border-b border-l border-[#C5A059]" />
                    <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>
                  <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-[#0B1C3E] pointer-events-none p-1 flex items-end justify-end">
                    <div className="w-4 h-4 border-b border-r border-[#C5A059]" />
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-[#C5A059] rotate-45" />
                  </div>

                  {/* Inner Fine Gold Inset Line */}
                  <div className="absolute inset-2 border border-[#E8D29B]/80 pointer-events-none rounded-sm" />

                  <div className="text-center space-y-5 relative z-10 py-3 px-3">
                    
                    {/* Header Logo & Subheader */}
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <img src="/altus-logo-web.png" alt="Altus Advisory" className="h-12 md:h-14 w-auto object-contain" />
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
                      <div className="md:col-span-3 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#C5A059]/40 pe-0 md:pe-6 py-2">
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
