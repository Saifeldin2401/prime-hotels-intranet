import { useState, useEffect } from 'react'
import { Plus, Users, Calendar, BookOpen, Search, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { learningService } from '@/services/learningService'
import type { LearningAssignment } from '@/types/learning'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

// Hooks
import { useProfiles } from '@/hooks/useUsers'
import { useDepartments } from '@/hooks/useDepartments'
import { useLearningQuizzes, useTrainingModules, useAssignmentProgress } from '@/hooks/useTraining'
import { Eye } from 'lucide-react'

function AssignmentProgressDialog({
    assignmentId,
    open,
    onOpenChange
}: {
    assignmentId: string | null,
    open: boolean,
    onOpenChange: (open: boolean) => void
}) {
    const { data: progress, isLoading } = useAssignmentProgress(assignmentId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assignment Progress</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading progress...</div>
                ) : !progress || progress.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed rounded-lg">
                        <div className="text-muted-foreground">No progress recorded yet.</div>
                        <p className="text-xs text-muted-foreground mt-1">Users appear here once they start the assignment.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">User</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Score</th>
                                    <th className="px-4 py-3 text-left font-medium">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {progress.map((p: any) => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{p.user?.full_name || 'Unknown User'}</div>
                                            <div className="text-xs text-muted-foreground">{p.user?.job_title}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            {p.score_percentage !== null && p.score_percentage !== undefined ? `${p.score_percentage}%` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {format(new Date(p.updated_at), 'MMM d, HH:mm')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

const ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' },
    { value: 'housekeeping', label: 'Housekeeping' },
    { value: 'front_desk', label: 'Front Desk' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'security', label: 'Security' },
]

export default function AssignmentManager() {
    const { t } = useTranslation('learning')
    const [assignments, setAssignments] = useState<LearningAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [searchParams] = useSearchParams()
    const { toast } = useToast()

    // Data Hooks
    const { data: users } = useProfiles()
    const { departments } = useDepartments()
    const { data: quizzes } = useLearningQuizzes() // Fetch all statuses
    const { data: modules } = useTrainingModules()

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [viewProgressId, setViewProgressId] = useState<string | null>(null)

    // Form Data
    const [formData, setFormData] = useState({
        content_type: 'quiz',
        content_id: '',
        target_type: 'role',
        target_id: '',
        due_date: '',
        priority: 'medium'
    })

    // Selector States
    const [userOpen, setUserOpen] = useState(false)
    const [contentOpen, setContentOpen] = useState(false)

    useEffect(() => {
        loadAssignments()

        // Handle pre-filled quiz assignment
        const quizId = searchParams.get('quiz')
        if (quizId) {
            setFormData(prev => ({ ...prev, content_type: 'quiz', content_id: quizId }))
            setShowModal(true)
        }
    }, [searchParams])

    const loadAssignments = async () => {
        try {
            const data = await learningService.getAssignments()
            setAssignments(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!formData.content_id || !formData.target_id || !formData.due_date) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields.',
                variant: 'destructive'
            })
            return
        }

        try {
            setCreating(true)
            await learningService.createAssignment(formData as any)
            toast({ title: 'Success', description: 'Assignment created successfully' })
            setShowModal(false)
            // Reset form
            setFormData({
                content_type: 'quiz',
                content_id: '',
                target_type: 'role',
                target_id: '',
                due_date: '',
                priority: 'medium'
            })
            loadAssignments()
        } catch (error) {
            console.error(error)
            toast({ title: 'Error', description: 'Failed to create assignment', variant: 'destructive' })
        } finally {
            setCreating(false)
        }
    }

    // Helper to get display name for content
    const getContentName = (id: string, type: string) => {
        if (type === 'quiz') return quizzes?.find(q => q.id === id)?.title || id
        if (type === 'module') return modules?.find(m => m.id === id)?.title || id
        return id
    }

    // Helper to get display name for target
    const getTargetName = (id: string, type: string) => {
        if (type === 'user') return users?.find(u => u.id === id)?.full_name || id
        if (type === 'department') return departments?.find(d => d.id === id)?.name || id
        if (type === 'role') return ROLES.find(r => r.value === id)?.label || id
        return id
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assignment Manager</h1>
                    <p className="text-muted-foreground mt-2">
                        Target quizzes and content to specific staff, roles, or departments.
                    </p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Assignment
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{assignments.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        {/* Content Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Content Type</Label>
                                <Select
                                    value={formData.content_type}
                                    onValueChange={v => setFormData({ ...formData, content_type: v, content_id: '' })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="quiz">Quiz</SelectItem>
                                        <SelectItem value="module">Training Module</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Select Content</Label>
                                <Popover open={contentOpen} onOpenChange={setContentOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={contentOpen}
                                            className="w-full justify-between"
                                        >
                                            {formData.content_id
                                                ? getContentName(formData.content_id, formData.content_type)
                                                : `Select ${formData.content_type === 'quiz' ? 'Quiz' : 'Module'}...`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={`Search ${formData.content_type}...`} />
                                            <CommandEmpty>No content found.</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-auto">
                                                {formData.content_type === 'quiz' ? (
                                                    quizzes?.map((quiz) => (
                                                        <CommandItem
                                                            key={quiz.id}
                                                            value={quiz.title}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, content_id: quiz.id })
                                                                setContentOpen(false)
                                                            }}
                                                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                        >
                                                            <div
                                                                className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                                                                onPointerDown={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setFormData({ ...formData, content_id: quiz.id })
                                                                    setContentOpen(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.content_id === quiz.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {quiz.title}
                                                                {quiz.status !== 'published' && (
                                                                    <span className="ml-2 text-xs text-muted-foreground capitalize">({quiz.status})</span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))
                                                ) : (
                                                    modules?.map((module) => (
                                                        <CommandItem
                                                            key={module.id}
                                                            value={module.title}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, content_id: module.id })
                                                                setContentOpen(false)
                                                            }}
                                                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                        >
                                                            <div
                                                                className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                                                                onPointerDown={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setFormData({ ...formData, content_id: module.id })
                                                                    setContentOpen(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.content_id === module.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {module.title}
                                                            </div>
                                                        </CommandItem>
                                                    ))
                                                )}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Target Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('targetType')}</Label>
                                <Select
                                    value={formData.target_type}
                                    onValueChange={v => setFormData({ ...formData, target_type: v, target_id: '' })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="role">Role</SelectItem>
                                        <SelectItem value="department">Department</SelectItem>
                                        <SelectItem value="user">Specific User</SelectItem>
                                        <SelectItem value="everyone">All Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('targetValue')}</Label>
                                {formData.target_type === 'user' ? (
                                    <Popover open={userOpen} onOpenChange={setUserOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={userOpen}
                                                className="w-full justify-between"
                                            >
                                                {formData.target_id
                                                    ? users?.find((user) => user.id === formData.target_id)?.full_name
                                                    : t('selectUser')}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                            <Command>
                                                <CommandInput placeholder={t('searchUser')} />
                                                <CommandEmpty>{t('noUserFound')}</CommandEmpty>
                                                <CommandGroup className="max-h-[200px] overflow-auto">
                                                    {users?.map((user) => (
                                                        <CommandItem
                                                            key={user.id}
                                                            value={user.full_name || user.email || ''} // Search by name or email
                                                            onSelect={() => {
                                                                setFormData({ ...formData, target_id: user.id })
                                                                setUserOpen(false)
                                                            }}
                                                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                        >
                                                            <div
                                                                className="w-full flex items-center px-2 py-1.5 cursor-pointer"
                                                                onPointerDown={(e) => e.preventDefault()}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setFormData({ ...formData, target_id: user.id })
                                                                    setUserOpen(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.target_id === user.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {user.full_name}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                ) : formData.target_type === 'department' ? (
                                    <Select
                                        value={formData.target_id}
                                        onValueChange={v => setFormData({ ...formData, target_id: v })}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('selectDepartment')} /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : formData.target_type === 'role' ? (
                                    <Select
                                        value={formData.target_id}
                                        onValueChange={v => setFormData({ ...formData, target_id: v })}
                                    >
                                        <SelectTrigger><SelectValue placeholder={t('selectRole')} /></SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(role => (
                                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input value={t('allStaff')} disabled />
                                )}
                            </div>
                        </div>

                        {/* Date and Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('dueDate')}</Label>
                                <Input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('priority')}</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={v => setFormData({ ...formData, priority: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('low')}</SelectItem>
                                        <SelectItem value="medium">{t('medium')}</SelectItem>
                                        <SelectItem value="high">{t('high')}</SelectItem>
                                        <SelectItem value="compliance">{t('complianceMandatory')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? t('creating') : t('createAssignment')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('content')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('target')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('type')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('dueDate')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('priority')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground">{t('dateAssigned')}</th>
                                <th className="px-6 py-3 font-medium text-muted-foreground text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {assignments.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-blue-500" />
                                            {/* Attempt to show title if available (would need enriched data or lookup) */}
                                            {getContentName(a.content_id, a.content_type) || a.content_type.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <span className="capitalize">
                                                {a.target_type === 'everyone' ? t('allStaff') : getTargetName(a.target_id, a.target_type)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 capitalize">{a.content_type}</td>
                                    <td className="px-6 py-4">
                                        {a.due_date ? format(new Date(a.due_date), 'MMM d, yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={
                                            a.priority === 'compliance' ? 'destructive' :
                                                a.priority === 'high' ? 'destructive' :
                                                    'secondary'
                                        }>
                                            {a.priority}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {format(new Date(a.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setViewProgressId(a.id)}
                                            title={t('viewProgress')}
                                        >
                                            <Eye className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {assignments.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        {t('noActiveAssignments')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AssignmentProgressDialog
                assignmentId={viewProgressId}
                open={!!viewProgressId}
                onOpenChange={(val) => !val && setViewProgressId(null)}
            />
        </div>
    )
}
