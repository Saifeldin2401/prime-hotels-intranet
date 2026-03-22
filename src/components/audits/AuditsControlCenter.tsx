import { DeleteConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useAuditItems,
    useAuditRuns,
    useAuditTemplates,
    useCreateAuditItem,
    useCreateAuditRun,
    useCreateAuditTemplate,
    useDeleteAuditItem,
    useDeleteAuditRun,
    useDeleteAuditTemplate,
    useUpdateAuditItem,
    useUpdateAuditTemplate
} from '@/hooks/useAudits'
import { Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const SCOPE_TYPES = [
  { value: 'global', label: 'Global' },
  { value: 'property', label: 'Property' },
  { value: 'department', label: 'Department' }
]

const SEVERITY = ['low', 'medium', 'high', 'critical']

export function AuditsControlCenter() {
  const { data: templates = [] } = useAuditTemplates()
  const createTemplate = useCreateAuditTemplate()
  const updateTemplate = useUpdateAuditTemplate()
  const deleteTemplate = useDeleteAuditTemplate()
  const createItem = useCreateAuditItem()
  const updateItem = useUpdateAuditItem()
  const deleteItem = useDeleteAuditItem()
  const createRun = useCreateAuditRun()
  const deleteRun = useDeleteAuditRun()

  const [templateName, setTemplateName] = useState('')
  const [templateScope, setTemplateScope] = useState('property')
  const [templateFrequency, setTemplateFrequency] = useState('monthly')

  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const selectedTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId), [templates, selectedTemplateId])

  const { data: items = [] } = useAuditItems(selectedTemplateId || undefined)
  const { data: runs = [] } = useAuditRuns(selectedTemplateId || undefined)

  const [itemTitle, setItemTitle] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemSeverity, setItemSeverity] = useState('medium')

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [deletingItem, setDeletingItem] = useState(false)

  const [deleteRunId, setDeleteRunId] = useState<string | null>(null)
  const [deletingRun, setDeletingRun] = useState(false)

  useEffect(() => {
    if (!selectedTemplate) return
    setTemplateName(selectedTemplate.name)
    setTemplateScope(selectedTemplate.scope_type)
    setTemplateFrequency(selectedTemplate.frequency || 'monthly')
    setIsEditingTemplate(false)
  }, [selectedTemplate])

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return
    await createTemplate.mutateAsync({
      name: templateName.trim(),
      description: '',
      scope_type: templateScope as 'global' | 'property' | 'department',
      frequency: templateFrequency
    })
    setTemplateName('')
  }

  const handleSaveTemplate = async () => {
    if (!selectedTemplateId) return
    if (!templateName.trim()) return

    await updateTemplate.mutateAsync({
      id: selectedTemplateId,
      updates: {
        name: templateName.trim(),
        scope_type: templateScope as 'global' | 'property' | 'department',
        frequency: templateFrequency
      }
    })
    setIsEditingTemplate(false)
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return
    try {
      setDeletingTemplate(true)
      await deleteTemplate.mutateAsync(deleteTemplateId)
      if (selectedTemplateId === deleteTemplateId) {
        setSelectedTemplateId(null)
      }
      setDeleteTemplateId(null)
    } finally {
      setDeletingTemplate(false)
    }
  }

  const handleCreateItem = async () => {
    if (!selectedTemplateId || !itemTitle.trim()) return
    if (editingItemId) {
      await updateItem.mutateAsync({
        id: editingItemId,
        template_id: selectedTemplateId,
        updates: {
          title: itemTitle.trim(),
          category: itemCategory,
          severity: itemSeverity as 'low' | 'medium' | 'high' | 'critical',
          required: true
        }
      })
    } else {
      await createItem.mutateAsync({
        template_id: selectedTemplateId,
        title: itemTitle.trim(),
        category: itemCategory,
        severity: itemSeverity as 'low' | 'medium' | 'high' | 'critical',
        required: true,
        order_index: items.length
      })
    }
    setItemTitle('')
    setItemCategory('')
    setItemSeverity('medium')
    setEditingItemId(null)
  }

  const startEditItem = (item: { id: string, title?: string | null, category?: string | null, severity?: string | null }) => {
    setEditingItemId(item.id)
    setItemTitle(item.title || '')
    setItemCategory(item.category || '')
    setItemSeverity(item.severity || 'medium')
  }

  const cancelEditItem = () => {
    setEditingItemId(null)
    setItemTitle('')
    setItemCategory('')
    setItemSeverity('medium')
  }

  const handleDeleteItem = async () => {
    if (!deleteItemId || !selectedTemplateId) return
    try {
      setDeletingItem(true)
      await deleteItem.mutateAsync({ id: deleteItemId, template_id: selectedTemplateId })
      setDeleteItemId(null)
      if (editingItemId === deleteItemId) {
        cancelEditItem()
      }
    } finally {
      setDeletingItem(false)
    }
  }

  const handleStartAudit = async () => {
    if (!selectedTemplateId) return
    await createRun.mutateAsync({ template_id: selectedTemplateId })
  }

  const handleDeleteRun = async () => {
    if (!deleteRunId) return
    const run = runs.find(r => r.id === deleteRunId)
    try {
      setDeletingRun(true)
      await deleteRun.mutateAsync({ id: deleteRunId, template_id: run?.template_id })
      setDeleteRunId(null)
    } finally {
      setDeletingRun(false)
    }
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
          {selectedTemplateId ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || updateTemplate.isPending}
                className="flex-1"
              >
                {isEditingTemplate ? 'Save Template' : 'Update Template'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateName('')
                  setTemplateScope('property')
                  setTemplateFrequency('monthly')
                  setSelectedTemplateId(null)
                }}
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleCreateTemplate} disabled={!templateName.trim() || createTemplate.isPending}>
              Create Template
            </Button>
          )}
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
                onClick={() => {
                  setSelectedTemplateId(template.id)
                  setIsEditingTemplate(true)
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{template.name}</span>
                  <Badge variant="secondary">{template.scope_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{template.frequency}</p>
                {template.next_run_at && (
                  <p className="text-xs text-muted-foreground">Next run: {new Date(template.next_run_at).toLocaleString()}</p>
                )}
                {selectedTemplateId === template.id && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsEditingTemplate(true)
                      }}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteTemplateId(template.id)
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
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
                <div className="sm:col-span-3 flex items-center gap-2">
                  <Button onClick={handleCreateItem} disabled={!itemTitle.trim() || createItem.isPending || updateItem.isPending} className="flex-1">
                    {editingItemId ? 'Save Item' : 'Add Item'}
                  </Button>
                  {editingItemId && (
                    <Button type="button" variant="outline" onClick={cancelEditItem} title="Cancel">
                      Cancel
                    </Button>
                  )}
                </div>
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.severity}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditItem(item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteItemId(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
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
              <div className="flex items-center gap-2">
                <Badge variant={run.status === 'completed' ? 'default' : run.status === 'in_progress' ? 'secondary' : 'outline'}>
                  {run.status}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteRunId(run.id)}
                  title="Delete run"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
        itemName="template"
        onConfirm={handleDeleteTemplate}
        isLoading={deletingTemplate}
      />

      <DeleteConfirmationDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        itemName="item"
        onConfirm={handleDeleteItem}
        isLoading={deletingItem}
      />

      <DeleteConfirmationDialog
        open={!!deleteRunId}
        onOpenChange={(open) => !open && setDeleteRunId(null)}
        itemName="run"
        onConfirm={handleDeleteRun}
        isLoading={deletingRun}
      />
    </div>
  )
}
