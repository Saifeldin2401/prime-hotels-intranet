import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments } from '@/hooks/useDocuments'
import { downloadCSV } from '@/lib/exportUtils'
import { format } from 'date-fns'
import { BookOpen, Clock, Download, FileText, RotateCcw } from 'lucide-react'

export default function ReportsDashboard() {
    const { data: documents, isLoading: isLoadingDocs } = useDocuments()

    if (isLoadingDocs) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        )
    }

    // Calculate Document Stats manually since useDocuments returns array
    const docStats = {
        total: documents?.length || 0,
        published: documents?.filter(d => d.status === 'PUBLISHED').length || 0,
        approved: documents?.filter(d => d.status === 'APPROVED').length || 0,
        pending: documents?.filter(d => d.status === 'PENDING_REVIEW').length || 0,
        rejected: documents?.filter(d => d.status === 'REJECTED').length || 0,
    }

    const handleExport = () => {
        const overviewData = [
            { Metric: 'Total Documents', Value: docStats.total },
            { Metric: 'Published Documents', Value: docStats.published },
            { Metric: 'Approved Documents', Value: docStats.approved },
            { Metric: 'Pending Review Documents', Value: docStats.pending },
            { Metric: 'Rejected Documents', Value: docStats.rejected },
        ]
        const columns = [
            { key: 'Metric', header: 'Metric' },
            { key: 'Value', header: 'Value' }
        ]
        downloadCSV(overviewData, columns, `knowledge_overview_report_${format(new Date(), 'yyyy-MM-dd')}`)
    }

    const cards = [
        { title: 'Published SOPs', value: docStats.published, note: 'Live in Knowledge Base', icon: BookOpen },
        { title: 'Total Documents', value: docStats.total, note: `${docStats.approved} approved`, icon: FileText },
        { title: 'Pending Review', value: docStats.pending, note: 'In approval queue', icon: Clock },
        { title: 'Needs Revision', value: docStats.rejected, note: 'Returned to authors', icon: RotateCcw },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Analytics"
                description="Knowledge base status across your organization."
                actions={
                    <Button onClick={handleExport}>
                        <Download className="w-4 h-4 me-2" />
                        Export Overview
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map(({ title, value, note, icon: Icon }) => (
                    <Card key={title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value}</div>
                            <p className="text-xs text-muted-foreground">{note}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
