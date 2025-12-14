import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Award,
  Download,
  Search,
  ExternalLink,
  CheckCircle,
  FileText,
  Shield,
  Printer,
  AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import type {
  TrainingCertificate,
  TrainingProgress,
  TrainingModule,
  Profile
} from '@/lib/types'

// Extended type for certificates with joined data
interface CertificateWithDetails extends TrainingCertificate {
  training_progress: TrainingProgress & {
    training_modules: TrainingModule
    profiles: Profile
  }
}

type CertificateStatus = 'valid' | 'expired' | 'revoked' | 'pending'
type CertificateType = 'standard' | 'advanced' | 'excellence'

interface VerificationResult {
  valid: boolean
  certificate: CertificateWithDetails | null
  message: string
}

export default function TrainingCertificates() {
  const { profile } = useAuth()
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.language === 'ar'
  const dateLocale = i18n.language === 'ar' ? ar : enUS

  // State
  const [search, setSearch] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null)
  const [showCertificateDialog, setShowCertificateDialog] = useState(false)

  // Fetch user's certificates
  const { data: myCertificates, isLoading: myLoading } = useQuery({
    queryKey: ['my-certificates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('training_certificates')
        .select(`
          *,
          training_progress!inner(
            *,
            training_modules(id, title, description),
            profiles!inner(id, full_name, email)
          )
        `)
        .eq('training_progress.profiles.id', profile.id)
        .order('issued_at', { ascending: false })

      if (error) throw error
      return data as CertificateWithDetails[]
    },
    enabled: !!profile?.id
  })

  // Admin: Fetch all certificates
  const { data: allCertificates, isLoading: allLoading } = useQuery({
    queryKey: ['all-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_certificates')
        .select(`
          *,
          training_progress(
            *,
            training_modules(id, title, description),
            profiles(id, full_name, email)
          )
        `)
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data as CertificateWithDetails[]
    }
  })

  // Verify certificate mutation
  const verifyCertificateMutation = useMutation({
    mutationFn: async (code: string) => {
      // For now, we'll simulate verification since verification_code column doesn't exist
      // In a real implementation, you'd need to add verification_code to the table
      console.log('Verifying certificate code:', code)
      return {
        valid: false,
        certificate: null,
        message: 'Certificate verification not yet implemented'
      }
    },
    onSuccess: (result) => {
      setVerificationResult(result)
    }
  })

  // Download certificate mutation
  const downloadCertificateMutation = useMutation({
    mutationFn: async (certificateId: string) => {
      // This would generate and return a PDF certificate
      // For now, we'll just simulate the download
      const { data, error } = await supabase
        .from('training_certificates')
        .select('certificate_url')
        .eq('id', certificateId)
        .single()

      if (error) throw error

      // Log download (would integrate with download tracking)
      console.log('Certificate downloaded:', certificateId)

      return data
    },
    onSuccess: () => {
      alert(t.certificateDownloaded)
    }
  })

  // Helper functions
  const getCertificateStatus = (certificate: CertificateWithDetails): CertificateStatus => {
    const now = new Date()
    const expiredDate = certificate.expires_at ? new Date(certificate.expires_at) : null

    if (expiredDate && expiredDate < now) return 'expired'
    return 'valid'
  }

  const getCertificateType = (score: number): CertificateType => {
    if (score >= 95) return 'excellence'
    if (score >= 85) return 'advanced'
    return 'standard'
  }

  const getStatusColor = (status: CertificateStatus) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'revoked': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: CertificateType) => {
    switch (type) {
      case 'excellence': return 'bg-purple-100 text-purple-800'
      case 'advanced': return 'bg-blue-100 text-blue-800'
      case 'standard': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleVerify = () => {
    if (!verificationCode.trim()) return
    verifyCertificateMutation.mutate(verificationCode)
  }

  const handleDownload = (certificateId: string) => {
    downloadCertificateMutation.mutate(certificateId)
  }

  const handleViewCertificate = (certificate: CertificateWithDetails) => {
    setSelectedCertificate(certificate)
    setShowCertificateDialog(true)
  }

  const generateCertificateURL = (certificate: CertificateWithDetails) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/certificates/${certificate.id}`
  }

  const copyCertificateLink = (certificate: CertificateWithDetails) => {
    const url = generateCertificateURL(certificate)
    navigator.clipboard.writeText(url)
    alert(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard')
  }

  // Filter certificates
  const filteredMyCertificates = myCertificates?.filter(cert =>
    !search || cert.training_progress.training_modules.title.toLowerCase().includes(search.toLowerCase())
  ) || []

  const filteredAllCertificates = allCertificates?.filter(cert =>
    !search || cert.training_progress.training_modules.title.toLowerCase().includes(search.toLowerCase()) ||
    cert.training_progress.profiles.full_name?.toLowerCase().includes(search.toLowerCase())
  ) || []

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
          <TabsTrigger value="all-certificates">{t('allCertificates')}</TabsTrigger>
          <TabsTrigger value="history">{t('downloadHistory')}</TabsTrigger>
        </TabsList>

        {/* My Certificates */}
        <TabsContent value="my-certificates" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 ${isRTL ? 'pr-10' : ''}`}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('myCertificates')}</CardTitle>
            </CardHeader>
            <CardContent>
              {myLoading ? (
                <div className="text-center py-8 text-gray-700">{t('loading')}</div>
              ) : filteredMyCertificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMyCertificates.map((certificate) => {
                    const status = getCertificateStatus(certificate)
                    const score = certificate.training_progress.quiz_score || 0
                    const type = getCertificateType(score)

                    return (
                      <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Award className="w-8 h-8 text-yellow-500" />
                              <div>
                                <h3 className="font-medium text-sm">
                                  {certificate.training_progress.training_modules.title}
                                </h3>
                                <div className="text-sm text-gray-600">
                                  <div>{t('issuedOn')}: {format(new Date(certificate.issued_at), 'PPP', { locale: dateLocale })}</div>
                                  {certificate.expires_at && (
                                    <div>{t('expiresOn')}: {format(new Date(certificate.expires_at), 'PPP', { locale: dateLocale })}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge className={getStatusColor(status)}>
                              {t[status]}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span>{t('score')}:</span>
                              <span className="font-medium">{score}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>{t('certificateType')}:</span>
                              <Badge className={`bg-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'}-100 text-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'}-800 border border-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'} rounded-md`}>
                                {t[type]}
                              </Badge>
                            </div>
                            {certificate.expires_at && (
                              <div className="flex justify-between text-sm">
                                <span>{t('expiresOn')}:</span>
                                <span>{format(new Date(certificate.expires_at), 'PPP', { locale: dateLocale })}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleViewCertificate(certificate)}>
                              <FileText className="w-4 h-4 mr-2" />
                              {t('viewCertificate')}
                            </Button>
                            <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors" onClick={() => handleDownload(certificate.id)}>
                              <Download className="w-4 h-4 mr-2" />
                              {t('download')}
                            </Button>
                          </div>

                          {certificate.verification_code && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">
                                  {t('verificationCode')}: {certificate.verification_code}
                                </span>
                                <Button size="sm" className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors" onClick={() => copyCertificateLink(certificate)}>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700">{t('noCertificates')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Certificate */}
        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('verifyCertificate')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">{t('enterVerificationCode')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder={t('enterVerificationCode')}
                    className="flex-1"
                  />
                  <Button className="bg-hotel-gold text-white hover:bg-hotel-gold-dark rounded-md transition-colors" onClick={handleVerify} disabled={verifyCertificateMutation.isPending}>
                    {verifyCertificateMutation.isPending ? t('loading') : t('verifyButton')}
                  </Button>
                </div>
              </div>

              {verificationResult && (
                <Card className={verificationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      {verificationResult.valid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${verificationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                        {verificationResult.message}
                      </span>
                    </div>

                    {verificationResult.certificate && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{t('trainingModule')}:</span>
                          <span className="font-medium">
                            {verificationResult.certificate.training_progress.training_modules.title}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('issuedTo')}:</span>
                          <span className="font-medium">
                            {verificationResult.certificate.training_progress.profiles.full_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('issuedOn')}:</span>
                          <span className="font-medium">
                            {format(new Date(verificationResult.certificate.issued_at), 'PPP', { locale: dateLocale })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('score')}:</span>
                          <span className="font-medium">
                            {verificationResult.certificate.training_progress.quiz_score}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Certificates (Admin) */}
        <TabsContent value="all-certificates" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('searchCertificates')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 ${isRTL ? 'pr-10' : ''}`}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('allCertificates')}</CardTitle>
            </CardHeader>
            <CardContent>
              {allLoading ? (
                <div className="text-center py-8 text-gray-700">{t('loading')}</div>
              ) : filteredAllCertificates.length > 0 ? (
                <div className="space-y-4">
                  {filteredAllCertificates.map((certificate) => {
                    const status = getCertificateStatus(certificate)
                    const score = certificate.training_progress.quiz_score || 0
                    const type = getCertificateType(score)

                    return (
                      <div key={certificate.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50">
                        <div className="flex items-center gap-4">
                          <Award className="w-8 h-8 text-yellow-500" />
                          <div>
                            <h3 className="font-medium">
                              {certificate.training_progress.training_modules.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {certificate.training_progress.profiles.full_name}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                              <span>{t('issuedOn')}: {format(new Date(certificate.issued_at), 'PPP', { locale: dateLocale })}</span>
                              <span>{t('score')}: {score}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>
                            {t[status]}
                          </Badge>
                          <Badge className={`bg-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'}-100 text-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'}-800 border border-${type === 'standard' ? 'green' : type === 'advanced' ? 'blue' : 'purple'} rounded-md`}>
                            {t[type]}
                          </Badge>
                          <Button size="sm" className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors" onClick={() => handleViewCertificate(certificate)}>
                            {t('viewCertificate')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700">{t('noCertificates')}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('downloadHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-700">
                <Download className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>{t('downloadHistory')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certificate View Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.certificateDetails}</DialogTitle>
          </DialogHeader>
          {selectedCertificate && (
            <div className="space-y-6">
              {/* Certificate Preview */}
              <div className="border-2 border-double border-gray-300 p-8 bg-gradient-to-br from-yellow-50 to-white">
                <div className="text-center space-y-4">
                  <div className="flex justify-center mb-4">
                    <Award className="w-16 h-16 text-yellow-500" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {isRTL ? 'شهادة إتمام' : 'Certificate of Completion'}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {isRTL ? 'هذه الشهادة تؤكد أن' : 'This is to certify that'}
                  </p>
                  <div className="py-4 border-b-2 border-yellow-400">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      {selectedCertificate.training_progress.profiles.full_name}
                    </h2>
                  </div>
                  <p className="text-gray-600">
                    {isRTL ? 'قد أكمل بنجاح وحدة التدريب' : 'has successfully completed the training module'}
                  </p>
                  <h3 className="text-xl font-medium text-gray-800">
                    {selectedCertificate.training_progress.training_modules.title}
                  </h3>
                  {selectedCertificate.training_progress.training_modules.description && (
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      {selectedCertificate.training_progress.training_modules.description}
                    </p>
                  )}
                  <div className="flex justify-center gap-8 pt-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{t('score')}</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {selectedCertificate.training_progress.quiz_score}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{t('completionDate')}</p>
                      <p className="text-lg font-medium text-gray-800">
                        {format(new Date(selectedCertificate.issued_at), 'PPP', { locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <Button onClick={() => handleDownload(selectedCertificate.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('download')}
                </Button>
                <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  {t('printCertificate')}
                </Button>
                <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => copyCertificateLink(selectedCertificate)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('copyLink')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
