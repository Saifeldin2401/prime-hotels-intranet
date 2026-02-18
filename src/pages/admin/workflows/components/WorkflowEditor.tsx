import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical, Loader2, Save } from 'lucide-react'
import { useWorkflowSteps, useUpdateWorkflow, useUpdateWorkflowSteps, useCreateWorkflow } from '@/hooks/useWorkflows'
import { useToast } from '@/components/ui/use-toast'
import type { WorkflowDefinition, WorkflowStep } from '@/hooks/useWorkflows'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { supabase } from '@/lib/supabase'

interface WorkflowEditorProps {
    workflow: WorkflowDefinition
    onClose: () => void
}

export function WorkflowEditor({ workflow, onClose }: WorkflowEditorProps) {
    const { data: steps, isLoading: stepsLoading } = useWorkflowSteps(workflow.id)
    const updateWorkflowMutation = useUpdateWorkflow()
    const createWorkflowMutation = useCreateWorkflow()
    const updateStepsMutation = useUpdateWorkflowSteps(workflow.id)
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
    const [localSteps, setLocalSteps] = useState<Partial<WorkflowStep>[]>([])

    useEffect(() => {
        if (steps) {
            setLocalSteps(steps)
        }
    }, [steps])

    const handleAddStep = () => {
        setLocalSteps([...localSteps, {
            name: 'New Step',
            action: 'send_notification',
            config: {}
        }])
    }

    const handleRemoveStep = (index: number) => {
        setLocalSteps(localSteps.filter((_, i) => i !== index))
    }

    const handleStepChange = (index: number, field: keyof WorkflowStep, value: any) => {
        const updatedSteps = [...localSteps]
        updatedSteps[index] = { ...updatedSteps[index], [field]: value }
        setLocalSteps(updatedSteps)
    }

    const handleSave = async () => {
        try {
            let workflowId = workflow.id
            let parsedTrigger = {}
            let parsedAction = {}

            try {
                parsedTrigger = triggerConfig ? JSON.parse(triggerConfig) : {}
            } catch (err) {
                throw new Error('Trigger config JSON is invalid')
            }

            try {
                parsedAction = actionConfig ? JSON.parse(actionConfig) : {}
            } catch (err) {
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
                } as any)
                workflowId = created.id
            }

            if (workflowId) {
                if (workflow.id) {
                    await updateStepsMutation.mutateAsync(localSteps as any)
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
            <div className="space-y-4 border-b pb-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Workflow Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this workflow do?"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="type">Workflow Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as WorkflowDefinition['type'])}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="event-based">Event Based</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="trigger_config">Trigger Config (JSON)</Label>
                    <Textarea
                        id="trigger_config"
                        value={triggerConfig}
                        onChange={(e) => setTriggerConfig(e.target.value)}
                        className="font-mono text-xs h-28"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="action_config">Workflow Action Config (JSON)</Label>
                    <Textarea
                        id="action_config"
                        value={actionConfig}
                        onChange={(e) => setActionConfig(e.target.value)}
                        className="font-mono text-xs h-28"
                    />
                    <p className="text-xs text-muted-foreground">
                        Used when no steps are defined. Example: {"{\"action\":\"send_training_reminders\"}"}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Workflow Steps</h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                    </Button>
                </div>

                <div className="space-y-3">
                    {localSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                            <div className="mt-2 text-muted-foreground">
                                <GripVertical className="h-4 w-4 cursor-grab" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Step Name</Label>
                                        <Input
                                            size={1}
                                            className="h-8"
                                            value={step.name}
                                            onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Action Type</Label>
                                        <Select
                                            value={step.action}
                                            onValueChange={(val) => handleStepChange(index, 'action', val)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="send_notification">Send Notification</SelectItem>
                                                <SelectItem value="create_task">Create Task</SelectItem>
                                                <SelectItem value="assign_training">Assign Training</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Config (JSON)</Label>
                                    <Textarea
                                        className="font-mono text-xs min-h-[60px]"
                                        value={JSON.stringify(step.config)}
                                        onChange={(e) => {
                                            try {
                                                handleStepChange(index, 'config', JSON.parse(e.target.value))
                                            } catch (err) { }
                                        }}
                                    />
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
                    ))}
                    {localSteps.length === 0 && (
                        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
                            No steps defined. Add a step to get started.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={updateWorkflowMutation.isPending || updateStepsMutation.isPending || createWorkflowMutation.isPending}>
                    {updateWorkflowMutation.isPending || updateStepsMutation.isPending || createWorkflowMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Workflow
                </Button>
            </div>
        </div>
    )
}
