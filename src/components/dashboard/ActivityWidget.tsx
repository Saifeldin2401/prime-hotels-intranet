
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Megaphone, GraduationCap } from 'lucide-react'
import { useRecentActivity } from '@/hooks/useRecentActivity'
import { formatRelativeTime } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function ActivityWidget() {
    const { data: recentActivity } = useRecentActivity()
    const { t } = useTranslation('dashboard')

    if (!recentActivity || (recentActivity.announcements.length === 0 && recentActivity.assignments.length === 0)) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('widgets.activity')}</CardTitle>
                <CardDescription>{t('widgets.activity_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {recentActivity.announcements.map((announcement: any) => (
                    <div key={announcement.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex items-start gap-3">
                            <Megaphone className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="font-medium">{announcement.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatRelativeTime(announcement.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {recentActivity.assignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex items-start gap-3">
                            <GraduationCap className="w-5 h-5 text-green-500 mt-0.5" />
                            <div>
                                <p className="font-medium">
                                    {assignment.training_modules?.title || 'Training Assignment'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Assigned {formatRelativeTime(assignment.created_at)}
                                    {assignment.deadline && ` • Due ${formatRelativeTime(assignment.deadline)}`}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
