
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { useMaintenanceStats } from '@/hooks/useMaintenanceStats'
import { useTranslation } from 'react-i18next'

export function MaintenanceWidget() {
    const { data: stats } = useMaintenanceStats()
    const { t } = useTranslation('dashboard')

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('widgets.maintenance')}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.open || 0}</div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{stats?.critical || 0} {t('analytics.critical')}</span>
                    <span>{stats?.urgent || 0} {t('analytics.urgent')}</span>
                </div>
            </CardContent>
        </Card>
    )
}
