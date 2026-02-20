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
import { Settings2, Trash2, Plus, Loader2 } from 'lucide-react'
import { useTriggers, useUpdateTrigger, useDeleteTrigger } from '@/hooks/useTriggers'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TriggerEditor } from './TriggerEditor'
import type { TriggerRule } from '@/hooks/useTriggers'
import { useTranslation } from "react-i18next";

export function TriggerList() {
    const { t: t_ext } = useTranslation('extracted');
    const { data: triggers, isLoading, error } = useTriggers()
    const updateMutation = useUpdateTrigger()
    const deleteMutation = useDeleteTrigger()
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [editingTrigger, setEditingTrigger] = useState<TriggerRule | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const handleToggle = (id: string, currentStatus: boolean) => {
        updateMutation.mutate(
            { id, is_active: !currentStatus },
            {
                onSuccess: () => {
                    toast({
                        title: 'Trigger Updated',
                        description: `Trigger is now ${!currentStatus ? 'active' : 'inactive'}`,
                    })
                },
                onError: (error) => {
                    toast({
                        title: 'Error',
                        description: 'Failed to update trigger status',
                        variant: 'destructive',
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
                    title: 'Trigger Deleted',
                    description: 'Trigger rule has been removed.',
                })
                setDeleteId(null)
            },
            onError: (error) => {
                toast({
                    title: 'Delete Failed',
                    description: error instanceof Error ? error.message : 'Unknown error',
                    variant: 'destructive',
                })
                setDeleteId(null)
            }
        })
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    if (error) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {t_ext('failed_to_load_trigger_rules', 'Failed to load trigger rules:')}{error instanceof Error ? error.message : 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t_ext('active_trigger_rules', 'Active Trigger Rules')}</h3>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t_ext('new_trigger', 'New Trigger')}</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t_ext('rule_name', 'Rule Name')}</TableHead>
                            <TableHead>{t_ext('event_type', 'Event Type')}</TableHead>
                            <TableHead>{t_ext('action', 'Action')}</TableHead>
                            <TableHead>{t_ext('created', 'Created')}</TableHead>
                            <TableHead>{t_ext('status_1', 'Status')}</TableHead>
                            <TableHead className="text-right">{t_ext('actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {triggers?.map((trigger) => (
                            <TableRow key={trigger.id}>
                                <TableCell className="font-medium">
                                    <div>{trigger.name}</div>
                                    <div className="text-xs text-muted-foreground">{trigger.description}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{trigger.event_type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium">{trigger.action_type.replace('_', ' ')}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {JSON.stringify(trigger.action_config)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(trigger.created_at), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={trigger.is_active}
                                        onCheckedChange={() => handleToggle(trigger.id, trigger.is_active)}
                                        disabled={updateMutation.isPending}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingTrigger(trigger)}
                                        >
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(trigger.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!triggers?.length && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    {t_ext('no_trigger_rules_found', 'No trigger rules found.')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t_ext('are_you_sure', 'Are you sure?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t_ext('this_will_permanently_delete_the_trigger', 'This will permanently delete the trigger rule. Systems relying on this trigger will stop responding to the associated events.')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t_ext('cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t_ext('delete', 'Delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!editingTrigger} onOpenChange={() => setEditingTrigger(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t_ext('edit_trigger_rule', 'Edit Trigger Rule')}</DialogTitle>
                    </DialogHeader>
                    {editingTrigger && (
                        <TriggerEditor
                            trigger={editingTrigger}
                            onClose={() => setEditingTrigger(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t_ext('create_trigger_rule', 'Create Trigger Rule')}</DialogTitle>
                    </DialogHeader>
                    <TriggerEditor
                        onClose={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div >
    )
}
