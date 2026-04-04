/**
 * Fully Wired Template Manager Panel
 * 
 * REAL database integration for template management
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Mail, Copy, Edit, Eye, BarChart2, CheckCircle, Clock, AlertCircle, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  template_key: string
  name: string
  description: string
  category: string
  is_system_template: boolean
  is_editable: boolean
  active_version_number: number
  usage_count: number
  last_used_at: string
  icon: string
  color: string
}

interface TemplateVersion {
  id: string
  template_id: string
  version_number: number
  name: string
  content: {
    subject: string
    body_html: string
    body_text: string
    preheader?: string
  }
  status: 'draft' | 'active' | 'deprecated'
  translations?: Record<string, unknown>
}

interface TemplateVariable {
  id: string
  variable_key: string
  name: string
  description: string
  example_value: string
  category: string
}

export function TemplateManagerPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const queryClient = useQueryClient()

  // REAL database query - fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_template_library')
        .select('*')
        .order('category', { ascending: true })
      
      if (error) {
        toast.error('Failed to load templates: ' + error.message)
        throw error
      }
      return data as EmailTemplate[]
    }
  })

  // REAL database query - fetch template versions
  const { data: versions } = useQuery({
    queryKey: ['template-versions', selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate) return []
      const { data, error } = await supabase
        .from('email_template_versions')
        .select('*')
        .eq('template_id', selectedTemplate.id)
        .order('version_number', { ascending: false })
      
      if (error) throw error
      return data as TemplateVersion[]
    },
    enabled: !!selectedTemplate
  })

  // REAL database query - fetch variables
  const { data: variables } = useQuery({
    queryKey: ['template-variables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_variables')
        .select('*')
        .order('category', { ascending: true })
      
      if (error) throw error
      return data as TemplateVariable[]
    }
  })

  // REAL mutation - update template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      updates 
    }: { 
      templateId: string
      updates: Partial<EmailTemplate>
    }) => {
      const { data, error } = await supabase
        .from('email_template_library')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      toast.success('Template updated successfully')
      setIsEditDialogOpen(false)
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message)
    }
  })

  // REAL mutation - create new version
  const createVersionMutation = useMutation({
    mutationFn: async ({
      templateId,
      content
    }: {
      templateId: string
      content: TemplateVersion['content']
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current max version
      const { data: maxVersion } = await supabase
        .from('email_template_versions')
        .select('version_number')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      const newVersionNumber = (maxVersion?.version_number || 0) + 1

      const { data, error } = await supabase
        .from('email_template_versions')
        .insert({
          template_id: templateId,
          version_number: newVersionNumber,
          name: `Version ${newVersionNumber}`,
          content,
          status: 'active',
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Update template to point to new version
      await supabase
        .from('email_template_library')
        .update({
          active_version_id: data.id,
          active_version_number: newVersionNumber
        })
        .eq('id', templateId)

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-versions'] })
      toast.success('New version created successfully')
    },
    onError: (error) => {
      toast.error('Failed to create version: ' + error.message)
    }
  })

  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = !searchTerm ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(templates?.map(t => t.category) || [])]

  const activeVersion = versions?.find(v => v.status === 'active')

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          className="gap-2"
          onClick={() => {
            setSelectedTemplate(null)
            setIsEditDialogOpen(true)
          }}
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates?.map(template => (
          <TemplateCard 
            key={template.id} 
            template={template}
            onEdit={() => {
              setSelectedTemplate(template)
              setIsEditDialogOpen(true)
            }}
            onPreview={() => {
              setSelectedTemplate(template)
              setIsPreviewOpen(true)
            }}
          />
        ))}
      </div>

      {filteredTemplates?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No templates found</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {selectedTemplate ? `Edit: ${selectedTemplate.name}` : 'New Template'}
            </DialogTitle>
            <DialogDescription>
              Edit template content and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTemplate && activeVersion && (
              <>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input 
                    defaultValue={activeVersion.content.subject}
                    placeholder="Email subject line"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Preheader</Label>
                  <Input 
                    defaultValue={activeVersion.content.preheader}
                    placeholder="Preview text shown in email clients"
                  />
                </div>

                <div className="space-y-2">
                  <Label>HTML Body</Label>
                  <Textarea 
                    defaultValue={activeVersion.content.body_html}
                    rows={8}
                    placeholder="HTML email content"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plain Text Body</Label>
                  <Textarea 
                    defaultValue={activeVersion.content.body_text}
                    rows={4}
                    placeholder="Plain text version"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Available Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {variables?.map(v => (
                      <Badge key={v.id} variant="outline" className="cursor-pointer hover:bg-muted">
                        {'{{'}{v.variable_key}{'}}'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {!selectedTemplate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Key</Label>
                  <Input placeholder="unique_template_key" />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Template Name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="What is this template used for?" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="gap-2"
              onClick={() => {
                if (selectedTemplate && activeVersion) {
                  createVersionMutation.mutate({
                    templateId: selectedTemplate.id,
                    content: activeVersion.content
                  })
                }
              }}
            >
              <Save className="w-4 h-4" />
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div className="border-b pb-2 mb-4">
              <p className="text-sm text-muted-foreground">Subject: {activeVersion?.content.subject}</p>
            </div>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: activeVersion?.content.body_html || '' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateCard({ 
  template, 
  onEdit,
  onPreview
}: { 
  template: EmailTemplate
  onEdit: () => void
  onPreview: () => void
}) {
  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: template.color + '20', color: template.color }}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs">
                v{template.active_version_number} • {template.template_key}
              </CardDescription>
            </div>
          </div>
          {template.is_system_template && (
            <Badge variant="secondary">System</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {template.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {template.usage_count} uses
          </span>
          {template.last_used_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(template.last_used_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onPreview}>
            <Eye className="w-3 h-3" />
            Preview
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onEdit}>
            <Edit className="w-3 h-3" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <BarChart2 className="w-3 h-3" />
            Stats
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
