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
import type { TriggerRule } from '@/hooks/useTriggers'
import { useCreateTrigger, useUpdateTrigger } from '@/hooks/useTriggers'
import { useWorkflows } from '@/hooks/useWorkflows'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from "react-i18next"

interface TriggerEditorProps {
    trigger?: Partial<TriggerRule>
    onClose: () => void
}

type ConditionRow = {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'in'
    value: string
}

export function TriggerEditor({ trigger, onClose }: TriggerEditorProps) {
    const { t } = useTranslation()
    const createMutation = useCreateTrigger()
    const updateMutation = useUpdateTrigger()
    const { toast } = useToast()
    const { data: workflows } = useWorkflows()
    const { data: modules } = useTrainingModulesList()
    const { data: quizzes } = useQuery({
        queryKey: ['quizzes-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('quizzes')
                .select('id, title, status')
                .order('title')
            if (error) throw error
            return data?.filter(q => q.status === 'published') || []
        }
    })
    const { data: documents } = useQuery({
        queryKey: ['documents-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select('id, title')
                .eq('is_deleted', false)
                .order('title')
            if (error) throw error
            return data || []
        }
    })

    const [name, setName] = useState(trigger?.name || '')
    const [description, setDescription] = useState(trigger?.description || '')
    const [eventType, setEventType] = useState(trigger?.event_type || 'NEW_HIRE')
    const [customEventType, setCustomEventType] = useState('')
    const [actionType, setActionType] = useState(trigger?.action_type || 'send_notification')
    const [actionConfig, setActionConfig] = useState(() => JSON.stringify(trigger?.action_config || {}, null, 2))
    const [conditions, setConditions] = useState(() => JSON.stringify(trigger?.conditions || [], null, 2))
    const [advancedMode, setAdvancedMode] = useState(false)
    const [conditionRows, setConditionRows] = useState<ConditionRow[]>(() => {
        if (!Array.isArray(trigger?.conditions)) return []
        return trigger?.conditions.map((condition) => ({
            field: String(condition?.field ?? ''),
            operator: (condition?.operator ?? 'equals') as ConditionRow['operator'],
            value: Array.isArray(condition?.value) ? condition.value.join(', ') : String(condition?.value ?? '')
        }))
    })

    const eventOptions = [
        { value: 'NEW_HIRE', label: 'New Hire' },
        { value: 'ROLE_CHANGE', label: 'Role Change' },
        { value: 'SOP_PUBLISHED', label: 'SOP Published' },
        { value: 'SOP_UPDATED', label: 'SOP Updated' },
        { value: 'INCIDENT_REPORTED', label: 'Incident Reported' },
        { value: 'AUDIT_FINDING', label: 'Audit Finding' },
        { value: 'CERTIFICATION_EXPIRED', label: 'Certification Expired' },
        { value: 'DOCUMENT_EXPIRING', label: 'Document Expiring' },
        { value: 'LEAVE_REQUESTED', label: 'Leave Requested' }
    ]

    const actionOptions = [
        { value: 'send_notification', label: 'Send Notification' },
        { value: 'start_workflow', label: 'Start Workflow' },
        { value: 'assign_training', label: 'Assign Training' },
        { value: 'assign_quiz', label: 'Assign Quiz' },
        { value: 'assign_required_reading', label: 'Assign Required Reading' }
    ]

    const activeWorkflows = (workflows || []).filter(wf => wf.is_active)
    const recommendedWelcomeWorkflow = activeWorkflows.find(wf =>
        wf.name?.toLowerCase().includes('welcome') || wf.name?.toLowerCase().includes('onboarding')
    )
    const recommendedModule = (modules || [])[0]

    const applyTemplate = (template: {
        name: string
        description: string
        event_type: string
        action_type: string
        action_config
        conditions?
    }) => {
        setName(template.name)
        setDescription(template.description)
        if (eventOptions.some((evt) => evt.value === template.event_type)) {
            setEventType(template.event_type)
            setCustomEventType('')
        } else {
            setEventType('CUSTOM')
            setCustomEventType(template.event_type)
        }
        setActionType(template.action_type)
        setActionConfig(JSON.stringify(template.action_config || {}, null, 2))
        const nextConditions = template.conditions || []
        setConditions(JSON.stringify(nextConditions, null, 2))
        setConditionRows(nextConditions.map((condition) => ({
            field: String(condition?.field ?? 'department_id'),
            operator: (condition?.operator ?? 'equals') as ConditionRow['operator'],
            value: Array.isArray(condition?.value) ? condition.value.join(', ') : String(condition?.value ?? '')
        })))
        setAdvancedMode(false)
    }

    const templates = [
        {
            id: 'new_hire_welcome',
            title: 'New Hire: Start Welcome Workflow',
            description: 'Automatically start the welcome workflow for new hires.',
            action: () => {
                applyTemplate({
                    name: 'New Hire Welcome',
                    description: 'Start the welcome workflow for new hires.',
                    event_type: 'NEW_HIRE',
                    action_type: 'start_workflow',
                    action_config: { workflow_id: recommendedWelcomeWorkflow?.id }
                })
            },
            disabled: !recommendedWelcomeWorkflow
        },
        {
            id: 'sop_published_notify',
            title: 'SOP Published: Notify Staff',
            description: 'Send a notification when a new SOP is published.',
            action: () => {
                applyTemplate({
                    name: 'Notify Staff of New SOP',
                    description: 'Notify staff when a new SOP is published.',
                    event_type: 'SOP_PUBLISHED',
                    action_type: 'send_notification',
                    action_config: {
                        type: 'info',
                        title: 'New SOP Published',
                        message: 'A new Standard Operating Procedure has been published for your department.'
                    }
                })
            }
        },
        {
            id: 'document_expiring',
            title: 'Document Expiring: Notify User',
            description: 'Notify users when a required document is nearing expiry.',
            action: () => {
                applyTemplate({
                    name: 'Document Expiring: Notify User',
                    description: 'Notify users when a required document is nearing expiry.',
                    event_type: 'DOCUMENT_EXPIRING',
                    action_type: 'send_notification',
                    action_config: {
                        type: 'warning',
                        title: 'Document Expiring Soon',
                        message: 'A required document is nearing expiry. Please review and update it.'
                    }
                })
            }
        },
        {
            id: 'role_change_training',
            title: 'Role Change: Assign Training',
            description: 'Assign a training module when a role changes.',
            action: () => {
                applyTemplate({
                    name: 'Role Change: Assign Training',
                    description: 'Assign a training module when a role changes.',
                    event_type: 'ROLE_CHANGE',
                    action_type: 'assign_training',
                    action_config: {
                        due_days: 14,
                        target_id: recommendedModule?.id
                    }
                })
            },
            disabled: !recommendedModule
        }
    ]

    useEffect(() => {
        if (trigger?.event_type && !eventOptions.some((evt) => evt.value === trigger.event_type)) {
            setEventType('CUSTOM')
            setCustomEventType(trigger.event_type)
        }
    }, [trigger?.event_type])

    const conditionFieldOptions = useMemo(() => ([
        { value: 'department_id', label: 'Department' },
        { value: 'property_id', label: 'Property' },
        { value: 'role', label: 'Role' },
        { value: 'event_type', label: 'Event Type' },
        { value: 'source_type', label: 'Source Type' },
        { value: 'user_id', label: 'User ID' },
    ]), [])

    const operatorOptions: Array<{ value: ConditionRow['operator']; label: string }> = [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'in', label: 'In (comma separated)' }
    ]

    const updateActionConfig = (updates) => {
        let current = {}
        try {
            current = actionConfig ? JSON.parse(actionConfig) : {}
        } catch {
            current = {}
        }
        const next = { ...current, ...updates }
        setActionConfig(JSON.stringify(next, null, 2))
    }

    const getActionConfigValue = (key: string, fallback = '') => {
        try {
            const parsed = actionConfig ? JSON.parse(actionConfig) : {}
            return parsed?.[key] ?? fallback
        } catch {
            return fallback
        }
    }

    const addConditionRow = () => {
        setConditionRows((prev) => [...prev, { field: 'department_id', operator: 'equals', value: '' }])
    }

    const updateConditionRow = (index: number, updates: Partial<ConditionRow>) => {
        setConditionRows((prev) => prev.map((row, i) => i === index ? { ...row, ...updates } : row))
    }

    const removeConditionRow = (index: number) => {
        setConditionRows((prev) => prev.filter((_, i) => i !== index))
    }

    const buildConditionsPayload = () => {
        if (advancedMode) {
            return JSON.parse(conditions)
        }
        return conditionRows
            .filter((row) => row.field && row.operator && row.value.trim() !== '')
            .map((row) => {
                if (row.operator === 'in') {
                    const list = row.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                    return { ...row, value: list }
                }
                return { ...row, value: row.value.trim() }
            })
    }

    const handleSave = async () => {
        try {
            if (eventType === 'CUSTOM' && !customEventType.trim()) {
                throw new Error('Custom event type is required')
            }

            const payload = {
                name,
                description,
                event_type: eventType === 'CUSTOM' ? customEventType : eventType,
                action_type: actionType,
                action_config: JSON.parse(actionConfig),
                conditions: buildConditionsPayload(),
                is_active: trigger?.is_active ?? true
            }

            if (trigger?.id) {
                await updateMutation.mutateAsync({ id: trigger.id, ...payload })
            } else {
                await createMutation.mutateAsync(payload)
            }

            toast({
                title: 'Success',
                description: 'Trigger rule saved successfully',
            })
            onClose()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save trigger'
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            })
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <div className="space-y-6">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div>
                    <h3 className="text-base font-semibold">Quick Templates</h3>
                    <p className="text-xs text-muted-foreground">Pick a ready-made trigger and customize it in seconds.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            className="rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={template.action}
                            disabled={template.disabled}
                        >
                            <div className="text-sm font-semibold">{template.title}</div>
                            <div className="text-xs text-muted-foreground">{template.description}</div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Rule Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., New Hire Onboarding" />
                </div>

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

                <div className="grid gap-2">
                    <Label htmlFor="action_type">Action Type</Label>
                    <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {actionOptions.map((action) => (
                                <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {actionType === 'start_workflow' && (
                    <div className="grid gap-2">
                        <Label>Workflow</Label>
                        <Select
                            value={getActionConfigValue('workflow_id', '')}
                            onValueChange={(val) => updateActionConfig({ workflow_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select workflow" />
                            </SelectTrigger>
                            <SelectContent>
                                {workflows?.filter(wf => wf.is_active)?.map(wf => (
                                    <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {actionType === 'assign_training' && (
                    <div className="grid gap-2">
                        <Label>Training Module</Label>
                        <Select
                            value={getActionConfigValue('target_id', '')}
                            onValueChange={(val) => updateActionConfig({ target_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                            <SelectContent>
                                {modules?.map(module => (
                                    <SelectItem key={module.id} value={module.id}>{module.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {actionType === 'assign_quiz' && (
                    <div className="grid gap-2">
                        <Label>Quiz</Label>
                        <Select
                            value={getActionConfigValue('target_id', '')}
                            onValueChange={(val) => updateActionConfig({ target_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select quiz" />
                            </SelectTrigger>
                            <SelectContent>
                                {quizzes?.map((quiz) => (
                                    <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {actionType === 'assign_required_reading' && (
                    <div className="grid gap-2">
                        <Label>Document</Label>
                        <Select
                            value={getActionConfigValue('target_id', '')}
                            onValueChange={(val) => updateActionConfig({ target_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select document" />
                            </SelectTrigger>
                            <SelectContent>
                                {documents?.map((doc) => (
                                    <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(actionType === 'assign_training' || actionType === 'assign_quiz' || actionType === 'assign_required_reading') && (
                    <div className="grid gap-2">
                        <Label htmlFor="due_days">Due Days (optional)</Label>
                        <Input
                            id="due_days"
                            type="number"
                            min={1}
                            value={getActionConfigValue('due_days', '')}
                            onChange={(e) => {
                                if (!e.target.value) {
                                    updateActionConfig({ due_days: null })
                                    return
                                }
                                const days = Number(e.target.value)
                                updateActionConfig({ due_days: Number.isNaN(days) ? null : days })
                            }}
                        />
                    </div>
                )}

                {actionType === 'send_notification' && (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="notif_type">Notification Type</Label>
                            <Select
                                value={getActionConfigValue('type', 'info')}
                                onValueChange={(val) => updateActionConfig({ type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notif_title">Notification Title</Label>
                            <Input
                                id="notif_title"
                                value={getActionConfigValue('title', '')}
                                onChange={(e) => updateActionConfig({ title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notif_message">Notification Message</Label>
                            <Textarea
                                id="notif_message"
                                value={getActionConfigValue('message', '')}
                                onChange={(e) => updateActionConfig({ message: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </>
                )}

                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label>Conditions</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAdvancedMode(!advancedMode)}>
                            {advancedMode ? 'Simple Mode' : 'Advanced JSON'}
                        </Button>
                    </div>
                    {!advancedMode && (
                        <div className="space-y-3">
                            {conditionRows.length === 0 && (
                                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                    No conditions. This rule will run for every matching event.
                                </div>
                            )}
                            {conditionRows.map((row, index) => (
                                <div key={`${row.field}-${index}`} className="grid gap-2 md:grid-cols-[1.3fr_1fr_1.5fr_auto] items-end">
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Field</Label>
                                        <Select value={row.field} onValueChange={(val) => updateConditionRow(index, { field: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {conditionFieldOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Operator</Label>
                                        <Select value={row.operator} onValueChange={(val: ConditionRow['operator']) => updateConditionRow(index, { operator: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {operatorOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs text-muted-foreground">Value</Label>
                                        <Input
                                            value={row.value}
                                            onChange={(e) => updateConditionRow(index, { value: e.target.value })}
                                            placeholder={row.operator === 'in' ? 'value1, value2' : 'value'}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => removeConditionRow(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addConditionRow}>
                                Add Condition
                            </Button>
                        </div>
                    )}
                    {advancedMode && (
                        <Textarea
                            id="conditions"
                            value={conditions}
                            onChange={(e) => setConditions(e.target.value)}
                            className="font-mono text-xs h-24"
                        />
                    )}
                </div>

                {advancedMode && (
                    <div className="grid gap-2">
                        <Label htmlFor="config">Action Config (JSON Object)</Label>
                        <Textarea
                            id="config"
                            value={actionConfig}
                            onChange={(e) => setActionConfig(e.target.value)}
                            className="font-mono text-xs h-32"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={onClose} disabled={isPending}>{t('common:cancel')}</Button>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Rule
                </Button>
            </div>
        </div>
    )
}
