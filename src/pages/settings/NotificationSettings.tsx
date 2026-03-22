import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { AlertCircle, Bell, BookOpen, CheckCircle, Clock, Globe, Loader2, Mail, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export function NotificationSettings() {
    const { t: t_ext } = useTranslation('extracted');
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
        <div className="space-y-6">
            {/* Master Channels */}
            <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-hotel-gold" />
                        {t('notifications.title')}
                    </CardTitle>
                    <CardDescription>{t('notifications.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">{t('notifications.browser_notifications')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.browser_notifications_desc_detailed')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.browser_push_enabled}
                            onCheckedChange={async (checked) => {
                                if (checked) {
                                    if (!('Notification' in window)) {
                                        toast.error("This browser does not support desktop notifications")
                                        return
                                    }
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

                    <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <Label className="text-base font-medium">{t('notifications.types.enable_all_emails')}</Label>
                                <p className="text-sm text-gray-500">{t('notifications.types.enable_all_emails_desc')}</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.email_enabled}
                            onCheckedChange={() => handleToggle('email_enabled')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Granular Controls */}
            <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                    <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2 text-base">
                        {t_ext('granular_preferences', 'Granular Preferences')}</CardTitle>
                    <CardDescription>{t_ext('choose_exactly_how_you_want_to_be_notifi', 'Choose exactly how you want to be notified for each category')}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                        {/* Approvals */}
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">{t('notifications.types.approvals')}</Label>
                                    <p className="text-sm text-gray-500">{t('notifications.types.approvals_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('email', 'Email')}</span>
                                    <Switch
                                        checked={preferences.approval_email}
                                        onCheckedChange={() => handleToggle('approval_email')}
                                        disabled={!preferences.email_enabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('push', 'Push')}</span>
                                    <Switch
                                        checked={preferences.approval_push}
                                        onCheckedChange={() => handleToggle('approval_push')}
                                        disabled={!preferences.browser_push_enabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Learning & Training */}
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">{t('notifications.types.training')}</Label>
                                    <p className="text-sm text-gray-500">{t('notifications.types.training_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('email', 'Email')}</span>
                                    <Switch
                                        checked={preferences.training_email}
                                        onCheckedChange={() => handleToggle('training_email')}
                                        disabled={!preferences.email_enabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('push', 'Push')}</span>
                                    <Switch
                                        checked={preferences.training_push}
                                        onCheckedChange={() => handleToggle('training_push')}
                                        disabled={!preferences.browser_push_enabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Announcements */}
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                    <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">{t('notifications.types.announcements')}</Label>
                                    <p className="text-sm text-gray-500">{t('notifications.types.announcements_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('email', 'Email')}</span>
                                    <Switch
                                        checked={preferences.announcement_email}
                                        onCheckedChange={() => handleToggle('announcement_email')}
                                        disabled={!preferences.email_enabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('push', 'Push')}</span>
                                    <Switch
                                        checked={preferences.announcement_push}
                                        onCheckedChange={() => handleToggle('announcement_push')}
                                        disabled={!preferences.browser_push_enabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Maintenance */}
                        <div className="p-6 flex items-center justify-between group">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                    <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">{t('notifications.types.maintenance')}</Label>
                                    <p className="text-sm text-gray-500">{t('notifications.types.maintenance_desc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('email', 'Email')}</span>
                                    <Switch
                                        checked={preferences.maintenance_email}
                                        onCheckedChange={() => handleToggle('maintenance_email')}
                                        disabled={!preferences.email_enabled}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">{t_ext('push', 'Push')}</span>
                                    <Switch
                                        checked={preferences.maintenance_push}
                                        onCheckedChange={() => handleToggle('maintenance_push')}
                                        disabled={!preferences.browser_push_enabled}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quiet Hours */}
                <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50 py-4 px-6 text-base">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-hotel-gold" />
                                {t('notifications.scheduling.title')}
                            </CardTitle>
                            <Switch
                                checked={preferences.quiet_hours_enabled}
                                onCheckedChange={() => handleToggle('quiet_hours_enabled')}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-4 space-y-4">
                        <p className="text-sm text-gray-500">{t('notifications.scheduling.description')}</p>
                        <div className={`flex items-center gap-4 ${preferences.quiet_hours_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs uppercase font-semibold text-gray-400">{t('notifications.scheduling.from')}</Label>
                                <input
                                    type="time"
                                    value={preferences.quiet_hours_start || '22:00'}
                                    onChange={(e) => updatePreferences.mutate({ quiet_hours_start: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50 rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs uppercase font-semibold text-gray-400">{t('notifications.scheduling.to')}</Label>
                                <input
                                    type="time"
                                    value={preferences.quiet_hours_end || '08:00'}
                                    onChange={(e) => updatePreferences.mutate({ quiet_hours_end: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50 rounded-md px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sounds & Summary */}
                <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden h-full">
                    <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50 py-4 px-6 text-base">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Bell className="h-4 w-4 text-hotel-gold" />
                            {t_ext('sound_summary', 'Sound & Summary')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-4 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{t('notifications.sounds.enable')}</Label>
                                <p className="text-xs text-gray-500">{t('notifications.sounds.enable_desc')}</p>
                            </div>
                            <Switch
                                checked={preferences.notification_sounds_enabled ?? true}
                                onCheckedChange={() => handleToggle('notification_sounds_enabled')}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{t('notifications.digest.title')}</Label>
                                <p className="text-xs text-gray-500">{t('notifications.digest.description')}</p>
                            </div>
                            <Switch
                                checked={preferences.daily_digest_enabled}
                                onCheckedChange={() => handleToggle('daily_digest_enabled')}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
