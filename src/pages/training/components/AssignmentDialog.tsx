
import { useState, useMemo, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AssignableEntity {
    id: string
    name: string
    details?: string
}

interface AssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    users: { id: string; first_name: string; last_name: string; email?: string }[]
    departments: { id: string; name: string }[]
    properties: { id: string; name: string }[]
    onAssign: (data: {
        targetType: 'all' | 'users' | 'departments' | 'properties'
        targetIds: string[]
        deadline?: string
    }) => Promise<void>
    isAssigning?: boolean
}

export function AssignmentDialog({
    open,
    onOpenChange,
    users,
    departments,
    properties,
    onAssign,
    isAssigning = false,
}: AssignmentDialogProps) {
    const { t } = useTranslation('training')
    const [targetType, setTargetType] = useState<'all' | 'users' | 'departments' | 'properties'>('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [deadline, setDeadline] = useState('')

    // Memoize list items to prevent render loops
    const listItems = useMemo((): AssignableEntity[] => {
        switch (targetType) {
            case 'users':
                return users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, details: u.email }))
            case 'departments':
                return departments.map(d => ({ id: d.id, name: d.name }))
            case 'properties':
                return properties.map(p => ({ id: p.id, name: p.name }))
            default:
                return []
        }
    }, [targetType, users, departments, properties])

    const handleToggle = useCallback((id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }, [])

    const handleTargetTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTargetType(e.target.value as 'all' | 'users' | 'departments' | 'properties')
        setSelectedIds([])
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onAssign({
            targetType,
            targetIds: selectedIds,
            deadline: deadline || undefined
        })
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-white dark:bg-slate-950 border-hotel-gold/20 shadow-2xl">
                <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
                    <DialogTitle className="text-2xl font-serif text-hotel-navy">
                        {t('assignModule')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-hotel-navy font-medium">{t('assignTo')}</Label>
                        {/* Use native HTML select to avoid Radix infinite loop */}
                        <select
                            value={targetType}
                            onChange={handleTargetTypeChange}
                            className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold focus:outline-none"
                        >
                            <option value="all">{t('allUsers', 'All Users')}</option>
                            <option value="users">{t('specificUsers', 'Specific Users')}</option>
                            <option value="departments">{t('departments', 'Departments')}</option>
                            <option value="properties">{t('properties', 'Properties')}</option>
                        </select>
                    </div>

                    {targetType !== 'all' && (
                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-medium">
                                {targetType === 'users' ? t('selectUsers', 'Select Users') :
                                    targetType === 'departments' ? t('selectDepartments', 'Select Departments') :
                                        t('selectProperties', 'Select Properties')}
                            </Label>
                            <ScrollArea className="h-64 border border-gray-200 rounded-md p-2 bg-gray-50/30">
                                <div className="space-y-1">
                                    {listItems.length > 0 ? (
                                        listItems.map((item) => (
                                            <label
                                                key={item.id}
                                                className="flex items-start space-x-3 p-2 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggle(item.id)}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold"
                                                />
                                                <div className="grid gap-0.5">
                                                    <span className="font-medium text-sm text-gray-700">
                                                        {item.name}
                                                    </span>
                                                    {item.details && (
                                                        <span className="text-gray-500 text-xs">
                                                            {item.details}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                            <p className="text-sm">{t('noDestinationsFound', 'No items found')}</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <p className="text-xs text-hotel-navy font-medium flex justify-end">
                                {selectedIds.length} {t('selected', 'selected')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="deadline" className="text-hotel-navy font-medium">{t('deadline', 'Deadline')} (Optional)</Label>
                        <input
                            id="deadline"
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            {t('cancel', 'Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-md min-w-[120px]"
                            disabled={isAssigning || (targetType !== 'all' && selectedIds.length === 0)}
                        >
                            {isAssigning ? 'Assigning...' : t('assign', 'Assign')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
