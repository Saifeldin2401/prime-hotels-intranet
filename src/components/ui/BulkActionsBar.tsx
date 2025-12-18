import { useState } from 'react'
import { Check, X, Trash2, UserPlus, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { BulkOperationResult } from '@/hooks/useBulkOperations'

interface BulkActionsBarProps {
    selectedCount: number
    selectedIds: string[]
    onClearSelection: () => void
    entityType: 'task' | 'maintenance_ticket' | 'leave_request'
    statusOptions?: Array<{ value: string; label: string }>
    assignees?: Array<{ id: string; name: string }>
    onBulkStatusChange?: (ids: string[], status: string) => Promise<BulkOperationResult>
    onBulkAssign?: (ids: string[], assigneeId: string | null) => Promise<BulkOperationResult>
    onBulkDelete?: (ids: string[]) => Promise<BulkOperationResult>
    onBulkApprove?: (ids: string[]) => Promise<BulkOperationResult>
    className?: string
}

export function BulkActionsBar({
    selectedCount,
    selectedIds,
    onClearSelection,
    entityType,
    statusOptions = [],
    assignees = [],
    onBulkStatusChange,
    onBulkAssign,
    onBulkDelete,
    onBulkApprove,
    className
}: BulkActionsBarProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [result, setResult] = useState<BulkOperationResult | null>(null)

    if (selectedCount === 0) return null

    const handleAction = async (
        action: (ids: string[]) => Promise<BulkOperationResult>
    ) => {
        setIsLoading(true)
        try {
            const result = await action(selectedIds)
            setResult(result)
            if (result.success.length > 0) {
                onClearSelection()
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusChange = async (status: string) => {
        if (onBulkStatusChange) {
            await handleAction((ids) => onBulkStatusChange(ids, status))
        }
    }

    const handleAssign = async (assigneeId: string) => {
        if (onBulkAssign) {
            await handleAction((ids) => onBulkAssign(ids, assigneeId === 'unassign' ? null : assigneeId))
        }
    }

    const handleDelete = async () => {
        if (onBulkDelete) {
            await handleAction(onBulkDelete)
            setShowDeleteConfirm(false)
        }
    }

    const handleApprove = async () => {
        if (onBulkApprove) {
            await handleAction(onBulkApprove)
        }
    }

    const entityLabel = entityType.replace('_', ' ')

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
                        'bg-background border rounded-lg shadow-lg p-3',
                        'flex items-center gap-3',
                        className
                    )}
                >
                    {/* Selection count */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                            {selectedCount} selected
                        </span>
                    </div>

                    {/* Status change */}
                    {onBulkStatusChange && statusOptions.length > 0 && (
                        <Select onValueChange={handleStatusChange} disabled={isLoading}>
                            <SelectTrigger className="w-[140px]">
                                <Clock className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Assign */}
                    {onBulkAssign && assignees.length > 0 && (
                        <Select onValueChange={handleAssign} disabled={isLoading}>
                            <SelectTrigger className="w-[140px]">
                                <UserPlus className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassign">Unassign</SelectItem>
                                {assignees.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Approve (for leave requests) */}
                    {onBulkApprove && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleApprove}
                            disabled={isLoading}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Approve All
                        </Button>
                    )}

                    {/* Delete */}
                    {onBulkDelete && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    )}

                    {/* Clear selection */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearSelection}
                        disabled={isLoading}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </motion.div>
            </AnimatePresence>

            {/* Delete confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete {selectedCount} {entityLabel}(s)?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will soft-delete the selected items. They can be recovered by an administrator.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete {selectedCount} items
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Result notification */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className={cn(
                            'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
                            'bg-background border rounded-lg shadow-lg p-3',
                            'flex items-center gap-3'
                        )}
                    >
                        {result.failed.length === 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : result.success.length === 0 ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        )}
                        <span className="text-sm">
                            {result.success.length} succeeded
                            {result.failed.length > 0 && `, ${result.failed.length} failed`}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResult(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default BulkActionsBar
