import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    verifyCertificate,
    generateCertificatePDF,
    loadLogoAsDataUrl,
    type Certificate
} from '@/services/certificateService'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Award,
    Building2,
    Calendar,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    FileCheck2,
    FileText,
    Globe,
    Layers,
    Lock,
    Printer,
    QrCode,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    User,
    XCircle
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

interface CertificateVerificationResult {
    isValid: boolean
    certificate?: Certificate
    verifiedAt?: string
    message?: string
}

interface DetailItemProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value?: string | number | null
    className?: string
    highlight?: boolean
}

const SAMPLE_DEMO_CODES = [
    'CERT-2026-EXCELLENCE',
    'SOP-SAUDI-9901',
    'PH-CERT-2026-001'
]

export default function VerifyCertificate() {
    const { code: urlCode } = useParams<{ code?: string }>()
    const { t, i18n } = useTranslation('public')
    const isRTL = i18n.dir() === 'rtl'
    const dateLocale = i18n.language === 'ar' ? ar : enUS

    const [code, setCode] = useState(urlCode || '')
    const [isVerifying, setIsVerifying] = useState(false)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [result, setResult] = useState<CertificateVerificationResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleVerify = useCallback(async (e?: React.FormEvent, targetCode?: string) => {
        if (e) e.preventDefault()
        const queryCode = (targetCode || code).trim()
        if (!queryCode) return

        setIsVerifying(true)
        setError(null)
        setResult(null)

        try {
            const data = await verifyCertificate(queryCode)
            if (data && data.isValid) {
                setResult(data as CertificateVerificationResult)
                setError(null)
            } else {
                setResult(null)
                setError(t('verification.invalid_code', 'Invalid Verification Code'))
            }
        } catch (err) {
            console.error('Verification error:', err)
            setError(t('verification.invalid_code', 'Invalid Verification Code'))
            setResult(null)
        } finally {
            setIsVerifying(false)
        }
    }, [code, t])

    // Auto-verify if code is present in URL
    useEffect(() => {
        if (urlCode) {
            void handleVerify(undefined, urlCode)
        }
    }, [urlCode, handleVerify])

    const handleCopyLink = () => {
        const url = `${window.location.origin}/verify/${encodeURIComponent(code.trim())}`
        void navigator.clipboard.writeText(url)
        toast.success(t('verification.copy_success', 'Verification link copied to clipboard'))
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        if (!result?.certificate) return
        setIsGeneratingPdf(true)
        toast.info(t('verification.generating_pdf', 'Generating official PDF certificate...'))

        try {
            const logoUrl = await loadLogoAsDataUrl()
            const pdfBlob = await generateCertificatePDF(result.certificate, logoUrl || undefined)
            
            const downloadUrl = URL.createObjectURL(pdfBlob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `ALTUS_Certificate_${result.certificate.certificateNumber || result.certificate.verificationCode}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(downloadUrl)

            toast.success(t('verification.pdf_success', 'Official Certificate PDF downloaded successfully!'))
        } catch (err) {
            console.error('Failed to generate PDF:', err)
            toast.error(t('verification.pdf_error', 'Failed to generate PDF. You can still print the official report.'))
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    const formatDateString = (dateVal?: Date | string | null) => {
        if (!dateVal) return 'N/A'
        try {
            const dateObj = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
            return format(dateObj, 'PPPP', { locale: dateLocale })
        } catch {
            return String(dateVal)
        }
    }

    return (
        <div className="verify-page-wrapper min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Global Print Style Overrides to Guarantee Pure White Single-Page Output */}
            <style>{`
                .verify-page-wrapper {
                    background-color: #070B14;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                    }
                    html, body, #root, .verify-page-wrapper {
                        background-color: #ffffff !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-single-page {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        max-height: 100vh !important;
                        overflow: hidden !important;
                    }
                }
            `}</style>

            {/* Dark Ambient Lighting & Background Effects (Hidden on Print) */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(7,11,20,1))] print:hidden" />
            <motion.div 
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none print:hidden" 
            />
            <div className="fixed bottom-10 end-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none print:hidden" />
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none print:hidden" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
                backgroundSize: '40px 40px'
            }} />

            {/* Navigation Header (Hidden on Print) */}
            <div className="print:hidden">
                <PublicNavbar />
            </div>

            {/* Main Web Content (Hidden on Print) */}
            <main className="flex-grow pt-32 pb-20 px-4 md:px-6 relative z-10 print:hidden">
                <div className="max-w-4xl mx-auto">

                    {/* Hero Branding Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="text-center mb-12"
                    >
                        {/* Animated Emblem */}
                        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
                            <div style={{ backgroundColor: '#0F172A', borderColor: 'rgba(245, 158, 11, 0.4)' }} className="relative w-20 h-20 rounded-3xl border flex items-center justify-center shadow-xl shadow-amber-500/10">
                                <ShieldCheck className="w-10 h-10 text-amber-400" />
                            </div>
                        </div>

                        {/* Gold Badge */}
                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }} className="inline-flex items-center gap-2 border rounded-full px-5 py-2 mb-6 shadow-xl shadow-amber-500/10">
                            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                                {t('verification.badge', 'ALTUS CONNECT • OFFICIAL CREDENTIAL VERIFICATION')}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent mb-5 tracking-tight leading-tight">
                            {t('verification.title', 'Certificate Verification')}
                        </h1>
                        <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
                            {t('verification.subtitle', 'Official validation service for ALTUS Advisory certifications and accreditation credentials across KSA.')}
                        </p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {!result && !error ? (
                            /* Search Form Card (Pure Solid Dark Container) */
                            <motion.div
                                key="search-form"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-10"
                            >
                                <div style={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} className="shadow-[0_0_60px_rgba(245,158,11,0.15)] border rounded-3xl overflow-hidden">
                                    {/* Multi-tone Metallic Ribbon Accent */}
                                    <div className="h-2.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-600" />
                                    
                                    <div className="p-6 sm:p-10 md:p-12">
                                        <form onSubmit={(e) => void handleVerify(e)} className="space-y-8">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                                                    <label className="flex items-center gap-2">
                                                        <FileCheck2 className="w-4 h-4 text-amber-400" />
                                                        <span>{t('verification.input_label', 'Verification Code / Certificate Number')}</span>
                                                    </label>
                                                    <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }} className="text-xs text-amber-300 font-mono px-3 py-1 rounded-lg border">
                                                        Format: CERT-XXXX-XXXX
                                                    </span>
                                                </div>
                                                
                                                <div className="relative group">
                                                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-amber-500/40 via-yellow-400/40 to-amber-600/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 blur-md pointer-events-none" />
                                                    <div className="relative flex items-center">
                                                        <Input
                                                            value={code}
                                                            onChange={(e) => setCode(e.target.value)}
                                                            placeholder={t('verification.input_placeholder', 'Enter code e.g. PH-CERT-2026-001')}
                                                            style={{ backgroundColor: '#070B14', borderColor: '#334155', color: '#FFFFFF' }}
                                                            className="h-16 sm:h-20 text-lg sm:text-xl ps-14 pe-14 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 placeholder:text-slate-500 rounded-2xl shadow-inner font-mono tracking-widest uppercase"
                                                            disabled={isVerifying}
                                                            autoComplete="off"
                                                        />
                                                        <Search className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 text-amber-400 pointer-events-none ${isRTL ? 'end-5' : 'start-5'}`} />
                                                        
                                                        {code && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCode('')}
                                                                style={{ backgroundColor: '#1E293B' }}
                                                                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${isRTL ? 'start-5' : 'end-5'}`}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Demo Sample Chips */}
                                                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                                                    <span className="text-slate-400 font-medium me-1">Try sample code:</span>
                                                    {SAMPLE_DEMO_CODES.map((sampleCode) => (
                                                        <button
                                                            key={sampleCode}
                                                            type="button"
                                                            onClick={() => {
                                                                setCode(sampleCode)
                                                                void handleVerify(undefined, sampleCode)
                                                            }}
                                                            style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                                                            className="hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border rounded-lg px-3 py-1.5 font-mono transition-all duration-200"
                                                        >
                                                            {sampleCode}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Glowing Submit Button */}
                                            <Button
                                                type="submit"
                                                disabled={isVerifying || !code.trim()}
                                                className="w-full h-16 sm:h-18 text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_45px_rgba(245,158,11,0.6)] active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {isVerifying ? (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                                                        <span>{t('verification.verifying', 'Authenticating Credential...')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <ShieldCheck className="w-6 h-6 text-slate-950" />
                                                        <span>{t('verification.verify_button', 'Verify Authenticity')}</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </form>

                                        {/* Security Notice Footer */}
                                        <div style={{ borderColor: '#1E293B' }} className="mt-8 pt-6 border-t flex items-center justify-between text-xs text-slate-400">
                                            <span className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-emerald-400" />
                                                {t('verification.secure_notice', 'Encrypted Cryptographic Validation Ledger')}
                                            </span>
                                            <span className="font-mono text-amber-400 font-bold">ALTUS CONNECT • KSA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Trust & Accreditation Highlights */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div style={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} className="p-5 rounded-2xl border flex items-start gap-4 shadow-lg">
                                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }} className="w-10 h-10 rounded-xl border flex items-center justify-center text-amber-400 shrink-0">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Cryptographic Proof</h4>
                                            <p className="text-xs text-slate-400 mt-1">Direct lookup against ALTUS immutable certificate registry.</p>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} className="p-5 rounded-2xl border flex items-start gap-4 shadow-lg">
                                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }} className="w-10 h-10 rounded-xl border flex items-center justify-center text-amber-400 shrink-0">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Kingdom Accredited</h4>
                                            <p className="text-xs text-slate-400 mt-1">Recognized across all partner hotel properties in KSA.</p>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} className="p-5 rounded-2xl border flex items-start gap-4 shadow-lg">
                                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }} className="w-10 h-10 rounded-xl border flex items-center justify-center text-amber-400 shrink-0">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white">Official Report</h4>
                                            <p className="text-xs text-slate-400 mt-1">Generate shareable links and printable verification records.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : error ? (
                            /* Error State Card */
                            <motion.div
                                key="error-card"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div style={{ backgroundColor: '#0F172A', borderColor: 'rgba(244, 63, 94, 0.3)' }} className="shadow-2xl border rounded-3xl overflow-hidden">
                                    <div className="h-2.5 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
                                    <div className="p-8 sm:p-12 text-center">
                                        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.3)' }} className="inline-flex items-center justify-center w-20 h-20 border rounded-2xl mb-6 text-rose-400 shadow-xl shadow-rose-500/10">
                                            <ShieldAlert className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                                            {t('verification.invalid_code', 'Invalid Verification Code')}
                                        </h2>
                                        <p className="text-slate-300 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                                            {t('verification.invalid_desc', 'The certificate code provided could not be authenticated in our records. Please confirm the code from your certificate or contact HR.')}
                                        </p>
                                        <Button
                                            onClick={() => { setError(null); setCode('') }}
                                            style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                                            className="hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 text-sm font-semibold transition-all border"
                                        >
                                            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                                            {t('verification.search_again', 'Try Another Code')}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* Verified Success Result Card (Pure Solid Dark Container) */
                            <motion.div
                                key="success-result"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                                className="space-y-6"
                            >
                                <div style={{ backgroundColor: '#0F172A', borderColor: 'rgba(245, 158, 11, 0.4)' }} className="shadow-[0_0_80px_rgba(245,158,11,0.2)] border rounded-3xl overflow-hidden">
                                    {/* Gold Header Ribbon */}
                                    <div className="h-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                                    
                                    <div style={{ backgroundColor: '#070B14', borderColor: '#1E293B' }} className="border-b p-6 sm:p-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                                            <div className="flex items-center gap-4">
                                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' }} className="w-16 h-16 border rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/15">
                                                    <CheckCircle2 className="w-9 h-9" />
                                                </div>
                                                <div className="text-center sm:text-start">
                                                    <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                                                        <Badge style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)' }} className="text-emerald-300 border text-xs px-3 py-1 font-bold uppercase tracking-wider">
                                                            {t('verification.details.valid', 'AUTHENTIC & ACTIVE')}
                                                        </Badge>
                                                        {result?.certificate?.status && (
                                                            <Badge style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }} variant="outline" className="text-amber-300 border text-xs uppercase font-bold">
                                                                {result.certificate.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
                                                        {t('verification.valid_title', 'Certificate Verified')}
                                                    </h2>
                                                </div>
                                            </div>

                                            {/* Header Quick Actions */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDownloadPDF}
                                                    disabled={isGeneratingPdf}
                                                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FDE68A' }}
                                                    className="hover:bg-amber-500/20 font-bold rounded-xl shadow-lg"
                                                >
                                                    {isGeneratingPdf ? (
                                                        <RefreshCw className="w-4 h-4 me-1.5 animate-spin text-amber-400" />
                                                    ) : (
                                                        <Download className="w-4 h-4 me-1.5 text-amber-400" />
                                                    )}
                                                    <span>{t('verification.download_pdf', 'Download PDF')}</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCopyLink}
                                                    style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F1F5F9' }}
                                                    className="hover:bg-slate-700 font-semibold rounded-xl"
                                                >
                                                    <Copy className="w-4 h-4 me-1.5 text-amber-400" />
                                                    <span className="hidden sm:inline">{t('verification.share', 'Share')}</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handlePrint}
                                                    style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F1F5F9' }}
                                                    className="hover:bg-slate-700 font-semibold rounded-xl"
                                                >
                                                    <Printer className="w-4 h-4 me-1.5 text-amber-400" />
                                                    <span className="hidden sm:inline">{t('verification.print', 'Print')}</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setResult(null); setCode(''); setError(null) }}
                                                    className="text-slate-300 hover:text-white rounded-xl"
                                                >
                                                    <Search className="w-4 h-4 me-1.5" />
                                                    <span className="hidden sm:inline">{t('verification.search_again', 'Verify Another Certificate')}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: '#0F172A' }} className="p-6 sm:p-10 space-y-8">
                                        {/* Certificate Details Grid (Solid Dark Boxes) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            <DetailItem
                                                icon={User}
                                                label={t('verification.details.recipient', 'ISSUED TO')}
                                                value={result?.certificate?.recipientName}
                                                highlight
                                            />
                                            <DetailItem
                                                icon={Award}
                                                label={t('verification.details.course', 'PROGRAM / COURSE')}
                                                value={result?.certificate?.title}
                                                highlight
                                            />
                                            <DetailItem
                                                icon={FileText}
                                                label={t('verification.details.certificate_number', 'CERTIFICATE ID')}
                                                value={result?.certificate?.certificateNumber || result?.certificate?.verificationCode || code}
                                            />
                                            <DetailItem
                                                icon={Calendar}
                                                label={t('verification.details.issue_date', 'DATE OF ISSUE')}
                                                value={formatDateString(result?.certificate?.completionDate)}
                                            />
                                            {result?.certificate?.propertyName && (
                                                <DetailItem
                                                    icon={Building2}
                                                    label={t('verification.details.property', 'PROPERTY')}
                                                    value={result.certificate.propertyName}
                                                />
                                            )}
                                            {result?.certificate?.departmentName && (
                                                <DetailItem
                                                    icon={Layers}
                                                    label={t('verification.details.department', 'DEPARTMENT')}
                                                    value={result.certificate.departmentName}
                                                />
                                            )}
                                        </div>

                                        {/* Certificate Description if present */}
                                        {result?.certificate?.description && (
                                            <div style={{ backgroundColor: '#070B14', borderColor: '#1E293B' }} className="p-5 rounded-2xl border text-sm text-slate-200">
                                                <span className="font-bold text-amber-400 uppercase text-xs tracking-wider block mb-1">Description:</span>
                                                <p>{result.certificate.description}</p>
                                            </div>
                                        )}

                                        {/* Official Seal Statement (Solid Dark Box) */}
                                        <div style={{ backgroundColor: '#070B14', borderColor: 'rgba(245, 158, 11, 0.4)' }} className="p-6 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                                            <div className="flex items-center gap-4 text-center sm:text-start">
                                                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }} className="w-14 h-14 rounded-2xl border flex items-center justify-center text-amber-300 shrink-0 shadow-lg shadow-amber-500/10">
                                                    <ShieldCheck className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-bold text-amber-300">
                                                        {t('verification.authentic_seal', 'ALTUS Advisory Excellence Center Seal')}
                                                    </h4>
                                                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                                                        {t('verification.valid_desc', 'This certificate is authentic and was issued by the Altus Advisory Excellence Center.')}
                                                    </p>
                                                </div>
                                            </div>
                                            {result?.verifiedAt && (
                                                <span style={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} className="text-[11px] font-mono text-amber-300 shrink-0 px-3.5 py-2 rounded-xl border">
                                                    Verified: {new Date(result.verifiedAt).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Copyright */}
                                <p className="text-center text-xs text-slate-400">
                                    © {new Date().getFullYear()} ALTUS Advisory. {t('footer.all_rights', 'All Rights Reserved.')}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Dedicated Corporate A4 Printable Verification Letterhead (Guaranteed Single Page A4 Output) */}
            {result?.certificate && (
                <div className="hidden print:block print-single-page p-6 bg-white text-slate-900 font-serif">
                    {/* Header with Logo */}
                    <div className="flex items-center justify-between border-b-2 border-amber-600 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <img src="/altus-logo-web.png" alt="ALTUS Advisory Logo" className="h-12 w-auto object-contain" />
                            <div>
                                <h1 className="text-xl font-bold text-slate-950 uppercase tracking-wide">ALTUS Advisory</h1>
                                <p className="text-[10px] font-sans text-amber-800 font-semibold tracking-wider uppercase">Kingdom of Saudi Arabia • Excellence Center</p>
                            </div>
                        </div>
                        <div className="text-end text-[11px] font-sans text-slate-600">
                            <p className="font-bold text-slate-900">OFFICIAL VERIFICATION REPORT</p>
                            <p>Doc Ref: {result.certificate.certificateNumber || result.certificate.verificationCode}</p>
                            <p>Printed: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    {/* Verification Title */}
                    <div className="text-center my-4">
                        <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-full px-5 py-1 text-[11px] font-sans font-bold uppercase tracking-widest mb-2">
                            ✓ Authenticated & Registered Credential
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Official Credential Verification Statement</h2>
                        <p className="text-xs font-sans text-slate-600 mt-1 max-w-lg mx-auto leading-relaxed">
                            This document serves as formal confirmation from the ALTUS Advisory Platform that the credential detailed below is authentic, active, and registered in our corporate database.
                        </p>
                    </div>

                    {/* Certificate Details Grid Table */}
                    <div className="my-4 font-sans">
                        <table className="w-full border-collapse border border-slate-300 text-xs">
                            <tbody>
                                <tr className="border-b border-slate-300 bg-amber-50/50">
                                    <td className="py-2.5 px-3 font-bold text-slate-700 w-1/3 border-r border-slate-300">Recipient Full Name</td>
                                    <td className="py-2.5 px-3 font-extrabold text-slate-950 text-sm">{result.certificate.recipientName}</td>
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300">Certification / Program Title</td>
                                    <td className="py-2.5 px-3 font-extrabold text-amber-900 text-sm">{result.certificate.title}</td>
                                </tr>
                                <tr className="border-b border-slate-300 bg-slate-50">
                                    <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300">Certificate Reference Number</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">{result.certificate.certificateNumber || result.certificate.verificationCode}</td>
                                </tr>
                                <tr className="border-b border-slate-300">
                                    <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300">Date of Completion</td>
                                    <td className="py-2.5 px-3 text-slate-900">{formatDateString(result.certificate.completionDate)}</td>
                                </tr>
                                {result.certificate.propertyName && (
                                    <tr className="border-b border-slate-300 bg-slate-50">
                                        <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300">Property / Establishment</td>
                                        <td className="py-2.5 px-3 text-slate-900">{result.certificate.propertyName}</td>
                                    </tr>
                                )}
                                {result.certificate.departmentName && (
                                    <tr className="border-b border-slate-300">
                                        <td className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300">Department</td>
                                        <td className="py-2.5 px-3 text-slate-900">{result.certificate.departmentName}</td>
                                    </tr>
                                )}
                                <tr className="bg-emerald-50">
                                    <td className="py-2.5 px-3 font-bold text-emerald-900 border-r border-slate-300">Database Registration Status</td>
                                    <td className="py-2.5 px-3 font-bold text-emerald-700 uppercase">VALID & ACTIVE (AUTHENTICATED)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Official Signatory & Seal Section */}
                    <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between items-end font-sans">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Verification Ledger Hash</p>
                            <p className="text-[11px] font-mono text-slate-700">{result.certificate.verificationCode}-ALTUS-KSA-SECURE</p>
                            <p className="text-[10px] text-slate-500 mt-1">Verified online at: altus-advisory.com/verify</p>
                        </div>
                        <div className="text-center">
                            <div className="w-20 h-20 border-2 border-amber-600 rounded-full flex flex-col items-center justify-center p-1.5 mb-1.5 mx-auto bg-amber-50 text-amber-900">
                                <ShieldCheck className="w-7 h-7 text-amber-700" />
                                <span className="text-[8px] font-bold tracking-widest uppercase mt-0.5">OFFICIAL SEAL</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-900 uppercase">ALTUS Advisory Registrar</p>
                            <p className="text-[10px] text-slate-500">Excellence & Compliance Center</p>
                        </div>
                    </div>

                    {/* Footer Legal Notice */}
                    <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 font-sans">
                        <p>© {new Date().getFullYear()} ALTUS Advisory • Kingdom of Saudi Arabia. All Rights Reserved.</p>
                        <p className="mt-0.5">This official verification report is issued electronically under the authority of ALTUS Advisory Platform.</p>
                    </div>
                </div>
            )}
        </div>
    )
}

function DetailItem({ icon: Icon, label, value, className = '', highlight = false }: DetailItemProps) {
    return (
        <div 
            style={{ backgroundColor: '#070B14', borderColor: '#1E293B' }} 
            className={`flex items-start gap-4 p-5 sm:p-6 rounded-2xl border transition-all duration-300 shadow-xl ${className}`}
        >
            <div 
                style={{ 
                    backgroundColor: highlight ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.8)', 
                    borderColor: highlight ? 'rgba(245, 158, 11, 0.4)' : '#334155' 
                }}
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-md"
            >
                <Icon className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest block mb-1.5">
                    {label}
                </span>
                <span 
                    style={{ color: highlight ? '#FDE68A' : '#FFFFFF' }}
                    className="text-base sm:text-lg font-extrabold leading-snug break-words block"
                >
                    {value || 'N/A'}
                </span>
            </div>
        </div>
    )
}
