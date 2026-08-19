import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateTrainingRule, useDeleteTrainingRule, useTrainingModulesList, useTrainingRules, useUpdateTrainingRule } from '@/hooks/useTrainingRules'
import { cn } from '@/lib/utils'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// Job-title-based rules were removed: the UI let an admin pick a job_titles.id,
// but training_assignment_rules has no job_title_id column and profiles only
// stores job_title as free text (not linked by id) - there was no data path
// that could ever resolve who a "by job title" rule applied to. Role-based
// rules are backed by a real relationship (user_roles) end to end.
export default function TrainingAssignmentRules() {
    const { t, i18n } = useTranslation(['training', 'common'])
    const isRTL = i18n.dir() === 'rtl'
    const { data: rules, isLoading } = useTrainingRules()
    const { data: modules } = useTrainingModulesList()

    const createMutation = useCreateTrainingRule()
    const deleteMutation = useDeleteTrainingRule()
    const updateMutation = useUpdateTrainingRule()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<any>(null)
    const [newRule, setNewRule] = useState({
        training_module_id: '',
        target_role: '',
        is_active: true
    })

    const roles = [
        'regional_admin',
        'regional_hr',
        'property_manager',
        'property_hr',
        'department_head',
        'staff'
    ]

    const resetForm = () => {
        setNewRule({
            training_module_id: '',
            target_role: '',
            is_active: true
        })
        setEditingRule(null)
    }

    const handleSave = async () => {
        try {
            if (!newRule.training_module_id || !newRule.target_role) return

            // Dual-write: target_role/training_module_id are the columns
            // handle_new_user_training() reads to auto-assign this rule to
            // anyone granted this role in the future. target_type/target_id/
            // content_type/content_id are what generate_assignment_progress()
            // reads to retroactively backfill CURRENT holders of the role
            // right now. Both are needed - they cover different moments in time.
            const payload = {
                training_module_id: newRule.training_module_id,
                target_role: newRule.target_role,
                is_active: newRule.is_active,
                target_type: 'role',
                target_id: newRule.target_role,
                content_type: 'module',
                content_id: newRule.training_module_id
            }

            if (editingRule?.id) {
                await updateMutation.mutateAsync({ id: editingRule.id, updates: payload })
            } else {
                await createMutation.mutateAsync(payload as any)
            }

            setIsCreateOpen(false)
            resetForm()
        } catch (error) {
            console.error('Failed to create rule:', error)
        }
    }

    const startEdit = (rule) => {
        setEditingRule(rule)
        setNewRule({
            training_module_id: rule.training_module_id || '',
            target_role: rule.target_role || '',
            is_active: rule.is_active ?? true
        })
        setIsCreateOpen(true)
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
                <Dialog
                    open={isCreateOpen}
                    onOpenChange={(open) => {
                        setIsCreateOpen(open)
                        if (!open) resetForm()
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                            <Plus className="w-4 h-4 me-2" />
                            {t('rules.new_rule')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingRule ? t('rules.edit_title', { defaultValue: 'Edit Rule' }) : t('rules.create_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
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
                            <Button
                                onClick={handleSave}
                                className="w-full"
                                disabled={(createMutation.isPending || updateMutation.isPending) || !newRule.target_role || !newRule.training_module_id}
                            >
                                {(createMutation.isPending || updateMutation.isPending)
                                    ? t('rules.creating')
                                    : editingRule
                                        ? t('common:action.save', { defaultValue: 'Save' })
                                        : t('rules.create_rule')}
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
                                        {rule.target_role ? t(`common:roles.${rule.target_role}`) : t('unknown')}
                                    </CardTitle>
                                    <p className="text-sm text-gray-500">{t('rules.auto_assigns_to')} {t('rules.by_role')}</p>
                                </div>
                                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                    {rule.is_active ? t('common:status_options.active') : t('common:status_options.inactive')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="font-medium text-hotel-navy">
                                    {modules?.find(m => m.id === rule.training_module_id)?.title || rule.training_module_id}
                                </p>
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
                                        aria-label={t('accessibility.edit_rule', 'Edit Rule')}
                                        onClick={() => startEdit(rule)}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t('accessibility.delete_rule', 'Delete Rule')}
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
