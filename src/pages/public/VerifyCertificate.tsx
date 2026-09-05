import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    verifyCertificate,
    generateCertificatePDF,
    loadLogoAsDataUrl,
    type Certificate
} from '@/services/certificateService';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Award,
    Building2,
    Calendar,
    CheckCircle2,
    Copy,
    Download,
    FileCheck2,
    FileText,
    Globe,
    Layers,
    Lock,
    Printer,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { cairo, canela, inter, mono, neueHaas } from './publicConstants';

interface CertificateVerificationResult {
    isValid: boolean;
    certificate?: Certificate;
    verifiedAt?: string;
    message?: string;
}

interface DetailItemProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value?: string | number | null;
    className?: string;
    highlight?: boolean;
    isRTL?: boolean;
}

function OfficialSealGraphic({ className = '', isRTL = false }: { className?: string; isRTL?: boolean }) {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className="absolute inset-0 rounded-full bg-[#C45B2F]/20 blur-xl animate-pulse" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#C45B2F] bg-gradient-to-br from-[#1C222D] via-[#12161F] to-[#0A0D12] p-1.5 shadow-[0_0_40px_rgba(196,91,47,0.35)] flex items-center justify-center select-none">
                <div className="w-full h-full rounded-full border border-dashed border-[#E07A5F]/70 flex flex-col items-center justify-center p-2 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,91,47,0.15)_0,transparent_70%)]" />
                    <Sparkles className="w-4 h-4 text-[#E07A5F] mb-0.5 animate-spin-slow" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#E07A5F]" style={mono}>
                        {isRTL ? 'معتمد' : 'VERIFIED'}
                    </span>
                    <span className="text-[7px] text-slate-400 uppercase tracking-wider font-semibold">
                        ALTUS KSA
                    </span>
                    <div className="mt-1 w-6 h-px bg-[#E07A5F]/40" />
                </div>
            </div>
        </div>
    );
}

