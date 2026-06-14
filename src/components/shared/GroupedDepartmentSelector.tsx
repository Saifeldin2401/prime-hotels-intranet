import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { Department } from '@/lib/types'
import { Building2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface GroupedDepartmentSelectorProps {
    departments
    properties
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    showGeneral?: boolean
    generalLabel?: string
    generalValue?: string
    disabled?: boolean
    className?: string
}

/**
 * A reusable component that displays departments grouped by their property.
 * This resolves issues with duplicate department names across different hotels.
 */
export function GroupedDepartmentSelector({
    departments,
    properties,
    value,
    onValueChange,
    placeholder,
    showGeneral = true,
    generalLabel,
    generalValue = 'none',
    disabled = false,
    className
}: GroupedDepartmentSelectorProps) {
    const { t } = useTranslation('common')

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
        }, {} as Record<string, Department[]>)
    }, [departments, properties, t])

    // Sort properties alphabetically, but put Head Office first if it exists
    const sortedPropertyNames = useMemo(() => {
        return Object.keys(groupedDepartments).sort((a, b) => {
            if (a.includes('Head Office') || a.includes('HEAD OFFICE')) return -1
            if (b.includes('Head Office') || b.includes('HEAD OFFICE')) return 1
            return a.localeCompare(b)
        })
    }, [groupedDepartments])

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder || t('common.select_department', 'Select Department')} />
            </SelectTrigger>
            <SelectContent className="max-h-[80vh]">
                {showGeneral && (
                    <SelectItem value={generalValue}>
                        {generalLabel || t('common.general_department', 'General / All Departments')}
                    </SelectItem>
                )}

                {sortedPropertyNames.map(propertyName => (
                    <SelectGroup key={propertyName}>
                        <SelectLabel className="flex items-center gap-2 text-hotel-gold bg-muted/30 py-2 mt-1 first:mt-0 font-bold uppercase text-[10px] tracking-wider cursor-default">
                            <Building2 className="w-3 h-3" />
                            {propertyName}
                        </SelectLabel>
                        {groupedDepartments[propertyName]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(dept => (
                                <SelectItem key={dept.id} value={dept.id} className="ps-10">
                                    {dept.name}
                                </SelectItem>
                            ))}
                    </SelectGroup>
                ))}

                {(!departments || departments.length === 0) && (
                    <div className="p-4 text-center text-sm text-muted-foreground italic">
                        {t('common.no_departments_found', 'No departments found')}
                    </div>
                )}
            </SelectContent>
        </Select>
    )
}
