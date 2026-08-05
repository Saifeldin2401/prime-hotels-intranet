import { ArrowLeft, Save, Plus, Trash2, Eye, Code } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
    if (!window.confirm('Are you sure you want to delete this template?')) return

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

  return (
    <div className="container mx-auto py-6 max-w-[1400px]">
      <PageHeader
        title="Email Template Editor"
        description="Manage the HTML and Text structures for system email templates."
        backTo="/admin"
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {t('actions.save', { ns: 'common', defaultValue: 'Save Template' })}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
        {/* Sidebar */}
        <Card className="md:col-span-3 h-[calc(100vh-200px)] flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-muted/20">
            <h3 className="font-semibold text-sm">Templates</h3>
            <Button variant="ghost" size="icon" onClick={handleNewTemplate}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : templates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  selectedTemplate?.id === tmpl.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                {tmpl.template_key}
                <div className="text-[10px] opacity-70 mt-0.5">v{tmpl.version || 1} • {tmpl.business_domain}</div>
              </button>
            ))}
            {!isLoading && templates.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No templates found</div>
            )}
          </div>
        </Card>

        {/* Editor Area */}
        <div className="md:col-span-9 h-[calc(100vh-200px)] flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-shrink-0">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Key (Unique)</Label>
                <Input 
                  value={templateKey} 
                  onChange={e => setTemplateKey(e.target.value)} 
                  placeholder="e.g. auth_password_reset"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Template (Variables allowed: {'{{name}}'})</Label>
                <Input 
                  value={subjectTemplate} 
                  onChange={e => setSubjectTemplate(e.target.value)} 
                  placeholder="Your action is required"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="p-2 border-b flex items-center justify-between bg-muted/20">
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="code"><Code className="w-4 h-4 mr-2" /> Code Editor</TabsTrigger>
                  <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-2" /> Live Preview</TabsTrigger>
                </TabsList>
              </Tabs>
              {selectedTemplate && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex-1 flex overflow-hidden">
              {previewMode === 'code' ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="bg-muted p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">HTML Template</div>
                    <Textarea 
                      className="flex-1 resize-none p-4 font-mono text-sm border-0 focus-visible:ring-0"
                      value={htmlTemplate}
                      onChange={e => setHtmlTemplate(e.target.value)}
                      placeholder="<html><body>...</body></html>"
                    />
                  </div>
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="bg-muted p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plain Text Template</div>
                    <Textarea 
                      className="flex-1 resize-none p-4 font-mono text-sm border-0 focus-visible:ring-0"
                      value={textTemplate}
                      onChange={e => setTextTemplate(e.target.value)}
                      placeholder="Hello {{name}}, ..."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 flex items-center justify-center p-6 overflow-hidden">
                  <div className="w-full max-w-2xl h-full bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                    <div className="bg-gray-100 p-3 border-b text-sm text-gray-500">
                      <strong>Subject:</strong> {subjectTemplate || 'No subject'}
                    </div>
                    <iframe 
                      title="preview"
                      className="w-full flex-1" 
                      srcDoc={htmlTemplate || '<div style="padding: 20px; text-align: center; color: #888;">No HTML content</div>'} 
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
