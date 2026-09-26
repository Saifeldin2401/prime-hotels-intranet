import { ConfirmDialog } from '@/ui'
import { Save, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface EmailTemplate {
  id: string
  template_key: string
  business_domain: string
  notification_type: string
  subject_template: string
  html_template: string
  text_template: string
  version?: number
  is_active: boolean
}

export default function EmailTemplateEditor() {
  const { t } = useTranslation(['admin', 'common'])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('preview')

  // Form states
  const [templateKey, setTemplateKey] = useState('')
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [htmlTemplate, setHtmlTemplate] = useState('')
  const [textTemplate, setTextTemplate] = useState('')

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('notification_email_templates')
        .select('*')
        .order('template_key', { ascending: true })
      
      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Failed to fetch templates:', err)
      toast.error(t('error', { defaultValue: 'An error occurred' }))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleSelectTemplate = (tmpl: EmailTemplate) => {
    setSelectedTemplate(tmpl)
    setTemplateKey(tmpl.template_key || '')
    setSubjectTemplate(tmpl.subject_template || '')
    setHtmlTemplate(tmpl.html_template || '')
    setTextTemplate(tmpl.text_template || '')
  }

  const handleNewTemplate = () => {
    setSelectedTemplate(null)
    setTemplateKey('')
    setSubjectTemplate('')
    setHtmlTemplate('')
    setTextTemplate('')
  }

  const handleSave = async () => {
    if (!templateKey.trim()) {
      toast.error(t('email_writer.validation.missing_key', { ns: 'admin', defaultValue: 'Template Key is required' }))
      return
    }

    setIsSaving(true)
    try {
      if (selectedTemplate) {
        // Update
        const { error } = await supabase
          .from('notification_email_templates')
          .update({
            template_key: templateKey,
            subject_template: subjectTemplate,
            html_template: htmlTemplate,
            text_template: textTemplate,
            version: (selectedTemplate.version || 1) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTemplate.id)
        
        if (error) throw error
        toast.success(t('email_writer.saved', { ns: 'admin', defaultValue: 'Template updated successfully' }))
      } else {
        // Insert
        const { error } = await supabase
          .from('notification_email_templates')
          .insert({
            template_key: templateKey,
            subject_template: subjectTemplate,
            html_template: htmlTemplate,
            text_template: textTemplate,
            business_domain: 'system',
            notification_type: 'alert',
            is_active: true,
            version: 1
          })
        
        if (error) throw error
        toast.success(t('email_writer.created', { ns: 'admin', defaultValue: 'Template created successfully' }))
      }
      
      await fetchTemplates()
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return

    try {
      const { error } = await supabase
        .from('notification_email_templates')
        .delete()
        .eq('id', selectedTemplate.id)
      
      if (error) throw error
      toast.success('Template deleted')
      handleNewTemplate()
      fetchTemplates()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to delete')
    }
  }

  const previewHtml = useMemo(() => {
    if (!htmlTemplate) return '<div style="padding: 40px; text-align: center; color: #888; font-family: sans-serif;">No HTML content</div>'
    
    let html = htmlTemplate
    const sampleContext: Record<string, string> = {
      '{{org_name}}': 'Royal Palace Hospitality Group',
      '{{org_name_ar}}': 'مجموعة فنادق القصر الملكي',
      '{{logo_url}}': '/altus-emblem-icon.png',
      '{{header_gradient}}': 'linear-gradient(135deg, #0B1C3E 0%, #1a365d 100%)',
      '{{brand_primary}}': '#0B1C3E',
      '{{brand_secondary}}': '#2563eb',
      '{{brand_accent}}': '#D4AF37',
      '{{brand_color}}': '#2563eb',
      '{{title}}': subjectTemplate ? subjectTemplate.replace(/\{\{[^}]+\}\}/g, 'Notification') : 'Sample Notification Title',
      '{{recipient_name}}': 'Sarah Al-Otaibi',
      '{{greeting_hello}}': 'Hello ',
      '{{message}}': 'This is a sample operational notification rendered with authoritative dynamic multi-tenant branding variables.',
      '{{module_title}}': 'Executive Hospitality Standards & Guest Experience SOP',
      '{{due_date}}': '2026-09-15',
      '{{action_url}}': 'https://altus-lms.com/admin',
      '{{action_label}}': 'Open Portal & Review',
      '{{footer_text}}': 'Confidential & Proprietary. Intended solely for authorized personnel.',
      '{{app_url}}': 'https://altus-lms.com',
      '{{dashboard_link_text}}': 'Dashboard',
      '{{help_link_text}}': 'Knowledge Hub',
      '{{rights_reserved}}': 'All rights reserved.',
      '{{year}}': new Date().getFullYear().toString(),
      '{{lang}}': 'en',
      '{{dir}}': 'ltr',
      '{{align}}': 'left',
      '{{align_opposite}}': 'right',
      '{{business_unit_label}}': 'Operations & Standards',
      '{{trouble_clicking}}': 'If you are having trouble clicking the button above, copy and paste this URL into your browser:'
    }

    for (const [key, val] of Object.entries(sampleContext)) {
      html = html.split(key).join(val)
    }

    return html
  }, [htmlTemplate, subjectTemplate])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Email templates"
        description="The subject, HTML and plain-text versions of every email the platform sends."
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="min-h-[44px] bg-ds-ink text-ds-on-ink hover:bg-ds-ink/90">
            <Save aria-hidden="true" className="me-2 h-4 w-4" />
            {t('actions.save', { ns: 'common', defaultValue: 'Save Template' })}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Sidebar */}
        <div className="flex max-h-72 flex-col overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface md:col-span-3 md:max-h-none md:h-[calc(100vh-220px)]">
          <div className="flex items-center justify-between border-b border-ds-border px-4 py-2">
            <h2 className="text-sm font-semibold text-ds-ink">Templates <span className="font-mono text-xs font-normal tabular-nums text-ds-muted">{templates.length}</span></h2>
            <Button variant="ghost" size="sm" className="min-h-[36px]" onClick={handleNewTemplate}>
              <Plus aria-hidden="true" className="me-1 h-4 w-4" />New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-ds-muted">Loading…</div>
            ) : templates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={cn(
                  "w-full text-start px-3 py-2 text-sm rounded-md transition-colors",
                  selectedTemplate?.id === tmpl.id
                    ? "bg-ds-accent-soft font-medium text-ds-ink"
                    : "text-ds-ink-secondary hover:bg-ds-surface-subtle"
                )}
              >
                {tmpl.template_key}
                <div className="text-[10px] opacity-70 mt-0.5">v{tmpl.version || 1} • {tmpl.business_domain}</div>
              </button>
            ))}
            {!isLoading && templates.length === 0 && (
              <div className="p-4 text-center text-sm text-ds-muted">No templates yet</div>
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex flex-col space-y-4 md:col-span-9 md:h-[calc(100vh-220px)] md:overflow-hidden">
          <div className="grid shrink-0 grid-cols-1 gap-4 rounded-[6px] border border-ds-border bg-ds-surface p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template key</Label>
                <Input 
                  value={templateKey} 
                  onChange={e => setTemplateKey(e.target.value)} 
                  placeholder="e.g. auth_password_reset"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject <span className="font-normal text-ds-muted">(variables like {'{{name}}'} allowed)</span></Label>
                <Input 
                  value={subjectTemplate} 
                  onChange={e => setSubjectTemplate(e.target.value)} 
                  placeholder="Your action is required"
                />
              </div>
          </div>

          <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
            <div className="flex items-center justify-between border-b border-ds-border px-2">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                <TabsList className="h-auto gap-1 rounded-none bg-transparent p-0">
                  <TabsTrigger value="code" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">Edit</TabsTrigger>
                  <TabsTrigger value="preview" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">Preview</TabsTrigger>
                </TabsList>
              </Tabs>
              {selectedTemplate && (
                <Button variant="ghost" size="sm" className="min-h-[36px] text-ds-danger hover:bg-ds-danger-soft hover:text-ds-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 me-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex-1 flex overflow-hidden">
              {previewMode === 'code' ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="border-b border-ds-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">HTML</div>
                    <Textarea 
                      className="flex-1 resize-none p-4 font-mono text-sm border-0 focus-visible:ring-0"
                      value={htmlTemplate}
                      onChange={e => setHtmlTemplate(e.target.value)}
                      placeholder="<html><body>...</body></html>"
                    />
                  </div>
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="border-b border-ds-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">Plain text</div>
                    <Textarea 
                      className="flex-1 resize-none p-4 font-mono text-sm border-0 focus-visible:ring-0"
                      value={textTemplate}
                      onChange={e => setTextTemplate(e.target.value)}
                      placeholder="Hello {{name}}, ..."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-ds-surface-subtle flex items-center justify-center p-6 overflow-hidden">
                  <div className="w-full max-w-2xl h-full bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                    <div className="bg-ds-surface-subtle p-3 border-b text-sm text-ds-muted">
                      <strong>Subject:</strong> {subjectTemplate || 'No subject'}
                    </div>
                    <iframe 
                      title="preview"
                      className="w-full flex-1" 
                      srcDoc={previewHtml} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await handleDelete()
          setConfirmDelete(false)
        }}
        isDestructive
        title={`Delete ${selectedTemplate?.template_key ?? 'this template'}?`}
        description="Emails that use this template will stop sending until a template with the same key exists again."
        confirmButtonText="Delete template"
      />
    </div>
  )
}
