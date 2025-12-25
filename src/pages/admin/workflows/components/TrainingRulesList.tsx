import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, GraduationCap } from 'lucide-react'
import { useTrainingRules, useDeleteTrainingRule, useUpdateTrainingRule } from '@/hooks/useTrainingRules'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function TrainingRulesList() {
    const { data: rules, isLoading } = useTrainingRules()
    const deleteMutation = useDeleteTrainingRule()
    const updateMutation = useUpdateTrainingRule()
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleToggle = (id: string, currentStatus: boolean) => {
        updateMutation.mutate(
            { id, updates: { is_active: !currentStatus } },
            {
                onSuccess: () => {
                    toast({
                        title: 'Rule Updated',
                        description: `Auto-assignment rule is now ${!currentStatus ? 'active' : 'inactive'}`,
                    })
                }
            }
        )
    }

    const handleDelete = () => {
        if (!deleteId) return
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast({
                    title: 'Rule Deleted',
                    description: 'Training assignment rule has been removed.',
                })
                setDeleteId(null)
            }
        })
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Training Auto-Assignment Rules</h3>
                </div>
                <Button size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'Rule Editor UI is being finalized.' })}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Target Module</TableHead>
                            <TableHead>Criteria (Dept/Role/Title)</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules?.map((rule: any) => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">
                                    {rule.training_modules?.title || 'Unknown Module'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {rule.departments?.name && (
                                            <Badge variant="outline">Dept: {rule.departments.name}</Badge>
                                        )}
                                        {rule.target_role && (
                                            <Badge variant="outline">Role: {rule.target_role}</Badge>
                                        )}
                                        {rule.job_titles?.title && (
                                            <Badge variant="outline">Title: {rule.job_titles.title}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(rule.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={rule.is_active}
                                        onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(rule.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!rules?.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No auto-assignment rules found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will stop automatic training assignments for this criteria. Existing assignments will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
