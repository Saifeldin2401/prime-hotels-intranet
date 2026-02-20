import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    XCircle,
    Search,
    Award,
    Calendar,
    User,
    FileText,
    ShieldCheck,
    AlertTriangle,
    ArrowLeft
} from 'lucide-react'
import { verifyCertificate } from '@/lib/certificateService'
import { format } from 'date-fns'

export default function VerifyCertificate() {
    const { code: urlCode } = useParams<{ code?: string }>()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation('public')
    const isRTL = i18n.dir() === 'rtl'

    const [code, setCode] = useState(urlCode || '')
    const [isVerifying, setIsVerifying] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!code.trim()) return

        setIsVerifying(true)
        setError(null)
        setResult(null)

        try {
            const data = await verifyCertificate(code.trim())
            if (data && data.isValid) {
                setResult(data)
                setError(null)
            } else {
                setResult(null)
                setError(t('verification.invalid_code'))
            }
        } catch (err) {
            console.error('Verification error:', err)
            setError(t('verification.invalid_code'))
            setResult(null)
        } finally {
            setIsVerifying(false)
        }
    }

    // Auto-verify if code is in URL
    useEffect(() => {
        if (urlCode) {
            handleVerify()
        }
    }, [urlCode])

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir={isRTL ? 'rtl' : 'ltr'}>
            <PublicNavbar />

            <main className="flex-grow pt-24 pb-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-hotel-gold/10 rounded-full mb-4">
                            <ShieldCheck className="w-8 h-8 text-hotel-gold" />
                        </div>
                        <h1 className="text-3xl font-bold text-hotel-navy mb-2 font-serif">
                            {t('verification.title')}
                        </h1>
                        <p className="text-gray-500 max-w-lg mx-auto">
                            {t('verification.subtitle')}
                        </p>
                    </div>

                    {!result && !error ? (
                        /* Search Form */
                        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-hotel-gold via-hotel-navy to-hotel-gold" />
                            <CardContent className="p-8">
                                <form onSubmit={handleVerify} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 block text-start">
                                            {t('verification.input_label')}
                                        </label>
                                        <div className="relative">
                                            <Input
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                placeholder={t('verification.input_placeholder')}
                                                className="h-14 lg:text-lg ps-12 border-gray-200 focus:ring-hotel-gold focus:border-hotel-gold bg-white"
                                                disabled={isVerifying}
                                            />
                                            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isVerifying || !code.trim()}
                                        className="w-full h-14 text-lg font-bold bg-hotel-navy hover:bg-hotel-navy/90 text-white rounded-xl transition-all shadow-lg hover:shadow-hotel-navy/20"
                                    >
                                        {isVerifying ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white me-2"></div>
                                                {t('verification.verifying')}
                                            </>
                                        ) : (
                                            t('verification.verify_button')
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : error ? (
                        /* Error State */
                        <Card className="border-none shadow-xl bg-white overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="h-2 bg-red-500" />
                            <CardContent className="p-10 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6 text-red-500">
                                    <XCircle className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('verification.invalid_code')}</h2>
                                <p className="text-gray-500 mb-8 max-w-md mx-auto">{t('verification.invalid_desc')}</p>
                                <Button
                                    variant="outline"
                                    onClick={() => { setError(null); setCode('') }}
                                    className="rounded-full px-8"
                                >
                                    <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ms-2' : 'me-2'}`} />
                                    {t('verification.search_again')}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Success Result */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-none shadow-2xl bg-white overflow-hidden mb-6">
                                <div className="h-2 bg-hotel-gold" />
                                <CardHeader className="bg-slate-50/50 border-b border-gray-100 p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <div className="text-center md:text-start">
                                                <CardTitle className="text-2xl font-bold text-hotel-navy font-serif">
                                                    {t('verification.valid_title')}
                                                </CardTitle>
                                                <div className="text-sm text-green-600 font-medium flex items-center gap-1 justify-center md:justify-start">
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        {t('verification.details.valid')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setResult(null); setCode(''); setError(null) }}
                                            className="text-gray-500 hover:text-hotel-navy"
                                        >
                                            <Search className="w-4 h-4 me-2" />
                                            {t('verification.search_again')}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {/* Main Details */}
                                        <div className="space-y-6">
                                            <DetailItem
                                                icon={User}
                                                label={t('verification.details.recipient')}
                                                value={result.certificate?.recipientName}
                                                className="p-4 bg-slate-50 rounded-xl"
                                            />
                                            <DetailItem
                                                icon={Award}
                                                label={t('verification.details.course')}
                                                value={result.certificate?.title}
                                                className="p-4 bg-slate-50 rounded-xl"
                                            />
                                        </div>

                                        {/* Metadata */}
                                        <div className="space-y-6">
                                            <DetailItem
                                                icon={FileText}
                                                label={t('verification.details.certificate_number')}
                                                value={result.certificate?.certificateNumber}
                                                className="p-4 bg-slate-50 rounded-xl"
                                            />
                                            <DetailItem
                                                icon={Calendar}
                                                label={t('verification.details.issue_date')}
                                                value={result.certificate?.completionDate ? format(new Date(result.certificate.completionDate), 'PPP') : 'N/A'}
                                                className="p-4 bg-slate-50 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    {/* Verification Message */}
                                    <div className="mt-10 p-6 bg-hotel-navy/5 rounded-2xl border border-hotel-navy/10">
                                        <p className="text-center text-hotel-navy italic">
                                            "{t('verification.valid_desc')}"
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <p className="text-center text-sm text-gray-400">
                                {t('footer.copyright', { year: new Date().getFullYear() })}
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function DetailItem({ icon: Icon, label, value, className }: any) {
    return (
        <div className={`flex items-start gap-4 ${className}`}>
            <div className="w-10 h-10 bg-white shadow-sm rounded-lg flex items-center justify-center text-hotel-navy flex-shrink-0">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    {label}
                </span>
                <span className="text-lg font-bold text-hotel-navy">
                    {value}
                </span>
            </div>
        </div>
    )
}
