import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePayslips } from '@/hooks/usePayslips'
import { FileText, Download, Calendar as CalendarIcon, Wallet, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { toast } from 'sonner'

import { useTranslation } from 'react-i18next'
import { ar, enUS } from 'date-fns/locale'

export default function MyPayslips() {
    const { t, i18n } = useTranslation('hr')
    const dateLocale = i18n.language.startsWith('ar') ? ar : enUS
    const { data: payslips, isLoading } = usePayslips()

    const handleDownload = (id: string) => {
        toast.info(t('payroll.downloading'))
        // Mock download logic
        setTimeout(() => {
            toast.success(t('payroll.download_success'))
        }, 1500)
    }

    return (
        <MotionWrapper>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('payroll.title')}</h1>
                        <p className="text-muted-foreground">{t('payroll.description')}</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle>{t('payroll.salary_overview')}</CardTitle>
                            <CardDescription>{t('payroll.salary_summary')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t('payroll.est_net_pay')}</span>
                                <div className="text-2xl font-bold">{t('payroll.confidential')}</div>
                                <p className="text-[10px] text-muted-foreground">{t('payroll.based_on_recent')}</p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">{t('payroll.help_title')}</h4>
                                <p className="text-xs text-muted-foreground">
                                    {t('payroll.help_text')}
                                </p>
                                <Button variant="outline" size="sm" className="w-full">{t('payroll.contact_hr')}</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                {t('payroll.history_title')}
                            </CardTitle>
                            <CardDescription>{t('payroll.history_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] w-full pr-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {payslips?.map((payslip) => (
                                            <div
                                                key={payslip.id}
                                                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                                                        <CalendarIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{format(new Date(payslip.year, payslip.month - 1), 'MMMM yyyy', { locale: dateLocale })}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {payslip.payment_date ? `${t('payroll.paid_on')} ${format(new Date(payslip.payment_date), 'MMM d', { locale: dateLocale })}` : t('payroll.processing')}
                                                            </Badge>
                                                            {payslip.is_published && (
                                                                <Badge className="text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/10 border-green-500/20">
                                                                    {t('payroll.published')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(payslip.id)}>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        {t('payroll.download')}
                                                    </Button>
                                                    <Button size="sm" variant="secondary" className="gap-1">
                                                        {t('payroll.view')} <ArrowRight className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {payslips?.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>{t('payroll.no_payslips')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MotionWrapper>
    )
}
