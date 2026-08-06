import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import {
    useDataImportLogs,
    useDeleteImportLog,
} from '@/hooks/useOperations'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
    AlertCircle,
    AlertTriangle,
    BedDouble,
    BookText,
    ChevronRight,
    Crown,
    FileSpreadsheet,
    Loader2,
    PackageSearch,
    RefreshCw,
    Trash2,
    Upload,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { isConsolidatedPropertyId } from '@/lib/propertyScope'

export default function OperationsDashboard() {
    const { t } = useTranslation(['operations', 'common'])
    const { currentProperty } = useProperty()
    const { profile } = useAuth()

    const { data: importLogs, refetch: refetchLogs } = useDataImportLogs()
    const deleteImportLog = useDeleteImportLog()
    const [logToDelete, setLogToDelete] = useState<string | null>(null)

    const handleDeleteLog = async (id: string) => {
        try {
            await deleteImportLog.mutateAsync(id)
            toast.success(t('operations:imports.deleted', 'Import history permanently deleted'))
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Delete failed'
            toast.error(errorMessage)
        } finally {
            setLogToDelete(null)
        }
    }

    const quickActions = [
        {
            to: '/operations/import',
            icon: Upload,
            color: 'bg-purple-100 dark:bg-purple-900',
            iconColor: 'text-purple-600',
            title: t('operations:nav.import', 'Data Import'),
            subtitle: t('operations:nav.import_desc', 'Upload CSV data'),
        },
        {
            to: '/operations/guest-requests',
            icon: BedDouble,
            color: 'bg-blue-100 dark:bg-blue-900',
            iconColor: 'text-blue-600',
            title: t('operations:nav.guest_requests', 'Guest Requests'),
            subtitle: t('operations:nav.guest_requests_desc', 'Service requests'),
        },
        {
            to: '/operations/logbook',
            icon: BookText,
            color: 'bg-green-100 dark:bg-green-900',
            iconColor: 'text-green-600',
            title: t('operations:nav.logbook', 'Daily Logbook'),
            subtitle: t('operations:nav.logbook_desc', 'Shift log & handover'),
        },
        {
            to: '/operations/incidents',
            icon: AlertTriangle,
            color: 'bg-orange-100 dark:bg-orange-900',
            iconColor: 'text-orange-600',
            title: t('operations:nav.incidents', 'Incidents'),
            subtitle: t('operations:nav.incidents_desc', 'Log incidents'),
        },
        {
            to: '/operations/vip-guests',
            icon: Crown,
            color: 'bg-amber-100 dark:bg-amber-900',
            iconColor: 'text-amber-600',
            title: t('operations:nav.vip_guests', 'VIP Guests'),
            subtitle: t('operations:nav.vip_guests_desc', 'Guest protocols'),
        },
        {
            to: '/operations/lost-found',
            icon: PackageSearch,
            color: 'bg-teal-100 dark:bg-teal-900',
            iconColor: 'text-teal-600',
            title: t('operations:nav.lost_found', 'Lost & Found'),
            subtitle: t('operations:nav.lost_found_desc', 'Track items'),
        },
    ]

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {t('operations:dashboard.title', 'Operations Dashboard')}
                        </h1>
                        {isConsolidatedPropertyId(currentProperty?.id) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                {t('operations:dashboard.all_properties', 'Group Portfolio (All Properties)')}
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        {currentProperty?.name || t('operations:dashboard.all_properties', 'Group Portfolio (All Properties)')} — {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                        <RefreshCw className="h-4 w-4 me-2" />
                        {t('common:refresh', 'Refresh')}
                    </Button>
                    <Button size="sm" asChild>
                        <Link to="/operations/import">
                            <Upload className="h-4 w-4 me-2" />
                            {t('operations:import.upload_data', 'Upload Data')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {quickActions.map((action) => (
                    <Link key={action.to} to={action.to} className="group">
                        <Card className="hover:shadow-md transition-all hover:border-primary/50 h-full">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', action.color)}>
                                            <action.icon className={cn('h-5 w-5', action.iconColor)} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{action.title}</p>
                                            <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Data Import History */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('operations:imports.title', 'Data Import History')}</CardTitle>
                    <CardDescription>{t('operations:imports.desc', 'Recent data imports and sync status')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {importLogs?.map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-0 group">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                                        <FileSpreadsheet className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">{log.file_name || t('operations:imports.manual', 'Manual Import')}</p>
                                            <Badge variant={
                                                log.status === 'completed' ? 'default' :
                                                    log.status === 'failed' ? 'destructive' : 'secondary'
                                            } className="text-[10px] h-4 px-1.5 uppercase font-bold">
                                                {log.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {log.property?.name} • {format(new Date(log.started_at), 'MMM d, yyyy HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {log.records_processed || 0} {t('operations:imports.records', 'records')}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                            {t('operations:imports.sync_status', 'Sync Status')}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all"
                                        onClick={() => setLogToDelete(log.id)}
                                        aria-label={t('accessibility.delete_import_log', 'Delete import log')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {(!importLogs || importLogs.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-12">
                                {t('operations:no_imports', 'No import history available')}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!logToDelete} onOpenChange={(open) => !open && setLogToDelete(null)}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            {t('operations:imports.delete_title', 'Delete Import History')}
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            {t('operations:imports.delete_warning', 'Are you sure you want to delete this import? This will permanently remove all records associated with this session.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={deleteImportLog.isPending}>
                            {t('common:cancel', 'Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => logToDelete && handleDeleteLog(logToDelete)}
                            disabled={deleteImportLog.isPending}
                            className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                        >
                            {deleteImportLog.isPending ? (
                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 me-2" />
                            )}
                            {t('operations:imports.delete_confirm', 'Delete Forever')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
