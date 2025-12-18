
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock, Megaphone, CheckCircle } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useTranslation } from 'react-i18next'

export function PendingItemsWidget() {
    const { data: stats } = useDashboardStats()
    const { t } = useTranslation('dashboard')

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('widgets.pending_widget.title')}</CardTitle>
                <CardDescription>{t('widgets.pending_widget.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {stats?.pendingApprovals ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            <div>
                                <p className="font-medium">{t('widgets.pending_widget.approvals')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {t('widgets.pending_widget.items_waiting', { count: stats.pendingApprovals })}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
                {stats?.unreadNotifications ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Megaphone className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="font-medium">{t('widgets.pending_widget.notifications')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {t('widgets.pending_widget.notifications_count', { count: stats.unreadNotifications })}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
                {stats?.unreadAnnouncements ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Megaphone className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="font-medium">{t('widgets.pending_widget.announcements')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {t('widgets.pending_widget.announcements_count', { count: stats.unreadAnnouncements })}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
                {(!stats?.pendingApprovals && !stats?.unreadNotifications && !stats?.unreadAnnouncements) && (
                    <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <p>{t('widgets.pending_widget.all_caught_up')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
