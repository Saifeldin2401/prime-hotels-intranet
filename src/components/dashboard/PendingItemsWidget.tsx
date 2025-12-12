
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock, Megaphone, CheckCircle } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export function PendingItemsWidget() {
    const { data: stats } = useDashboardStats()

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Items</CardTitle>
                <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {stats?.pendingApprovals ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            <div>
                                <p className="font-medium">Pending Approvals</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats.pendingApprovals} item{stats.pendingApprovals !== 1 ? 's' : ''} waiting
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
                                <p className="font-medium">Unread Notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats.unreadNotifications} new notification{stats.unreadNotifications !== 1 ? 's' : ''}
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
                                <p className="font-medium">Unread Announcements</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats.unreadAnnouncements} new announcement{stats.unreadAnnouncements !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
                {(!stats?.pendingApprovals && !stats?.unreadNotifications && !stats?.unreadAnnouncements) && (
                    <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <p>All caught up! No pending items.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
