import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { useCreateTrigger, useUpdateTrigger } from '@/hooks/useTriggers'
import { useToast } from '@/components/ui/use-toast'
import type { TriggerRule } from '@/hooks/useTriggers'
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

    const [name, setName] = useState(trigger?.name || '')
    const [description, setDescription] = useState(trigger?.description || '')
    const [eventType, setEventType] = useState(trigger?.event_type || 'NEW_HIRE')
    const [actionType, setActionType] = useState(trigger?.action_type || 'send_notification')
    const [actionConfig, setActionConfig] = useState(JSON.stringify(trigger?.action_config || {}, null, 2))
    const [conditions, setConditions] = useState(JSON.stringify(trigger?.conditions || [], null, 2))

    const handleSave = async () => {
        try {
            const payload = {
                name,
                description,
                event_type: eventType,
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
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save trigger',
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
                            <SelectItem value="NEW_HIRE">New Hire Created</SelectItem>
                            <SelectItem value="SOP_PUBLISHED">SOP Published</SelectItem>
                            <SelectItem value="DOCUMENT_EXPIRING">Document Expiring</SelectItem>
                            <SelectItem value="LEAVE_REQUESTED">Leave Requested</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="action_type">Action Type</Label>
                    <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="send_notification">Send Notification</SelectItem>
                            <SelectItem value="start_workflow">Start Workflow</SelectItem>
                            <SelectItem value="assign_training">Assign Training</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

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
