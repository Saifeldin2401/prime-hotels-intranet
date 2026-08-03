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
                    placeholder="e.g. ABC123XYZ"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
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
                <div className="p-6 md:p-10 bg-[#FDFBF7] border-2 border-[#0B1C3E] relative shadow-inner overflow-hidden select-none rounded-sm">
                  
                  {/* Subtle Background Watermark Motif */}
                  <div className="absolute inset-0 opacity-[0.025] pointer-events-none flex items-center justify-center">
                    <img src="/altus-logo-web.png" alt="Watermark" className="w-[550px] object-contain" />
                  </div>

                  {/* Corner Art-Deco Ornaments (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
                  <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-[#C5A059] pointer-events-none flex items-start justify-start p-0.5">
                    <div className="w-3 h-3 border-t border-l border-[#0B1C3E]" />
                  </div>
                  <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-[#C5A059] pointer-events-none flex items-start justify-end p-0.5">
                    <div className="w-3 h-3 border-t border-r border-[#0B1C3E]" />
                  </div>
                  <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-[#C5A059] pointer-events-none flex items-end justify-start p-0.5">
                    <div className="w-3 h-3 border-b border-l border-[#0B1C3E]" />
                  </div>
                  <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-[#C5A059] pointer-events-none flex items-end justify-end p-0.5">
                    <div className="w-3 h-3 border-b border-r border-[#0B1C3E]" />
                  </div>

                  {/* Bottom Border Diamond Accent */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-[#C5A059] rotate-45 border border-[#0B1C3E] z-20 pointer-events-none" />

                  {/* Inner Fine Gold Inset Line */}
                  <div className="absolute inset-2 border border-[#E8D29B]/80 pointer-events-none rounded-sm" />

                  <div className="text-center space-y-5 relative z-10 py-2 px-2">
                    
                    {/* Header Logo & Subheader */}
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <img src="/altus-logo-web.png" alt="Altus Advisory" className="h-12 md:h-14 w-auto object-contain" />
                      <span className="text-[#C5A059] text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase pt-1">
                        PROFESSIONAL STANDARD CERTIFICATION
                      </span>
                    </div>

                    {/* Title Block with Ornate Gold Divider */}
                    <div className="space-y-2 pt-1 max-w-3xl mx-auto">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-[1px] w-24 bg-[#C5A059]" />
                        <span className="text-[#C5A059] text-xs">◆</span>
                        <div className="h-[1px] w-24 bg-[#C5A059]" />
                      </div>
                      
                      <h1 className="text-[#0B1C3E] font-serif text-3xl md:text-5xl font-extrabold tracking-[0.1em] uppercase drop-shadow-xs">
                        CERTIFICATE OF COMPLETION
                      </h1>

                      <div className="flex items-center justify-center gap-3 pt-1">
                        <div className="h-[1px] w-36 bg-[#C5A059]" />
                        <span className="text-[#C5A059] text-xs">◇ ◆ ◇</span>
                        <div className="h-[1px] w-36 bg-[#C5A059]" />
                      </div>
                    </div>

                    {/* Middle Section: Left Laurel Wreath Shield + Right Recipient & Course Area */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 py-2 max-w-4xl mx-auto">
                      
                      {/* Left: Gold Laurel Wreath Shield Emblem */}
                      <div className="md:col-span-3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#C5A059]/40 pe-0 md:pe-6 py-2">
                        <div className="relative w-24 h-24 flex items-center justify-center text-[#C5A059]">
                          {/* Laurel Wreath Graphic */}
                          <div className="absolute inset-0 border-2 border-dashed border-[#C5A059]/50 rounded-full animate-spin-slow" />
                          <div className="w-20 h-20 rounded-full border-2 border-[#C5A059] flex items-center justify-center bg-[#FAF5E8]/80 shadow-md">
                            <div className="flex flex-col items-center text-[#75531B]">
                              <span className="text-xs font-serif font-bold">✦</span>
                              <Award className="w-10 h-10 text-[#C5A059] drop-shadow" />
                              <span className="text-[8px] font-bold tracking-widest uppercase">QUALITY</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Recipient & Course Credentials */}
                      <div className="md:col-span-9 space-y-4 text-center md:text-center ps-0 md:ps-2">
                        
                        {/* Recipient */}
                        <div className="space-y-1.5">
                          <p className="text-slate-600 font-serif italic text-sm md:text-base">
                            This official certificate is proudly presented to
                          </p>
                          <h2 className="text-[#0B1C3E] text-3xl md:text-4xl lg:text-5xl font-black font-serif tracking-wider uppercase pt-0.5">
                            {selectedCertificate.recipientName}
                          </h2>
                          <div className="flex items-center justify-center gap-2 max-w-md mx-auto pt-1">
                            <div className="h-[1.5px] w-full bg-[#C5A059]" />
                            <span className="text-[#C5A059] text-[10px]">◆</span>
                            <div className="h-[1.5px] w-full bg-[#C5A059]" />
                          </div>
                        </div>

                        {/* Course Achievement */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-slate-600 font-serif italic text-xs md:text-sm">
                            has successfully completed and demonstrated mastery in
                          </p>
                          <h3 className="text-[#0B1C3E] text-xl md:text-2xl lg:text-3xl font-extrabold font-serif tracking-wider uppercase">
                            {selectedCertificate.title}
                          </h3>
                          <div className="text-[#C5A059] text-xs pt-0.5">◆</div>
                        </div>

                        {/* Completion Date */}
                        <p className="text-xs font-serif italic text-slate-500 pt-1">
                          Completed on {format(new Date(selectedCertificate.completionDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Signature (Left), Verification Card (Center), Official Seal (Right) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 items-end pt-4 border-t border-[#C5A059]/40 max-w-4xl mx-auto gap-4 mt-2">
                      
                      {/* Left: Authorized Executive Signature */}
                      <div className="md:col-span-4 text-center md:text-start space-y-1">
                        <div className="font-serif italic font-bold text-[#0B1C3E] text-2xl ps-1 tracking-wide">
                          Saifeldin M.
                        </div>
                        <div className="flex items-center gap-1 w-44">
                          <div className="h-[1px] w-full bg-[#C5A059]" />
                          <span className="text-[#C5A059] text-[8px]">◇</span>
                          <div className="h-[1px] w-full bg-[#C5A059]" />
                        </div>
                        <p className="text-[11px] font-black text-[#0B1C3E] uppercase tracking-wider">SAIFELDIN M.</p>
                        <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">VP OF LEARNING & QUALITY</p>
                        <p className="text-[10px] text-slate-600">PRIME Hotels & Resorts / Altus Advisory</p>
                        <p className="text-[9px] font-mono text-slate-400 pt-0.5">Cert ID: {selectedCertificate.certificateNumber}</p>
                      </div>

                      {/* Center: Structured Secure Verification Card */}
                      <div className="md:col-span-5 flex justify-center">
                        <div className="w-full max-w-md p-2.5 bg-white/90 border-2 border-[#C5A059] rounded-xl shadow-sm flex items-center gap-3 text-start">
                          {/* QR Image */}
                          <div className="p-1 bg-white border border-[#C5A059] rounded flex-shrink-0">
                            {qrCodeDataUrl ? (
                              <img 
                                src={qrCodeDataUrl}
                                alt="QR Verification"
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">QR</div>
                            )}
                          </div>
                          {/* Card Verification Details */}
                          <div className="space-y-0.5 text-[10px] text-slate-700 min-w-0">
                            <span className="text-[10px] font-black text-[#0B1C3E] uppercase tracking-wider block border-b border-slate-200 pb-0.5 mb-1">
                              SECURE VERIFICATION
                            </span>
                            <div className="flex items-center gap-1 text-[9.5px]">
                              <span className="text-green-600 font-bold">☑</span>
                              <span className="font-semibold text-slate-600">Certificate ID:</span>
                              <span className="font-mono font-bold text-[#0B1C3E] truncate">{selectedCertificate.certificateNumber}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px]">
                              <span className="text-blue-600">📅</span>
                              <span className="font-semibold text-slate-600">Issued On:</span>
                              <span className="font-medium text-[#0B1C3E]">{format(new Date(selectedCertificate.completionDate), 'MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px]">
                              <span className="text-amber-600">🌐</span>
                              <span className="font-semibold text-slate-600">Verify at:</span>
                              <span className="font-mono text-blue-700 underline text-[9px]">verify.altusadvisory.com</span>
                            </div>
                            <div className="pt-0.5">
                              <span className="text-[8.5px] font-bold text-slate-500 block">🔒 Verification Code:</span>
                              <span className="font-mono font-bold text-[9px] text-[#0B1C3E] tracking-tighter block truncate">
                                {selectedCertificate.verificationCode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: 3D Embossed Gold Seal Stamp Medallion */}
                      <div className="md:col-span-3 flex justify-center md:justify-end">
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#F2D888] via-[#C5A059] to-[#6A4915] p-1 shadow-2xl flex items-center justify-center">
                          {/* Outer Serrated Ring Detail */}
                          <div className="w-full h-full rounded-full border-2 border-dashed border-[#0B1C3E]/60 flex flex-col items-center justify-center text-center p-1 bg-gradient-to-br from-[#FAF5E8] via-[#E5C378] to-[#9A7635] text-[#0B1C3E] shadow-inner">
                            <span className="text-[7.5px] font-black uppercase tracking-widest text-[#0B1C3E]">OFFICIAL SEAL</span>
                            <img src="/altus-logo-web.png" alt="Seal Crest" className="h-4 w-auto object-contain my-0.5" />
                            <span className="text-[7px] font-extrabold text-[#573C11] uppercase tracking-wider">ALTUS VERIFIED</span>
                            <span className="text-[6.5px] font-bold text-[#0B1C3E] uppercase tracking-tighter leading-none mt-0.5">EXCELLENCE IN EDUCATION</span>
                            <span className="text-[7px] font-bold text-[#0B1C3E] pt-0.5">★ ★ ★</span>
                            <span className="text-[6.5px] font-black text-[#573C11] uppercase tracking-widest mt-0.5">ALTUS ADVISORY</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white/90 backdrop-blur p-4 flex justify-center gap-4 border-t border-[#C5A059]/30">
                <Button className="bg-[#C5A059] text-white hover:bg-[#A37F38] shadow-md font-semibold px-6" onClick={() => handleDownload(selectedCertificate.id)} disabled={downloadMutation.isPending}>
                  <Download className="w-4 h-4 me-2" />
                  {t('download')}
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
