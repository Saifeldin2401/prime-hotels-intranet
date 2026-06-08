import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useDepartments } from '@/hooks/useDepartments'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, Loader2, Pencil, Plus, ShieldAlert, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
const STANDARD_DEPARTMENTS = [
    "Front Office",
    "Housekeeping",
    "Food & Beverage",
    "Kitchen / Culinary",
    "Engineering & Maintenance",
    "Security",
    "Sales & Marketing",
    "Human Resources",
    "Finance / Accounting",
    "IT",
    "Executive Office",
    "Spa & Recreation",
    "Concierge",
    "Reservations"
]

export default function PropertyDepartments() {
    const { t } = useTranslation(['admin', 'common'])
    const { currentProperty } = useProperty()
    const { toast } = useToast()

    const { departments, createDepartment, updateDepartment, deleteDepartment, isLoading } = useDepartments(currentProperty?.id)

    const [selectedDept, setSelectedDept] = useState<string>('')
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
    const [editingDeptName, setEditingDeptName] = useState<string>('')

    // Fetch Property Metrics
    const { data: propertyMetrics, isLoading: isLoadingMetrics } = useQuery({
        queryKey: ['property-metrics', currentProperty?.id],
        queryFn: async () => {
            if (!currentProperty?.id) return null

            let staffQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            if (isRealPropertyId(currentProperty.id)) {
                staffQuery = staffQuery.eq('property_id', currentProperty.id)
            }

            const { count: staffCount, error: staffError } = await staffQuery

            if (staffError) throw staffError

            let taskQuery = supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .in('status', ['open', 'todo', 'in_progress', 'pending'])
                .eq('is_deleted', false)

            if (isRealPropertyId(currentProperty.id)) {
                taskQuery = taskQuery.eq('property_id', currentProperty.id)
            }

            const { count: taskCount, error: taskError } = await taskQuery

            if (taskError) throw taskError

            return {
                activeStaff: staffCount || 0,
                openTasks: taskCount || 0
            }
        },
        enabled: !!currentProperty?.id
    })

    if (!currentProperty) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-hotel-gold/50" />
                <h2 className="text-xl font-semibold">{t('departments.no_property_selected', 'No Property Selected')}</h2>
                <p className="text-gray-500 max-w-sm">
                    {t('departments.select_property_desc', 'Please select a property from the sidebar to manage its departments.')}
                </p>
            </div>
        )
    }

    const handleAdd = () => {
        if (!selectedDept || !isRealPropertyId(currentProperty?.id)) return

        // Prevent duplicate names
        if (departments.some(d => d.name === selectedDept)) {
            toast({ title: t('common:error'), description: t('properties.errors.exists'), variant: 'destructive' })
            return
        }

        createDepartment.mutate({ name: selectedDept, property_id: currentProperty.id }, {
            onSuccess: () => {
                setSelectedDept('')
                toast({
                    title: t('properties.success.dept_added'),
                    description: t('properties.success.dept_added_desc', { name: selectedDept, propertyName: currentProperty.name })
                })
            },
            onError: (err) => toast({ title: t('common:error'), description: err.message, variant: 'destructive' })
        })
    }

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return
        deleteDepartment.mutate(id, {
            onSuccess: () => toast({ title: t('properties.success.dept_deleted') }),
            onError: (err) => toast({ title: t('properties.errors.delete_failed'), description: err.message, variant: 'destructive' })
        })
    }

    const startEdit = (dept: { id: string; name: string }) => {
        setEditingDeptId(dept.id)
        setEditingDeptName(dept.name)
    }

    const cancelEdit = () => {
        setEditingDeptId(null)
        setEditingDeptName('')
    }

    const handleSaveEdit = (deptId: string) => {
        const trimmed = editingDeptName.trim()
        if (!trimmed) return

        if (departments.some(d => d.name === trimmed && d.id !== deptId)) {
            toast({ title: t('common:error'), description: t('properties.errors.exists'), variant: 'destructive' })
            return
        }

        updateDepartment.mutate({ id: deptId, name: trimmed }, {
            onSuccess: () => {
                toast({ title: t('properties.success.dept_updated', { defaultValue: 'Department updated' }) })
                cancelEdit()
            },
            onError: (err) => toast({ title: t('common:error'), description: err.message, variant: 'destructive' })
        })
    }

    const customDepts = departments.filter(d => !STANDARD_DEPARTMENTS.includes(d.name))
    const stdDepts = departments.filter(d => STANDARD_DEPARTMENTS.includes(d.name))

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('departments.title', 'Departments')}
                description={t('departments.description', 'Manage the distinct organizational departments within {{propertyName}}', { propertyName: currentProperty.name })}
            />

            {/* Property Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-hotel-navy" />
                            {t('departments.total_departments', 'Total Departments')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : departments.length}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {stdDepts.length} Standard, {customDepts.length} Custom
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            {t('properties.metrics.active_staff', 'Active Staff')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoadingMetrics ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : propertyMetrics?.activeStaff || 0}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('departments.across_property', 'Across all departments')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            {t('team.open_tasks', 'Open Tasks & Issues')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">
                            {isLoadingMetrics ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : propertyMetrics?.openTasks || 0}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {t('departments.property_wide_issues', 'Property-wide pending items')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Add New Department Card */}
                <Card className="md:col-span-1 h-fit shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">{t('departments.add_new', 'Add Department')}</CardTitle>
                        <CardDescription>{t('departments.add_new_desc', 'Select from standard departments or create a custom one.')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('departments.department_name', 'Department Name')}</label>
                            <Select value={selectedDept} onValueChange={setSelectedDept}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('properties.select_dept')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {STANDARD_DEPARTMENTS.sort().map(dept => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground pt-1">
                                {t('departments.custom_desc', 'If your department is not listed, you can type it in later updates.')}
                            </p>
                        </div>
                        <Button
                            className="w-full bg-hotel-gold hover:bg-hotel-gold-dark text-white"
                            onClick={handleAdd}
                            disabled={createDepartment.isPending || !selectedDept}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('properties.add_dept')}
                        </Button>
                    </CardContent>
                </Card>

                {/* List of Departments */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-slate-50/50 pb-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-hotel-gold" />
                                {currentProperty.name} {t('departments.directory', 'Departments')}
                            </CardTitle>
                            <CardDescription className="mt-1">
                                {departments.length} {t('departments.total', 'total departments')}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground">{t('common:loading')}</div>
                        ) : departments.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground border-dashed border-2 m-4 rounded-lg">
                                <Building2 className="mx-auto h-8 w-8 opacity-50 mb-3" />
                                {t('properties.no_depts')}
                            </div>
                        ) : (
                            <div className="divide-y max-h-[600px] overflow-y-auto">
                                {departments.sort((a, b) => a.name.localeCompare(b.name)).map(dept => (
                                    <div key={dept.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                        {editingDeptId === dept.id ? (
                                            <div className="flex-1 flex flex-wrap items-center gap-2">
                                                <Input
                                                    value={editingDeptName}
                                                    onChange={(e) => setEditingDeptName(e.target.value)}
                                                    className="max-w-xs"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="bg-hotel-navy hover:bg-hotel-navy/90 text-white"
                                                    onClick={() => handleSaveEdit(dept.id)}
                                                    disabled={updateDepartment.isPending || !editingDeptName.trim()}
                                                >
                                                    {t('common:save', 'Save')}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                    {t('common:cancel', 'Cancel')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                                        {dept.name.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                                                        <div className="mt-1">
                                                            {STANDARD_DEPARTMENTS.includes(dept.name) ? (
                                                                <Badge variant="outline" className="text-xs font-normal">Standard</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs font-normal text-hotel-gold bg-hotel-gold/10 hover:bg-hotel-gold/20">Custom</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 sm:self-start">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-gray-400 hover:text-hotel-navy hover:bg-slate-100"
                                                        onClick={() => startEdit(dept)}
                                                        aria-label={t('accessibility.edit_department', 'Edit Department')}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(dept.id, dept.name)}
                                                        aria-label={t('accessibility.delete_department', 'Delete Department')}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
