import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, GraduationCap, Megaphone } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { StatsCardSkeleton } from '@/components/loading/CardSkeleton'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export function DocumentsWidget() {
    const { data: stats, isLoading } = useDashboardStats()
    const { t } = useTranslation('dashboard')

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card className="group transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('widgets.documents')}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 group-hover:text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
                <p className="text-xs text-muted-foreground">{t('widgets.documents_desc')}</p>
            </CardContent>
        </Card>
    )
}

export function TrainingWidget() {
    const { data: stats, isLoading } = useDashboardStats()
    const { t } = useTranslation('dashboard')

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card className="group transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('widgets.training')}</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.completedTraining || 0}</div>
                <p className="text-xs text-muted-foreground">
                    {t('widgets.training_desc', { count: stats?.inProgressTraining || 0 })}
                </p>
            </CardContent>
        </Card>
    )
}

export function AnnouncementsWidget() {
    const { data: stats, isLoading } = useDashboardStats()
    const { t } = useTranslation('dashboard')

    if (isLoading) return <StatsCardSkeleton />

    return (
        <Card className="group transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('widgets.announcements')}</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 group-hover:text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.unreadAnnouncements || 0}</div>
                <p className="text-xs text-muted-foreground">{t('widgets.announcements_desc')}</p>
            </CardContent>
        </Card>
    )
}
