import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const isPriorityPropertyName = (name: string) => /head office|prime group/i.test(name)

const sortPropertyNames = (a: string, b: string) => {
    if (isPriorityPropertyName(a) && !isPriorityPropertyName(b)) return -1
    if (!isPriorityPropertyName(a) && isPriorityPropertyName(b)) return 1
    return a.localeCompare(b)
}

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
    const [propertyFilters, setPropertyFilters] = useState<string[]>([])
    const [targetSearch, setTargetSearch] = useState('')

    const normalizedTargetSearch = targetSearch.trim().toLowerCase()
    const matchesTargetSearch = useCallback((value: string, secondary?: string) => {
        if (!normalizedTargetSearch) return true
        const primary = value?.toLowerCase() ?? ''
        const secondaryValue = secondary?.toLowerCase() ?? ''
        return primary.includes(normalizedTargetSearch) || secondaryValue.includes(normalizedTargetSearch)
    }, [normalizedTargetSearch])

    const departmentProperties = useMemo(() => {
        const props = new Set<string>()
        if (departments && Array.isArray(departments)) {
            departments.forEach(d => {
                if (d.propertyName) {
                    props.add(d.propertyName)
                } else {
                    props.add(t('other', 'Other'))
                }
            })
        }
        return Array.from(props).sort(sortPropertyNames)
    }, [departments, t])

    const departmentGroups = useMemo(() => {
        if (!departments || !Array.isArray(departments)) return []
        const filters = new Set(propertyFilters)
        const groups = new Map<string, { name: string; items: AssignableEntity[] }>()

        departments.forEach((dept) => {
            const propertyName = dept.propertyName || t('other', 'Other')
            if (propertyFilters.length > 0 && !filters.has(propertyName)) return
            const displayName = dept.rawName || dept.name.replace(/\s*\(.+\)$/, '')
            if (!matchesTargetSearch(displayName, propertyName)) return

            if (!groups.has(propertyName)) {
                groups.set(propertyName, { name: propertyName, items: [] })
            }
            groups.get(propertyName)!.items.push({
                id: dept.id,
                name: displayName
            })
        })

        return Array.from(groups.values())
            .map(group => ({
                ...group,
                items: group.items.sort((a, b) => a.name.localeCompare(b.name))
            }))
            .sort((a, b) => sortPropertyNames(a.name, b.name))
    }, [departments, propertyFilters, matchesTargetSearch, t])

    const currentListItems = useMemo((): AssignableEntity[] => {
        switch (targetType) {
            case 'users':
                return (users && Array.isArray(users))
                    ? users
                        .map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, details: u.email }))
                        .filter(u => matchesTargetSearch(u.name, u.details))
                    : []
            case 'departments':
                return departmentGroups.flatMap(group => group.items)
            case 'properties':
                return (properties && Array.isArray(properties))
                    ? properties
                        .map(p => ({ id: p.id, name: p.name }))
                        .filter(p => matchesTargetSearch(p.name))
                    : []
            default:
                return []
        }
    }, [targetType, users, properties, departmentGroups, matchesTargetSearch])

    const handleToggle = useCallback((id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }, [])

    const togglePropertyFilter = useCallback((propertyName: string, enabled: boolean) => {
        setPropertyFilters(prev => {
            const next = new Set(prev)
            if (enabled) {
                next.add(propertyName)
            } else {
                next.delete(propertyName)
            }
            return Array.from(next)
        })
    }, [])

    const toggleGroupSelection = useCallback((items: AssignableEntity[], shouldSelect: boolean) => {
        const itemIds = items.map(item => item.id)
        setSelectedIds(prev => {
            if (shouldSelect) {
                return Array.from(new Set([...prev, ...itemIds]))
            }
            return prev.filter(id => !itemIds.includes(id))
        })
    }, [])

    const handleTargetTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTargetType(e.target.value as 'all' | 'users' | 'departments' | 'properties')
        setSelectedIds([])
        setPropertyFilters([])
        setTargetSearch('')
    }, [])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting || isAssigning) return

        setIsSubmitting(true)
        try {
            await onAssign({
                targetType,
                targetIds: selectedIds,
                deadline: deadline || undefined
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border-hotel-gold/20 shadow-2xl">
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

                    {targetType !== 'all' && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <Label className="text-hotel-navy font-medium">
                                    {targetType === 'users' ? t('selectUsers', 'Select Users') :
                                        targetType === 'departments' ? t('selectDepartments', 'Select Departments') :
                                            t('selectProperties', 'Select Properties')}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedIds(currentListItems.map(item => item.id))}
                                        disabled={currentListItems.length === 0}
                                    >
                                        {t('selectAll', 'Select all')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedIds([])}
                                    >
                                        {t('clear', 'Clear')}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                                        <Input
                                            value={targetSearch}
                                            onChange={(e) => setTargetSearch(e.target.value)}
                                            placeholder={
                                                targetType === 'users'
                                                    ? t('searchUsers', 'Search users...')
                                                    : targetType === 'departments'
                                                        ? t('searchDepartments', 'Search departments or properties...')
                                                        : t('searchProperties', 'Search properties...')
                                            }
                                            className={`${isRTL ? 'pr-9 text-right' : 'pl-9'} bg-white`}
                                        />
                                    </div>

                                    {targetType === 'departments' && departmentProperties.length > 0 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-10">
                                                    {t('filterByProperty')}
                                                    {propertyFilters.length > 0 && (
                                                        <span className="ms-2 text-xs text-muted-foreground">({propertyFilters.length})</span>
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64">
                                                <DropdownMenuLabel>{t('filterByProperty')}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuCheckboxItem
                                                    checked={propertyFilters.length === 0}
                                                    onCheckedChange={() => setPropertyFilters([])}
                                                >
                                                    {t('allProperties')}
                                                </DropdownMenuCheckboxItem>
                                                <DropdownMenuSeparator />
                                                {departmentProperties.map(propertyName => (
                                                    <DropdownMenuCheckboxItem
                                                        key={propertyName}
                                                        checked={propertyFilters.includes(propertyName)}
                                                        onCheckedChange={(checked) => togglePropertyFilter(propertyName, Boolean(checked))}
                                                    >
                                                        {propertyName}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>

                            <ScrollArea className="h-64 border border-gray-200 rounded-md bg-white">
                                <div className="p-3 flex flex-col gap-3">
                                    {targetType === 'departments' ? (
                                        departmentGroups.length > 0 ? (
                                            departmentGroups.map((group) => {
                                                const groupIds = group.items.map(item => item.id)
                                                const selectedCount = groupIds.filter(id => selectedIds.includes(id)).length
                                                const allSelected = selectedCount === group.items.length && group.items.length > 0

                                                return (
                                                    <div key={group.name} className="rounded-md border bg-white">
                                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gray-50 px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-gray-700">{group.name}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {selectedCount}/{group.items.length}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => toggleGroupSelection(group.items, !allSelected)}
                                                            >
                                                                {allSelected ? t('clear', 'Clear') : t('selectAll', 'Select all')}
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-col gap-1 p-2">
                                                            {group.items.map((item) => (
                                                                <label
                                                                    key={item.id}
                                                                    className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-50 cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedIds.includes(item.id)}
                                                                        onChange={() => handleToggle(item.id)}
                                                                        className={`h-4 w-4 rounded border-gray-300 text-hotel-gold focus:ring-hotel-gold ${isRTL ? 'ml-3' : 'mr-3'}`}
                                                                    />
                                                                    <span className="text-sm text-gray-700">{item.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                <p className="text-sm">{t('noDestinationsFound', 'No items found')}</p>
                                            </div>
                                        )
                                    ) : currentListItems.length > 0 ? (
                                        currentListItems.map((item) => (
                                            <label
                                                key={item.id}
                                                className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-gray-200"
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

                    <div className="flex flex-col-reverse gap-3 pt-6 border-t border-gray-100 mt-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 sm:w-auto"
                        >
                            {t('cancel', 'Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="w-full bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-md sm:w-auto"
                            disabled={isAssigning || isSubmitting || (targetType !== 'all' && selectedIds.length === 0)}
                        >
                            {isAssigning ? t('common:saving', 'Assigning...') : t('assign', 'Assign')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    )
}
