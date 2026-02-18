
import React, { useMemo, useState, useId } from 'react'
import { Check, ChevronsUpDown, Building2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { Department, Property } from '@/lib/types'
import { useTranslation } from 'react-i18next'

// Define local compatible types to handle variations between hooks and global types
type SelectorDepartment = {
    id: string
    name: string
    property_id: string
}

type SelectorProperty = {
    id: string
    name: string
}

interface MultiDepartmentSelectorProps {
    departments: SelectorDepartment[] | undefined
    properties: SelectorProperty[] | undefined
    value: string[]
    onValueChange: (value: string[]) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function MultiDepartmentSelector({
    departments,
    properties,
    value = [],
    onValueChange,
    placeholder,
    className,
    disabled = false
}: MultiDepartmentSelectorProps) {
    const { t } = useTranslation('common')
    const [open, setOpen] = useState(false)
    const id = useId()

    // Group departments by property
    const groupedDepartments = useMemo(() => {
        if (!departments) return {}

        return departments.reduce((acc, dept) => {
            const property = properties?.find(p => p.id === dept.property_id)
            const propertyName = property?.name || t('common.unknown_property', 'Other / Unknown Property')

            if (!acc[propertyName]) {
                acc[propertyName] = []
            }
            acc[propertyName].push(dept)
            return acc
        }, {} as Record<string, SelectorDepartment[]>)
    }, [departments, properties, t])

    const sortedPropertyNames = useMemo(() => {
        return Object.keys(groupedDepartments).sort((a, b) => {
            if (a.includes('Head Office') || a.includes('HEAD OFFICE')) return -1
            if (b.includes('Head Office') || b.includes('HEAD OFFICE')) return 1
            return a.localeCompare(b)
        })
    }, [groupedDepartments])

    const handleSelect = (deptId: string) => {
        if (value.includes(deptId)) {
            onValueChange(value.filter((id) => id !== deptId))
        } else {
            onValueChange([...value, deptId])
        }
    }

    const removeValue = (deptId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onValueChange(value.filter((id) => id !== deptId))
    }

    // Compute display text
    const selectedCount = value.length
    const displayText = selectedCount > 0
        ? `${selectedCount} ${t('common.selected', 'selected')}`
        : (placeholder || t('common.select_departments', 'Select departments...'))

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-controls={id}
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal"
                        disabled={disabled}
                    >
                        <span className="truncate flex-1">
                            {displayText}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={t('common.search_department', 'Search department...')} />
                        <CommandList className="max-h-[400px]" id={id}>
                            <CommandEmpty>{t('common.no_departments_found', 'No department found.')}</CommandEmpty>
                            {sortedPropertyNames.map((propertyName) => (
                                <CommandGroup
                                    key={propertyName}
                                    heading={
                                        <div className="flex items-center gap-2 text-primary font-semibold">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {propertyName}
                                        </div>
                                    }
                                >
                                    {groupedDepartments[propertyName]
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((dept) => (
                                            <CommandItem
                                                key={dept.id}
                                                value={`${propertyName} - ${dept.name}`} // Combine for search
                                                onSelect={() => handleSelect(dept.id)}
                                                className="pl-8 relative cursor-pointer"
                                            >
                                                <div className={cn(
                                                    "absolute left-2 flex h-3.5 w-3.5 items-center justify-center border border-primary/30 rounded-sm",
                                                    value.includes(dept.id) ? "bg-primary border-primary text-primary-foreground" : "opacity-50"
                                                )}>
                                                    {value.includes(dept.id) && <Check className="h-2.5 w-2.5" />}
                                                </div>
                                                {dept.name}
                                            </CommandItem>
                                        ))}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Pills */}
            {selectedCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {value.map(deptId => {
                        const dept = departments?.find(d => d.id === deptId)
                        if (!dept) return null
                        const prop = properties?.find(p => p.id === dept.property_id)
                        return (
                            <Badge key={deptId} variant="secondary" className="text-[10px] pl-2 pr-1 py-0.5 h-6 gap-1 group">
                                <span className="opacity-70">{prop?.name.split(' ')[0]}:</span>
                                {dept.name}
                                <button
                                    onClick={(e) => removeValue(deptId, e)}
                                    className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                                >
                                    <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                                </button>
                            </Badge>
                        )
                    })}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => onValueChange([])}
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    )
}
