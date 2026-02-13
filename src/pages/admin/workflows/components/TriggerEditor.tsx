import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { useCreateTrigger, useUpdateTrigger } from '@/hooks/useTriggers'
import { useToast } from '@/components/ui/use-toast'
import type { TriggerRule } from '@/hooks/useTriggers'
import { useWorkflows } from '@/hooks/useWorkflows'
import { useTrainingModulesList } from '@/hooks/useTrainingRules'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TriggerEditorProps {
    trigger?: Partial<TriggerRule>
    onClose: () => void
}

export function TriggerEditor({ trigger, onClose }: TriggerEditorProps) {
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
    const [actionConfig, setActionConfig] = useState(JSON.stringify(trigger?.action_config || {}, null, 2))
    const [conditions, setConditions] = useState(JSON.stringify(trigger?.conditions || [], null, 2))

    const eventOptions = [
        'NEW_HIRE',
        'ROLE_CHANGE',
        'SOP_PUBLISHED',
        'SOP_UPDATED',
        'INCIDENT_REPORTED',
        'AUDIT_FINDING',
        'CERTIFICATION_EXPIRED',
        'DOCUMENT_EXPIRING',
        'LEAVE_REQUESTED'
    ]

    const actionOptions = [
        { value: 'send_notification', label: 'Send Notification' },
        { value: 'start_workflow', label: 'Start Workflow' },
        { value: 'assign_training', label: 'Assign Training' },
        { value: 'assign_quiz', label: 'Assign Quiz' },
        { value: 'assign_required_reading', label: 'Assign Required Reading' }
    ]

    useEffect(() => {
        if (trigger?.event_type && !eventOptions.includes(trigger.event_type)) {
            setEventType('CUSTOM')
            setCustomEventType(trigger.event_type)
        }
    }, [trigger?.event_type])

    const updateActionConfig = (updates: Record<string, any>) => {
        let current: Record<string, any> = {}
        try {
            current = actionConfig ? JSON.parse(actionConfig) : {}
        } catch {
            current = {}
        }
        const next = { ...current, ...updates }
        setActionConfig(JSON.stringify(next, null, 2))
    }

    const getActionConfigValue = (key: string, fallback: any = '') => {
        try {
            const parsed = actionConfig ? JSON.parse(actionConfig) : {}
            return parsed?.[key] ?? fallback
        } catch {
            return fallback
        }
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
                conditions: JSON.parse(conditions),
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
                                <SelectItem key={evt} value={evt}>{evt.replace('_', ' ')}</SelectItem>
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
                                {quizzes?.map((quiz: any) => (
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
                                {documents?.map((doc: any) => (
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
                            <Label htmlFor="notif_title">Notification Title</Label>
                            <Input
                                id="notif_title"
                                value={getActionConfigValue('title', '')}
                                onChange={(e) => updateActionConfig({ title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notif_message">Notification Message</Label>
                            <Input
                                id="notif_message"
                                value={getActionConfigValue('message', '')}
                                onChange={(e) => updateActionConfig({ message: e.target.value })}
                            />
                        </div>
                    </>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="conditions">Conditions (JSON Array)</Label>
                    <Textarea
                        id="conditions"
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        className="font-mono text-xs h-24"
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="config">Action Config (JSON Object)</Label>
                    <Textarea
                        id="config"
                        value={actionConfig}
                        onChange={(e) => setActionConfig(e.target.value)}
                        className="font-mono text-xs h-32"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Rule
                </Button>
            </div>
        </div>
    )
}
