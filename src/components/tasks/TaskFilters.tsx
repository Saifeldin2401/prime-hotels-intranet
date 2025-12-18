import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Building2 } from 'lucide-react'

interface TaskFiltersProps {
    filters: any
    onChange: (filters: any) => void
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
    const { currentProperty } = useProperty()

    // Fetch departments for current property
    const { data: departments = [] } = useQuery({
        queryKey: ['departments', currentProperty?.id],
        queryFn: async () => {
            if (!currentProperty?.id) return []
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
                    placeholder="Search tasks..."
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
                        <SelectValue placeholder="Department" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
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
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.status || 'all'}
                onValueChange={(val) => updateFilter('status', val)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
