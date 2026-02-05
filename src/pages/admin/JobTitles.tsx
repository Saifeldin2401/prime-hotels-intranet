
import { useState, useMemo } from 'react'
import type { ColumnDef } from "@tanstack/react-table"
import {
    Briefcase,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    AlertTriangle,
    Loader2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ROLES } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { useDepartments } from '@/hooks/useDepartments'

interface JobTitle {
    id: string
    title: string
    category: string
    department_id: string | null
    default_role: string | null
    created_at: string
}

export default function JobTitles() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTitle, setEditingTitle] = useState<JobTitle | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        department_id: '',
        default_role: ''
    })

    const { toast } = useToast()
    const queryClient = useQueryClient()
    const { departments } = useDepartments()
    const { t, i18n } = useTranslation('admin')
    const isRTL = i18n.dir() === 'rtl'

    // Fetch Job Titles
    const { data: jobTitles, isLoading } = useQuery({
        queryKey: ['job-titles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_titles')
                .select(`
                    *,
                    department:departments(id, name)
                `)
                .order('title', { ascending: true })

            if (error) throw error
            return data.map((item: any) => ({
                ...item,
                category: item.department?.name || item.category
            })) as JobTitle[]
        }
    })

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (newTitle: { title: string, department_id: string | null, category: string, default_role: string | null }) => {
            const { data, error } = await supabase
                .from('job_titles')
                .insert([newTitle])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-titles'] })
            toast({
                title: t('common.success'),
                description: t('job_titles.success.created'),
            })
            setIsDialogOpen(false)
            resetForm()
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            })
        }
    })

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (title: { id: string, title: string, department_id: string | null, category: string, default_role: string | null }) => {
            const { data, error } = await supabase
                .from('job_titles')
                .update({
                    title: title.title,
                    department_id: title.department_id,
                    category: title.category,
                    default_role: title.default_role
                })
                .eq('id', title.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-titles'] })
            toast({
                title: t('common.success'),
                description: t('job_titles.success.updated'),
            })
            setIsDialogOpen(false)
            resetForm()
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            })
        }
    })

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('job_titles')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-titles'] })
            toast({
                title: t('common.success'),
                description: t('job_titles.success.deleted'),
            })
        },
        onError: (error: any) => {
            if (error.code === '23503') {
                toast({
                    title: t('common.error'),
                    description: t('job_titles.errors.restricted_delete'),
                    variant: "destructive"
                })
            } else {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive"
                })
            }
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.department_id) {
            toast({
                title: t('common.error'),
                description: t('job_titles.errors.validation'),
                variant: "destructive"
            })
            return
        }

        const deptName = departments?.find(d => d.id === formData.department_id)?.name || ''

        if (editingTitle) {
            updateMutation.mutate({
                id: editingTitle.id,
                title: formData.title,
                department_id: formData.department_id,
                category: deptName,
                default_role: formData.default_role || null
            })
        } else {
            createMutation.mutate({
                title: formData.title,
                department_id: formData.department_id,
                category: deptName,
                default_role: formData.default_role || null
            })
        }
    }

    const handleEdit = (title: JobTitle) => {
        setEditingTitle(title)
        setFormData({
            title: title.title,
            department_id: title.department_id || '',
            default_role: title.default_role || ''
        })
        setIsDialogOpen(true)
    }

    const resetForm = () => {
        setEditingTitle(null)
        setFormData({
            title: '',
            department_id: '',
            default_role: ''
        })
    }

    // Column definitions for DataTable
    const columns: ColumnDef<JobTitle>[] = useMemo(() => [
        {
            accessorKey: "title",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('job_titles.table.title')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium text-hotel-navy">{row.getValue("title")}</span>
            ),
        },
        {
            accessorKey: "category",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('job_titles.table.department')} />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                    {row.getValue("category")}
                </Badge>
            ),
        },
        {
            accessorKey: "default_role",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('job_titles.table.default_role')} />
            ),
            cell: ({ row }) => {
                const role = row.getValue("default_role") as string | null
                return role ? (
                    <Badge variant="outline" className="border-hotel-gold text-hotel-navy">
                        {(ROLES[role as keyof typeof ROLES] as any)?.label || role}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className={isRTL ? "text-left" : "text-right"}>{t('job_titles.table.actions')}</div>,
            cell: ({ row }) => {
                const job = row.original
                return (
                    <div className={isRTL ? "text-left" : "text-right"}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? "start" : "end"}>
                                <DropdownMenuItem onClick={() => handleEdit(job)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t('job_titles.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => {
                                        if (confirm(t('job_titles.delete_confirm'))) {
                                            deleteMutation.mutate(job.id)
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('job_titles.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ], [t, isRTL, deleteMutation])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-serif text-hotel-navy">{t('job_titles.title')}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {t('job_titles.description')}
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('job_titles.add_title')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTitle ? t('job_titles.edit_title') : t('job_titles.new_title')}</DialogTitle>
                            <DialogDescription>
                                {t('job_titles.dialog_desc')}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('job_titles.job_title_label')}</Label>
                                <Input
                                    id="title"
                                    placeholder={t('job_titles.job_title_placeholder')}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="department">{t('job_titles.department_label')}</Label>
                                <Select
                                    value={formData.department_id}
                                    onValueChange={(val) => setFormData({ ...formData, department_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('job_titles.select_department')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments?.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">{t('job_titles.default_role_label')}</Label>
                                <Select
                                    value={formData.default_role}
                                    onValueChange={(val) => setFormData({ ...formData, default_role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('job_titles.select_role')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLES).map(([key, role]) => (
                                            <SelectItem key={key} value={key}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {t('job_titles.role_helper')}
                                </p>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {editingTitle ? t('common.save') : t('job_titles.add_title')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t('job_titles.loading')}
                    </div>
                ) : !jobTitles?.length ? (
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                        <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
                        <p>{t('job_titles.no_data')}</p>
                        <p className="text-sm mt-1">{t('job_titles.no_data_desc')}</p>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={jobTitles}
                        searchKey="title"
                        searchPlaceholder={t('job_titles.search_placeholder')}
                    />
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">{t('job_titles.about_title')}</p>
                    <p>
                        {t('job_titles.about_desc')}
                    </p>
                </div>
            </div>
        </div>
    )
}
