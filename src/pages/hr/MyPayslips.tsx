import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePayslips } from '@/hooks/usePayslips'
import { FileText, Download, Calendar as CalendarIcon, Wallet, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MotionWrapper } from '@/components/ui/MotionWrapper'
import { toast } from 'sonner'

export default function MyPayslips() {
    const { data: payslips, isLoading } = usePayslips()

    const handleDownload = (id: string) => {
        toast.info('Generating PDF download...')
        // Mock download logic
        setTimeout(() => {
            toast.success('Payslip downloaded successfully')
        }, 1500)
    }

    return (
        <MotionWrapper>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
                        <p className="text-muted-foreground">Access and download your monthly payslips securely.</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle>Salary Overview</CardTitle>
                            <CardDescription>Quick summary of your earnings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Estimated Net Pay</span>
                                <div className="text-2xl font-bold">Confidential</div>
                                <p className="text-[10px] text-muted-foreground">Based on your most recent payslip</p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold">Payroll Help</h4>
                                <p className="text-xs text-muted-foreground">
                                    If you have any questions regarding your payslip, please contact the Property HR department.
                                </p>
                                <Button variant="outline" size="sm" className="w-full">Contact HR</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2 shadow-lg border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Payslip History
                            </CardTitle>
                            <CardDescription>View and download your historical records</CardDescription>
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
                                                        <p className="font-bold">{format(new Date(payslip.year, payslip.month - 1), 'MMMM yyyy')}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {payslip.payment_date ? `Paid on ${format(new Date(payslip.payment_date), 'MMM d')}` : 'Processing'}
                                                            </Badge>
                                                            {payslip.is_published && (
                                                                <Badge className="text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/10 border-green-500/20">
                                                                    Published
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDownload(payslip.id)}>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Download
                                                    </Button>
                                                    <Button size="sm" variant="secondary" className="gap-1">
                                                        View <ArrowRight className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {payslips?.length === 0 && (
                                            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p>No payslips found in your record.</p>
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
