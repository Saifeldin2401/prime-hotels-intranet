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

export function TriggerList() {
    const { data: triggers, isLoading } = useTriggers()
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Active Trigger Rules</h3>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Trigger
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Event Type</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                    No trigger rules found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the trigger rule. Systems relying on this trigger will stop responding to the associated events.
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

            <Dialog open={!!editingTrigger} onOpenChange={() => setEditingTrigger(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Trigger Rule</DialogTitle>
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
                        <DialogTitle>Create Trigger Rule</DialogTitle>
                    </DialogHeader>
                    <TriggerEditor
                        onClose={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div >
    )
}
