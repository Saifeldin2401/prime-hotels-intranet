import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Shield } from 'lucide-react'
import { useTrainingRules, useCreateTrainingRule, useDeleteTrainingRule, useUpdateTrainingRule, useTrainingModulesList } from '@/hooks/useTrainingRules'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function TrainingAssignmentRules() {
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.dir() === 'rtl'
    const { data: rules, isLoading } = useTrainingRules()
    const { data: modules } = useTrainingModulesList()

    const createMutation = useCreateTrainingRule()
    const deleteMutation = useDeleteTrainingRule()
    const updateMutation = useUpdateTrainingRule()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [targetType, setTargetType] = useState<'role' | 'job_title'>('role')
    const [newRule, setNewRule] = useState({
        training_module_id: '',
        target_role: '',
        job_title_id: '',
        is_active: true
    })

    const { data: jobTitles } = useQuery({
        queryKey: ['job_titles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_titles').select('*').order('title')
            if (error) throw error
            return data
        }
    })

    const roles = [
        'regional_admin',
        'regional_hr',
        'property_manager',
        'property_hr',
        'department_head',
        'staff'
    ]

    const handleCreate = async () => {
        try {
            if (!newRule.training_module_id) return
            if (targetType === 'role' && !newRule.target_role) return
            if (targetType === 'job_title' && !newRule.job_title_id) return

            await createMutation.mutateAsync({
                training_module_id: newRule.training_module_id,
                target_role: targetType === 'role' ? newRule.target_role : null,
                job_title_id: targetType === 'job_title' ? newRule.job_title_id : null,
                is_active: newRule.is_active
            } as any)

            setIsCreateOpen(false)
            setNewRule({
                training_module_id: '',
                target_role: '',
                job_title_id: '',
                is_active: true
            })
        } catch (error) {
            console.error('Failed to create rule:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm(t('rules.confirm_delete'))) {
            try {
                await deleteMutation.mutateAsync(id)
            } catch (error) {
                console.error('Failed to delete rule:', error)
            }
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await updateMutation.mutateAsync({
                id,
                updates: { is_active: !currentStatus }
            })
        } catch (error) {
            console.error('Failed to update rule:', error)
        }
    }

    return (
        <div className={`space-y-6 animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center justify-between">
                <PageHeader
                    title={t('rules.title')}
                    description={t('rules.description')}
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            {t('rules.new_rule')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('rules.create_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('rules.assignment_type')}</label>
                                <div className="flex bg-gray-100 p-1 rounded-md">
                                    <button
                                        onClick={() => setTargetType('role')}
                                        className={cn("flex-1 py-1 text-sm rounded-sm transition-all", targetType === 'role' ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-900")}
                                    >
                                        {t('rules.by_role')}
                                    </button>
                                    <button
                                        onClick={() => setTargetType('job_title')}
                                        className={cn("flex-1 py-1 text-sm rounded-sm transition-all", targetType === 'job_title' ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-900")}
                                    >
                                        {t('rules.by_job_title')}
                                    </button>
                                </div>
                            </div>

                            {targetType === 'role' ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('rules.target_role')}</label>
                                    <Select
                                        value={newRule.target_role}
                                        onValueChange={(val) => setNewRule(prev => ({ ...prev, target_role: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('rules.select_role')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(role => (
                                                <SelectItem key={role} value={role}>{t(`common:roles.${role}`)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('rules.target_job_title')}</label>
                                    <Select
                                        value={newRule.job_title_id}
                                        onValueChange={(val) => setNewRule(prev => ({ ...prev, job_title_id: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('rules.select_job_title')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobTitles?.map(jt => (
                                                <SelectItem key={jt.id} value={jt.id}>
                                                    {jt.title}
                                                    {jt.category && <span className="ml-2 text-xs text-muted-foreground">({jt.category})</span>}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('module')}</label>
                                <Select
                                    value={newRule.training_module_id}
                                    onValueChange={(val) => setNewRule(prev => ({ ...prev, training_module_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('rules.select_module')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modules?.map(module => (
                                            <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending || (targetType === 'role' && !newRule.target_role) || (targetType === 'job_title' && !newRule.job_title_id) || !newRule.training_module_id}>
                                {createMutation.isPending ? t('rules.creating') : t('rules.create_rule')}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div>{t('loading')}</div>
                ) : rules?.map((rule) => (
                    <Card key={rule.id} className={cn("transition-all hover:shadow-md", !rule.is_active && "opacity-60")}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-hotel-gold" />
                                        {rule.job_title_id
                                            ? rule.job_titles?.title // Assuming join, fallback to checking ID if join missing in hook
                                            : t(`common:roles.${rule.target_role}`) || t('unknown')
                                        }
                                    </CardTitle>
                                    <p className="text-sm text-gray-500">{t('rules.auto_assigns_to')} {rule.job_title_id ? t('rules.by_job_title') : t('rules.by_role')}</p>
                                </div>
                                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                    {rule.is_active ? t('common:status.active') : t('common:status.inactive')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="font-medium text-hotel-navy">{rule.training_modules?.title}</p>
                                {/* ... existing buttons ... */}
                                <div className="flex items-center gap-2 pt-2 border-t mt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleToggle(rule.id, rule.is_active)}
                                    >
                                        {rule.is_active ? t('rules.deactivate') : t('rules.activate')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(rule.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!isLoading && rules?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 border border-dashed rounded-lg">
                        <p>{t('rules.no_rules')}</p>
                        <Button variant="link" onClick={() => setIsCreateOpen(true)}>{t('rules.create_first')}</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
