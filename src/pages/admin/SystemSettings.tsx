import { PageHeader } from '@/ui/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSystemSettings, type SystemSetting } from '@/hooks/useSystemSettings'
import { SubscriptionEntitlementsCard } from '@/pages/admin/components/SubscriptionEntitlementsCard'
import { useTenant } from '@/contexts/TenantContext'
import {
    Bell,
    Building,
    Loader2,
    Palette,
    RotateCcw,
    Save,
    Settings,
    Shield,
    Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton, WorkspaceHeader } from '@/ui'

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    general: { label: 'General', icon: <Settings className="w-4 h-4" />, description: 'Core application settings' },
    security: { label: 'Security', icon: <Shield className="w-4 h-4" />, description: 'Authentication and access control settings' },
    notifications: { label: 'Notifications', icon: <Bell className="w-4 h-4" />, description: 'Notification channel settings' },
    branding: { label: 'Branding', icon: <Palette className="w-4 h-4" />, description: 'Company and application branding' },
    hr: { label: 'HR & Compliance', icon: <Users className="w-4 h-4" />, description: 'Human resources and KSA compliance' },
    operations: { label: 'Operations', icon: <Building className="w-4 h-4" />, description: 'Day-to-day operations settings' },
}

const PLATFORM_EXCLUSIVE_KEYS = new Set(['maintenance_mode', 'legacy_role_fallback_enabled'])

function formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function SettingRow({
    setting,
    onUpdate,
    onReset
}: {
    setting: SystemSetting
    onUpdate: (key: string, value: unknown) => void
    onReset?: (key: string) => void
}) {
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between py-4 px-4 gap-3">
            <div className="flex-1 min-w-0 pe-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ds-ink">
                        {formatKey(setting.key)}
                    </span>
                    {setting.is_override ? (
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] text-ds-warning bg-ds-warning-soft border-ds-warning/30">
                                Changed from the default
                            </Badge>
                            {onReset && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                                    onClick={() => onReset(setting.key)}
                                    title="Revert to system default"
                                >
                                    <RotateCcw className="w-3 h-3" /> Use default
                                </Button>
                            )}
                        </div>
                    ) : (
                        <span className="text-[11px] text-ds-muted">Default</span>
                    )}
                </div>
                {setting.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                )}
                {parseError && (
                    <p className="text-xs font-medium text-ds-danger mt-1">{parseError}</p>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                {isBool ? (
                    <label className="inline-flex min-h-[44px] items-center gap-2 text-sm text-ds-ink">
                        <Switch
                            checked={setting.value as boolean}
                            onCheckedChange={(checked) => onUpdate(setting.key, checked)}
                            aria-label={formatKey(setting.key)}
                        />
                        {setting.value ? 'On' : 'Off'}
                    </label>
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
                            className="w-full text-xs font-mono p-2 border rounded-md bg-ds-surface-subtle border-ds-border focus:outline-none focus:ring-1 focus:ring-ds-brass resize-y"
                        />
                        {isDirty && (
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1 self-end bg-ds-ink hover:bg-ds-ink-secondary text-white" onClick={handleSave}>
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
                            <Button size="sm" variant="default" className="h-9 gap-1 bg-ds-ink hover:bg-ds-ink-secondary text-white" onClick={handleSave}>
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
    const { currentOrganization } = useTenant()
    const { t } = useTranslation(['admin', 'common'])
    const { groupedSettings, isLoading, updateSetting, resetSetting } = useSystemSettings()

    const handleUpdate = (key: string, value: unknown) => updateSetting.mutate({ key, value })
    const handleReset = (key: string) => resetSetting.mutate(key)

    // Only sections that actually contain settings this organization may change.
    const sections = Object.keys(CATEGORY_META)
        .map((cat) => ({ cat, list: (groupedSettings[cat] || []).filter((st) => !PLATFORM_EXCLUSIVE_KEYS.has(st.key)) }))
        .filter((sec) => sec.list.length > 0)

    const sectionTitle = (cat: string) => t(`admin:settingsPage.section.${cat}`, CATEGORY_META[cat].label)
    const sectionHint = (cat: string) => t(`admin:settingsPage.hint.${cat}`, CATEGORY_META[cat].description)

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <WorkspaceHeader
                eyebrow={t('admin:settingsPage.eyebrow', 'Organization')}
                title={t('admin:settingsPage.title', 'Settings')}
                context={currentOrganization?.name
                    ? t('admin:settingsPage.context', 'Applies to everyone in {{org}}. Changes save as soon as you make them.', { org: currentOrganization.name })
                    : null}
            />

            {isLoading ? (
                <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]" aria-busy="true">
                    <Skeleton variant="card" className="h-40" />
                    <Skeleton variant="card" className="h-96" />
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
                    {/* Section index */}
                    <nav aria-label={t('admin:settingsPage.sections', 'Sections')} className="hidden lg:block">
                        <ul className="sticky top-20 space-y-0.5 border-s border-ds-border">
                            {sections.map(({ cat }) => (
                                <li key={cat}>
                                    <a href={`#settings-${cat}`} className="-ms-px flex min-h-[36px] items-center border-s-2 border-transparent ps-4 text-sm text-ds-muted hover:border-ds-border-strong hover:text-ds-ink">
                                        {sectionTitle(cat)}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <a href="#settings-plan" className="-ms-px flex min-h-[36px] items-center border-s-2 border-transparent ps-4 text-sm text-ds-muted hover:border-ds-border-strong hover:text-ds-ink">
                                    {t('admin:settingsPage.plan', 'Plan & limits')}
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <div className="min-w-0 space-y-12">
                        {sections.length === 0 && (
                            <p className="text-sm text-ds-muted">{t('admin:settingsPage.none', 'There are no organization settings to change yet.')}</p>
                        )}
                        {sections.map(({ cat, list }) => {
                            const simple = list.filter((st) => typeof st.value !== 'object' || st.value === null)
                            const advanced = list.filter((st) => typeof st.value === 'object' && st.value !== null)
                            return (
                                <section key={cat} id={`settings-${cat}`} aria-labelledby={`settings-${cat}-title`} className="scroll-mt-20 space-y-3">
                                    <div>
                                        <h2 id={`settings-${cat}-title`} className="text-lg font-semibold text-ds-ink">{sectionTitle(cat)}</h2>
                                        <p className="text-sm text-ds-muted">{sectionHint(cat)}</p>
                                    </div>
                                    {simple.length > 0 && (
                                        <div className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                                            {simple.map((st) => <SettingRow key={st.id || st.key} setting={st} onUpdate={handleUpdate} onReset={handleReset} />)}
                                        </div>
                                    )}
                                    {advanced.length > 0 && (
                                        <details className="group rounded-[6px] border border-ds-border bg-ds-surface">
                                            <summary className="flex min-h-[44px] cursor-pointer items-center px-4 text-sm font-medium text-ds-ink">
                                                {t('admin:settingsPage.advanced', 'Advanced ({{count}})', { count: advanced.length })}
                                            </summary>
                                            <div className="divide-y divide-ds-border border-t border-ds-border">
                                                {advanced.map((st) => <SettingRow key={st.id || st.key} setting={st} onUpdate={handleUpdate} onReset={handleReset} />)}
                                            </div>
                                        </details>
                                    )}
                                </section>
                            )
                        })}

                        <section id="settings-plan" aria-labelledby="settings-plan-title" className="scroll-mt-20 space-y-3">
                            <h2 id="settings-plan-title" className="text-lg font-semibold text-ds-ink">{t('admin:settingsPage.plan', 'Plan & limits')}</h2>
                            <SubscriptionEntitlementsCard />
                        </section>
                    </div>
                </div>
            )}
        </div>
    )
}
