import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useDownloadCertificate, useMyCertificates } from '@/hooks/useCertificates'
import { cn } from '@/lib/utils'
import type { Certificate } from '@/services/certificateService'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
    AlertCircle,
    Award,
    BookOpen,
    Calendar as CalendarIcon,
    CheckCircle,
    CheckCircle2,
    Compass,
    Copy,
    Download,
    Eye,
    Loader2,
    Search,
    Shield,
    ShieldCheck,
    Trophy,
    XCircle
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toSimpleT } from '@/lib/simpleT'


export default function MyCertificates() {
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'
    const dateLocale = isRTL ? ar : enUS
    const { toast } = useToast()
    const navigate = useNavigate()

    // Main Hub Tab: 'certificates' | 'badges' | 'milestones'
    const [hubTab, setHubTab] = useState<string>('certificates')

    // Certificate Type Filter: 'all' | 'training' | 'sop_quiz' | 'compliance'
    const [selectedType, setSelectedType] = useState<string>('all')

    // Quick verification search
    const [verifyInput, setVerifyInput] = useState('')

    // Real Supabase queries
    const { data: certificates, isLoading: certsLoading } = useMyCertificates()
    const downloadCertificate = useDownloadCertificate()
    const isLoading = certsLoading

    const filteredCertificates = useMemo(() => {
        return (certificates || []).filter(cert => {
            if (selectedType === 'all') return true
            return cert.certificateType === selectedType
        })
    }, [certificates, selectedType])

    const activeCertificates = useMemo(() => filteredCertificates.filter(c => c.status === 'active'), [filteredCertificates])
    const expiredCertificates = useMemo(() => filteredCertificates.filter(c => c.status === 'expired' || c.status === 'revoked'), [filteredCertificates])

    const handleDownload = async (certificateId: string) => {
        try {
            await downloadCertificate.mutateAsync(certificateId)
        } catch {
            // Handled by toast inside hook
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: isRTL ? 'تم النسخ' : 'Copied to Clipboard',
            description: `${label}: ${text}`,
        })
    }

    const handleQuickVerify = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = verifyInput.trim()
        if (!trimmed) return
        window.open(`/verify/${encodeURIComponent(trimmed)}`, '_blank')
    }

    if (isLoading) {
        return (
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="h-10 bg-muted/40 rounded-xl w-64 animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="animate-pulse rounded-2xl">
                            <CardContent className="p-6">
                                <div className="h-7 bg-muted/60 rounded-lg w-16 mb-2" />
                                <div className="h-4 bg-muted/40 rounded-md w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse rounded-3xl h-80">
                            <CardHeader className="p-6">
                                <div className="h-6 bg-muted/60 rounded w-24 mb-3" />
                                <div className="h-6 bg-muted/50 rounded w-3/4" />
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                                <div className="h-28 bg-muted/30 rounded-xl" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Executive Hero Banner with ALTUS Gold Laurel Medal Asset */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-card/95 via-card/85 to-amber-500/[0.06] p-6 sm:p-8 backdrop-blur-2xl shadow-sm">
                <div className="absolute top-0 end-0 -mt-10 -me-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left Brand Identity & Badges */}
                    <div className="flex items-start gap-4">
                        <div className="relative shrink-0 hidden sm:block">
                            <div className="h-20 w-20 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-amber-600/10 p-1 shadow-lg shadow-amber-500/10 overflow-hidden">
                                <img
                                    src="/assets/altus/cert-badge.jpg"
                                    alt="ALTUS Accreditation Seal"
                                    className="h-full w-full object-cover rounded-xl"
                                    onError={e => {
                                        // Fallback to icon container if image asset fails to load
                                        (e.target as HTMLElement).style.display = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-semibold text-xs gap-1.5"
                                >
                                    <Award className="h-3.5 w-3.5" />
                                    {isRTL ? 'نظام الاعتمادات والشهادات الرسمية • ألتوس' : 'Official Hospitality Credentials • ALTUS'}
                                </Badge>
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                    <ShieldCheck className="h-3 w-3" />
                                    {isRTL ? 'مشفر وموثق رسمياً' : 'Verified by ALTUS Protocol'}
                                </span>
                            </div>

                            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                {isRTL ? 'سجل الاعتمادات والشارات التخصصية' : 'Accreditations & Competency Hub'}
                            </h1>
                            <p className="text-muted-foreground text-sm font-sans max-w-2xl">
                                {isRTL
                                    ? 'استعرض وصدّر شهادات التخرج المعتمدة، شارات الكفاءة التخصصية، ومحطات تميز معايير الخمس نجوم عبر فنادق المملكة.'
                                    : 'Review, verify, and export your accredited hospitality certificates, micro-credential badges, and Forbes 5-star performance milestones.'}
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Quick Metrics Deck */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                                {certificates?.length || 0}
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                                {isRTL ? 'إجمالي الشهادات' : 'Credentials'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-gradient-to-b from-card to-card/60 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-mono text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {activeCertificates.length}
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                                {isRTL ? 'شهادات سارية' : 'Active & Verified'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Top-Level Main Hub Navigation: Certificates | Badges | Milestones */}
            <Tabs value={hubTab} onValueChange={setHubTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md">
                    <TabsList className="grid grid-cols-1 h-11 bg-muted/60 rounded-xl p-1 w-full sm:w-auto">
                        <TabsTrigger value="certificates" className="text-xs sm:text-sm rounded-lg px-4 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span>{isRTL ? 'الشهادات الرسمية' : 'Certificates'}</span>
                            <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">{certificates?.length || 0}</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Quick Certificate Search / Verification lookup */}
                    <form onSubmit={handleQuickVerify} className="relative flex items-center w-full sm:w-72">
                        <Search className="absolute start-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={isRTL ? 'تحقق برمز الاعتماد...' : 'Verify credential code...'}
                            value={verifyInput}
                            onChange={e => setVerifyInput(e.target.value)}
                            className="ps-8 pe-16 h-9 text-xs font-mono rounded-xl bg-background/80 border-border/60"
                        />
                        <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            disabled={!verifyInput.trim()}
                            className="absolute end-1 h-7 text-[11px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg"
                        >
                            {isRTL ? 'تحقق' : 'Verify'}
                        </Button>
                    </form>
                </div>

                {/* TAB 1: OFFICIAL CERTIFICATES & ACCREDITATIONS */}
                <TabsContent value="certificates" className="space-y-6 mt-0">
                    {/* Sub-filter tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant={selectedType === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedType('all')}
                            className={cn('h-8 rounded-xl text-xs font-medium', selectedType === 'all' && 'bg-amber-500 hover:bg-amber-600 text-slate-950')}
                        >
                            {isRTL ? 'جميع الاعتمادات' : 'All Credentials'}
                        </Button>
                        <Button
                            variant={selectedType === 'training' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedType('training')}
                            className={cn('h-8 rounded-xl text-xs font-medium', selectedType === 'training' && 'bg-amber-500 hover:bg-amber-600 text-slate-950')}
                        >
                            {isRTL ? 'الدورات المنهجية' : 'Core Courses'}
                        </Button>
                        <Button
                            variant={selectedType === 'sop_quiz' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedType('sop_quiz')}
                            className={cn('h-8 rounded-xl text-xs font-medium', selectedType === 'sop_quiz' && 'bg-amber-500 hover:bg-amber-600 text-slate-950')}
                        >
                            {isRTL ? 'معايير التشغيل القياسية' : 'SOP Standards'}
                        </Button>
                        <Button
                            variant={selectedType === 'compliance' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedType('compliance')}
                            className={cn('h-8 rounded-xl text-xs font-medium', selectedType === 'compliance' && 'bg-amber-500 hover:bg-amber-600 text-slate-950')}
                        >
                            {isRTL ? 'الامتثال والسلامة' : 'Compliance'}
                        </Button>
                    </div>

                    {filteredCertificates.length === 0 ? (
                        <Card className="rounded-3xl border-2 border-dashed border-border/60 bg-muted/20">
                            <CardContent className="text-center py-16 space-y-4">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600">
                                    <Award className="w-9 h-9" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-display text-xl font-bold text-foreground">
                                        {isRTL ? 'لا توجد شهادات مسجلة حتى الآن' : 'No Official Credentials Yet'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">
                                        {isRTL
                                            ? 'أكمل الدورات التدريبية المعتمدة أو اجتز اختبارات معايير التشغيل للحصول على شهاداتك الرسمية وتصديرها.'
                                            : 'Complete certified training modules or achieve passing scores on SOP assessments to unlock and export your credentials.'}
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <Button
                                        onClick={() => navigate('/learn/courses')}
                                        className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm gap-2 text-xs h-9"
                                    >
                                        <Compass className="h-4 w-4" />
                                        <span>{isRTL ? 'استكشف دليل الدورات التدريبية' : 'Explore Course Catalog'}</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            {/* Active Certificates */}
                            {activeCertificates.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            <span>{isRTL ? 'الاعتمادات النشطة والمعتمدة' : 'Active & Verified Accreditations'}</span>
                                        </h2>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {activeCertificates.length} {isRTL ? 'شهادة معتمدة' : 'verified'}
                                        </span>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {activeCertificates.map(cert => (
                                            <CertificateCard
                                                key={cert.id}
                                                certificate={cert}
                                                onDownload={handleDownload}
                                                onCopy={copyToClipboard}
                                                isDownloading={downloadCertificate.isPending}
                                                dateLocale={dateLocale}
                                                isRTL={isRTL}
                                                t={toSimpleT(t)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Expired / Revoked */}
                            {expiredCertificates.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-border/40">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-display text-base font-bold text-muted-foreground flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-500" />
                                            <span>{isRTL ? 'السجلات المؤرشفة والمنتهية' : 'Archived & Expired Credentials'}</span>
                                        </h2>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {expiredCertificates.length} {isRTL ? 'منتهي' : 'archived'}
                                        </span>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-80">
                                        {expiredCertificates.map(cert => (
                                            <CertificateCard
                                                key={cert.id}
                                                certificate={cert}
                                                onDownload={handleDownload}
                                                onCopy={copyToClipboard}
                                                isDownloading={downloadCertificate.isPending}
                                                dateLocale={dateLocale}
                                                isRTL={isRTL}
                                                t={toSimpleT(t)}
                                            />
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

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'training':
            return <BookOpen className="w-4 h-4 text-blue-500" />
        case 'sop_quiz':
            return <Shield className="w-4 h-4 text-orange-500" />
        case 'compliance':
            return <CheckCircle className="w-4 h-4 text-purple-500" />
        case 'achievement':
            return <Award className="w-4 h-4 text-amber-500" />
        default:
            return <Award className="w-4 h-4 text-amber-500" />
    }
}

const getTypeLabel = (type: string, t: (key: string, def?: string) => string) => {
    switch (type) {
        case 'training':
            return t('training', 'Core Curriculum')
        case 'sop_quiz':
            return t('sopQuiz', 'SOP Standard')
        case 'compliance':
            return t('compliance', 'Compliance')
        case 'achievement':
            return t('achievement', 'Excellence')
        default:
            return t('certificate', 'Certificate')
    }
}

const getStatusBadge = (status: string, t: (key: string, def?: string) => string) => {
    switch (status) {
        case 'active':
            return (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('active', 'Verified Active')}
                </Badge>
            )
        case 'expired':
            return (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('expired', 'Expired')}
                </Badge>
            )
        case 'revoked':
            return (
                <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-[10px] font-semibold gap-1">
                    <XCircle className="w-3 h-3" />
                    {t('revoked', 'Revoked')}
                </Badge>
            )
        default:
            return <Badge variant="secondary" className="text-[10px]">{status}</Badge>
    }
}

interface CertificateCardProps {
    certificate: Certificate
    onDownload: (id: string) => void
    onCopy: (text: string, label: string) => void
    isDownloading: boolean
    dateLocale: unknown
    isRTL: boolean
    t: (key: string, def?: string) => string
}

const CertificateCard = ({ certificate, onDownload, onCopy, isDownloading, dateLocale, isRTL, t }: CertificateCardProps) => {
    const formattedIssueDate = certificate.completionDate
        ? format(new Date(certificate.completionDate), 'MMMM d, yyyy', { locale: dateLocale as any })
        : '-'

    return (
        <Card className="group relative flex flex-col justify-between rounded-3xl border border-amber-500/30 bg-gradient-to-b from-card via-card/95 to-amber-500/[0.03] shadow-sm hover:border-amber-500/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {/* Top decorative luxury copper accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

            <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            {getTypeIcon(certificate.certificateType)}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                            {getTypeLabel(certificate.certificateType, t)}
                        </Badge>
                    </div>
                    {getStatusBadge(certificate.status, t)}
                </div>

                <CardTitle className="font-display text-lg font-bold text-foreground group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                    {certificate.title}
                </CardTitle>

                <CardDescription className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('completedOn', `Issued: ${formattedIssueDate}`)}</span>
                </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
                {/* Score badge if available */}
                {certificate.score !== undefined && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                        <span className="text-muted-foreground font-sans">{t('score', 'Score Achieved')}:</span>
                        <div className="flex items-center gap-1 font-mono font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm">{certificate.score}%</span>
                            {certificate.passingScore && (
                                <span className="text-muted-foreground text-[11px] font-normal">
                                    / {certificate.passingScore}% {t('required', 'req.')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Security Verification Panel with Hash & Code */}
                <div className="rounded-2xl border border-border/60 bg-background/70 p-3.5 space-y-2 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {t('certificateNumber', 'Credential ID')}
                        </span>
                        <button
                            type="button"
                            onClick={() => onCopy(certificate.certificateNumber, 'Credential ID')}
                            className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1 font-mono"
                            title="Copy ID"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-foreground truncate select-all">
                        {certificate.certificateNumber}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            {t('verificationCode', 'Verification Hash')}
                        </span>
                        <button
                            type="button"
                            onClick={() => onCopy(certificate.verificationCode, 'Verification Hash')}
                            className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1 font-mono"
                            title="Copy Hash"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="font-mono text-[11px] text-amber-700 dark:text-amber-300 truncate select-all">
                        {certificate.verificationCode}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                    <Button
                        size="sm"
                        className="flex-1 font-bold h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all duration-200 active:scale-95 shadow-sm gap-1.5"
                        onClick={() => onDownload(certificate.id)}
                        disabled={isDownloading || certificate.status !== 'active'}
                    >
                        {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span>{t('downloadPdf', 'Download PDF')}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 rounded-xl border-border/70 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30"
                        onClick={() => window.open(`/certificates/verify/${certificate.verificationCode}`, '_blank')}
                        title={isRTL ? 'التحقق العام' : 'Public Verification'}
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
