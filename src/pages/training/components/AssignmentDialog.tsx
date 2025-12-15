
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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

    const getListItems = (): AssignableEntity[] => {
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
    }

    const handleToggle = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id])
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onAssign({
            targetType,
            targetIds: selectedIds,
            deadline: deadline || undefined
        })
        // Reset on success handled by parent or effect
    }

    const listItems = getListItems()

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
                        <Select
                            value={targetType}
                            onValueChange={(value: 'all' | 'users' | 'departments' | 'properties') => {
                                setTargetType(value)
                                setSelectedIds([])
                            }}
                        >
                            <SelectTrigger className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('allUsers')}</SelectItem>
                                <SelectItem value="users">{t('specificUsers')}</SelectItem>
                                <SelectItem value="departments">{t('departments')}</SelectItem>
                                <SelectItem value="properties">{t('properties')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {targetType !== 'all' && (
                        <div className="space-y-2">
                            <Label className="text-hotel-navy font-medium">
                                {t(
                                    targetType === 'users'
                                        ? 'selectUsers'
                                        : targetType === 'departments'
                                            ? 'selectDepartments'
                                            : 'selectProperties'
                                )}
                            </Label>
                            <ScrollArea className="h-64 border border-gray-200 rounded-md p-2 bg-gray-50/30">
                                <div className="space-y-1">
                                    {listItems.length > 0 ? (
                                        listItems.map((item) => (
                                            <div key={item.id} className="flex items-start space-x-3 p-2 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer" onClick={() => handleToggle(item.id, !selectedIds.includes(item.id))}>
                                                <Checkbox
                                                    id={item.id}
                                                    checked={selectedIds.includes(item.id)}
                                                    onCheckedChange={(checked) => handleToggle(item.id, checked as boolean)}
                                                    className="mt-1 data-[state=checked]:bg-hotel-gold data-[state=checked]:border-hotel-gold"
                                                />
                                                <div className="grid gap-0.5">
                                                    <Label
                                                        htmlFor={item.id}
                                                        className="cursor-pointer font-medium text-sm text-gray-700"
                                                        onClick={(e) => e.stopPropagation()} // Prevent double toggle
                                                    >
                                                        {item.name}
                                                    </Label>
                                                    {item.details && (
                                                        <span className="text-gray-500 text-xs">
                                                            {item.details}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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
                        <Label htmlFor="deadline" className="text-hotel-navy font-medium">{t('deadline')} (Optional)</Label>
                        <Input
                            id="deadline"
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold bg-gray-50/50"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="bg-hotel-navy text-white hover:bg-hotel-navy-light shadow-md min-w-[120px]"
                            disabled={isAssigning || (targetType !== 'all' && selectedIds.length === 0)}
                        >
                            {isAssigning ? (
                                <span className="flex items-center gap-2">Assigning...</span>
                            ) : (
                                t('assign')
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
