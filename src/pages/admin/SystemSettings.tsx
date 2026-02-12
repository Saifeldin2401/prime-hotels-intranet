import { useState } from 'react'
import { useSystemSettings, type SystemSetting } from '@/hooks/useSystemSettings'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Loader2,
    Settings,
    Shield,
    Bell,
    Palette,
    Users,
    Building,
    Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    general: { label: 'General', icon: <Settings className="w-4 h-4" />, description: 'Core application settings' },
    security: { label: 'Security', icon: <Shield className="w-4 h-4" />, description: 'Authentication and access control settings' },
    notifications: { label: 'Notifications', icon: <Bell className="w-4 h-4" />, description: 'Notification channel settings' },
    branding: { label: 'Branding', icon: <Palette className="w-4 h-4" />, description: 'Company and application branding' },
    hr: { label: 'HR & Compliance', icon: <Users className="w-4 h-4" />, description: 'Human resources and KSA compliance' },
    operations: { label: 'Operations', icon: <Building className="w-4 h-4" />, description: 'Day-to-day operations settings' },
}

function formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function SettingRow({ setting, onUpdate }: { setting: SystemSetting; onUpdate: (key: string, value: unknown) => void }) {
    const isBool = typeof setting.value === 'boolean'
    const isNumber = typeof setting.value === 'number'
    const isString = typeof setting.value === 'string'
    const isArray = Array.isArray(setting.value)

    const [localValue, setLocalValue] = useState<string>(
        isArray ? JSON.stringify(setting.value) : String(setting.value ?? '')
    )
    const [isDirty, setIsDirty] = useState(false)

    const handleSave = () => {
        let parsed: unknown = localValue
        if (isNumber) parsed = Number(localValue)
        else if (isArray) {
            try { parsed = JSON.parse(localValue) } catch { parsed = localValue }
        }
        onUpdate(setting.key, parsed)
        setIsDirty(false)
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 border-b last:border-0 gap-2">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatKey(setting.key)}</span>
                </div>
                {setting.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {isBool ? (
                    <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={(checked) => onUpdate(setting.key, checked)}
                    />
                ) : (
                    <>
                        <Input
                            value={localValue}
                            onChange={(e) => {
                                setLocalValue(e.target.value)
                                setIsDirty(true)
                            }}
                            className="w-40 sm:w-48 text-sm h-8"
                        />
                        {isDirty && (
                            <Button size="sm" variant="default" className="h-8 gap-1" onClick={handleSave}>
                                <Save className="w-3.5 h-3.5" />
                                Save
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function SystemSettings() {
    const { groupedSettings, isLoading, updateSetting } = useSystemSettings()

    const handleUpdate = (key: string, value: unknown) => {
        updateSetting.mutate({ key, value })
    }

    const categories = Object.keys(CATEGORY_META)

    return (
        <div className="space-y-6">
            <PageHeader
                title="System Settings"
                description="Configure global application settings"
            />

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Tabs defaultValue="general" className="space-y-4">
                    <TabsList className="flex flex-wrap h-auto gap-1">
                        {categories.map((cat) => {
                            const meta = CATEGORY_META[cat]
                            const count = groupedSettings[cat]?.length || 0
                            if (count === 0) return null
                            return (
                                <TabsTrigger key={cat} value={cat} className="gap-1.5">
                                    {meta.icon}
                                    {meta.label}
                                    <Badge variant="secondary" className="text-[10px] ms-1 px-1.5">{count}</Badge>
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>

                    {categories.map((cat) => {
                        const meta = CATEGORY_META[cat]
                        const settingsList = groupedSettings[cat] || []
                        if (settingsList.length === 0) return null
                        return (
                            <TabsContent key={cat} value={cat}>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-2">
                                            {meta.icon}
                                            <div>
                                                <CardTitle className="text-base">{meta.label}</CardTitle>
                                                <CardDescription className="text-xs">{meta.description}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {settingsList.map((s) => (
                                            <SettingRow key={s.id} setting={s} onUpdate={handleUpdate} />
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )
                    })}
                </Tabs>
            )}
        </div>
    )
}
