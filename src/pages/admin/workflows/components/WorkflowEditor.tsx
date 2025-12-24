import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical, Loader2, Save } from 'lucide-react'
import { useWorkflowSteps, useUpdateWorkflow, useUpdateWorkflowSteps } from '@/hooks/useWorkflows'
import { useToast } from '@/components/ui/use-toast'
import type { WorkflowDefinition, WorkflowStep } from '@/hooks/useWorkflows'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface WorkflowEditorProps {
    workflow: WorkflowDefinition
    onClose: () => void
}

export function WorkflowEditor({ workflow, onClose }: WorkflowEditorProps) {
    const { data: steps, isLoading: stepsLoading } = useWorkflowSteps(workflow.id)
    const updateWorkflowMutation = useUpdateWorkflow()
    const updateStepsMutation = useUpdateWorkflowSteps(workflow.id)
    const { toast } = useToast()

    const [name, setName] = useState(workflow.name)
    const [description, setDescription] = useState(workflow.description || '')
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
            await updateWorkflowMutation.mutateAsync({
                id: workflow.id,
                name,
                description
            })

            await updateStepsMutation.mutateAsync(localSteps as any)

            toast({
                title: 'Success',
                description: 'Workflow and steps updated successfully',
            })
            onClose()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save workflow',
                variant: 'destructive'
            })
        }
    }

    if (stepsLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

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
                                                <SelectItem value="wait_for_approval">Wait for Approval</SelectItem>
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
                <Button onClick={handleSave} disabled={updateWorkflowMutation.isPending || updateStepsMutation.isPending}>
                    {updateWorkflowMutation.isPending || updateStepsMutation.isPending ? (
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
