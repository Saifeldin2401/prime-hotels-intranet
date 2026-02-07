import { usePresence } from '@/contexts/PresenceContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslation } from 'react-i18next'

export function ActiveUsersWidget() {
    const { t } = useTranslation('dashboard')
    const { onlineUsers } = usePresence()

    // Filter out duplicates if any (though key should be unique)
    const uniqueUsers = Array.from(new Map(onlineUsers.map(u => [u.user_id, u])).values())

    return (
        <Card className="col-span-1 h-full font-sans">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {t('widgets.active_users.title', 'Active Team Members')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-4 flex items-center gap-2">
                    {uniqueUsers.length}
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
                <ScrollArea className="h-[200px] start-pr-4">
                    <div className="space-y-4">
                        {uniqueUsers.map((user) => (
                            <div key={user.user_id} className="flex items-center gap-4">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                                    <AvatarFallback>{(user.full_name || user.email || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.full_name || user.email}</p>
                                    <p className="text-xs text-muted-foreground me-2">
                                        {user.role ? t(`common:roles.${user.role}`, { defaultValue: user.role }) : t('widgets.no_role', 'Team Member')}
                                    </p>
                                </div>
                                <div className="ms-auto">
                                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">
                                        {t('widgets.active_users.online', 'Online')}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {uniqueUsers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {t('widgets.active_users.no_active', 'No other active users right now.')}
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
