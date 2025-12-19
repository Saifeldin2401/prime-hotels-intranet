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
    const { t } = useTranslation('training')
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
        if (confirm('Are you sure you want to delete this rule?')) {
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
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Auto-Assignment Rules"
                    description="Automatically assign training modules to new users based on their role or job title."
                />
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Assignment Rule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assignment Type</label>
                                <div className="flex bg-gray-100 p-1 rounded-md">
                                    <button
                                        onClick={() => setTargetType('role')}
                                        className={cn("flex-1 py-1 text-sm rounded-sm transition-all", targetType === 'role' ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-900")}
                                    >
                                        By Role
                                    </button>
                                    <button
                                        onClick={() => setTargetType('job_title')}
                                        className={cn("flex-1 py-1 text-sm rounded-sm transition-all", targetType === 'job_title' ? "bg-white shadow-sm font-medium" : "text-gray-500 hover:text-gray-900")}
                                    >
                                        By Job Title
                                    </button>
                                </div>
                            </div>

                            {targetType === 'role' ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Role</label>
                                    <Select
                                        value={newRule.target_role}
                                        onValueChange={(val) => setNewRule(prev => ({ ...prev, target_role: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(role => (
                                                <SelectItem key={role} value={role}>{role.replace('_', ' ').toUpperCase()}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Target Job Title</label>
                                    <Select
                                        value={newRule.job_title_id}
                                        onValueChange={(val) => setNewRule(prev => ({ ...prev, job_title_id: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select job title" />
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
                                <label className="text-sm font-medium">Training Module</label>
                                <Select
                                    value={newRule.training_module_id}
                                    onValueChange={(val) => setNewRule(prev => ({ ...prev, training_module_id: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modules?.map(module => (
                                            <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending || (targetType === 'role' && !newRule.target_role) || (targetType === 'job_title' && !newRule.job_title_id) || !newRule.training_module_id}>
                                {createMutation.isPending ? 'Creating...' : 'Create Rule'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div>Loading rules...</div>
                ) : rules?.map((rule) => (
                    <Card key={rule.id} className={cn("transition-all hover:shadow-md", !rule.is_active && "opacity-60")}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-hotel-gold" />
                                        {rule.job_title_id
                                            ? rule.job_titles?.title // Assuming join, fallback to checking ID if join missing in hook
                                            : rule.target_role?.replace('_', ' ').toUpperCase() || 'Unknown Target'
                                        }
                                    </CardTitle>
                                    <p className="text-sm text-gray-500">Auto-assigns to {rule.job_title_id ? 'Job Title' : 'Role'}</p>
                                </div>
                                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                    {rule.is_active ? 'Active' : 'Inactive'}
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
                                        {rule.is_active ? 'Deactivate' : 'Activate'}
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
                        <p>No assignment rules found.</p>
                        <Button variant="link" onClick={() => setIsCreateOpen(true)}>Create your first rule</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
