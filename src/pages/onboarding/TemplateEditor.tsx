import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateOnboardingTemplate, useOnboardingTemplate, useUpdateOnboardingTemplate } from '@/hooks/useOnboarding'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTrainingModules } from '@/hooks/useTraining'
import { useDocuments } from '@/hooks/useDocuments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, ArrowLeft, Link as LinkIcon, Check, ChevronsUpDown } from 'lucide-react'
import { type AppRole, ROLES } from '@/lib/constants'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { OnboardingTaskDefinition } from '@/lib/types'

export default function TemplateEditor() {
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
            setTasks(existingTemplate.tasks)
        }
    }, [existingTemplate])

    const handleAddTask = () => {
        setTasks([...tasks, { title: '', description: '', assignee_role: 'self', due_day_offset: 1 }])
    }

    const handleTaskChange = (index: number, field: keyof OnboardingTaskDefinition, value: any) => {
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
            toast({ title: "Title is required", variant: "destructive" })
            return
        }
        const validTasks = tasks.filter(t => t.title.trim() !== '')
        if (validTasks.length === 0) {
            toast({ title: "At least one valid task is required", variant: "destructive" })
            return
        }

        const templateData = {
            title,
            role: targetType === 'role' && role !== 'all' ? role : null,
            job_title: targetType === 'job_title' ? jobTitle : null,
            tasks: validTasks,
            is_active: true
        }

        if (isEditMode && id) {
            updateTemplate({ id, updates: templateData }, {
                onSuccess: () => {
                    toast({ title: "Template updated successfully" })
                    navigate('/admin/onboarding/templates')
                },
                onError: (err) => {
                    toast({ title: "Failed to update template", description: err.message, variant: "destructive" })
                }
            })
        } else {
            createTemplate(templateData, {
                onSuccess: () => {
                    toast({ title: "Template created successfully" })
                    navigate('/admin/onboarding/templates')
                },
                onError: (err) => {
                    toast({ title: "Failed to create template", description: err.message, variant: "destructive" })
                }
            })
        }
    }

    if (isEditMode && isLoadingTemplate) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6 p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/onboarding/templates')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{isEditMode ? 'Edit' : 'Create'} Onboarding Template</h2>
                    <p className="text-muted-foreground">Define tasks for new hires.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Template Details</CardTitle>
                        <CardDescription>Who is this onboarding checklist for?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Template Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Sales Team Onboarding" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Target Audience</Label>
                            <RadioGroup
                                value={targetType}
                                onValueChange={(val) => setTargetType(val as 'role' | 'job_title' | 'all')}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="target-all" />
                                    <Label htmlFor="target-all">General (All Roles)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="role" id="target-role" />
                                    <Label htmlFor="target-role">System Role</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="job_title" id="target-job-title" />
                                    <Label htmlFor="target-job-title">Specific Job Title</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {targetType === 'role' && (
                            <div className="grid gap-2">
                                <Label htmlFor="role">Select Role</Label>
                                <Select value={role} onValueChange={(val) => setRole(val as AppRole | 'all')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
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
                                <Label htmlFor="jobTitle">Select Job Title</Label>
                                <Popover open={openJobTitle} onOpenChange={setOpenJobTitle}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openJobTitle}
                                            className={cn(
                                                "w-full justify-between",
                                                !jobTitle && "text-muted-foreground"
                                            )}
                                        >
                                            {jobTitle
                                                ? jobTitlesList?.find((t) => t.title === jobTitle)?.title || jobTitle
                                                : "Select job title"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search job title..." />
                                            <CommandList>
                                                <CommandEmpty>No job title found.</CommandEmpty>
                                                <CommandGroup>
                                                    {jobTitlesList?.map((item) => (
                                                        <CommandItem
                                                            value={item.title}
                                                            key={item.id}
                                                            onSelect={() => {
                                                                setJobTitle(item.title)
                                                                setOpenJobTitle(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    item.title === jobTitle
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {item.title}
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

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Tasks</h3>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
                            <Plus className="mr-2 h-4 w-4" /> Add Task
                        </Button>
                    </div>

                    {tasks.map((task, index) => (
                        <Card key={index}>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="grid gap-2 flex-1">
                                        <Label>Task Title</Label>
                                        <Input value={task.title} onChange={(e) => handleTaskChange(index, 'title', e.target.value)} placeholder="e.g., Sign NDA" />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => handleRemoveTask(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Textarea value={task.description} onChange={(e) => handleTaskChange(index, 'description', e.target.value)} placeholder="Instructions for the user..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Assign To</Label>
                                        <Select value={task.assignee_role} onValueChange={(val) => handleTaskChange(index, 'assignee_role', val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="self">The New Hire (Self)</SelectItem>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="it">IT Support</SelectItem>
                                                <SelectItem value="hr">HR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Due After (Days)</Label>
                                        <Input type="number" min="0" value={task.due_day_offset} onChange={(e) => handleTaskChange(index, 'due_day_offset', parseInt(e.target.value))} />
                                    </div>
                                </div>

                                {/* Resource Linking Section */}
                                <div className="pt-2 border-t mt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="flex items-center gap-2">
                                                <LinkIcon className="h-3 w-3" /> Link Resource (Optional)
                                            </Label>
                                            <Select
                                                value={task.link_type || 'none'}
                                                onValueChange={(val) => handleTaskChange(index, 'link_type', val === 'none' ? undefined : val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="No Link" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Link</SelectItem>
                                                    <SelectItem value="training">Training Module</SelectItem>
                                                    <SelectItem value="document">Document</SelectItem>
                                                    <SelectItem value="url">External URL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {task.link_type === 'training' && (
                                            <div className="grid gap-2">
                                                <Label>Select Module</Label>
                                                <Select
                                                    value={task.link_id || ''}
                                                    onValueChange={(val) => handleTaskChange(index, 'link_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select module..." />
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
                                                <Label>Select Document</Label>
                                                <Select
                                                    value={task.link_id || ''}
                                                    onValueChange={(val) => handleTaskChange(index, 'link_id', val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select document..." />
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
                                                <Label>Enter URL</Label>
                                                <Input
                                                    value={task.link_id || ''}
                                                    onChange={(e) => handleTaskChange(index, 'link_id', e.target.value)}
                                                    placeholder="https://..."
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
                    <Button type="button" variant="outline" onClick={() => navigate('/admin/onboarding/templates')}>Cancel</Button>
                    <Button type="submit" disabled={isCreating || isUpdating}>
                        {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Update Template' : 'Save Template'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
