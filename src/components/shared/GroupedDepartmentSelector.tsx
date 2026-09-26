import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface SelectorDepartment {
    id: string
    name: string
}

interface GroupedDepartmentSelectorProps {
    departments: SelectorDepartment[] | undefined
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
 * Pick one department of the organization, alphabetically, with an optional
 * "all departments" choice first. (Kept under its old name for existing callers.)
 */
export function GroupedDepartmentSelector({
    departments,
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
    const sorted = useMemo(() => [...(departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [departments])

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder || t('common.select_department', 'Select department')} />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
                {showGeneral && (
                    <SelectItem value={generalValue}>
                        {generalLabel || t('common.general_department', 'All departments')}
                    </SelectItem>
                )}
                {sorted.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
                {sorted.length === 0 && (
                    <div className="p-4 text-center text-sm text-ds-muted">
                        {t('common.no_departments_found', 'No departments found')}
                    </div>
                )}
            </SelectContent>
        </Select>
    )
}
