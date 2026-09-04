import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserSettings } from '@/contexts/UserSettingsContext'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { useAppRecovery } from '@/hooks/useAppRecovery'
import { supabase } from '@/lib/supabase'
import { Accessibility, Globe, Keyboard, Loader2, RefreshCw, Shield, Wrench, Building2, Building, CreditCard, User as UserIcon, Bell } from 'lucide-react'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { NotificationSettings } from './NotificationSettings'
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings'
import { SessionList } from '@/components/auth/SessionList'
import { OrganizationProfileSettings } from '@/pages/admin/components/OrganizationProfileSettings'
import { HotelsManagement } from '@/pages/admin/components/HotelsManagement'
import { SubscriptionEntitlementsCard } from '@/pages/admin/components/SubscriptionEntitlementsCard'

export default function Settings() {
    const { t: t_ext } = useTranslation('extracted');
    const { user, primaryRole } = useAuth()
    const { currentOrganization, isOrgAdmin, isPlatformAdmin } = useTenant()
    const [searchParams, setSearchParams] = useSearchParams()
    const { t, i18n } = useTranslation('settings')
    const {
        reduced_motion,
        high_contrast,
        large_text,
        keyboard_shortcuts,
        updateSettings: updateUserSettings,
        loading: settingsLoading
    } = useUserSettings()

    const [loading, setLoading] = useState(false)
    const [language, setLanguage] = useState('en')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [updatingPassword, setUpdatingPassword] = useState(false)
    const { forceRefresh } = useAppRecovery()
    const [clearingCache, setClearingCache] = useState(false)

    const canManageOrg = isOrgAdmin || isPlatformAdmin || ['administrator', 'super_admin', 'corporate_admin', 'regional_admin'].includes(primaryRole || '')
    const currentTab = searchParams.get('tab') || 'general'
    const validTabs = useMemo(() => {
        return canManageOrg
            ? ['general', 'organization', 'properties', 'subscription', 'notifications', 'security', 'troubleshooting']
            : ['general', 'notifications', 'security', 'troubleshooting']
    }, [canManageOrg])

    const activeTab = validTabs.includes(currentTab) ? currentTab : 'general'

    const handleTabChange = (val: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('tab', val)
            return next
        })
    }

    const isBroadTab = ['organization', 'properties', 'subscription'].includes(activeTab)

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
        } catch (error) {
            toast.error(error.message || 'Failed to update password')
        } finally {
            setUpdatingPassword(false)
        }
    }

    const handleClearCache = async () => {
        try {
            setClearingCache(true)
            await forceRefresh()
        } finally {
            setClearingCache(false)
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
        <div className={cn("container mx-auto py-8 transition-all duration-200", isBroadTab ? "max-w-6xl" : "max-w-4xl")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-serif text-foreground">{t('title')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {canManageOrg && currentOrganization
                            ? `${currentOrganization.name} • ${t('description')}`
                            : t('description')}
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="mb-8 p-1.5 bg-slate-100 dark:bg-hotel-navy-dark rounded-xl border border-border/50 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                        <UserIcon className="h-4 w-4 me-1.5" />
                        {t('tabs.general')}
                    </TabsTrigger>
                    {canManageOrg && (
                        <TabsTrigger value="organization" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                            <Building2 className="h-4 w-4 me-1.5 text-hotel-gold" />
                            {t('tabs.organization')}
                        </TabsTrigger>
                    )}
                    {canManageOrg && (
                        <TabsTrigger value="properties" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                            <Building className="h-4 w-4 me-1.5 text-emerald-500" />
                            {t('tabs.properties')}
                        </TabsTrigger>
                    )}
                    {canManageOrg && (
                        <TabsTrigger value="subscription" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                            <CreditCard className="h-4 w-4 me-1.5 text-purple-500" />
                            {t('tabs.subscription')}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                        <Bell className="h-4 w-4 me-1.5" />
                        {t('tabs.notifications')}
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                        <Shield className="h-4 w-4 me-1.5" />
                        {t('tabs.security')}
                    </TabsTrigger>
                    <TabsTrigger value="troubleshooting" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-hotel-navy data-[state=active]:shadow-sm text-xs sm:text-sm font-medium">
                        <Wrench className="h-4 w-4 me-1.5" />
                        {t('tabs.troubleshooting', { defaultValue: 'Troubleshooting' })}
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t_ext('choose_your_primary_interface_language', 'Choose your primary interface language')}</p>
                                    </div>
                                    <Select value={language} onValueChange={handleLanguageChange}>
                                        <SelectTrigger id="language-select" className="w-[180px] bg-white dark:bg-hotel-navy-dark">
                                            <SelectValue placeholder={t('language.select_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t('language.en')}</SelectItem>
                                            <SelectItem value="ar">{t('language.ar')}</SelectItem>
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
                                <CardDescription className="text-gray-600 dark:text-gray-400">{t_ext('tailor_the_interface_to_your_visual_and_', 'Tailor the interface to your visual and motor needs')}</CardDescription>
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
                                <CardDescription className="text-gray-600 dark:text-gray-400">{t_ext('speed_up_your_workflow_with_power_user_t', 'Speed up your workflow with power-user tools')}</CardDescription>
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

                {canManageOrg && (
                    <TabsContent value="organization" className="space-y-6">
                        <OrganizationProfileSettings />
                    </TabsContent>
                )}

                {canManageOrg && (
                    <TabsContent value="properties" className="space-y-6">
                        <HotelsManagement />
                    </TabsContent>
                )}

                {canManageOrg && (
                    <TabsContent value="subscription" className="space-y-6">
                        <SubscriptionEntitlementsCard />
                    </TabsContent>
                )}

                <TabsContent value="notifications">
                    <div className="grid gap-6">
                        <NotificationSettings />
                        <PushNotificationSettings />
                    </div>
                </TabsContent>

                <TabsContent value="security">
                    <div className="grid gap-6">
                        {/* Change Password */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-hotel-gold" />
                                    {t_ext('change_password', 'Change Password')}</CardTitle>
                                <CardDescription>{t_ext('update_your_password_to_keep_your_accoun', 'Update your password to keep your account secure')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">{t_ext('new_password', 'New Password')}</Label>
                                    <Input
                                        id="new-password"
                                        name="new-password"
                                        autoComplete="new-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50"
                                    />
                                    <p className="text-xs text-gray-400">{t_ext('must_be_at_least_8_characters', 'Must be at least 8 characters')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">{t_ext('confirm_new_password', 'Confirm New Password')}</Label>
                                    <Input
                                        id="confirm-password"
                                        name="confirm-password"
                                        autoComplete="new-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-hotel-navy-dark border border-border/50"
                                    />
                                </div>
                                <button
                                    onClick={handlePasswordUpdate}
                                    disabled={updatingPassword}
                                    className="w-full bg-hotel-gold hover:bg-hotel-gold-dark text-white font-semibold py-2 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    {updatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t_ext('update_password', 'Update Password')}</button>
                            </CardContent>
                        </Card>

                        {/* Active Sessions */}
                        <SessionList />
                    </div>
                </TabsContent>

                <TabsContent value="troubleshooting">
                    <div className="grid gap-6">
                        {/* Clear Cache & Reload */}
                        <Card className="bg-white dark:bg-hotel-navy border-border/50 shadow-sm">
                            <CardHeader className="bg-slate-50/50 dark:bg-white/5 border-b border-border/50">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-hotel-gold" />
                                    {t_ext('troubleshooting', 'Troubleshooting')}</CardTitle>
                                <CardDescription>{t_ext('resolve_issues_caused_by_outdated_or_cor', 'Resolve issues caused by outdated or corrupted local app data')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-gray-900 dark:text-gray-100 font-medium">{t_ext('clear_cache_and_reload', 'Clear Cache & Reload')}</Label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t_ext('seeing_a_blank_page_missing_data_or_a_st', "Seeing a blank page, missing data, or a stale version of the app? Clearing the cache and reloading can fix it.")}</p>
                                    </div>
                                    <button
                                        onClick={handleClearCache}
                                        disabled={clearingCache}
                                        className="shrink-0 flex items-center gap-2 text-sm text-hotel-gold hover:text-hotel-gold-dark font-medium px-4 py-2 border border-hotel-gold/30 rounded-md hover:bg-hotel-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {clearingCache ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        {t_ext('clear_cache_and_reload', 'Clear Cache & Reload')}</button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
