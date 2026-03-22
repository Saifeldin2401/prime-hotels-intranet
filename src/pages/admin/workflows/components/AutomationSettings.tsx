import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import type { AutomationConfig } from '@/hooks/useAutomationConfig'
import { useAutomationConfigs, useUpdateAutomationConfig } from '@/hooks/useAutomationConfig'
import { supabase } from '@/lib/supabase'
import { CalendarDays, GraduationCap, Loader2, Save, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"

export function AutomationSettings() {
    const { t: t_ext } = useTranslation('extracted');
    const { data: configs, isLoading, error } = useAutomationConfigs()
    const updateMutation = useUpdateAutomationConfig()
    const { toast } = useToast()
    const [localConfigs, setLocalConfigs] = useState<Partial<Record<AutomationConfig['id'], any>>>({})

    const handleToggle = (id: AutomationConfig['id'], isEnabled: boolean) => {
        updateMutation.mutate({ id, is_enabled: isEnabled }, {
            onSuccess: () => {
                toast({
                    title: 'Status Updated',
                    description: `${id.replace('_', ' ')} automation is now ${isEnabled ? 'active' : 'disabled'}.`
                })
            }
        })
    }

    const handleSaveConfig = async (id: AutomationConfig['id']) => {
        const config = localConfigs[id]
        if (!config) return

        updateMutation.mutate({ id, config }, {
            onSuccess: async () => {
                if (id === 'recurring_tasks' && config.run_time) {
                    const { error } = await supabase.rpc('update_recurring_tasks_schedule', {
                        p_run_time: config.run_time
                    })
                    if (error) {
                        toast({
                            title: 'Schedule Update Failed',
                            description: error.message,
                            variant: 'destructive'
                        })
                        return
                    }
                }

                toast({
                    title: 'Settings Saved',
                    description: `Parameters for ${id.replace('_', ' ')} have been updated.`
                })
            }
        })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {t_ext('failed_to_load_automation_settings', 'Failed to load automation settings:')}{error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Smart Leave Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 end-0 p-4 opacity-10">
                    <Sparkles className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t_ext('smart_leave_approval', 'Smart Leave Approval')}</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'smart_leave')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('smart_leave', val)}
                        />
                    </div>
                    <CardDescription>
                        {t_ext('auto_approve_low_impact_leave_requests_w', 'Auto-approve low-impact leave requests without manager intervention.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t_ext('max_duration_days', 'Max Duration (Days)')}</Label>
                        <Input
                            type="number"
                            defaultValue={configs?.find(c => c.id === 'smart_leave')?.config.max_days}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                smart_leave: { ...configs?.find(c => c.id === 'smart_leave')?.config, max_days: parseInt(e.target.value) }
                            })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t_ext('allowed_leave_types_comma_separated', 'Allowed Leave Types (comma separated)')}</Label>
                        <Input
                            type="text"
                            placeholder={t_ext('sick_annual', 'sick, annual')}
                            defaultValue={(configs?.find(c => c.id === 'smart_leave')?.config.allowed_types || []).join(', ')}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                smart_leave: {
                                    ...configs?.find(c => c.id === 'smart_leave')?.config,
                                    allowed_types: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('smart_leave')}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t_ext('save_rules', 'Save Rules')}</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Auto Training Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 end-0 p-4 opacity-10">
                    <GraduationCap className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t_ext('ai_training_allocator', 'AI Training Allocator')}</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'auto_training')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('auto_training', val)}
                        />
                    </div>
                    <CardDescription>
                        {t_ext('automatically_assign_training_modules_ba', 'Automatically assign training modules based on role and department changes.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t_ext('standard_deadline_days', 'Standard Deadline (Days)')}</Label>
                        <Input
                            type="number"
                            defaultValue={configs?.find(c => c.id === 'auto_training')?.config.default_due_days}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                auto_training: { ...configs?.find(c => c.id === 'auto_training')?.config, default_due_days: parseInt(e.target.value) }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('auto_training')}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t_ext('save_rules', 'Save Rules')}</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recurring Tasks Config */}
            <Card className="relative overflow-hidden">
                <div className="absolute top-0 end-0 p-4 opacity-10">
                    <CalendarDays className="h-12 w-12" />
                </div>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t_ext('recurring_checklists', 'Recurring Checklists')}</CardTitle>
                        <Switch
                            checked={configs?.find(c => c.id === 'recurring_tasks')?.is_enabled}
                            onCheckedChange={(val) => handleToggle('recurring_tasks', val)}
                        />
                    </div>
                    <CardDescription>
                        {t_ext('generate_daily_weekly_and_monthly_tasks_', 'Generate daily, weekly, and monthly tasks from templates autonomously.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t_ext('generation_time_cron_target', 'Generation Time (Cron Target)')}</Label>
                        <Input
                            type="text"
                            placeholder="00:00"
                            defaultValue={configs?.find(c => c.id === 'recurring_tasks')?.config.run_time}
                            onChange={(e) => setLocalConfigs({
                                ...localConfigs,
                                recurring_tasks: { ...configs?.find(c => c.id === 'recurring_tasks')?.config, run_time: e.target.value }
                            })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveConfig('recurring_tasks')}
                            disabled={updateMutation.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t_ext('save_schedule', 'Save Schedule')}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
