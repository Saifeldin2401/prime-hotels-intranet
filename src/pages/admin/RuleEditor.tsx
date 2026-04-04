/**
 * Rule Editor Component
 * 
 * Visual IF/THEN rule builder with condition editor and action sequencer
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Play, Save, ArrowRight, GripVertical, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface RuleEditorProps {
  rule: AutomationRule | null
  isOpen: boolean
  onClose: () => void
  onSave: (rule: Partial<AutomationRule>) => void
}

interface AutomationRule {
  id?: string
  name: string
  description: string
  trigger_event: string
  trigger_config: Record<string, unknown>
  conditions: RuleCondition[]
  condition_logic: 'and' | 'or'
  actions: RuleAction[]
  scope_type: string
  scope_id: string | null
  priority: number
  is_active: boolean
}

interface RuleCondition {
  field: string
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'contains' | 'in' | 'exists' | 'empty'
  value: unknown
}

interface RuleAction {
  action_type: string
  config: Record<string, unknown>
  delay_minutes?: number
}

const TRIGGER_EVENTS = [
  { value: 'review_submitted', label: 'Guest Review Submitted' },
  { value: 'approval_pending', label: 'Approval Request Created' },
  { value: 'training_overdue', label: 'Training Becomes Overdue' },
  { value: 'maintenance_created', label: 'Maintenance Ticket Created' },
  { value: 'time_based', label: 'Scheduled (Time-based)' },
  { value: 'user_login', label: 'User Login' },
  { value: 'document_uploaded', label: 'Document Uploaded' },
]

const OPERATORS = [
  { value: '==', label: 'Equals', types: ['string', 'number', 'boolean'] },
  { value: '!=', label: 'Not Equals', types: ['string', 'number', 'boolean'] },
  { value: '<', label: 'Less Than', types: ['number'] },
  { value: '<=', label: 'Less Than or Equal', types: ['number'] },
  { value: '>', label: 'Greater Than', types: ['number'] },
  { value: '>=', label: 'Greater Than or Equal', types: ['number'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'in', label: 'In List', types: ['string', 'number'] },
  { value: 'exists', label: 'Exists', types: ['any'] },
  { value: 'empty', label: 'Is Empty', types: ['string', 'array'] },
]

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: 'Mail' },
  { value: 'send_slack', label: 'Send Slack Message', icon: 'MessageSquare' },
  { value: 'send_in_app', label: 'Send In-App Notification', icon: 'Bell' },
  { value: 'create_task', label: 'Create Task', icon: 'CheckSquare' },
  { value: 'request_approval', label: 'Request Approval', icon: 'FileQuestion' },
  { value: 'escalate_approval', label: 'Escalate Approval', icon: 'TrendingUp' },
  { value: 'webhook', label: 'Call Webhook', icon: 'Webhook' },
]

const CONDITION_FIELDS = [
  { value: 'rating', label: 'Review Rating', type: 'number', context: 'review' },
  { value: 'severity', label: 'Severity', type: 'string', context: 'review' },
  { value: 'hours_pending', label: 'Hours Pending', type: 'number', context: 'approval' },
  { value: 'priority', label: 'Priority', type: 'string', context: 'all' },
  { value: 'status', label: 'Status', type: 'string', context: 'all' },
  { value: 'days_until_deadline', label: 'Days Until Deadline', type: 'number', context: 'training' },
  { value: 'user.role', label: 'User Role', type: 'string', context: 'all' },
  { value: 'user.department', label: 'User Department', type: 'string', context: 'all' },
  { value: 'property.name', label: 'Property Name', type: 'string', context: 'all' },
]

export function RuleEditor({ rule, isOpen, onClose, onSave }: RuleEditorProps) {
  const [activeTab, setActiveTab] = useState('trigger')
  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    trigger_event: '',
    trigger_config: {},
    conditions: [],
    condition_logic: 'and',
    actions: [],
    scope_type: 'property',
    scope_id: null,
    priority: 100,
    is_active: false,
  })

  // Load rule data when editing
  useEffect(() => {
    if (rule) {
      setFormData({
        ...rule,
        conditions: rule.conditions || [],
        actions: rule.actions || [],
      })
    } else {
      setFormData({
        name: '',
        description: '',
        trigger_event: '',
        trigger_config: {},
        conditions: [],
        condition_logic: 'and',
        actions: [],
        scope_type: 'property',
        scope_id: null,
        priority: 100,
        is_active: false,
      })
    }
  }, [rule, isOpen])

  // Test rule mutation
  const testRuleMutation = useMutation({
    mutationFn: async (testData: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('action-registry', {
        body: {
          action: 'test_rule',
          rule: formData,
          test_data: testData
        }
      })
      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      toast.success(`Rule test: ${result.conditions_matched ? 'Conditions MATCHED' : 'Conditions NOT matched'}`)
    },
    onError: (error) => {
      toast.error('Rule test failed: ' + error.message)
    }
  })

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), { field: '', operator: '==', value: '' }]
    }))
  }

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.map((c, i) => i === index ? { ...c, ...updates } : c) || []
    }))
  }

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions?.filter((_, i) => i !== index) || []
    }))
  }

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...(prev.actions || []), { action_type: '', config: {}, delay_minutes: 0 }]
    }))
  }

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.map((a, i) => i === index ? { ...a, ...updates } : a) || []
    }))
  }

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index) || []
    }))
  }

  const duplicateAction = (index: number) => {
    const action = formData.actions?.[index]
    if (action) {
      setFormData(prev => ({
        ...prev,
        actions: [...(prev.actions || []).slice(0, index + 1), { ...action }, ...(prev.actions || []).slice(index + 1)]
      }))
    }
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rule ? 'Edit Rule' : 'Create New Rule'}
          </DialogTitle>
          <DialogDescription>
            Build an IF/THEN automation rule with conditions and actions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trigger">1. Trigger</TabsTrigger>
            <TabsTrigger value="conditions">2. Conditions (IF)</TabsTrigger>
            <TabsTrigger value="actions">3. Actions (THEN)</TabsTrigger>
            <TabsTrigger value="settings">4. Settings</TabsTrigger>
          </TabsList>

          {/* Trigger Tab */}
          <TabsContent value="trigger" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Negative Review Alert"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this rule do?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select
                  value={formData.trigger_event}
                  onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map(event => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.trigger_event === 'time_based' && (
                <Card className="bg-muted">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Schedule</Label>
                      <Select
                        value={formData.trigger_config?.schedule as string}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          trigger_config: { ...formData.trigger_config, schedule: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">Conditions</h4>
                <p className="text-sm text-muted-foreground">
                  All conditions must be true for the rule to fire
                </p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={formData.condition_logic}
                  onValueChange={(value: 'and' | 'or') => setFormData({ ...formData, condition_logic: value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND (all)</SelectItem>
                    <SelectItem value="or">OR (any)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {formData.conditions?.map((condition, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Select
                          value={condition.field}
                          onValueChange={(value) => updateCondition(index, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(index, { operator: value as RuleCondition['operator'] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!['exists', 'empty'].includes(condition.operator) && (
                          <Input
                            value={condition.value as string}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Value"
                            type={condition.operator === '<' || condition.operator === '>' || condition.operator === '<=' || condition.operator === '>=' ? 'number' : 'text'}
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={addCondition}
              >
                <Plus className="w-4 h-4" />
                Add Condition
              </Button>
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-medium">Actions</h4>
              <p className="text-sm text-muted-foreground">
                These actions will execute when conditions are met
              </p>
            </div>

            <div className="space-y-3">
              {formData.actions?.map((action, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <Select
                          value={action.action_type}
                          onValueChange={(value) => updateAction(index, { action_type: value })}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => duplicateAction(index)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeAction(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Action-specific config */}
                    {action.action_type === 'send_email' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">To</Label>
                            <Input
                              placeholder="user@example.com or {{user.email}}"
                              value={action.config.to as string || ''}
                              onChange={(e) => updateAction(index, { config: { ...action.config, to: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Template</Label>
                            <Input
                              placeholder="template_key"
                              value={action.config.template as string || ''}
                              onChange={(e) => updateAction(index, { config: { ...action.config, template: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {action.action_type === 'send_slack' && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Channel</Label>
                          <Input
                            placeholder="#channel or @user"
                            value={action.config.channel as string || ''}
                            onChange={(e) => updateAction(index, { config: { ...action.config, channel: e.target.value } })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Message</Label>
                          <Textarea
                            placeholder="Message text with {{variables}}"
                            value={action.config.message as string || ''}
                            onChange={(e) => updateAction(index, { config: { ...action.config, message: e.target.value } })}
                            rows={2}
                          />
                        </div>
                      </div>
                    )}

                    {action.action_type === 'create_task' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input
                              placeholder="Task title"
                              value={action.config.title as string || ''}
                              onChange={(e) => updateAction(index, { config: { ...action.config, title: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Assignee</Label>
                            <Input
                              placeholder="user_id or {{user.id}}"
                              value={action.config.assignee_id as string || ''}
                              onChange={(e) => updateAction(index, { config: { ...action.config, assignee_id: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delay option for all actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Label className="text-xs">Delay (minutes):</Label>
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={action.delay_minutes || 0}
                        onChange={(e) => updateAction(index, { delay_minutes: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                      {action.delay_minutes > 0 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={addAction}
              >
                <Plus className="w-4 h-4" />
                Add Action
              </Button>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scope Type</Label>
                <Select
                  value={formData.scope_type}
                  onValueChange={(value) => setFormData({ ...formData, scope_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (All Properties)</SelectItem>
                    <SelectItem value="property">Specific Property</SelectItem>
                    <SelectItem value="department">Specific Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">Lower numbers = higher priority</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Activate rule immediately
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => testRuleMutation.mutate({ rating: 2, severity: 'critical' })}
            disabled={testRuleMutation.isPending}
          >
            <Play className="w-4 h-4" />
            Test Rule
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="w-4 h-4" />
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
