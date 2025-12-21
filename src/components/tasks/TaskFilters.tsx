import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TaskFiltersProps {
    filters: any
    onChange: (filters: any) => void
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
    const { t } = useTranslation('tasks')
    const { currentProperty } = useProperty()

    // Fetch departments for current property (or all if viewing 'all')
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', currentProperty?.id],
        queryFn: async () => {
            if (!currentProperty?.id) return []
            if (currentProperty.id === 'all') {
                // Fetch all departments when 'All Properties' is selected
                const { data, error } = await supabase
                    .from('departments')
                    .select('id, name')
                    .order('name')
                if (error) throw error
                return data
            }
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', currentProperty.id)
                .order('name')
            if (error) throw error
            return data
        },
        enabled: !!currentProperty?.id
    })

    const updateFilter = (key: string, value: string | null) => {
        const newFilters = { ...filters }
        if (value && value !== 'all') {
            newFilters[key] = value
        } else {
            delete newFilters[key]
        }
        onChange(newFilters)
    }

    const hasFilters = filters.status || filters.priority || filters.departmentId

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('search_placeholder')}
                    className="pl-8"
                />
            </div>

            {/* Department Filter */}
            <Select
                value={filters.departmentId || 'all'}
                onValueChange={(val) => updateFilter('departmentId', val)}
            >
                <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <SelectValue placeholder={t('department')} />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('all_departments')}</SelectItem>
                    {departments.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={filters.priority || 'all'}
                onValueChange={(val) => updateFilter('priority', val)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('priority')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('priorities.all')}</SelectItem>
                    <SelectItem value="low">{t('priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('priorities.high')}</SelectItem>
                    <SelectItem value="urgent">{t('priorities.urgent')}</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.status || 'all'}
                onValueChange={(val) => updateFilter('status', val)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('statuses.all')}</SelectItem>
                    <SelectItem value="todo">{t('kanban.todo')}</SelectItem>
                    <SelectItem value="in_progress">{t('kanban.in_progress')}</SelectItem>
                    <SelectItem value="review">{t('kanban.review')}</SelectItem>
                    <SelectItem value="completed">{t('kanban.completed')}</SelectItem>
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button variant="ghost" onClick={() => onChange({})} size="icon">
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
