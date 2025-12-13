
import { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
// BubbleMenu and FloatingMenu removed due to Vite export issues
// import { BubbleMenu, FloatingMenu } from '@tiptap/react'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import FloatingMenuExtension from '@tiptap/extension-floating-menu'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { Loader2, Upload, Heading1, Heading2, List, ListOrdered, AlignRight, AlignLeft, Image as ImageIcon, Wand2, Download, Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useAutoSave } from '@/hooks/useAutoSave'
import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/gemini'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SOPEditorAdvancedProps {
  documentId?: string
  initialContent?: string
  initialMetadata?: {
    title: string
    description: string
    department: string
    category: string
    priority: string
  }
  onSave?: (content: string, metadata: any) => void
  onCancel?: () => void
}

function SOPEditorAdvanced({ documentId, initialContent = '', initialMetadata, onSave, onCancel }: SOPEditorAdvancedProps) {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [metadata, setMetadata] = useState({
    code: '', // Track code
    title: initialMetadata?.title || '',
    description: initialMetadata?.description || '',
    department: initialMetadata?.department || '',
    category: initialMetadata?.category || '',
    priority: initialMetadata?.priority || 'medium',
    tags: [] as string[],
    reviewFrequency: 'quarterly',
    emergencyProcedure: false,
    requiresTraining: false,
    complianceLevel: 'standard'
  })


  // 💾 AUTO SAVE HOOK
  const { lastSaved, hasUnsavedChanges, triggerSave: triggerAutoSave } = useAutoSave(
    'sop_current_draft',
    '', // We don't pass content here directly to avoid re-renders, simpler implementation
    metadata
  )

  const [newTag, setNewTag] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  // 📝 EDITOR SETUP
  const editor = useEditor({
    extensions: [
      StarterKit,
      BubbleMenuExtension,
      FloatingMenuExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'bulletList', 'orderedList'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4',
        dir: textDirection // Native HTML dir attribute
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getText()
      setWordCount(content.split(/\s+/).filter(word => word.length > 0).length)
    },
  })

  // 🔄 FETCH EXISTING DOCUMENT
  useEffect(() => {
    if (!documentId) return

    const fetchDocument = async () => {
      const toastId = toast.loading('Loading document...')
      try {
        const { data, error } = await supabase
          .from('sop_documents')
          .select('*')
          .eq('id', documentId)
          .single()

        if (error) throw error
        if (data) {
          // Update Editor Content
          editor?.commands.setContent(data.content)

          // Update Metadata
          setMetadata({
            code: data.code,
            title: data.title,
            description: data.description || '',
            department: data.department_id, // Map DB department_id to state
            category: data.category_id || '',
            priority: data.priority || 'medium',
            tags: [], // Need tags table join if tags are separate
            reviewFrequency: data.review_frequency_months ? `${data.review_frequency_months} months` : 'quarterly',
            emergencyProcedure: false,
            requiresTraining: data.requires_quiz || false,
            complianceLevel: data.compliance_level || 'standard'
          })
          toast.success('Document loaded', { id: toastId })
        }
      } catch (error) {
        console.error('Error fetching document:', error)
        toast.error('Failed to load document', { id: toastId })
      }
    }

    if (editor) {
      fetchDocument()
    }
  }, [documentId, editor])

  // 🌍 RTL TOGGLE HANDLER
  const toggleDirection = () => {
    const newDir = textDirection === 'ltr' ? 'rtl' : 'ltr'
    setTextDirection(newDir)

    // Auto-update alignment to match direction
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4',
            dir: newDir
          }
        }
      })
      editor.chain().focus().setTextAlign(newDir === 'rtl' ? 'right' : 'left').run()
    }
  }

  // 🪄 AI ASSIST HANDLER
  const handleAiAssist = async (action: 'grammar' | 'expert' | 'expand' | 'arabic') => {
    if (!editor) return
    const selection = editor.state.selection
    const text = editor.state.doc.textBetween(selection.from, selection.to, ' ')

    if (!text || text.length < 5) {
      toast.error("Please highlight some text first!")
      return
    }

    setIsAiProcessing(true)
    const toastId = toast.loading("AI is working its magic...")

    try {
      // Map 'expert' to 'professional' which the API expects
      const instruction = action === 'expert' ? 'professional' : action

      console.log(`🪄 AI Request: ${instruction} for text: "${text.substring(0, 20)}..."`)

      const improvedText = await aiService.improveContent(text, instruction as any)

      if (!improvedText) {
        throw new Error("AI service returned no result. It might be overloaded.")
      }

      editor.chain().focus().insertContent(improvedText).run()
      toast.success("Text improved successfully!", { id: toastId })
    } catch (error: any) {
      console.error("AI Assist Error:", error)
      toast.error("AI Request Failed", {
        id: toastId,
        description: error.message || "Please check your network connection."
      })
    } finally {
      setIsAiProcessing(false)
    }
  }

  // 📤 IMAGE UPLOAD HANDLER
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files.length) return
    if (!user) {
      toast.error('You must be logged in to upload images')
      return
    }

    const file = event.target.files[0]
    setIsUploading(true)

    try {
      // 1. Upload to Supabase
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/sop-images/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // 3. Insert into Editor
      editor?.chain().focus().setImage({ src: publicUrl }).run()
      toast.success('Image uploaded successfully')

    } catch (error: any) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload image', { description: error.message })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = '' // Reset input
    }
  }

  const triggerImageUpload = () => fileInputRef.current?.click()

  const addTag = useCallback(() => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }, [newTag, metadata.tags])

  const removeTag = useCallback((tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }, [])


  const [departments, setDepartments] = useState<{ id: string, name: string }[]>([])

  // 🔄 FETCH DEPARTMENTS
  // 🔄 FETCH DEPARTMENTS
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, is_active')
          .eq('is_active', true);

        if (error) throw error;
        if (data) setDepartments(data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        // Fallback or toast could be added here
      }
    };

    fetchDepartments();
  }, []);

  const handleManualSave = async (status: 'draft' | 'published' = 'draft') => {
    if (!editor || !user) return

    // Validate required fields
    if (!metadata.title || metadata.title.trim() === '') {
      toast.error('Title is required', {
        description: 'Please enter a title for your SOP document before saving.'
      })
      return
    }

    if (status === 'published' && !metadata.description) {
      toast.error('Description is required for publishing', {
        description: 'Please add a description before publishing your SOP.'
      })
      return
    }

    setIsUploading(true) // Reuse loading state
    const toastId = toast.loading(status === 'published' ? "Publishing document..." : "Saving draft...")

    try {
      const content = editor.getHTML()

      // Find department ID if possible, else use raw string if mixed usage (ideally should be strict)
      // For now we try to match by name or ID
      const selectedDept = departments.find(d => d.id === metadata.department || d.name === metadata.department)
      const departmentId = selectedDept?.id || null

      const payload: any = {
        code: metadata.code || `SOP-${Date.now()}`,
        title: metadata.title.trim(),
        title_ar: metadata.title.trim(),
        content: content,
        status: status,
        description: metadata.description,
        department_id: departmentId,
        category_id: null,
        priority: metadata.priority,
        requires_quiz: metadata.requiresTraining,
        compliance_level: metadata.complianceLevel,
        review_frequency_months: 3,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      }

      if (status === 'published') {
        payload.published_at = new Date().toISOString()
      }

      if (documentId) {
        payload.id = documentId
      } else {
        payload.created_by = user.id
        payload.version = 1
      }

      const { data, error } = await supabase
        .from('sop_documents')
        .upsert(payload)
        .select()
        .single()

      if (error) throw error

      toast.success(status === 'published' ? "Document published!" : "Draft saved!", { id: toastId })
      triggerAutoSave() // update local last-saved

      // Notify parent
      if (onSave && data) {
        onSave(content, data)
      }

    } catch (error: any) {
      console.error('Save failed:', error)
      toast.error('Failed to save document', {
        id: toastId,
        description: error.message
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 🚀 HIDDEN FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 🔹 HEADER & ACTIONS */}
      <div className="border-b bg-muted/30 p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight">SOP Editor</h2>
              <div className="flex gap-2 text-xs text-muted-foreground items-center">
                {isUploading ? (
                  <span className="text-blue-600 flex items-center"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving to DB...</span>
                ) : hasUnsavedChanges ? (
                  <span className="text-amber-500 flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> Unsaved changes</span>
                ) : (
                  <span className="text-green-600 flex items-center"><Icons.Check className="h-3 w-3 mr-1" /> Saved to DB</span>
                )}
                {lastSaved && <span className="hidden sm:inline">• Local draft: {lastSaved.toLocaleTimeString()}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDirection}
              title={textDirection === 'ltr' ? 'Switch to RTL' : 'Switch to LTR'}
            >
              {textDirection === 'ltr' ? <AlignRight className="h-4 w-4 mr-2" /> : <AlignLeft className="h-4 w-4 mr-2" />}
              {textDirection === 'ltr' ? 'Arabic Mode' : 'English Mode'}
            </Button>

            <Separator orientation="vertical" className="h-8 mx-2" />

            {/* AI ASSIST MENU */}
            <Select onValueChange={(val: any) => handleAiAssist(val)}>
              <SelectTrigger className="w-[140px] h-9 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
                {isAiProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                <SelectValue placeholder="AI Assist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grammar">Fix Grammar</SelectItem>
                <SelectItem value="expert">Make Professional</SelectItem>
                <SelectItem value="expand">Expand Detail</SelectItem>
                <SelectItem value="arabic">Translate to Arabic</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={handleExportPDF} title="Print/Export to PDF">
              <Download className="h-4 w-4" />
            </Button>

            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="mr-2"
              >
                Cancel
              </Button>
            )}

            <Button
              onClick={() => handleManualSave('draft')}
              disabled={isUploading}
              className="bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            <Button
              onClick={() => handleManualSave('published')}
              disabled={isUploading}
              className="bg-hotel-gold text-white hover:bg-hotel-gold-dark"
            >
              <Icons.Upload className="h-4 w-4 mr-2" />
              Publish
            </Button>

          </div>
        </div>
      </div>

      <Tabs defaultValue="content" className="flex-1 overflow-hidden flex flex-col print:overflow-visible print:h-auto print:block">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b print:hidden">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 m-0 overflow-hidden flex flex-col relative h-full print:overflow-visible print:h-auto print:block">
          {!isPreview && editor && (
            <>
              {/* Sticky Toolbar for manual actions */}
              <div className="border-b p-2 flex flex-wrap gap-2 items-center bg-background z-10 sticky top-0 print:hidden">
                <div className="flex gap-1">
                  <Toggle pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} size="sm">
                    <Icons.Bold className="h-4 w-4" />
                  </Toggle>
                  <Toggle pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} size="sm">
                    <Icons.Italic className="h-4 w-4" />
                  </Toggle>
                  <Toggle pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} size="sm">
                    <Icons.Underline className="h-4 w-4" />
                  </Toggle>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn(editor.isActive('heading', { level: 1 }) && "bg-muted")}>H1</Button>
                  <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn(editor.isActive('heading', { level: 2 }) && "bg-muted")}>H2</Button>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={triggerImageUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
            </>
          )}

          <div className={`flex-1 overflow-auto p-4 ${textDirection === 'rtl' ? 'text-right' : 'text-left'} print:overflow-visible print:h-auto`} dir={textDirection}>
            {isPreview ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
                dir={textDirection}
              />
            ) : (
              <EditorContent editor={editor} className="h-full min-h-[500px]" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="p-4 overflow-auto">
          {/* ... (Metadata inputs - kept same as before for brevity) ... */}
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter SOP title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={metadata.department}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">Loading departments...</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Beta)</Label>
              <Input
                id="description"
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter SOP description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={metadata.category}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={metadata.priority}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    className="w-32"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="p-4 overflow-auto">
          {/* ... (Settings inputs - kept same as before for brevity) ... */}
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reviewFrequency">Review Frequency</Label>
                <Select
                  value={metadata.reviewFrequency}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, reviewFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="complianceLevel">Compliance Level</Label>
                <Select
                  value={metadata.complianceLevel}
                  onValueChange={(value) => setMetadata(prev => ({ ...prev, complianceLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="enhanced">Enhanced</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="emergencyProcedure"
                  checked={metadata.emergencyProcedure}
                  onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, emergencyProcedure: checked }))}
                />
                <Label htmlFor="emergencyProcedure">Emergency Procedure</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresTraining"
                  checked={metadata.requiresTraining}
                  onCheckedChange={(checked) => setMetadata(prev => ({ ...prev, requiresTraining: checked }))}
                />
                <Label htmlFor="requiresTraining">Requires Training</Label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div >
  )
}


export default SOPEditorAdvanced
