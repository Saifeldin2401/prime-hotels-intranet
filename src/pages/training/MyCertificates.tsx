/**
 * MyCertificates Page - View and download earned certificates
 * 
 * Features:
 * - Grid view of all certificates
 * - Download PDF on demand
 * - View certificate details
 * - Filter by type/status
 * - Verification code display
 */

import { useState } from 'react'
import { useMyCertificates, useDownloadCertificate } from '@/hooks/useCertificates'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Award,
    Download,
    Eye,
    BookOpen,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import type { Certificate } from '@/lib/certificateService'

export default function MyCertificates() {
    const { t } = useTranslation('training')
    const { data: certificates, isLoading } = useMyCertificates()
    const downloadCertificate = useDownloadCertificate()
    const [selectedType, setSelectedType] = useState<string>('all')

    const filteredCertificates = certificates?.filter(cert => {
        if (selectedType === 'all') return true
        return cert.certificateType === selectedType
    }) || []

    const activeCertificates = filteredCertificates.filter(c => c.status === 'active')
    const expiredCertificates = filteredCertificates.filter(c => c.status === 'expired' || c.status === 'revoked')

    const handleDownload = async (certificateId: string) => {
        await downloadCertificate.mutateAsync(certificateId)
    }

    const getTypeIcon = (type: string) => {
        const baseClasses = "w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
        switch (type) {
            case 'training': return <BookOpen className={`${baseClasses} text-blue-600`} />
            case 'sop_quiz': return <Shield className={`${baseClasses} text-green-600`} />
            case 'compliance': return <CheckCircle className={`${baseClasses} text-purple-600`} />
            case 'achievement': return <Award className={`${baseClasses} text-yellow-600`} />
            default: return <Award className={`${baseClasses} text-gray-600`} />
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'training': return 'Training'
            case 'sop_quiz': return 'SOP Quiz'
            case 'compliance': return 'Compliance'
            case 'achievement': return 'Achievement'
            default: return 'Certificate'
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('active')}</Badge>
            case 'expired':
                return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />{t('expired')}</Badge>
            case 'revoked':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{t('revoked')}</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const CertificateCard = ({ certificate }: { certificate: Certificate }) => (
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        {getTypeIcon(certificate.certificateType)}
                        <Badge variant="outline">{getTypeLabel(certificate.certificateType)}</Badge>
                    </div>
                    {getStatusBadge(certificate.status)}
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-2">{certificate.title}</CardTitle>
                <CardDescription>
                    <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3 h-3" />
                        Completed {format(new Date(certificate.completionDate), 'MMM d, yyyy')}
                    </div>
                </CardDescription>
            </CardHeader>
            <CardContent>
                {certificate.score !== undefined && (
                    <div className="mb-3 text-sm">
                        <span className="text-gray-600">{t('score')}: </span>
                        <span className="font-semibold text-blue-600">{certificate.score}%</span>
                        {certificate.passingScore && (
                            <span className="text-gray-400 ml-1">/ {certificate.passingScore}% {t('required')}</span>
                        )}
                    </div>
                )}

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-xs text-gray-500 mb-1">{t('certificateNumber')}</div>
                    <div className="font-mono text-sm font-medium">{certificate.certificateNumber}</div>
                    <div className="text-xs text-gray-500 mt-2 mb-1">{t('verificationCode')}</div>
                    <div className="font-mono text-xs text-gray-600">{certificate.verificationCode}</div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(certificate.id)}
                        disabled={downloadCertificate.isPending || certificate.status !== 'active'}
                    >
                        {downloadCertificate.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:translate-y-1" />
                        )}
                        {t('downloadPdf')}
                    </Button>
                    <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )

    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title={t('myCertificates')}
                    description={t('viewDownloadCertificates')}
                />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-6 bg-gray-200 rounded w-24"></div>
                                <div className="h-5 bg-gray-200 rounded w-3/4 mt-2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-20 bg-gray-100 rounded"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Certificates"
                description="View and download your earned certificates"
            />

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{certificates?.length || 0}</div>
                        <div className="text-sm text-gray-600">{t('totalCertificates')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {certificates?.filter(c => c.status === 'active').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('active')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {certificates?.filter(c => c.certificateType === 'training').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('training')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {certificates?.filter(c => c.certificateType === 'sop_quiz').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('sopCertifications')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs */}
            <Tabs value={selectedType} onValueChange={setSelectedType}>
                <TabsList>
                    <TabsTrigger value="all">{t('all')}</TabsTrigger>
                    <TabsTrigger value="training">{t('training')}</TabsTrigger>
                    <TabsTrigger value="sop_quiz">{t('sop')}</TabsTrigger>
                    <TabsTrigger value="compliance">{t('compliance')}</TabsTrigger>
                </TabsList>

                <TabsContent value={selectedType} className="mt-6">
                    {filteredCertificates.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('noCertificatesYet')}</h3>
                                <p className="text-gray-500">
                                    {t('completeTrainingEarnCertificates')}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {/* Active Certificates */}
                            {activeCertificates.length > 0 && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">{t('activeCertificates')}</h2>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {activeCertificates.map(cert => (
                                            <CertificateCard key={cert.id} certificate={cert} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expired/Revoked Certificates */}
                            {expiredCertificates.length > 0 && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 text-gray-500">{t('expiredRevoked')}</h2>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-75">
                                        {expiredCertificates.map(cert => (
                                            <CertificateCard key={cert.id} certificate={cert} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
