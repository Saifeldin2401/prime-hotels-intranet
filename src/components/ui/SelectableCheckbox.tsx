import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface SelectableCheckboxProps {
    id: string
    checked: boolean
    onCheckedChange: (id: string) => void
    className?: string
    disabled?: boolean
}

/**
 * Checkbox for selecting items in a list
 * Stops click propagation to prevent row click handlers from firing
 */
export function SelectableCheckbox({
    id,
    checked,
    onCheckedChange,
    className,
    disabled = false
}: SelectableCheckboxProps) {
    return (
        <div
            className={cn('flex items-center', className)}
            onClick={(e) => e.stopPropagation()}
        >
            <Checkbox
                id={`select-${id}`}
                checked={checked}
                onCheckedChange={() => onCheckedChange(id)}
                disabled={disabled}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
        </div>
    )
}

interface SelectAllCheckboxProps {
    checked: boolean
    indeterminate?: boolean
    onCheckedChange: () => void
    className?: string
    label?: string
}

/**
 * Checkbox for selecting/deselecting all items
 */
export function SelectAllCheckbox({
    checked,
    indeterminate = false,
    onCheckedChange,
    className,
    label = 'Select all'
}: SelectAllCheckboxProps) {
    return (
        <div
            className={cn('flex items-center gap-2', className)}
            onClick={(e) => e.stopPropagation()}
        >
            <Checkbox
                id="select-all"
                checked={indeterminate ? 'indeterminate' : checked}
                onCheckedChange={onCheckedChange}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label
                htmlFor="select-all"
                className="text-sm text-muted-foreground cursor-pointer select-none"
            >
                {label}
            </label>
        </div>
    )
}

export default SelectableCheckbox
