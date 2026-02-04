import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Mail, CheckCircle, BookOpen, AlertCircle, Wrench, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function NotificationSettings() {
    const { preferences, isLoading, updatePreferences } = useNotificationPreferences()
    const { t } = useTranslation('settings')

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
    }

    if (!preferences) {
        return <div>{t('actions.error')}</div>
    }

    const handleToggle = (key: keyof typeof preferences) => {
        updatePreferences.mutate({ [key]: !preferences[key] })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('notifications.email_notifications')}</CardTitle>
                <CardDescription>
                    {t('notifications.description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Bell className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <Label className="text-base">{t('notifications.browser_notifications')}</Label>
                            <p className="text-sm text-gray-500">{t('notifications.types.browser_notifications_desc_detailed')}</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.browser_push_enabled}
                        onCheckedChange={async (checked) => {
                            if (checked) {
                                const permission = await Notification.requestPermission()
                                if (permission === 'granted') {
                                    handleToggle('browser_push_enabled')
                                } else {
                                    toast.error(t('notifications.types.permission_error'))
                                }
                            } else {
                                handleToggle('browser_push_enabled')
                            }
                        }}
                    />
                </div>

                <div className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <Label className="text-base">{t('notifications.types.enable_all_emails')}</Label>
                            <p className="text-sm text-gray-500">{t('notifications.types.enable_all_emails_desc')}</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.email_enabled}
                        onCheckedChange={() => handleToggle('email_enabled')}
                    />
                </div>

                <div className={preferences.email_enabled ? "space-y-6" : "space-y-6 opacity-30 pointer-events-none"}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-green-100 rounded-full">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <Label className="text-base">{t('notifications.types.approvals')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.approvals_desc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.approval_email}
                            onCheckedChange={() => handleToggle('approval_email')}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <Label className="text-base">{t('notifications.types.training')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.training_desc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.training_email}
                            onCheckedChange={() => handleToggle('training_email')}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-purple-100 rounded-full">
                                <AlertCircle className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                                <Label className="text-base">{t('notifications.types.announcements')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.announcements_desc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.announcement_email}
                            onCheckedChange={() => handleToggle('announcement_email')}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-orange-100 rounded-full">
                                <Wrench className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                                <Label className="text-base">{t('notifications.types.maintenance')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.maintenance_desc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.maintenance_email}
                            onCheckedChange={() => handleToggle('maintenance_email')}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
