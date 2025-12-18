import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Shield, PlayCircle } from 'lucide-react'
import { useTrainingRules, useCreateTrainingRule, useDeleteTrainingRule, useUpdateTrainingRule, useTrainingModulesList } from '@/hooks/useTrainingRules'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function TrainingAssignmentRules() {
    const { t } = useTranslation('training')
    const { data: rules, isLoading } = useTrainingRules()
    const { data: modules } = useTrainingModulesList()
    const createMutation = useCreateTrainingRule()
    const deleteMutation = useDeleteTrainingRule()
    const updateMutation = useUpdateTrainingRule()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
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

    const handleCreate = async () => {
        if (!newRule.training_module_id || !newRule.target_role) return

        await createMutation.mutateAsync({
            training_module_id: newRule.training_module_id,
            target_role: newRule.target_role, // Type cast might be needed if strictly typed
            is_active: newRule.is_active
        } as any)
        setIsCreateOpen(false)
        setNewRule({
            training_module_id: '',
            target_role: '',
            is_active: true
        })
    }

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this rule?')) {
            deleteMutation.mutate(id)
        }
    }

    const handleToggle = (id: string, currentStatus: boolean | null) => {
        updateMutation.mutate({ id, updates: { is_active: !currentStatus } })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Auto-Assignment Rules"
                    description="Automatically assign training modules to new users based on their role."
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
                            <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending || !newRule.target_role || !newRule.training_module_id}>
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
                                        {rule.target_role?.replace('_', ' ').toUpperCase()}
                                    </CardTitle>
                                    <p className="text-sm text-gray-500">Auto-assigns:</p>
                                </div>
                                <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="font-medium text-hotel-navy">{rule.training_modules?.title}</p>

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
