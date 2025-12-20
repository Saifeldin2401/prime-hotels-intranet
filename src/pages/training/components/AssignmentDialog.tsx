import { useState, useMemo, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'

interface AssignableEntity {
    id: string
    name: string
    details?: string
    group?: string
}

interface AssignmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    users: { id: string; first_name: string; last_name: string; email?: string }[]
    departments: { id: string; name: string; propertyName?: string; rawName?: string }[]
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
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [targetType, setTargetType] = useState<'all' | 'users' | 'departments' | 'properties'>('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [deadline, setDeadline] = useState('')
    const [propertyFilter, setPropertyFilter] = useState<string>('all')

    // Get unique properties from departments
    const departmentProperties = useMemo(() => {
        const props = new Set<string>()
        departments.forEach(d => {
            if (d.propertyName) props.add(d.propertyName)
        })
        return Array.from(props).sort()
    }, [departments])

    // Memoize list items to prevent render loops
    const listItems = useMemo((): AssignableEntity[] => {
        switch (targetType) {
            case 'users':
                return users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, details: u.email }))
            case 'departments':
                // Filter by property if one is selected
                const filteredDepts = propertyFilter === 'all'
                    ? departments
                    : departments.filter(d => d.propertyName === propertyFilter)
                return filteredDepts.map(d => ({
                    id: d.id,
                    name: d.rawName || d.name,
                    group: d.propertyName
                }))
            case 'properties':
                return properties.map(p => ({ id: p.id, name: p.name }))
            default:
                return []
        }
    }, [targetType, users, departments, properties, propertyFilter])

    // Group items if needed
    const groupedItems = useMemo(() => {
        if (!listItems.some(i => i.group)) return { 'All': listItems }

        return listItems.reduce((acc, item) => {
            const group = item.group || 'Other'
            if (!acc[group]) acc[group] = []
            acc[group].push(item)
            return acc
        }, {} as Record<string, AssignableEntity[]>)
    }, [listItems])

    const handleToggle = useCallback((id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }, [])

    // Toggle all in group
    const handleToggleGroup = useCallback((groupName: string, items: AssignableEntity[]) => {
        const itemIds = items.map(i => i.id)
        const allSelected = itemIds.every(id => selectedIds.includes(id))

        setSelectedIds(prev => {
            if (allSelected) {
                return prev.filter(id => !itemIds.includes(id))
            } else {
                return [...new Set([...prev, ...itemIds])]
            }
        })
    }, [selectedIds])

    const handleTargetTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTargetType(e.target.value as 'all' | 'users' | 'departments' | 'properties')
        setSelectedIds([])
        setPropertyFilter('all')
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
                <DialogHeader className={`border-b border-gray-100 pb-4 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <DialogTitle className="text-2xl font-serif text-hotel-navy">
                        {t('assignModule')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                        {t('assignModuleDescription', 'Select who should receive this training module')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="space-y-2">
                        <Label className="text-hotel-navy font-medium">{t('assignTo')}</Label>
                        <select
                            value={targetType}
                            onChange={handleTargetTypeChange}
                            className={`w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
                        >
                            <option value="all">{t('allUsers', 'All Users')}</option>
                            <option value="users">{t('specificUsers', 'Specific Users')}</option>
                            <option value="departments">{t('departments', 'Departments')}</option>
                            <option value="properties">{t('properties', 'Properties')}</option>
                        </select>
                    </div>

                    {targetType === 'departments' && departmentProperties.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-medium">{t('filterByProperty')}</Label>
                            <select
                                value={propertyFilter}
                                onChange={(e) => setPropertyFilter(e.target.value)}
                                className={`w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
                            >
                                <option value="all">{t('allProperties')}</option>
                                {departmentProperties.map(prop => (
                                    <option key={prop} value={prop}>{prop}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {targetType !== 'all' && (
                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-medium">
                                {targetType === 'users' ? t('selectUsers', 'Select Users') :
                                    targetType === 'departments' ? t('selectDepartments', 'Select Departments') :
                                        t('selectProperties', 'Select Properties')}
                            </Label>

                            <ScrollArea className="h-64 border border-gray-200 rounded-md bg-white">
                                <div className="p-3 space-y-1">
                                    {listItems.length > 0 ? (
                                        listItems.map((item) => (
                                            <label
                                                key={item.id}
                                                className="flex items-center space-x-3 p-2.5 hover:bg-gray-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggle(item.id)}
                                                    className={`h-4 w-4 rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold ${isRTL ? 'ml-3' : 'mr-3'}`}
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {item.name}
                                                    </span>
                                                    {item.details && (
                                                        <span className="block text-xs text-gray-500 mt-0.5">
                                                            {item.details}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                            <p className="text-sm">{t('noDestinationsFound', 'No items found')}</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <p className={`text-xs text-hotel-navy font-medium flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                {selectedIds.length} {t('selected', 'selected')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="deadline" className="text-hotel-navy font-medium">
                            {t('deadline', 'Deadline')} ({t('common:optional', 'Optional')})
                        </Label>
                        <input
                            id="deadline"
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className={`w-full h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50/50 focus:border-hotel-gold focus:ring-hotel-gold focus:outline-none ${isRTL ? 'text-right' : 'text-left'}`}
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
                            {isAssigning ? t('common:saving', 'Assigning...') : t('assign', 'Assign')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    )
}