export default function VerifyCertificate() {
    const { code: urlCode } = useParams<{ code?: string }>();
    const { t, i18n } = useTranslation('public');

    const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

    useEffect(() => {
        const handleLangChange = (lng: string) => setCurrentLang(lng);
        i18n.on('languageChanged', handleLangChange);
        return () => i18n.off('languageChanged', handleLangChange);
    }, [i18n]);

    const isRTL = currentLang === 'ar' || currentLang.startsWith('ar') || i18n.dir() === 'rtl';
    const dateLocale = currentLang.startsWith('ar') ? ar : enUS;

    const fontSans = isRTL ? cairo : neueHaas;
    const fontSerif = isRTL ? cairo : canela;
    const fontBody = isRTL ? cairo : inter;

    const [code, setCode] = useState(urlCode || '');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [result, setResult] = useState<CertificateVerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = useCallback(async (e?: React.FormEvent, targetCode?: string) => {
        if (e) e.preventDefault();
        const queryCode = (targetCode || code).trim();
        if (!queryCode) return;

        setIsVerifying(true);
        setError(null);
        setResult(null);

        try {
            const data = await verifyCertificate(queryCode);
            if (data && data.isValid) {
                setResult(data as CertificateVerificationResult);
                setError(null);
            } else {
                setResult(null);
                setError(t('verification.invalid_code', 'Invalid Verification Code'));
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError(t('verification.invalid_code', 'Invalid Verification Code'));
            setResult(null);
        } finally {
            setIsVerifying(false);
        }
    }, [code, t]);

    useEffect(() => {
        if (urlCode) {
            void handleVerify(undefined, urlCode);
        }
    }, [urlCode, handleVerify]);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/verify/${encodeURIComponent(code.trim())}`;
        void navigator.clipboard.writeText(url);
        toast.success(t('verification.copy_success', 'Verification link copied to clipboard'));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        if (!result?.certificate) return;
        setIsGeneratingPdf(true);
        toast.info(t('verification.generating_pdf', 'Generating official PDF certificate...'));

        try {
            const logoUrl = await loadLogoAsDataUrl();
            const pdfBlob = await generateCertificatePDF(result.certificate, logoUrl || undefined);
            
            const downloadUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `ALTUS_Certificate_${result.certificate.certificateNumber || result.certificate.verificationCode}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            toast.success(t('verification.pdf_success', 'Official Certificate PDF downloaded successfully!'));
        } catch (err) {
            console.error('Failed to generate PDF:', err);
            toast.error(t('verification.pdf_error', 'Failed to generate PDF. You can still print the official report.'));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const formatDateString = (dateVal?: Date | string | null) => {
        if (!dateVal) return 'N/A';
        try {
            const dateObj = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
            return format(dateObj, 'PPPP', { locale: dateLocale });
        } catch {
            return String(dateVal);
        }
    };

    return (
        <div className="verify-page-wrapper min-h-screen text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-[#C45B2F]/30 selection:text-white" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Global Print Style Overrides to Guarantee Pure White Single-Page Output */}
            <style>{`
                .verify-page-wrapper {
                    background-color: #0A0D12;
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
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(196,91,47,0.15),rgba(10,13,18,1))] print:hidden" />
            <motion.div 
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.12, 0.22, 0.12]
                }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#C45B2F]/15 rounded-full blur-[160px] pointer-events-none print:hidden" 
            />
            <div className="fixed bottom-10 end-10 w-[450px] h-[450px] bg-slate-800/20 rounded-full blur-[130px] pointer-events-none print:hidden" />



            {/* Main Web Content (Hidden on Print) */}
            <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 md:px-8 relative z-10 print:hidden">
                <div className="max-w-4xl mx-auto">

                    {/* Hero Branding Banner */}
                    <motion.div
                        initial={{ opacity: 0, transform: 'translateY(16px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0px)' }}
                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                        className="text-center mb-12"
                    >
                        {/* Official Seal Graphic Hero Emblem */}
                        <div className="mx-auto mb-6 flex justify-center">
                            <OfficialSealGraphic isRTL={isRTL} />
                        </div>

                        {/* Gold/Copper Badge */}
                        <div className="inline-flex items-center gap-2.5 border border-[#C45B2F]/40 bg-[#C45B2F]/10 rounded-full px-5 py-2 mb-6 shadow-xl shadow-[#C45B2F]/10">
                            <Sparkles className="w-4 h-4 text-[#E07A5F] animate-spin" style={{ animationDuration: '7s' }} />
                            <span className="text-xs font-bold text-[#F3C99F] uppercase tracking-widest" style={fontSans}>
                                {t('verification.badge', 'ALTUS CONNECT • OFFICIAL CREDENTIAL VERIFICATION')}
                            </span>
                        </div>

                        {/* Title with Canela / Cairo font */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-normal text-white mb-4 tracking-tight leading-tight" style={fontSerif}>
                            {t('verification.title', 'Certificate Verification')}
                        </h1>
                        <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed" style={fontBody}>
                            {t('verification.subtitle', 'Official validation service for ALTUS Advisory certifications and accreditation credentials across KSA.')}
                        </p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {!result && !error ? (
                            /* Search Form Card (Pure Solid Dark Container) */
                            <motion.div
                                key="search-form"
                                initial={{ opacity: 0, transform: 'scale(0.98)' }}
                                animate={{ opacity: 1, transform: 'scale(1)' }}
                                exit={{ opacity: 0, transform: 'scale(0.98)' }}
                                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                                className="space-y-10"
                            >
                                <div className="bg-[#12161F] border border-[#C45B2F]/40 shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(196,91,47,0.15)] rounded-3xl overflow-hidden">
                                    {/* Multi-tone Metallic Ribbon Accent */}
                                    <div className="h-2.5 bg-gradient-to-r from-[#C45B2F] via-[#E07A5F] to-[#D9C6A3]" />
                                    
                                    <div className="p-6 sm:p-10 md:p-12">
                                        <form onSubmit={(e) => void handleVerify(e)} className="space-y-8">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                                                    <label className="flex items-center gap-2" style={fontSans}>
                                                        <FileCheck2 className="w-4 h-4 text-[#E07A5F]" />
                                                        <span>{t('verification.input_label', 'Verification Code / Certificate Number')}</span>
                                                    </label>
                                                    <span className="text-xs text-[#E07A5F] px-3 py-1 rounded-lg border border-[#C45B2F]/30 bg-[#C45B2F]/10" style={mono}>
                                                        Format: CERT-XXXX-XXXX
                                                    </span>
                                                </div>
                                                
                                                <div className="relative group">
                                                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#C45B2F]/40 via-[#E07A5F]/40 to-[#D9C6A3]/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 blur-md pointer-events-none" />
                                                    <div className="relative flex items-center">
                                                        <Input
                                                            value={code}
                                                            onChange={(e) => setCode(e.target.value)}
                                                            placeholder={t('verification.input_placeholder', 'Enter code e.g. PH-CERT-2026-001')}
                                                            className="h-16 sm:h-20 text-lg sm:text-xl ps-14 pe-14 bg-[#0A0D12] border-slate-700 text-white focus:border-[#C45B2F] focus:ring-4 focus:ring-[#C45B2F]/20 placeholder:text-slate-500 rounded-2xl shadow-inner tracking-widest uppercase"
                                                            style={mono}
                                                            disabled={isVerifying}
                                                            autoComplete="off"
                                                        />
                                                        <Search className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 text-[#E07A5F] pointer-events-none ${isRTL ? 'end-5' : 'start-5'}`} />
                                                        
                                                        {code && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCode('')}
                                                                className={`absolute top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 hover:text-white w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors active:scale-90 ${isRTL ? 'start-5' : 'end-5'}`}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shimmering Submit Button */}
                                            <Button
                                                type="submit"
                                                disabled={isVerifying || !code.trim()}
                                                className="w-full h-16 sm:h-18 text-base sm:text-lg font-bold bg-gradient-to-r from-[#C45B2F] via-[#D96B3D] to-[#B34D24] hover:from-[#D96B3D] hover:to-[#C45B2F] text-white rounded-2xl transition-all duration-200 shadow-[0_0_30px_rgba(196,91,47,0.35)] hover:shadow-[0_0_45px_rgba(196,91,47,0.55)] active:scale-[0.98] disabled:opacity-50 tracking-wider uppercase"
                                                style={fontSans}
                                            >
                                                {isVerifying ? (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <RefreshCw className="w-6 h-6 animate-spin text-white" />
                                                        <span>{t('verification.verifying', 'Authenticating Credential...')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <ShieldCheck className="w-6 h-6 text-white" />
                                                        <span>{t('verification.verify_button', 'Verify Authenticity')}</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </form>

                                        {/* Security Notice Footer */}
                                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                            <span className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-emerald-400" />
                                                {t('verification.secure_notice', 'Encrypted Cryptographic Validation Ledger')}
                                            </span>
                                            <span className="text-[#E07A5F] font-bold" style={mono}>ALTUS CONNECT • KSA</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Trust & Accreditation Highlights */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-5 rounded-2xl border border-white/10 bg-[#12161F] flex items-start gap-4 shadow-lg">
                                        <div className="w-10 h-10 rounded-xl border border-[#C45B2F]/40 bg-[#C45B2F]/10 flex items-center justify-center text-[#E07A5F] shrink-0">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white" style={fontSans}>Cryptographic Proof</h4>
                                            <p className="text-xs text-slate-400 mt-1" style={fontBody}>Direct lookup against ALTUS immutable certificate registry.</p>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl border border-white/10 bg-[#12161F] flex items-start gap-4 shadow-lg">
                                        <div className="w-10 h-10 rounded-xl border border-[#C45B2F]/40 bg-[#C45B2F]/10 flex items-center justify-center text-[#E07A5F] shrink-0">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white" style={fontSans}>Kingdom Accredited</h4>
                                            <p className="text-xs text-slate-400 mt-1" style={fontBody}>Recognized across partner hotel properties in KSA.</p>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl border border-white/10 bg-[#12161F] flex items-start gap-4 shadow-lg">
                                        <div className="w-10 h-10 rounded-xl border border-[#C45B2F]/40 bg-[#C45B2F]/10 flex items-center justify-center text-[#E07A5F] shrink-0">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white" style={fontSans}>Official Report</h4>
                                            <p className="text-xs text-slate-400 mt-1" style={fontBody}>Generate shareable links and printable verification records.</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : error ? (
                            /* Error State Card */
                            <motion.div
                                key="error-card"
                                initial={{ opacity: 0, transform: 'scale(0.98)' }}
                                animate={{ opacity: 1, transform: 'scale(1)' }}
                                exit={{ opacity: 0, transform: 'scale(0.98)' }}
                                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                            >
                                <div className="shadow-2xl border border-rose-500/30 bg-[#12161F] rounded-3xl overflow-hidden">
                                    <div className="h-2.5 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
                                    <div className="p-8 sm:p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-20 h-20 border border-rose-500/30 bg-rose-500/10 rounded-2xl mb-6 text-rose-400 shadow-xl shadow-rose-500/10">
                                            <ShieldAlert className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3" style={fontSerif}>
                                            {t('verification.invalid_code', 'Invalid Verification Code')}
                                        </h2>
                                        <p className="text-slate-300 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed" style={fontBody}>
                                            {t('verification.invalid_desc', 'The certificate code provided could not be authenticated in our records. Please confirm the code from your certificate or contact HR.')}
                                        </p>
                                        <Button
                                            onClick={() => { setError(null); setCode(''); }}
                                            className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-8 py-3.5 text-sm font-semibold transition-all duration-150 active:scale-[0.97] border border-slate-700"
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
                                initial={{ opacity: 0, transform: 'scale(0.98) translateY(12px)' }}
                                animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                                exit={{ opacity: 0, transform: 'scale(0.98)' }}
                                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                                className="space-y-6"
                            >
                                <div className="shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_40px_rgba(196,91,47,0.2)] border border-[#C45B2F]/40 bg-[#12161F] rounded-3xl overflow-hidden">
                                    {/* Gold Header Ribbon */}
                                    <div className="h-3 bg-gradient-to-r from-[#C45B2F] via-[#E07A5F] to-[#D9C6A3]" />
                                    
                                    <div className="border-b border-white/10 bg-[#0E121A] p-6 sm:p-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 border border-emerald-500/40 bg-emerald-500/15 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/15">
                                                    <CheckCircle2 className="w-9 h-9" />
                                                </div>
                                                <div className="text-center sm:text-start">
                                                    <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                                                        <Badge className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 font-bold uppercase tracking-wider">
                                                            {t('verification.details.valid', 'AUTHENTIC & ACTIVE')}
                                                        </Badge>
                                                        {result?.certificate?.status && (
                                                            <Badge variant="outline" className="bg-[#C45B2F]/15 border-[#C45B2F]/40 text-[#E07A5F] text-xs uppercase font-bold">
                                                                {result.certificate.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h2 className="text-2xl sm:text-3xl text-white tracking-tight" style={fontSerif}>
                                                        {t('verification.valid_title', 'Certificate Verified')}
                                                    </h2>
                                                </div>
                                            </div>

                                            {/* Header Quick Actions */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDownloadPDF}
                                                    disabled={isGeneratingPdf}
                                                    className="bg-[#C45B2F]/15 border-[#C45B2F]/40 text-[#F3C99F] hover:bg-[#C45B2F]/25 font-bold rounded-xl shadow-lg transition-all duration-150 active:scale-[0.97]"
                                                >
                                                    {isGeneratingPdf ? (
                                                        <RefreshCw className="w-4 h-4 me-1.5 animate-spin text-[#E07A5F]" />
                                                    ) : (
                                                        <Download className="w-4 h-4 me-1.5 text-[#E07A5F]" />
                                                    )}
                                                    <span>{t('verification.download_pdf', 'Download PDF')}</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCopyLink}
                                                    className="bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-700 font-semibold rounded-xl transition-all duration-150 active:scale-[0.97]"
                                                >
                                                    <Copy className="w-4 h-4 me-1.5 text-[#E07A5F]" />
                                                    <span className="hidden sm:inline">{t('verification.share', 'Share')}</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handlePrint}
                                                    className="bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-700 font-semibold rounded-xl transition-all duration-150 active:scale-[0.97]"
                                                >
                                                    <Printer className="w-4 h-4 me-1.5 text-[#E07A5F]" />
                                                    <span className="hidden sm:inline">{t('verification.print', 'Print')}</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setResult(null); setCode(''); setError(null); }}
                                                    className="text-slate-300 hover:text-white rounded-xl transition-all duration-150 active:scale-[0.97]"
                                                >
                                                    <Search className="w-4 h-4 me-1.5" />
                                                    <span className="hidden sm:inline">{t('verification.search_again', 'Verify Another')}</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-10 space-y-8 bg-[#12161F]">
                                        {/* Certificate Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            <DetailItem
                                                icon={User}
                                                label={t('verification.details.recipient', 'ISSUED TO')}
                                                value={result?.certificate?.recipientName}
                                                highlight
                                                isRTL={isRTL}
                                            />
                                            <DetailItem
                                                icon={Award}
                                                label={t('verification.details.course', 'PROGRAM / COURSE')}
                                                value={result?.certificate?.title}
                                                highlight
                                                isRTL={isRTL}
                                            />
                                            <DetailItem
                                                icon={FileText}
                                                label={t('verification.details.certificate_number', 'CERTIFICATE ID')}
                                                value={result?.certificate?.certificateNumber || result?.certificate?.verificationCode || code}
                                                isRTL={isRTL}
                                            />
                                            <DetailItem
                                                icon={Calendar}
                                                label={t('verification.details.issue_date', 'DATE OF ISSUE')}
                                                value={formatDateString(result?.certificate?.completionDate)}
                                                isRTL={isRTL}
                                            />
                                            {result?.certificate?.propertyName && (
                                                <DetailItem
                                                    icon={Building2}
                                                    label={t('verification.details.property', 'PROPERTY')}
                                                    value={result.certificate.propertyName}
                                                    isRTL={isRTL}
                                                />
                                            )}
                                            {result?.certificate?.departmentName && (
                                                <DetailItem
                                                    icon={Layers}
                                                    label={t('verification.details.department', 'DEPARTMENT')}
                                                    value={result.certificate.departmentName}
                                                    isRTL={isRTL}
                                                />
                                            )}
                                        </div>

                                        {/* Certificate Description if present */}
                                        {result?.certificate?.description && (
                                            <div className="p-5 rounded-2xl border border-white/10 bg-[#0A0D12] text-sm text-slate-200" style={fontBody}>
                                                <span className="font-bold text-[#E07A5F] uppercase text-xs tracking-wider block mb-1">Description:</span>
                                                <p>{result.certificate.description}</p>
                                            </div>
                                        )}

                                        {/* Official Seal Statement Box */}
                                        <div className="p-6 border border-[#C45B2F]/40 bg-[#0A0D12] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                                            <div className="flex items-center gap-5 text-center sm:text-start">
                                                <OfficialSealGraphic isRTL={isRTL} className="shrink-0" />
                                                <div>
                                                    <h4 className="text-base sm:text-lg font-bold text-[#F3C99F]" style={fontSans}>
                                                        {t('verification.authentic_seal', 'ALTUS Advisory Excellence Center Seal')}
                                                    </h4>
                                                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed" style={fontBody}>
                                                        {t('verification.valid_desc', 'This certificate is authentic and was issued by the Altus Advisory Excellence Center.')}
                                                    </p>
                                                </div>
                                            </div>
                                            {result?.verifiedAt && (
                                                <span className="text-xs text-[#E07A5F] shrink-0 px-4 py-2 rounded-xl border border-white/10 bg-[#12161F]" style={mono}>
                                                    Verified: {new Date(result.verifiedAt).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Copyright */}
                                <p className="text-center text-xs text-slate-400" style={fontBody}>
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
                            ✓ Authenticated &amp; Registered Credential
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
                                    <td className="py-2.5 px-3 font-bold text-emerald-700 uppercase">VALID &amp; ACTIVE (AUTHENTICATED)</td>
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
                            <p className="text-[10px] text-slate-500">Excellence &amp; Compliance Center</p>
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
    );
}

function DetailItem({ icon: Icon, label, value, className = '', highlight = false, isRTL = false }: DetailItemProps) {
    return (
        <div 
            className={`flex items-start gap-4 p-5 sm:p-6 rounded-2xl border transition-all duration-300 shadow-xl bg-[#0A0D12] ${
                highlight ? 'border-[#C45B2F]/50 bg-[#C45B2F]/5' : 'border-white/10'
            } ${className}`}
        >
            <div 
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-md ${
                    highlight ? 'bg-[#C45B2F]/20 border-[#C45B2F]/40 text-[#E07A5F]' : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
            >
                <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-[#E07A5F] uppercase tracking-widest block mb-1.5" style={isRTL ? cairo : neueHaas}>
                    {label}
                </span>
                <span 
                    style={highlight ? (isRTL ? cairo : canela) : mono}
                    className={`text-base sm:text-lg font-bold leading-snug break-words block ${
                        highlight ? 'text-white' : 'text-slate-200'
                    }`}
                >
                    {value || 'N/A'}
                </span>
            </div>
        </div>
    );
}

