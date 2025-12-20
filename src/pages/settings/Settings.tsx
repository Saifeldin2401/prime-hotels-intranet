import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Globe } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { NotificationSettings } from './NotificationSettings'

export default function Settings() {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t, i18n } = useTranslation('settings')
    const [loading, setLoading] = useState(false)
    const [language, setLanguage] = useState('en')

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

            toast({
                title: "Language updated",
                description: "Your language preference has been saved.",
            })
        } catch (error) {
            console.error('Error saving language:', error)
            toast({
                title: "Error",
                description: "Failed to save language preference.",
                variant: "destructive"
            })
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">{t('title')}</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
                    <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="grid gap-6">
                        <Card className="bg-white">
                            <CardHeader>
                                <CardTitle className="text-gray-900">{t('language.title')}</CardTitle>
                                <CardDescription className="text-gray-600">{t('language.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Globe className="h-5 w-5 text-gray-700" />
                                        <Label className="text-gray-900">{t('language.label')}</Label>
                                    </div>
                                    <Select value={language} onValueChange={handleLanguageChange}>
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
        </div>
    )
}
