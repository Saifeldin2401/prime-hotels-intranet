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
import { Trash2, Plus, Loader2, CalendarDays, Clock } from 'lucide-react'
import { useTaskTemplates, useToggleTaskTemplate, useDeleteTaskTemplate } from '@/hooks/useTaskTemplates'
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

export function TaskTemplateList() {
    const { data: templates, isLoading } = useTaskTemplates()
    const toggleMutation = useToggleTaskTemplate()
    const deleteMutation = useDeleteTaskTemplate()
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const handleToggle = (id: string, currentStatus: boolean) => {
        toggleMutation.mutate({ id, isActive: !currentStatus }, {
            onSuccess: () => {
                toast({
                    title: 'Template Updated',
                    description: `Recurring task is now ${!currentStatus ? 'active' : 'inactive'}`,
                })
            }
        })
    }

    const handleDelete = () => {
        if (!deleteId) return
        deleteMutation.mutate(deleteId, {
            onSuccess: () => {
                toast({
                    title: 'Template Deleted',
                    description: 'Recurring task template has been removed.',
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
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-medium">Recurring Task Templates</h3>
                </div>
                <Button size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'Template Creator UI is being finalized.' })}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Template Title</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Next Run</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates?.map((template: any) => (
                            <TableRow key={template.id}>
                                <TableCell>
                                    <div className="font-medium">{template.title}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {template.description || 'No description'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {template.recurrence_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {template.assignee?.full_name || 'Unassigned'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {template.property?.name || 'Any Property'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Clock className="h-3 w-3" />
                                        {template.next_run_at ? format(new Date(template.next_run_at), 'MMM d, HH:mm') : 'N/A'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={template.is_active}
                                        onCheckedChange={() => handleToggle(template.id, template.is_active)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleteId(template.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!templates?.length && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No recurring task templates found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will stop the automated generation of tasks from this template. Existing tasks will not be affected.
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
