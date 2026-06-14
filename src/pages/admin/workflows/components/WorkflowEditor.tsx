import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useTrainingModulesList } from '@/hooks/useTrainingRules'
import type { WorkflowDefinition, WorkflowStep } from '@/hooks/useWorkflows'
import { useCreateWorkflow, useUpdateWorkflow, useUpdateWorkflowSteps, useWorkflowSteps } from '@/hooks/useWorkflows'
import { supabase } from '@/lib/supabase'
import { GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from "react-i18next"
import { useFormPersistence } from '@/hooks/useFormPersistence'
import { AlertTriangle } from 'lucide-react'

interface WorkflowEditorProps {
    workflow: WorkflowDefinition
    onClose: () => void
}

type WorkflowEditorStep = Omit<WorkflowStep, 'id' | 'workflow_id'> & Partial<Pick<WorkflowStep, 'id' | 'workflow_id'>>

type WorkflowStepConfig = {
    title?: string
    message?: string
    description?: string
    priority?: string
    module_id?: string
    content_id?: string
    [key: string]: unknown
}

type SimpleWorkflowAction = 'none' | 'send_training_reminders' | 'custom'

function getStepConfig(step: Partial<WorkflowStep>): WorkflowStepConfig {
    return typeof step.config === 'object' && step.config !== null
        ? step.config as WorkflowStepConfig
        : {}
}

export function WorkflowEditor({ workflow, onClose }: WorkflowEditorProps) {
    const { t: t_ext } = useTranslation('extracted');
    const { data: steps, isLoading: stepsLoading } = useWorkflowSteps(workflow.id)
    const updateWorkflowMutation = useUpdateWorkflow()
    const createWorkflowMutation = useCreateWorkflow()
    const updateStepsMutation = useUpdateWorkflowSteps(workflow.id)
    const { data: modules } = useTrainingModulesList()
    const { toast } = useToast()

    const [name, setName] = useState(workflow.name)
    const [description, setDescription] = useState(workflow.description || '')
    const [type, setType] = useState<WorkflowDefinition['type']>(workflow.type || 'event-based')
    const [triggerConfig, setTriggerConfig] = useState(() =>
        JSON.stringify(workflow.trigger_config || {}, null, 2)
    )
    const [actionConfig, setActionConfig] = useState(() =>
        JSON.stringify(workflow.action_config || {}, null, 2)
    )
    const [localSteps, setLocalSteps] = useState<WorkflowEditorStep[]>([])
    const [advancedMode, setAdvancedMode] = useState(false)
    const [eventType, setEventType] = useState('NEW_HIRE')
    const [customEventType, setCustomEventType] = useState('')
    const [scheduleCron, setScheduleCron] = useState('0 9 * * *')
    const [simpleAction, setSimpleAction] = useState<SimpleWorkflowAction>('none')
    const isNewWorkflow = !workflow.id

    // ============================================
    // FORM PERSISTENCE - Save draft on tab switch
    // ============================================
    const [hasMounted, setHasMounted] = useState(false)
    const [showRestorePrompt, setShowRestorePrompt] = useState(false)
    const restoredDraftRef = useRef(false)

    const formPersistence = useFormPersistence({
      key: `workflow_editor_${workflow.id || 'new'}`,
      enabled: isNewWorkflow,
      debounceMs: 500,
      version: 1,
    })
    const { loadDraft, saveDraft, clearDraft } = formPersistence

    // Hydrate from draft on mount
    useEffect(() => {
      if (!isNewWorkflow) {
        setHasMounted(true)
        return
      }

      const draft = loadDraft()
      if (draft) {
        if (typeof draft.name === 'string') setName(draft.name)
        if (typeof draft.description === 'string') setDescription(draft.description)
        if (draft.type === 'manual' || draft.type === 'scheduled' || draft.type === 'event-based') setType(draft.type)
        if (typeof draft.triggerConfig === 'string') setTriggerConfig(draft.triggerConfig)
        if (typeof draft.actionConfig === 'string') setActionConfig(draft.actionConfig)
        if (Array.isArray(draft.localSteps)) setLocalSteps(draft.localSteps)
        if (typeof draft.eventType === 'string') setEventType(draft.eventType)
        if (typeof draft.scheduleCron === 'string') setScheduleCron(draft.scheduleCron)
        if (draft.simpleAction === 'none' || draft.simpleAction === 'send_training_reminders' || draft.simpleAction === 'custom') {
            setSimpleAction(draft.simpleAction)
        }

        if (!restoredDraftRef.current) {
          restoredDraftRef.current = true
          setShowRestorePrompt(true)
          setTimeout(() => setShowRestorePrompt(false), 8000)
        }
      }
      setHasMounted(true)
    }, [isNewWorkflow, loadDraft])

    // Save draft when state changes
    useEffect(() => {
      if (!hasMounted || !isNewWorkflow) return

      saveDraft({
        name,
        description,
        type,
        triggerConfig,
        actionConfig,
        localSteps,
        eventType,
        scheduleCron,
        simpleAction,
      })
    }, [
      hasMounted, isNewWorkflow, saveDraft,
      name, description, type, triggerConfig, actionConfig,
      localSteps, eventType, scheduleCron, simpleAction,
    ])

    const eventOptions = useMemo(() => ([
        { value: 'NEW_HIRE', label: 'New Hire' },
        { value: 'ROLE_CHANGE', label: 'Role Change' },
        { value: 'SOP_PUBLISHED', label: 'SOP Published' },
        { value: 'SOP_UPDATED', label: 'SOP Updated' },
        { value: 'INCIDENT_REPORTED', label: 'Incident Reported' },
        { value: 'AUDIT_FINDING', label: 'Audit Finding' },
        { value: 'CERTIFICATION_EXPIRED', label: 'Certification Expired' },
        { value: 'DOCUMENT_EXPIRING', label: 'Document Expiring' },
        { value: 'LEAVE_REQUESTED', label: 'Leave Requested' }
    ]), [])

    const templates = [
        {
            id: 'training_reminders',
            title: 'Training Deadline Reminders',
            description: 'Send overdue training reminders every morning.',
            apply: () => {
                setName('training_deadline_reminders')
                setDescription('Send reminders for overdue training assignments.')
                setType('scheduled')
                setScheduleCron('0 9 * * *')
                setSimpleAction('send_training_reminders')
                setActionConfig(JSON.stringify({ action: 'send_training_reminders' }, null, 2))
                setTriggerConfig(JSON.stringify({ cron: '0 9 * * *' }, null, 2))
                setLocalSteps([])
            }
        },
        {
            id: 'new_hire_welcome',
            title: 'New Hire Welcome (Notify + Task)',
            description: 'Welcome new hires and create an onboarding task.',
            apply: () => {
                setName('New Hire Welcome Pack')
                setDescription('Welcome workflow for new staff: notify and create onboarding task.')
                setType('event-based')
                setEventType('NEW_HIRE')
                setTriggerConfig(JSON.stringify({ event_type: 'NEW_HIRE' }, null, 2))
                setSimpleAction('none')
                setActionConfig(JSON.stringify({}, null, 2))
                setLocalSteps([
                    {
                        step_order: 1,
                        name: 'Send Welcome Notification',
                        action: 'send_notification',
                        config: {
                            title: 'Welcome to Prime Hotels',
                            message: 'Welcome aboard! Please complete your onboarding checklist.'
                        }
                    },
                    {
                        step_order: 2,
                        name: 'Create Onboarding Task',
                        action: 'create_task',
                        config: {
                            title: 'Complete onboarding checklist',
                            description: 'Finish your onboarding tasks for the first week.',
                            priority: 'medium'
                        }
                    }
                ])
            }
        }
    ]

    useEffect(() => {
        if (steps) {
            setLocalSteps(steps)
        }
    }, [steps])

    useEffect(() => {
        try {
            const parsedTrigger = triggerConfig ? JSON.parse(triggerConfig) : {}
            const parsedAction = actionConfig ? JSON.parse(actionConfig) : {}

            if (type === 'scheduled') {
                setScheduleCron(parsedTrigger?.cron || '0 9 * * *')
                const triggerKeys = Object.keys(parsedTrigger || {})
                if (triggerKeys.some((key) => key !== 'cron')) {
                    setAdvancedMode(true)
                }
            }
            if (type === 'event-based') {
                const evt = parsedTrigger?.event_type || parsedTrigger?.event
                if (evt && eventOptions.some((opt) => opt.value === evt)) {
                    setEventType(evt)
                } else if (evt) {
                    setEventType('CUSTOM')
                    setCustomEventType(evt)
                }
                const triggerKeys = Object.keys(parsedTrigger || {})
                if (triggerKeys.some((key) => !['event', 'event_type'].includes(key))) {
                    setAdvancedMode(true)
                }
            }

            if (!parsedAction || Object.keys(parsedAction).length === 0) {
                setSimpleAction('none')
            } else if (parsedAction?.action === 'send_training_reminders') {
                setSimpleAction('send_training_reminders')
            } else {
                setSimpleAction('custom')
                setAdvancedMode(true)
            }
        } catch {
            setAdvancedMode(true)
        }
    }, [actionConfig, eventOptions, triggerConfig, type])

    useEffect(() => {
        if (advancedMode) return

        if (type === 'scheduled') {
            setTriggerConfig(JSON.stringify({ cron: scheduleCron || '0 9 * * *' }, null, 2))
        } else if (type === 'event-based') {
            const evt = eventType === 'CUSTOM' ? customEventType : eventType
            setTriggerConfig(JSON.stringify(evt ? { event_type: evt } : {}, null, 2))
        } else {
            setTriggerConfig(JSON.stringify({}, null, 2))
        }
    }, [advancedMode, type, scheduleCron, eventType, customEventType])

    useEffect(() => {
        if (advancedMode) return

        if (simpleAction === 'send_training_reminders') {
            setActionConfig(JSON.stringify({ action: 'send_training_reminders' }, null, 2))
        } else if (simpleAction === 'none') {
            setActionConfig(JSON.stringify({}, null, 2))
        }
    }, [advancedMode, simpleAction])

    const handleAddStep = () => {
        setLocalSteps([...localSteps, {
            step_order: localSteps.length + 1,
            name: 'New Step',
            action: 'send_notification',
            config: {}
        }])
    }

    const handleRemoveStep = (index: number) => {
        setLocalSteps(localSteps.filter((_, i) => i !== index))
    }

    const handleStepChange = (index: number, field: keyof WorkflowStep, value: WorkflowStep[keyof WorkflowStep]) => {
        const updatedSteps = [...localSteps]
        updatedSteps[index] = { ...updatedSteps[index], [field]: value } as WorkflowEditorStep
        setLocalSteps(updatedSteps)
    }

    const updateStepConfig = (index: number, updates: Partial<WorkflowStepConfig>) => {
        const updatedSteps = [...localSteps]
        const currentConfig = getStepConfig(updatedSteps[index] || {})
        updatedSteps[index] = {
            ...updatedSteps[index],
            config: { ...currentConfig, ...updates }
        }
        setLocalSteps(updatedSteps)
    }

    if (!hasMounted && isNewWorkflow) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    const handleSave = async () => {
        try {
            let workflowId = workflow.id
            let parsedTrigger = {}
            let parsedAction = {}

            try {
                parsedTrigger = triggerConfig ? JSON.parse(triggerConfig) : {}
            } catch (_err) {
                throw new Error('Trigger config JSON is invalid')
            }

            try {
                parsedAction = actionConfig ? JSON.parse(actionConfig) : {}
            } catch (_err) {
                throw new Error('Action config JSON is invalid')
            }

            if (workflow.id) {
                await updateWorkflowMutation.mutateAsync({
                    id: workflow.id,
                    name,
                    description,
                    type,
                    trigger_config: parsedTrigger,
                    action_config: parsedAction
                })
            } else {
                const created = await createWorkflowMutation.mutateAsync({
                    name,
                    description,
                    type,
                    trigger_config: parsedTrigger,
                    action_config: parsedAction,
                    is_active: true
                })
                workflowId = created.id
            }

            if (workflowId) {
                if (workflow.id) {
                    await updateStepsMutation.mutateAsync(localSteps.map((step, index) => ({
                        step_order: step.step_order ?? index + 1,
                        name: step.name || 'New Step',
                        action: step.action || 'send_notification',
                        config: step.config ?? {}
                    })))
                } else if (localSteps.length > 0) {
                    const stepsPayload = localSteps.map((s, i) => ({
                        ...s,
                        step_order: i + 1
                    }))
                    const { error } = await supabase.rpc('replace_workflow_steps', {
                        p_workflow_id: workflowId,
                        p_steps: stepsPayload
                    })
                    if (error) throw error
                }
            }

            toast({
                title: 'Success',
                description: 'Workflow and steps updated successfully',
            })
            onClose()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save workflow'
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    if (stepsLoading && workflow.id) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <div className="space-y-6">
            {/* Restore Draft Prompt */}
            {isNewWorkflow && showRestorePrompt && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">
                            Draft workflow restored from previous session
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowRestorePrompt(false)}>
                            Keep
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                clearDraft()
                                setName('')
                                setDescription('')
                                setLocalSteps([])
                                setShowRestorePrompt(false)
                                toast({ title: 'Draft cleared' })
                            }}
                        >
                            Clear Draft
                        </Button>
                    </div>
                </div>
            )}

            {isNewWorkflow && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div>
                        <h3 className="text-base font-semibold">Templates</h3>
                        <p className="text-xs text-muted-foreground">Start with a ready-made workflow and edit the details.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                className="rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary/50"
                                onClick={template.apply}
                            >
                                <div className="text-sm font-semibold">{template.title}</div>
                                <div className="text-xs text-muted-foreground">{template.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4 border-b pb-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t_ext('workflow_name', 'Workflow Name')}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">{t_ext('description_1', 'Description')}</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t_ext('what_does_this_workflow_do', 'What does this workflow do?')}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="type">{t_ext('workflow_type', 'Workflow Type')}</Label>
                    <Select value={type} onValueChange={(val) => setType(val as WorkflowDefinition['type'])}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="scheduled">{t_ext('scheduled', 'Scheduled')}</SelectItem>
                            <SelectItem value="event-based">{t_ext('event_based', 'Event Based')}</SelectItem>
                            <SelectItem value="manual">{t_ext('manual', 'Manual')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold">Trigger</h4>
                            <p className="text-xs text-muted-foreground">Decide when this workflow should run.</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdvancedMode(!advancedMode)}>
                            {advancedMode ? 'Simple Mode' : 'Advanced JSON'}
                        </Button>
                    </div>
                    {!advancedMode && (
                        <>
                            {type === 'scheduled' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="schedule_cron">Run Schedule (Cron)</Label>
                                    <Input
                                        id="schedule_cron"
                                        value={scheduleCron}
                                        onChange={(e) => setScheduleCron(e.target.value)}
                                        placeholder="0 9 * * *"
                                    />
                                    <p className="text-xs text-muted-foreground">Example: 0 9 * * * = every day at 9 AM.</p>
                                </div>
                            )}
                            {type === 'event-based' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="event_type">Event Type</Label>
                                        <Select value={eventType} onValueChange={setEventType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {eventOptions.map((evt) => (
                                                    <SelectItem key={evt.value} value={evt.value}>{evt.label}</SelectItem>
                                                ))}
                                                <SelectItem value="CUSTOM">Custom</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {eventType === 'CUSTOM' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="custom_event_type">Custom Event Type</Label>
                                            <Input
                                                id="custom_event_type"
                                                value={customEventType}
                                                onChange={(e) => setCustomEventType(e.target.value.toUpperCase())}
                                                placeholder="e.g., MAINTENANCE_TICKET_CREATED"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            {type === 'manual' && (
                                <p className="text-xs text-muted-foreground">Manual workflows run only when you click “Run”.</p>
                            )}
                        </>
                    )}
                    {advancedMode && (
                        <div className="grid gap-2">
                            <Label htmlFor="trigger_config">{t_ext('trigger_config_json', 'Trigger Config (JSON)')}</Label>
                            <Textarea
                                id="trigger_config"
                                value={triggerConfig}
                                onChange={(e) => setTriggerConfig(e.target.value)}
                                className="font-mono text-xs h-28"
                            />
                        </div>
                    )}
                </div>

                <div className="grid gap-3 rounded-lg border bg-muted/30 p-4">
                    <div>
                        <h4 className="text-sm font-semibold">Default Action (optional)</h4>
                        <p className="text-xs text-muted-foreground">Used when no steps are defined.</p>
                    </div>
                    {!advancedMode && (
                        <Select
                            value={simpleAction}
                            onValueChange={(val: 'none' | 'send_training_reminders' | 'custom') => {
                                setSimpleAction(val)
                                if (val === 'custom') {
                                    setAdvancedMode(true)
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a default action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No default action</SelectItem>
                                <SelectItem value="send_training_reminders">Send overdue training reminders</SelectItem>
                                <SelectItem value="custom">Custom (advanced)</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    {advancedMode && (
                        <div className="grid gap-2">
                            <Label htmlFor="action_config">{t_ext('workflow_action_config_json', 'Workflow Action Config (JSON)')}</Label>
                            <Textarea
                                id="action_config"
                                value={actionConfig}
                                onChange={(e) => setActionConfig(e.target.value)}
                                className="font-mono text-xs h-28"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{t_ext('workflow_steps', 'Workflow Steps')}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                        <Plus className="h-4 w-4 me-2" />
                        {t_ext('add_step', 'Add Step')}</Button>
                </div>
                <p className="text-xs text-muted-foreground">Steps are actions performed in order when the workflow runs.</p>

                <div className="space-y-3">
                    {localSteps.map((step, index) => {
                        const stepConfig = getStepConfig(step)
                        return (
                        <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                            <div className="mt-2 text-muted-foreground">
                                <GripVertical className="h-4 w-4 cursor-grab" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">{t_ext('step_name', 'Step Name')}</Label>
                                        <Input
                                            size={1}
                                            className="h-8"
                                            value={step.name}
                                            onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">{t_ext('action_type', 'Action Type')}</Label>
                                        <Select
                                            value={step.action}
                                            onValueChange={(val) => handleStepChange(index, 'action', val)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="send_notification">{t_ext('send_notification', 'Send Notification')}</SelectItem>
                                                <SelectItem value="create_task">{t_ext('create_task', 'Create Task')}</SelectItem>
                                                <SelectItem value="assign_training">{t_ext('assign_training', 'Assign Training')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">{advancedMode ? t_ext('config_json', 'Config (JSON)') : 'Step Details'}</Label>
                                    {!advancedMode && (
                                        <div className="space-y-2">
                                            {step.action === 'send_notification' && (
                                                <>
                                                    <Input
                                                        placeholder="Notification title"
                                                        value={stepConfig.title || ''}
                                                        onChange={(e) => updateStepConfig(index, { title: e.target.value })}
                                                    />
                                                    <Textarea
                                                        placeholder="Notification message"
                                                        value={stepConfig.message || ''}
                                                        onChange={(e) => updateStepConfig(index, { message: e.target.value })}
                                                    />
                                                </>
                                            )}
                                            {step.action === 'create_task' && (
                                                <>
                                                    <Input
                                                        placeholder="Task title"
                                                        value={stepConfig.title || ''}
                                                        onChange={(e) => updateStepConfig(index, { title: e.target.value })}
                                                    />
                                                    <Textarea
                                                        placeholder="Task description"
                                                        value={stepConfig.description || ''}
                                                        onChange={(e) => updateStepConfig(index, { description: e.target.value })}
                                                    />
                                                    <Select
                                                        value={stepConfig.priority || 'medium'}
                                                        onValueChange={(val) => updateStepConfig(index, { priority: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Priority" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="low">Low</SelectItem>
                                                            <SelectItem value="medium">Medium</SelectItem>
                                                            <SelectItem value="high">High</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </>
                                            )}
                                            {step.action === 'assign_training' && (
                                                <Select
                                                    value={stepConfig.module_id || stepConfig.content_id || ''}
                                                    onValueChange={(val) => updateStepConfig(index, { module_id: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select training module" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {modules?.map((module) => (
                                                            <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            {step.action !== 'send_notification' && step.action !== 'create_task' && step.action !== 'assign_training' && (
                                                <p className="text-xs text-muted-foreground">Use Advanced JSON for this step.</p>
                                            )}
                                        </div>
                                    )}
                                    {advancedMode && (
                                        <Textarea
                                            className="font-mono text-xs min-h-[60px]"
                                            value={JSON.stringify(step.config)}
                                            onChange={(e) => {
                                                try {
                                                    handleStepChange(index, 'config', JSON.parse(e.target.value))
                                                } catch (_err) {
                                                    // Keep raw text so user can see and correct invalid JSON
                                                    // The config will be validated again on save via handleSave
                                                    handleStepChange(index, 'config', e.target.value)
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive mt-6"
                                onClick={() => handleRemoveStep(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        )
                    })}
                    {localSteps.length === 0 && (
                        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
                            {t_ext('no_steps_defined_add_a_step_to_get_start', 'No steps defined. Add a step to get started.')}</div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={onClose}>{t_ext('cancel', 'Cancel')}</Button>
                <Button onClick={handleSave} disabled={updateWorkflowMutation.isPending || updateStepsMutation.isPending || createWorkflowMutation.isPending}>
                    {updateWorkflowMutation.isPending || updateStepsMutation.isPending || createWorkflowMutation.isPending ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="me-2 h-4 w-4" />
                    )}
                    {t_ext('save_workflow', 'Save Workflow')}</Button>
            </div>
        </div>
    )
}
