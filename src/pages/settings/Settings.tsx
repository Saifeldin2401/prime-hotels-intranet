import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Globe, Accessibility, Keyboard, Shield, Clock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { NotificationSettings } from './NotificationSettings'
import { useUserSettings } from '@/contexts/UserSettingsContext'

export default function Settings() {
    const { user } = useAuth()
    const { t, i18n } = useTranslation('settings')
    const {
        reduced_motion,
        high_contrast,
        large_text,
        keyboard_shortcuts,
        timezone,
        updateSettings: updateUserSettings,
        loading: settingsLoading
    } = useUserSettings()

    const [loading, setLoading] = useState(false)
    const [language, setLanguage] = useState('en')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [updatingPassword, setUpdatingPassword] = useState(false)

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('profiles')
                .select('language')
                .eq('id', user?.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading settings:', error)
            }

            if (data?.language) {
                setLanguage(data.language)
                i18n.changeLanguage(data.language)
            }
        } finally {
            setLoading(false)
        }
    }, [user?.id, i18n])

    useEffect(() => {
        if (user) loadSettings()
    }, [user, loadSettings])

    useEffect(() => {
        // Sync language with i18n on mount
        setLanguage(i18n.language)
    }, [i18n.language])

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        try {
            setUpdatingPassword(true)
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error

            toast.success('Password updated successfully')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password')
        } finally {
            setUpdatingPassword(false)
        }
    }

    const handleSignOutOthers = async () => {
        try {
            const { error } = await supabase.auth.signOut({ scope: 'others' })
            if (error) throw error
            toast.success('Signed out of all other devices')
        } catch (error: any) {
            toast.error(error.message || 'Failed to sign out of other devices')
        }
    }

    const handleLanguageChange = async (newLanguage: string) => {
        if (!user) return

        try {
            setLanguage(newLanguage)
            i18n.changeLanguage(newLanguage)

            const { error } = await supabase
                .from('profiles')
                .update({ language: newLanguage })
                .eq('id', user.id)

            if (error) throw error

            toast.success(t('messages.language_updated', 'Language updated'), {
                description: t('messages.language_updated_desc', 'Your language preference has been saved.')
            })
        } catch (error) {
            console.error('Error saving language:', error)
            toast.error(t('common:messages.error_action_failed', 'Failed to save language preference'))
        }
    }

    if (loading || settingsLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-hotel-gold" /></div>
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t('title')}</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-8 p-1 bg-slate-100 dark:bg-hotel-navy-dark rounded-xl border border-border/50">
                    <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm">
                        {t('tabs.general')}
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm">
                        {t('tabs.notifications')}
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm">
                        {t('tabs.security')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="grid gap-6">
                        {/* Language & Region */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-hotel-gold" />
                                    {t('language.title')}
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">{t('language.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('language.label')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Choose your primary interface language</p>
                                    </div>
                                    <Select value={language} onValueChange={handleLanguageChange}>
                                        <SelectTrigger className="w-[180px] bg-white dark:bg-hotel-navy-dark">
                                            <SelectValue placeholder={t('language.select_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t('language.en')}</SelectItem>
                                            <SelectItem value="ar">{t('language.ar')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="h-px bg-border/50 mx-[-24px]" />

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('general.timezone.label')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('general.timezone.description')}</p>
                                    </div>
                                    <Select
                                        value={timezone}
                                        onValueChange={(val) => updateUserSettings({ timezone: val })}
                                    >
                                        <SelectTrigger className="w-[220px] bg-white dark:bg-hotel-navy-dark">
                                            <SelectValue placeholder={t('general.timezone.select_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Asia/Riyadh">Riyadh (GMT+3)</SelectItem>
                                            <SelectItem value="Asia/Dubai">Dubai (GMT+4)</SelectItem>
                                            <SelectItem value="UTC">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Accessibility */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                    <Accessibility className="h-5 w-5 text-hotel-gold" />
                                    {t('appearance.accessibility.title')}
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">Tailor the interface to your visual and motor needs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('appearance.accessibility.reduced_motion')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.accessibility.reduced_motion_desc')}</p>
                                    </div>
                                    <Switch
                                        checked={reduced_motion}
                                        onCheckedChange={(checked) => updateUserSettings({ reduced_motion: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('appearance.accessibility.high_contrast')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.accessibility.high_contrast_desc')}</p>
                                    </div>
                                    <Switch
                                        checked={high_contrast}
                                        onCheckedChange={(checked) => updateUserSettings({ high_contrast: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('appearance.accessibility.large_text')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.accessibility.large_text_desc')}</p>
                                    </div>
                                    <Switch
                                        checked={large_text}
                                        onCheckedChange={(checked) => updateUserSettings({ large_text: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Productivity */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                    <Keyboard className="h-5 w-5 text-hotel-gold" />
                                    {t('appearance.shortcuts.title')}
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">Speed up your workflow with power-user tools</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t('appearance.shortcuts.enable')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('appearance.shortcuts.enable_desc')}</p>
                                    </div>
                                    <Switch
                                        checked={keyboard_shortcuts}
                                        onCheckedChange={(checked) => updateUserSettings({ keyboard_shortcuts: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationSettings />
                </TabsContent>

                <TabsContent value="security">
                    <div className="grid gap-6">
                        {/* Change Password */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-hotel-gold" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>Update your password to keep your account secure</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">New Password</Label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-hotel-gold outline-none"
                                    />
                                    <p className="text-xs text-gray-400">Must be at least 8 characters</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Confirm New Password</Label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-hotel-gold outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordUpdate}
                                    disabled={updatingPassword}
                                    className="w-full bg-hotel-gold hover:bg-hotel-gold-dark text-white font-semibold py-2 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    {updatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update Password
                                </button>
                            </CardContent>
                        </Card>

                        {/* Active Sessions */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-hotel-gold" />
                                    Active Sessions
                                </CardTitle>
                                <CardDescription>Devices currently signed into your account</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/50">
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Current Session</p>
                                                <p className="text-xs text-gray-500">Your active workspace</p>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                                    </div>
                                    <div className="p-6 bg-slate-50/50 dark:bg-white/5">
                                        <div className="flex flex-col gap-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-medium">Other Active Devices</h4>
                                                <p className="text-xs text-gray-500">To secure your account, you can terminate all other active sessions across your devices.</p>
                                            </div>
                                            <button
                                                onClick={handleSignOutOthers}
                                                className="w-fit text-sm text-red-600 hover:text-red-700 font-medium px-4 py-2 border border-red-200 dark:border-red-900/50 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                Sign out of all other devices
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
