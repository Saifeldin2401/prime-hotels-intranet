/**
 * Fully Wired Rules Engine Panel
 * 
 * REAL database integration for automation rules CRUD
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Settings, Play, Pause, Copy, Trash2, Clock, AlertTriangle, Zap, RefreshCw, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { RuleEditor } from './RuleEditor'

interface AutomationRule {
  id?: string
  name: string
  description: string
  is_active: boolean
  is_deleted?: boolean
  trigger_event: string
  trigger_config: Record<string, unknown>
  condition_logic: string
  conditions: Array<{
    field: string
    operator: string
    value: unknown
  }>
  actions: Array<{
    action_type: string
    config: Record<string, unknown>
  }>
  scope_type: string
  scope_id: string | null
  priority: number
  execution_count?: number
  success_count?: number
  failure_count?: number
  last_executed_at?: string
  created_by?: string
  created_at?: string
}

interface RuleTemplate {
  id: string
  name: string
  description: string
  category: string
  trigger_event: string
  conditions: Array<{
    field: string
    operator: string
    value: unknown
  }>
  actions: Array<{
    action_type: string
    config: Record<string, unknown>
  }>
  icon: string
  color: string
  popular: boolean
}

export function RulesEnginePanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null)

  const queryClient = useQueryClient()

  // REAL database query - fetch automation rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('is_deleted', false)
        .order('priority', { ascending: true })
      
      if (error) {
        toast.error('Failed to load rules: ' + error.message)
        throw error
      }
      return data as AutomationRule[]
    }
  })

  // REAL database query - fetch rule templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['rule-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_templates')
        .select('*')
        .order('popular', { ascending: false })
      
      if (error) {
        toast.error('Failed to load templates: ' + error.message)
        throw error
      }
      return data as RuleTemplate[]
    }
  })

  // REAL mutation - toggle rule active status
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success(`Rule ${vars.isActive ? 'activated' : 'deactivated'}`)
    },
    onError: (error) => {
      toast.error('Failed to toggle rule: ' + error.message)
    }
  })

  // REAL mutation - delete rule (soft delete)
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Rule deleted successfully')
    },
    onError: (error) => {
      toast.error('Failed to delete rule: ' + error.message)
    }
  })

  // REAL mutation - duplicate rule
  const duplicateRuleMutation = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          name: `${rule.name} (Copy)`,
          description: rule.description,
          trigger_event: rule.trigger_event,
          trigger_config: {},
          conditions: rule.conditions,
          condition_logic: rule.condition_logic,
          actions: rule.actions,
          scope_type: rule.scope_type,
          scope_id: rule.scope_id,
          priority: rule.priority + 1,
          is_active: false,
          created_by: user.id,
          version: 1
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Rule duplicated successfully')
    },
    onError: (error) => {
      toast.error('Failed to duplicate rule: ' + error.message)
    }
  })

  // REAL mutation - create rule from template
  const createFromTemplateMutation = useMutation({
    mutationFn: async (template: RuleTemplate) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          name: template.name,
          description: template.description,
          trigger_event: template.trigger_event,
          trigger_config: {},
          conditions: template.conditions,
          condition_logic: 'and',
          actions: template.actions,
          scope_type: 'property',
          is_active: false,
          created_by: user.id,
          version: 1
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Rule created from template')
      setIsCreateDialogOpen(false)
    },
    onError: (error) => {
      toast.error('Failed to create rule: ' + error.message)
    }
  })

  // REAL mutation - save rule (create or update) with RuleEditor
  const saveRuleMutation = useMutation({
    mutationFn: async (ruleData: Partial<AutomationRule>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (ruleData.id) {
        // Update existing
        const { data, error } = await supabase
          .from('automation_rules')
          .update({
            ...ruleData,
            updated_at: new Date().toISOString()
          })
          .eq('id', ruleData.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        // Create new
        const { data, error } = await supabase
          .from('automation_rules')
          .insert({
            ...ruleData,
            created_by: user.id,
            version: 1
          })
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Rule saved successfully')
      setIsEditDialogOpen(false)
      setSelectedRule(null)
    },
    onError: (error) => {
      toast.error('Failed to save rule: ' + error.message)
    }
  })

  const filteredRules = rules?.filter(rule => 
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: rules?.length || 0,
    active: rules?.filter(r => r.is_active).length || 0,
    inactive: rules?.filter(r => !r.is_active).length || 0,
    executions: rules?.reduce((sum, r) => sum + (r.execution_count || 0), 0) || 0
  }

  if (rulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Paused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Rule
        </Button>
      </div>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Rule Templates
          </CardTitle>
          <CardDescription>
            Start with a pre-built template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates?.slice(0, 6).map(template => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => createFromTemplateMutation.mutate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: template.color + '20', color: template.color }}
                    >
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                        {template.popular && (
                          <Badge className="text-xs">Popular</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRules?.map(rule => (
              <RuleRow 
                key={rule.id} 
                rule={rule}
                onToggle={(isActive) => toggleRuleMutation.mutate({ ruleId: rule.id, isActive })}
                onDelete={() => deleteRuleMutation.mutate(rule.id)}
                onDuplicate={() => duplicateRuleMutation.mutate(rule)}
                onEdit={() => {
                  setSelectedRule(rule)
                  setIsEditDialogOpen(true)
                }}
              />
            ))}
            
            {filteredRules?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No rules found. Create your first automation rule!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Rule - Use RuleEditor */}
      <RuleEditor
        rule={null}
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={(ruleData) => saveRuleMutation.mutate(ruleData)}
      />

      {/* Edit Rule - Use RuleEditor */}
      <RuleEditor
        rule={selectedRule as unknown as Parameters<typeof RuleEditor>[0]['rule']}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedRule(null)
        }}
        onSave={(ruleData) => saveRuleMutation.mutate(ruleData)}
      />
    </div>
  )
}

function RuleRow({ 
  rule, 
  onToggle, 
  onDelete, 
  onDuplicate,
  onEdit
}: { 
  rule: AutomationRule
  onToggle: (isActive: boolean) => void
  onDelete: () => void
  onDuplicate: () => void
  onEdit: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
          {rule.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </div>
        <div>
          <h4 className="font-medium">{rule.name}</h4>
          <p className="text-sm text-muted-foreground">{rule.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {rule.trigger_event}
            </span>
            <span>•</span>
            <span>{rule.condition_logic} logic</span>
            <span>•</span>
            <span>{rule.scope_type} scope</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium">{rule.execution_count} runs</div>
          {rule.last_executed_at && (
            <div className="text-xs text-muted-foreground">
              Last: {new Date(rule.last_executed_at).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <Switch checked={rule.is_active} onCheckedChange={onToggle} />
        
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
