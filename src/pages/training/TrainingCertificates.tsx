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
import type { Certificate } from '@/services/certificateService'
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
import { useState } from 'react'
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
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
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
                        <FileText className="w-4 h-4 mr-2" />
                        {t('viewCertificate')}
                      </Button>
                      <Button size="sm" className="flex-1 bg-hotel-gold hover:bg-hotel-gold-dark text-white" onClick={() => handleDownload(cert.id)} disabled={downloadMutation.isPending}>
                        <Download className="w-4 h-4 mr-2" />
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
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
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
                          <Button variant="ghost" size="icon" onClick={() => copyLink(cert.verificationCode)} title={t('copyLink')}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleView(cert)}>
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
        <DialogContent className="max-w-4xl bg-stone-100 p-0 overflow-hidden border-hotel-gold">
          {selectedCertificate && (
            <div className="flex flex-col h-full">
              <div className="p-8 bg-white m-4 border-8 border-hotel-gold shadow-2xl relative">
                {/* Visual Frame */}
                <div className="absolute inset-2 border-2 border-hotel-navy/20 pointer-events-none" />

                <div className="text-center space-y-8 relative z-10 py-12">
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-hotel-gold/10 flex items-center justify-center border-2 border-hotel-gold">
                      <Award className="w-12 h-12 text-hotel-gold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-hotel-navy font-serif text-4xl font-bold tracking-widest">{t('certificateOfCompletion', 'CERTIFICATE OF COMPLETION')}</h1>
                    <div className="h-1 w-32 bg-hotel-gold mx-auto" />
                  </div>

                  <p className="text-muted-foreground font-serif italic text-lg">{t('thisIsToCertifyThat', 'This is to certify that')}</p>

                  <h2 className="text-hotel-navy text-5xl font-bold border-b-2 border-hotel-gold/30 inline-block px-12 pb-2 min-w-[300px]">
                    {selectedCertificate.recipientName}
                  </h2>

                  <p className="text-muted-foreground font-serif">{t('successfullyCompletedModule', 'has successfully completed the training module')}</p>

                  <h3 className="text-hotel-navy text-2xl font-bold max-w-2xl mx-auto">{selectedCertificate.title}</h3>

                  <div className="flex justify-center gap-12 pt-12 border-t border-muted max-w-md mx-auto">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('issuedOn')}</p>
                      <p className="font-bold text-hotel-navy">{format(new Date(selectedCertificate.completionDate), 'PPP', { locale: dateLocale })}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('certificateNumber')}</p>
                      <p className="font-mono font-bold text-hotel-navy">{selectedCertificate.certificateNumber}</p>
                    </div>
                  </div>

                  <div className="pt-8 opacity-50 text-[10px] uppercase tracking-[0.2em]">
                    Verified by phg-connect.com/verify
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur p-4 flex justify-center gap-4 border-t border-hotel-gold/20">
                <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark" onClick={() => handleDownload(selectedCertificate.id)} disabled={downloadMutation.isPending}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('download')}
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  {t('printCertificate')}
                </Button>
                <Button variant="outline" onClick={() => setShowCertificateDialog(false)}>
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
