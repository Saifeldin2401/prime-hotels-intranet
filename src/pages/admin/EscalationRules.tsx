import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Clock,
  Settings,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import type { EscalationRule } from '@/lib/types'
import type { AppRole } from '@/lib/constants'
import { useTranslation } from 'react-i18next'

const entityTypes = [
  'leave_request',
  'document_approval',
  'training_assignment',
  'maintenance_ticket',
  'sop_approval',
  'referral_approval'
]

const roleLabels: Record<AppRole, string> = {
  regional_admin: 'Regional Admin',
  regional_hr: 'Regional HR',
  property_manager: 'Property Manager',
  property_hr: 'Property HR',
  department_head: 'Department Head',
  staff: 'Staff'
}

export default function EscalationRules() {
  const { t } = useTranslation(['admin', 'common'])
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('action_type', { ascending: true })

      if (error) throw error
      return data as EscalationRule[]
    }
  })

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: Partial<EscalationRule>) => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .insert({
          action_type: ruleData.action_type!,
          threshold_hours: ruleData.threshold_hours!,
          next_role: ruleData.next_role!,
          is_active: ruleData.is_active ?? true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })
      setShowForm(false)
      setEditingRule(null)
    }
  })

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...ruleData }: Partial<EscalationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .update({
          ...ruleData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })
      setShowForm(false)
      setEditingRule(null)
    }
  })

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('escalation_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })
    }
  })

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('escalation_rules')
        .update({
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })
    }
  })

  const handleEdit = (rule: EscalationRule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('escalation_rules.delete_confirm'))) {
      deleteRuleMutation.mutate(id)
    }
  }

  const handleToggle = (id: string, isActive: boolean) => {
    toggleRuleMutation.mutate({ id, is_active: isActive })
  }

  if (showForm) {
    return <EscalationRuleForm
      rule={editingRule}
      onClose={() => {
        setShowForm(false)
        setEditingRule(null)
      }}
      onSubmit={(data) => {
        if (editingRule) {
          updateRuleMutation.mutate({ id: editingRule.id, ...data })
        } else {
          createRuleMutation.mutate(data)
        }
      }}
    />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('escalation_rules.title')}
        description={t('escalation_rules.description')}
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('escalation_rules.add_rule')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('escalation_rules.total_rules')}</CardTitle>
            <Settings className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('escalation_rules.active_rules')}</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rules?.filter(r => r.is_active).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('escalation_rules.avg_threshold')}</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rules?.length ?
                Math.round(rules.reduce((sum, r) => sum + r.threshold_hours, 0) / rules.length) :
                0
              }h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('escalation_rules.critical_rules')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rules?.filter(r => r.threshold_hours <= 24).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('escalation_rules.rule_list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              {t('escalation_rules.loading')}
            </div>
          ) : (
            <div className="space-y-4">
              {rules?.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium capitalize">
                            {t(`escalation_rules.types.${rule.action_type}`)}
                          </h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? t('escalation_rules.active') : t('common:common.inactive', { defaultValue: 'Inactive' })}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {t('escalation_rules.escalates_to')} {t(`common:roles.${rule.next_role}`)} {t('escalation_rules.after_hours', { count: rule.threshold_hours })}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{t('escalation_rules.created')} {new Date(rule.created_at).toLocaleDateString()}</span>
                          {rule.updated_at && (
                            <span>{t('escalation_rules.updated')} {new Date(rule.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                        disabled={toggleRuleMutation.isPending}
                      />
                      <Button
                        size="sm"
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteRuleMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {rules?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t('escalation_rules.no_rules')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface EscalationRuleFormProps {
  rule?: EscalationRule | null
  onClose: () => void
  onSubmit: (data: Partial<EscalationRule>) => void
}

function EscalationRuleForm({ rule, onClose, onSubmit }: EscalationRuleFormProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [formData, setFormData] = useState({
    action_type: rule?.action_type || '',
    threshold_hours: rule?.threshold_hours || 48,
    next_role: rule?.next_role || '' as AppRole,
    is_active: rule?.is_active ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {rule ? t('escalation_rules.edit_title') : t('escalation_rules.create_title')}
        </h1>
        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={onClose}>
          {t('escalation_rules.cancel')} {/* Using cancel/back depending on context, using cancel key for consistency */}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('escalation_rules.rule_configuration')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action_type">{t('escalation_rules.action_type')}</Label>
                <Select
                  value={formData.action_type}
                  onValueChange={(value) => updateFormData('action_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('escalation_rules.select_action')} />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {t(`escalation_rules.types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold_hours">{t('escalation_rules.threshold_hours')}</Label>
                <Input
                  id="threshold_hours"
                  type="number"
                  min="1"
                  max="168"
                  value={formData.threshold_hours}
                  onChange={(e) => updateFormData('threshold_hours', parseInt(e.target.value))}
                  placeholder="48"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_role">{t('escalation_rules.escalate_to')}</Label>
              <Select
                value={formData.next_role}
                onValueChange={(value) => updateFormData('next_role', value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('escalation_rules.select_role')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(roleLabels).map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`common:roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => updateFormData('is_active', checked)}
              />
              <Label htmlFor="is_active">{t('escalation_rules.active')}</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('escalation_rules.cancel')}
              </Button>
              <Button type="submit">
                {rule ? t('escalation_rules.update') : t('escalation_rules.create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
