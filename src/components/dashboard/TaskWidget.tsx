
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'
import { useTaskStats } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'

export function TaskWidget() {
    const { user } = useAuth()
    const { data: stats } = useTaskStats(user?.id)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats?.todo_tasks || 0}</div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{stats?.in_progress_tasks || 0} in progress</span>
                    <span>{stats?.overdue_tasks || 0} overdue</span>
                </div>
            </CardContent>
        </Card>
    )
}
