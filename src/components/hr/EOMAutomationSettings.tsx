import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { domAnimation, LazyMotion, m } from 'framer-motion'
import { Bot, Calculator, Calendar, Play, Settings, Sparkles, Target, Building2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Property {
    id: string
    name: string
}

interface AutomationConfig {
    id?: string
    property_id: string
    is_enabled: boolean
    task_completion_weight: number
    training_completion_weight: number
    sop_compliance_weight: number
    attendance_weight: number
    min_attendance_rate: number
    min_task_completion_rate: number
    auto_announce: boolean
    announcement_day: number
    exclude_recent_winners: boolean
    exclusion_months: number
    min_employment_days: number
    updated_at?: string
}

interface EOMAutomationSettingsProps {
    onRunCalculation?: () => void
}

export function EOMAutomationSettings({ onRunCalculation }: EOMAutomationSettingsProps) {
    const { t } = useTranslation('dashboard')
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const { toast } = useToast()

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [runningCalculation, setRunningCalculation] = useState(false)
    const [config, setConfig] = useState<AutomationConfig | null>(null)
    const [properties, setProperties] = useState<Property[]>([])
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

    // Fetch all properties for Head Office
    useEffect(() => {
        async function fetchProperties() {
            const { data } = await supabase.from('properties').select('id, name').order('name')
            if (data) setProperties(data)
        }
        if (!isRealPropertyId(currentProperty?.id)) {
            fetchProperties()
        }
    }, [currentProperty?.id])

    const fetchConfig = useCallback(async (propertyId: string) => {
        if (!propertyId || !isRealPropertyId(propertyId)) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('eom_automation_config')
                .select('*')
                .eq('property_id', propertyId)
                .single()

            if (error && error.code !== 'PGRST116') {
                throw error
            }

            if (data) {
                setConfig(data)
            } else {
                // Create default config
                setConfig({
                    property_id: propertyId,
                    is_enabled: false,
                    task_completion_weight: 40,
                    training_completion_weight: 30,
                    sop_compliance_weight: 20,
                    attendance_weight: 10,
                    min_attendance_rate: 80,
                    min_task_completion_rate: 70,
                    auto_announce: false,
                    announcement_day: 1,
                    exclude_recent_winners: true,
                    exclusion_months: 3,
                    min_employment_days: 30
                })
            }
        } catch (err) {
            console.error('Error fetching config:', err)
            toast({
                title: 'Error',
                description: 'Failed to load automation settings',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (isRealPropertyId(currentProperty?.id)) {
            setSelectedPropertyId(currentProperty.id)
            fetchConfig(currentProperty.id)
        }
    }, [currentProperty?.id, fetchConfig])

    const handleSave = async () => {
        if (!config || !user?.id) return

        setSaving(true)
        try {
            const payload = {
                ...config,
                updated_by: user.id
            }

            const { error } = await supabase
                .from('eom_automation_config')
                .upsert(payload, { onConflict: 'property_id' })

            if (error) throw error

            toast({
                title: t('common:actions.save_success'),
                description: 'Automation settings saved successfully'
            })

            fetchConfig(config.property_id)
        } catch (err) {
            toast({
                title: t('common:errors.save_failed'),
                description: err instanceof Error ? err.message : 'Failed to save',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleRunTestCalculation = async () => {
        if (!config?.property_id) return

        setRunningCalculation(true)
        try {
            const now = new Date()
            const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
            const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

            const { data, error } = await supabase
                .rpc('run_eom_calculation', {
                    p_property_id: config.property_id,
                    p_month: prevMonth,
                    p_year: prevYear
                })

            if (error) throw error

            toast({
                title: 'Test Calculation Complete',
                description: `Calculated scores for ${data?.length || 0} employees. Top performer: ${data?.[0]?.full_name || 'N/A'} (${data?.[0]?.total_score || 0}/100)`
            })

            onRunCalculation?.()
        } catch (err) {
            toast({
                title: 'Calculation Failed',
                description: err instanceof Error ? err.message : 'Failed to run calculation',
                variant: 'destructive'
            })
        } finally {
            setRunningCalculation(false)
        }
    }

    const handlePropertySelect = (propertyId: string) => {
        setSelectedPropertyId(propertyId)
        fetchConfig(propertyId)
    }

    const updateWeight = (key: keyof AutomationConfig, value: number) => {
        if (!config) return
        setConfig({ ...config, [key]: value })
    }

    // Head Office view - show property selector
    if (!isRealPropertyId(currentProperty?.id)) {
        return (
            <Card className="border-hotel-gold/20">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bot className="h-5 w-5 text-hotel-gold" />
                        Automated Selection
                    </CardTitle>
                    <CardDescription>
                        Configure per-property automation settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-hotel-gold" />
                            Select Property
                        </Label>
                        <Select value={selectedPropertyId || ''} onValueChange={handlePropertySelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a property..." />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading && (
                        <div className="animate-pulse space-y-4 pt-4">
                            <div className="h-4 bg-hotel-gold/20 rounded w-1/3" />
                            <div className="h-8 bg-hotel-gold/20 rounded" />
                        </div>
                    )}

                    {!loading && config && (
                        <LazyMotion features={domAnimation}>
                            <m.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6 pt-4 border-t border-slate-100"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-hotel-gold/10 p-2 rounded-lg">
                                            <Bot className="h-5 w-5 text-hotel-gold" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{properties.find(p => p.id === selectedPropertyId)?.name}</p>
                                            <p className="text-xs text-slate-500">Automation Settings</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={config.is_enabled}
                                        onCheckedChange={(checked) => updateWeight('is_enabled', checked as unknown as number)}
                                    />
                                </div>

                                {!config.is_enabled && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                                        Enable automation to let the system calculate employee scores and select the winner automatically.
                                    </div>
                                )}

                                {config.is_enabled && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Task Weight</Label>
                                                <Input
                                                    type="number"
                                                    value={config.task_completion_weight}
                                                    onChange={(e) => updateWeight('task_completion_weight', parseInt(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Training Weight</Label>
                                                <Input
                                                    type="number"
                                                    value={config.training_completion_weight}
                                                    onChange={(e) => updateWeight('training_completion_weight', parseInt(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">SOP Weight</Label>
                                                <Input
                                                    type="number"
                                                    value={config.sop_compliance_weight}
                                                    onChange={(e) => updateWeight('sop_compliance_weight', parseInt(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Attendance Weight</Label>
                                                <Input
                                                    type="number"
                                                    value={config.attendance_weight}
                                                    onChange={(e) => updateWeight('attendance_weight', parseInt(e.target.value) || 0)}
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="bg-hotel-gold hover:bg-hotel-gold/90 text-white flex-1"
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleRunTestCalculation}
                                                disabled={runningCalculation}
                                                className="border-hotel-gold/30 text-hotel-gold"
                                            >
                                                <Play className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </m.div>
                        </LazyMotion>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (loading || !config) {
        return (
            <Card className="border-hotel-gold/20">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-hotel-gold/20 rounded w-1/3" />
                        <div className="h-8 bg-hotel-gold/20 rounded" />
                        <div className="h-8 bg-hotel-gold/20 rounded" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const totalWeight = config.task_completion_weight + config.training_completion_weight + config.sop_compliance_weight + config.attendance_weight
    const isWeightValid = totalWeight === 100

    return (
        <LazyMotion features={domAnimation}>
            <Card className="border-hotel-gold/20 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-hotel-gold/5 to-transparent border-b border-hotel-gold/10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-hotel-gold/10 p-2.5 rounded-xl">
                                <Bot className="h-6 w-6 text-hotel-gold" />
                            </div>
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Automated Selection
                                    {config.is_enabled && (
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Let the system automatically select the Employee of the Month based on performance metrics
                                </CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={config.is_enabled}
                            onCheckedChange={(checked) => updateWeight('is_enabled', checked as unknown as number)}
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    {/* Enable/Disable Notice */}
                    {!config.is_enabled && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                            Enable automation to let the system calculate employee scores and select the winner automatically.
                        </div>
                    )}

                    {config.is_enabled && (
                        <m.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            {/* Metric Weights */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className="h-4 w-4 text-hotel-gold" />
                                    <h4 className="font-semibold text-hotel-charcoal">Scoring Weights</h4>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full ml-auto",
                                        isWeightValid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                    )}>
                                        Total: {totalWeight}%
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {/* Task Completion Weight */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label className="flex items-center gap-2">
                                                <Target className="h-3.5 w-3.5 text-blue-500" />
                                                Task Completion
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={config.task_completion_weight}
                                                    onChange={(e) => updateWeight('task_completion_weight', parseInt(e.target.value) || 0)}
                                                    className="w-20 h-8 text-right"
                                                />
                                                <span className="text-sm font-medium w-6">%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all"
                                                style={{ width: `${config.task_completion_weight}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Training Completion Weight */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label className="flex items-center gap-2">
                                                <Calculator className="h-3.5 w-3.5 text-purple-500" />
                                                Training Completion
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={config.training_completion_weight}
                                                    onChange={(e) => updateWeight('training_completion_weight', parseInt(e.target.value) || 0)}
                                                    className="w-20 h-8 text-right"
                                                />
                                                <span className="text-sm font-medium w-6">%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 transition-all"
                                                style={{ width: `${config.training_completion_weight}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* SOP Compliance Weight */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label className="flex items-center gap-2">
                                                <Settings className="h-3.5 w-3.5 text-green-500" />
                                                SOP Compliance
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={config.sop_compliance_weight}
                                                    onChange={(e) => updateWeight('sop_compliance_weight', parseInt(e.target.value) || 0)}
                                                    className="w-20 h-8 text-right"
                                                />
                                                <span className="text-sm font-medium w-6">%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${config.sop_compliance_weight}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Attendance Weight */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                                Attendance Rate
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={config.attendance_weight}
                                                    onChange={(e) => updateWeight('attendance_weight', parseInt(e.target.value) || 0)}
                                                    className="w-20 h-8 text-right"
                                                />
                                                <span className="text-sm font-medium w-6">%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 transition-all"
                                                style={{ width: `${config.attendance_weight}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!isWeightValid && (
                                    <p className="text-xs text-amber-600">
                                        Total weights must equal 100%. Current total: {totalWeight}%
                                    </p>
                                )}
                            </div>

                            {/* Minimum Requirements */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-semibold text-hotel-charcoal flex items-center gap-2">
                                    <Target className="h-4 w-4 text-hotel-gold" />
                                    Minimum Eligibility Requirements
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">Minimum Attendance Rate (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={config.min_attendance_rate}
                                            onChange={(e) => updateWeight('min_attendance_rate', parseInt(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm">Minimum Task Completion (%)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={config.min_task_completion_rate}
                                            onChange={(e) => updateWeight('min_task_completion_rate', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Eligibility Rules */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-semibold text-hotel-charcoal flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-hotel-gold" />
                                    Eligibility Rules
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm">Exclude Recent Winners</Label>
                                            <p className="text-xs text-slate-500">Prevent the same employee from winning multiple times in a row</p>
                                        </div>
                                        <Switch
                                            checked={config.exclude_recent_winners}
                                            onCheckedChange={(checked) => updateWeight('exclude_recent_winners', checked as unknown as number)}
                                        />
                                    </div>

                                    {config.exclude_recent_winners && (
                                        <div className="space-y-2 pl-4 border-l-2 border-hotel-gold/20">
                                            <Label className="text-sm">Exclusion Period (months)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={12}
                                                value={config.exclusion_months}
                                                onChange={(e) => updateWeight('exclusion_months', parseInt(e.target.value) || 1)}
                                                className="w-32"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm">Minimum Employment Duration (days)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={config.min_employment_days}
                                            onChange={(e) => updateWeight('min_employment_days', parseInt(e.target.value) || 1)}
                                            className="w-32"
                                        />
                                        <p className="text-xs text-slate-500">Employee must be employed for at least this many days to be eligible</p>
                                    </div>
                                </div>
                            </div>

                            {/* Announcement Settings */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="font-semibold text-hotel-charcoal flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-hotel-gold" />
                                    Announcement Settings
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm">Auto-Announce Winner</Label>
                                            <p className="text-xs text-slate-500">
                                                If disabled, HR must review and approve before announcement
                                            </p>
                                        </div>
                                        <Switch
                                            checked={config.auto_announce}
                                            onCheckedChange={(checked) => updateWeight('auto_announce', checked as unknown as number)}
                                        />
                                    </div>

                                    {!config.auto_announce && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                            HR will receive a notification to review and approve the selection before it's announced.
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm">Announcement Day of Month</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={28}
                                            value={config.announcement_day}
                                            onChange={(e) => updateWeight('announcement_day', parseInt(e.target.value) || 1)}
                                            className="w-32"
                                        />
                                        <p className="text-xs text-slate-500">Day of the month when the winner is announced (1-28)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !isWeightValid}
                                    className="bg-hotel-gold hover:bg-hotel-gold/90 text-white"
                                >
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleRunTestCalculation}
                                    disabled={runningCalculation}
                                    className="border-hotel-gold/30 text-hotel-gold hover:bg-hotel-gold/10"
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    {runningCalculation ? 'Running...' : 'Test Calculation'}
                                </Button>
                            </div>
                        </m.div>
                    )}
                </CardContent>
            </Card>
        </LazyMotion>
    )
}
