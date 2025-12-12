import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Moon, Sun, Globe } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { NotificationSettings } from './NotificationSettings'

export default function Settings() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t, i18n } = useTranslation('settings')
    const { mode, setMode } = useTheme() // Using usage from ThemeContext
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Settings state
    const [language, setLanguage] = useState('en')
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [pushNotifications, setPushNotifications] = useState(true)

    useEffect(() => {
        if (user) loadSettings()
    }, [user])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user?.id)
                .single()

            if (error && error.code !== 'PGRST116') { // Ignore not found error
                console.error('Error loading settings:', error)
            }

            if (data) {
                setLanguage(data.language)
                setEmailNotifications(data.email_notifications)
                setPushNotifications(data.push_notifications)

                // Sync theme mode
                if (data.theme && data.theme !== mode) {
                    setMode(data.theme as 'light' | 'dark' | 'system')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSaveSettings = async () => {
        if (!user) return

        try {
            setSaving(true)

            const settings = {
                user_id: user.id,
                theme: mode, // Save current mode
                language,
                email_notifications: emailNotifications,
                push_notifications: pushNotifications,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert(settings)

            if (error) throw error

            toast({
                title: "Settings saved",
                description: "Your preferences have been updated successfully.",
            })
        } catch (error) {
            console.error('Error saving settings:', error)
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
                    <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
                    {/* <TabsTrigger value="account">{t('tabs.account')}</TabsTrigger> */}
                </TabsList>

                <TabsContent value="general">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('appearance.title')}</CardTitle>
                                <CardDescription>{t('appearance.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        {mode === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                        <Label>{t('appearance.theme')}</Label>
                                    </div>
                                    <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder={t('appearance.select_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">{t('appearance.light')}</SelectItem>
                                            <SelectItem value="dark">{t('appearance.dark')}</SelectItem>
                                            <SelectItem value="system">{t('appearance.system')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('language.title')}</CardTitle>
                                <CardDescription>{t('language.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="h-5 w-5" />
                                        <Label>{t('language.label')}</Label>
                                    </div>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger className="w-[180px]">
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
                    </div>
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationSettings />
                </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving || loading}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save')}
                </Button>
            </div>
        </div>
    )
}
