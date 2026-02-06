import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  useAuditItems,
  useAuditRuns,
  useAuditTemplates,
  useCreateAuditItem,
  useCreateAuditRun,
  useCreateAuditTemplate
} from '@/hooks/useAudits'
import { EnhancedCard } from '@/components/ui/enhanced-card'

const SCOPE_TYPES = [
  { value: 'global', label: 'Global' },
  { value: 'property', label: 'Property' },
  { value: 'department', label: 'Department' }
]

const SEVERITY = ['low', 'medium', 'high', 'critical']

export function AuditsControlCenter() {
  const { data: templates = [] } = useAuditTemplates()
  const createTemplate = useCreateAuditTemplate()
  const createItem = useCreateAuditItem()
  const createRun = useCreateAuditRun()

  const [templateName, setTemplateName] = useState('')
  const [templateScope, setTemplateScope] = useState('property')
  const [templateFrequency, setTemplateFrequency] = useState('monthly')

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const selectedTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId), [templates, selectedTemplateId])

  const { data: items = [] } = useAuditItems(selectedTemplateId || undefined)
  const { data: runs = [] } = useAuditRuns(selectedTemplateId || undefined)

  const [itemTitle, setItemTitle] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemSeverity, setItemSeverity] = useState('medium')

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return
    await createTemplate.mutateAsync({
      name: templateName.trim(),
      description: '',
      scope_type: templateScope as any,
      frequency: templateFrequency
    })
    setTemplateName('')
  }

  const handleCreateItem = async () => {
    if (!selectedTemplateId || !itemTitle.trim()) return
    await createItem.mutateAsync({
      template_id: selectedTemplateId,
      title: itemTitle.trim(),
      category: itemCategory,
      severity: itemSeverity as any,
      required: true,
      order_index: items.length
    })
    setItemTitle('')
    setItemCategory('')
  }

  const handleStartAudit = async () => {
    if (!selectedTemplateId) return
    await createRun.mutateAsync({ template_id: selectedTemplateId })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit Templates</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <Input placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          <Select value={templateScope} onValueChange={setTemplateScope}>
            <SelectTrigger>
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_TYPES.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Frequency (e.g. monthly)" value={templateFrequency} onChange={(e) => setTemplateFrequency(e.target.value)} />
          <Button onClick={handleCreateTemplate} disabled={!templateName.trim()}>Create Template</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit templates yet.</p>
            ) : templates.map((template) => (
              <button
                key={template.id}
                className={`w-full text-left p-3 rounded-lg border transition ${selectedTemplateId === template.id ? 'border-primary bg-accent' : 'hover:bg-accent'}`}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="secondary">{template.scope_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{template.frequency}</p>
                {template.next_run_at && (
                  <p className="text-xs text-muted-foreground">Next run: {new Date(template.next_run_at).toLocaleString()}</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <EnhancedCard padding="lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-base font-semibold">Template Items</h4>
              <p className="text-xs text-muted-foreground">Build the audit checklist.</p>
            </div>
            <Button size="sm" onClick={handleStartAudit} disabled={!selectedTemplateId}>Start Audit</Button>
          </div>
          {!selectedTemplateId ? (
            <p className="text-sm text-muted-foreground">Select a template to manage items.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Checklist item" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
                <Input placeholder="Category" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} />
                <Select value={itemSeverity} onValueChange={setItemSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateItem} disabled={!itemTitle.trim()} className="sm:col-span-3">
                  Add Item
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items for this template yet.</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.category || 'General'}</p>
                      </div>
                      <Badge variant="outline">{item.severity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </EnhancedCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Audits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audits started yet.</p>
          ) : runs.slice(0, 6).map(run => (
            <div key={run.id} className="flex items-center justify-between text-sm border rounded-md p-2">
              <div>
                <p className="font-medium">Run {run.id.slice(0, 6)}</p>
                <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={run.status === 'completed' ? 'default' : run.status === 'in_progress' ? 'secondary' : 'outline'}>
                {run.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
