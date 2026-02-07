import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'
import { useTaskStats } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export function TaskWidget() {
    const { t } = useTranslation('dashboard')
    const { user } = useAuth()
    const { data: stats } = useTaskStats(user?.id)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {t('widgets.my_tasks', 'My Tasks')}
                </CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.todo_tasks || 0}</div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{stats?.in_progress_tasks || 0} {t('widget_common.in_progress', 'in progress')}</span>
                    <span>{stats?.overdue_tasks || 0} {t('feed_types.overdue', 'overdue')}</span>
                </div>
            </CardContent>
        </Card>
    )
}
