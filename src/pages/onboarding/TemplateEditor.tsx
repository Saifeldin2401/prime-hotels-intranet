import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDocuments } from '@/hooks/useDocuments'
import { useCreateOnboardingTemplate, useOnboardingTemplate, useUpdateOnboardingTemplate } from '@/hooks/useOnboarding'
import { useTrainingModules } from '@/hooks/useTraining'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useId, useRef, useState } from 'react'
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from '@/components/ui/use-toast'
import { type AppRole, ROLES } from '@/lib/constants'
import type { OnboardingTaskDefinition } from '@/lib/types'
import { cn } from "@/lib/utils"
import { ArrowLeft, Check, ChevronsUpDown, Link as LinkIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function TemplateEditor() {
    const { t: t_ext } = useTranslation('extracted');
    const { t } = useTranslation('onboarding')
    const navigate = useNavigate()
    const { id } = useParams()
    const isEditMode = !!id
    const { toast } = useToast()

    // Data fetching for selectors
    const { data: trainingModules } = useTrainingModules()
    const { data: documents } = useDocuments()

    const { data: existingTemplate, isLoading: isLoadingTemplate } = useOnboardingTemplate(id)
    const { mutate: createTemplate, isPending: isCreating } = useCreateOnboardingTemplate()
    const { mutate: updateTemplate, isPending: isUpdating } = useUpdateOnboardingTemplate()

    const [title, setTitle] = useState('')
    const [targetType, setTargetType] = useState<'role' | 'job_title' | 'all'>('all')
    const [role, setRole] = useState<AppRole | 'all'>('all')
    const [jobTitle, setJobTitle] = useState('')
    const [openJobTitle, setOpenJobTitle] = useState(false)
    const [requiredTrainingIds, setRequiredTrainingIds] = useState<string[]>([])

    // IDs for accessibility
    const jobTitleListId = useId()

    // Fetch Job Titles
    const { data: jobTitlesList } = useQuery({
        queryKey: ['job_titles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_titles')
                .select('*')
                .order('title', { ascending: true })

            if (error) throw error
            return data as { id: string; title: string; default_role: string; category: string }[]
        }
    })
    const [tasks, setTasks] = useState<OnboardingTaskDefinition[]>([
        { title: '', description: '', assignee_role: 'self', due_day_offset: 0 }
    ])

    // ============================================
    // FORM PERSISTENCE
    // ============================================
    const [hasMounted, setHasMounted] = useState(false)
    const [showRestorePrompt, setShowRestorePrompt] = useState(false)
    const restoredDraftRef = useRef(false)

    const formPersistence = useFormPersistence({
      key: `onboarding_template_${id || 'new'}`,
      enabled: !isEditMode,
      debounceMs: 500,
      version: 1,
    })
    const { loadDraft, saveDraft, clearDraft } = formPersistence

    useEffect(() => {
      if (isEditMode) {
        setHasMounted(true)
        return
      }

      const draft = loadDraft()
      if (draft) {
        if (typeof draft.title === 'string') setTitle(draft.title)
        if (draft.targetType === 'role' || draft.targetType === 'job_title' || draft.targetType === 'all') setTargetType(draft.targetType)
        if (draft.role === 'all' || (typeof draft.role === 'string' && Object.prototype.hasOwnProperty.call(ROLES, draft.role))) setRole(draft.role as AppRole | 'all')
        if (typeof draft.jobTitle === 'string') setJobTitle(draft.jobTitle)
        if (Array.isArray(draft.requiredTrainingIds)) setRequiredTrainingIds(draft.requiredTrainingIds.filter((id): id is string => typeof id === 'string'))
        if (Array.isArray(draft.tasks)) setTasks(draft.tasks as OnboardingTaskDefinition[])

        if (!restoredDraftRef.current) {
          restoredDraftRef.current = true
          setShowRestorePrompt(true)
          setTimeout(() => setShowRestorePrompt(false), 8000)
        }
      }
      setHasMounted(true)
    }, [isEditMode, loadDraft])

    useEffect(() => {
      if (!hasMounted || isEditMode) return
      saveDraft({
        title, targetType, role, jobTitle, requiredTrainingIds, tasks
      })
    }, [hasMounted, isEditMode, saveDraft, title, targetType, role, jobTitle, requiredTrainingIds, tasks])

    // Load existing data
    useEffect(() => {
        if (existingTemplate) {
            setTitle(existingTemplate.title)
            if (existingTemplate.job_title) {
                setTargetType('job_title')
                setJobTitle(existingTemplate.job_title)
                setRole('all') // Reset role
            } else if (existingTemplate.role) {
                setTargetType('role')
                setRole(existingTemplate.role)
                setJobTitle('') // Reset job title
            } else {
                setTargetType('all')
                setRole('all')
                setJobTitle('')
            }
            setTasks(
                Array.isArray(existingTemplate.tasks) && existingTemplate.tasks.length > 0
                    ? existingTemplate.tasks
                    : [{ title: '', description: '', assignee_role: 'self', due_day_offset: 0 }]
            )
            setRequiredTrainingIds(Array.isArray(existingTemplate.required_training_ids) ? existingTemplate.required_training_ids : [])
        }
    }, [existingTemplate])

    const handleAddTask = () => {
        setTasks([...tasks, { title: '', description: '', assignee_role: 'self', due_day_offset: 1 }])
    }

    const handleTaskChange = (index: number, field: keyof OnboardingTaskDefinition, value) => {
        const newTasks = [...tasks]
        newTasks[index] = { ...newTasks[index], [field]: value }

        // Reset link_id if link_type changes
        if (field === 'link_type') {
            newTasks[index].link_id = undefined
        }

        setTasks(newTasks)
    }

    const handleRemoveTask = (index: number) => {
        const newTasks = tasks.filter((_, i) => i !== index)
        setTasks(newTasks)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Basic validation
        if (!title) {
            toast({ title: t('actions.title_required'), variant: "destructive" })
            return
        }
        if (targetType === 'job_title' && !jobTitle.trim()) {
            toast({ title: t('actions.job_title_required', 'Please select a job title'), variant: "destructive" })
            return
        }
        const validTasks = tasks.filter(t => t.title.trim() !== '')
        if (validTasks.length === 0) {
            toast({ title: t('actions.task_required'), variant: "destructive" })
            return
        }

        const templateData = {
            title,
            role: targetType === 'role' && role !== 'all' ? role : null,
            job_title: targetType === 'job_title' ? jobTitle : null,
            tasks: validTasks,
            required_training_ids: requiredTrainingIds,
            is_active: true
        }

        if (isEditMode && id) {
            updateTemplate({ id, updates: templateData }, {
                onSuccess: () => {
                    toast({ title: t('actions.template_updated') })
                    navigate('/admin/onboarding/templates')
                },
                onError: (err) => {
                    toast({ title: t('actions.update_failed'), description: err.message, variant: "destructive" })
                }
            })
        } else {
            createTemplate(templateData, {
                onSuccess: () => {
                    toast({ title: t('actions.template_created') })
                    clearDraft()
                    navigate('/admin/onboarding/templates')
                },
                onError: (err) => {
                    toast({ title: t('actions.create_failed'), description: err.message, variant: "destructive" })
                }
            })
        }
    }

    if (isEditMode && isLoadingTemplate) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!hasMounted && !isEditMode) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6 p-8 max-w-4xl mx-auto">
            {/* Restore Draft Prompt */}
            {!isEditMode && showRestorePrompt && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">
                            Draft template restored from previous session
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>Keep</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                            clearDraft()
                            setTitle('')
                            setTasks([{ title: '', description: '', assignee_role: 'self', due_day_offset: 0 }])
                            setShowRestorePrompt(false)
                            toast({ title: 'Draft cleared' })
                        }}>Clear Draft</Button>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/onboarding/templates')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> {t('actions.back')}
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{isEditMode ? t('editor.edit_title') : t('editor.create_title')}</h2>
                    <p className="text-muted-foreground">{t('editor.subtitle')}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('editor.details_title')}</CardTitle>
                        <CardDescription>{t('editor.details_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">{t('editor.template_title')}</Label>
                            <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('editor.placeholders.template_title')} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('editor.target_audience')}</Label>
                            <RadioGroup
                                value={targetType}
                                onValueChange={(val) => setTargetType(val as 'role' | 'job_title' | 'all')}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="target-all" />
                                    <Label htmlFor="target-all">{t('editor.target_general')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="role" id="target-role" />
                                    <Label htmlFor="target-role">{t('editor.target_role')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="job_title" id="target-job-title" />
                                    <Label htmlFor="target-job-title">{t('editor.target_job')}</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {targetType === 'role' && (
                            <div className="grid gap-2">
                                <Label htmlFor="role">{t('editor.select_role')}</Label>
                                <Select value={role} onValueChange={(val) => setRole(val as AppRole | 'all')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('editor.select_role')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLES).map(([key, config]) => (
                                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {targetType === 'job_title' && (
                            <div className="grid gap-2">
                                <Label htmlFor="jobTitle">{t('editor.select_job')}</Label>
                                <Popover open={openJobTitle} onOpenChange={setOpenJobTitle}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openJobTitle}
                                            aria-controls={jobTitleListId}
                                            className={cn(
                                                "w-full justify-between",
                                                !jobTitle && "text-muted-foreground"
                                            )}
                                        >
                                            {jobTitle
                                                ? jobTitlesList?.find((t) => t.title === jobTitle)?.title || jobTitle
                                                : t('editor.select_job')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder={t('editor.select_job') + "..."} />
                                            <CommandList id={jobTitleListId}>
                                                <CommandEmpty>{t_ext('no_job_title_found', 'No job title found.')}</CommandEmpty>
                                                <CommandGroup>
                                                    {jobTitlesList?.map((item) => (
                                                        <CommandItem
                                                            value={item.title}
                                                            key={item.id}
                                                            onSelect={() => {
                                                                setJobTitle(item.title)
                                                                setOpenJobTitle(false)
                                                            }}
                                                            className="p-0 data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                        >
                                                            <div className="w-full flex items-center px-2 py-1.5">
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        item.title === jobTitle
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                {item.title}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* Mandatory Training Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5" />
                            {t('editor.mandatory_training_title', 'Mandatory Training Modules')}
                        </CardTitle>
                        <CardDescription>
                            {t('editor.mandatory_training_desc', 'Modules selected here will be automatically assigned to the user and tracked as onboarding tasks.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {requiredTrainingIds.map(id => {
                                const module = trainingModules?.find(m => m.id === id)
                                return (
                                    <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                                        {module?.title || id}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                            onClick={() => setRequiredTrainingIds(prev => prev.filter(tid => tid !== id))}
                                            aria-label={t('accessibility.remove', 'Remove')}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                )
                            })}
                            {requiredTrainingIds.length === 0 && (
                                <p className="text-sm text-muted-foreground py-2 italic">
                                    {t('editor.no_training_selected', 'No mandatory training modules selected.')}
                                </p>
                            )}
                        </div>

                        <div className="pt-2">
                            <Select
                                onValueChange={(val) => {
                                    if (val && !requiredTrainingIds.includes(val)) {
                                        setRequiredTrainingIds(prev => [...prev, val])
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('editor.add_module', 'Add training module...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {trainingModules?.filter(m => !requiredTrainingIds.includes(m.id)).map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{t('editor.tasks_title')}</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
                            <Plus className="mr-2 h-4 w-4" /> {t('actions.add_task')}
                        </Button>
                    </div>

                    {tasks.map((task, index) => (
                        <Card key={index}>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="grid gap-2 flex-1">
                                        <Label>{t('editor.task_title')}</Label>
                                        <Input
                                            id={`task-title-${index}`}
                                            name={`task-title-${index}`}
                                            value={task.title}
                                            onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                                            placeholder={t('editor.placeholders.task_title')}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => handleRemoveTask(index)} aria-label={t('accessibility.delete', 'Delete')}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('editor.description')}</Label>
                                    <Textarea
                                        id={`task-desc-${index}`}
                                        name={`task-desc-${index}`}
                                        value={task.description}
                                        onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                                        placeholder={t('editor.placeholders.task_description')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>{t('editor.assign_to')}</Label>
                                        <Select value={task.assignee_role} onValueChange={(val) => handleTaskChange(index, 'assignee_role', val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="self">{t('editor.assign_self')}</SelectItem>
                                                <SelectItem value="manager">{t('editor.assign_manager')}</SelectItem>
                                                <SelectItem value="it">{t('editor.assign_it')}</SelectItem>
                                                <SelectItem value="hr">{t('editor.assign_hr')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('editor.due_after')}</Label>
                                        <Input
                                            type="number"
                                            id={`task-due-${index}`}
                                            name={`task-due-${index}`}
                                            min="0"
                                            value={task.due_day_offset}
                                            onChange={(e) => {
                                                const parsed = Number.parseInt(e.target.value, 10)
                                                handleTaskChange(index, 'due_day_offset', Number.isNaN(parsed) ? 0 : parsed)
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Resource Linking Section */}
                                <div className="pt-2 border-t mt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="flex items-center gap-2">
                                                <LinkIcon className="h-3 w-3" /> {t('editor.link_resource')}
                                            </Label>
                                            <Select
                                                value={task.link_type || 'none'}
                                                onValueChange={(val) => handleTaskChange(index, 'link_type', val === 'none' ? undefined : val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('editor.link_none')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">{t('editor.link_none')}</SelectItem>
                                                    <SelectItem value="training">{t('editor.link_training')}</SelectItem>
                                                    <SelectItem value="document">{t('editor.link_document')}</SelectItem>
                                                    <SelectItem value="url">{t('editor.link_url')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {task.link_type === 'training' && (
                                            <div className="grid gap-2">
                                                <Label>{t('editor.select_module')}</Label>
                                                <Select
                                                    value={task.link_id || ''}
                                                    onValueChange={(val) => handleTaskChange(index, 'link_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('editor.select_module') + "..."} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {trainingModules?.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {task.link_type === 'document' && (
                                            <div className="grid gap-2">
                                                <Label>{t('editor.select_document')}</Label>
                                                <Select
                                                    value={task.link_id || ''}
                                                    onValueChange={(val) => handleTaskChange(index, 'link_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('editor.select_document') + "..."} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {documents?.map(d => (
                                                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {task.link_type === 'url' && (
                                            <div className="grid gap-2">
                                                <Label>{t('editor.enter_url')}</Label>
                                                <Input
                                                    name={`task-link-${index}`}
                                                    id={`task-link-${index}`}
                                                    value={task.link_id || ''}
                                                    onChange={(e) => handleTaskChange(index, 'link_id', e.target.value)}
                                                    placeholder={t_ext('https', 'https://...')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/onboarding/templates')}>{t('actions.cancel')}</Button>
                    <Button type="submit" disabled={isCreating || isUpdating}>
                        {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? t('actions.update_template') : t('actions.save_template')}
                    </Button>
                </div>
            </form>
        </div>
    )
}
