import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, GraduationCap, Megaphone } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { StatsCardSkeleton } from '@/components/loading/CardSkeleton'

export function DocumentsWidget() {
    const { data: stats, isLoading } = useDashboardStats()

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Published documents</p>
            </CardContent>
        </Card>
    )
}

export function TrainingWidget() {
    const { data: stats, isLoading } = useDashboardStats()

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Training</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.completedTraining || 0}</div>
                <p className="text-xs text-muted-foreground">
                    {stats?.inProgressTraining || 0} in progress
                </p>
            </CardContent>
        </Card>
    )
}

export function AnnouncementsWidget() {
    const { data: stats, isLoading } = useDashboardStats()

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.unreadAnnouncements || 0}</div>
                <p className="text-xs text-muted-foreground">Unread announcements</p>
            </CardContent>
        </Card>
    )
}
