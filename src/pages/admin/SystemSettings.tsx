import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSystemSettings, type SystemSetting } from '@/hooks/useSystemSettings'
import { SubscriptionEntitlementsCard } from '@/pages/admin/components/SubscriptionEntitlementsCard'
import {
    Bell,
    Building,
    Loader2,
    Palette,
    Save,
    Settings,
    Shield,
    Users,
    CreditCard
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
    const isObject = typeof setting.value === 'object' && setting.value !== null

    const formattedPropValue = useMemo(() => {
        if (isBool) return String(setting.value)
        if (isObject) return JSON.stringify(setting.value, null, 2)
        return String(setting.value ?? '')
    }, [setting.value, isBool, isObject])

    const [localValue, setLocalValue] = useState<string>(formattedPropValue)
    const [isDirty, setIsDirty] = useState(false)
    const [parseError, setParseError] = useState<string | null>(null)

    useEffect(() => {
        if (!isDirty) {
            setLocalValue(formattedPropValue)
        }
    }, [formattedPropValue, isDirty])

    const handleSave = () => {
        let parsed: unknown = localValue
        if (isNumber) {
            parsed = Number(localValue)
        } else if (isObject) {
            try {
                parsed = JSON.parse(localValue)
                setParseError(null)
            } catch (err: any) {
                setParseError(err?.message || 'Invalid JSON format')
                return
            }
        }
        onUpdate(setting.key, parsed)
        setIsDirty(false)
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between py-4 px-4 border-b last:border-0 gap-3">
            <div className="flex-1 min-w-0 pe-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {formatKey(setting.key)}
                    </span>
                </div>
                {setting.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                )}
                {parseError && (
                    <p className="text-xs font-medium text-rose-500 mt-1">{parseError}</p>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                {isBool ? (
                    <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={(checked) => onUpdate(setting.key, checked)}
                    />
                ) : isObject ? (
                    <div className="flex flex-col gap-2 w-full sm:w-80">
                        <textarea
                            value={localValue}
                            onChange={(e) => {
                                setLocalValue(e.target.value)
                                setIsDirty(true)
                                setParseError(null)
                            }}
                            rows={3}
                            className="w-full text-xs font-mono p-2 border rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-hotel-gold resize-y"
                        />
                        {isDirty && (
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1 self-end bg-hotel-navy hover:bg-hotel-navy-light text-white" onClick={handleSave}>
                                <Save className="w-3.5 h-3.5" />
                                Save Changes
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                            type={isNumber ? "number" : "text"}
                            value={localValue}
                            onChange={(e) => {
                                setLocalValue(e.target.value)
                                setIsDirty(true)
                            }}
                            className="w-full sm:w-48 text-sm h-9"
                        />
                        {isDirty && (
                            <Button size="sm" variant="default" className="h-9 gap-1 bg-hotel-navy hover:bg-hotel-navy-light text-white" onClick={handleSave}>
                                <Save className="w-3.5 h-3.5" />
                                Save
                            </Button>
                        )}
                    </div>
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
                description="Configure global application settings and inspect tenant subscription limits"
            />

            {/* Tenant Subscription & Entitlements Overview */}
            <SubscriptionEntitlementsCard />

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
