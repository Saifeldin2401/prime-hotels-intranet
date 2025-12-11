'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useDepartments } from '@/hooks/useDepartments';
import { SOPService } from '@/lib/api/sop';
import type { SOPDocument, CreateSOPDocumentInput, UpdateSOPDocumentInput } from '@/lib/types/sop';

interface SOPEditorProps {
  documentId: string;
  initialDocument?: SOPDocument;
}

export function SOPEditor({ documentId, initialDocument }: SOPEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { departments, categories, subcategories, isLoading: isLoadingDepartments } = useDepartments();
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    department_id: '',
    category_id: '',
    subcategory_id: '',
    is_template: false,
    template_id: '',
  });

  // Initialize form with document data if editing
  useEffect(() => {
    if (initialDocument) {
      setFormData({
        title: initialDocument.title,
        title_ar: initialDocument.title_ar || '',
        description: initialDocument.description || '',
        description_ar: initialDocument.description_ar || '',
        department_id: initialDocument.department_id,
        category_id: initialDocument.category_id || '',
        subcategory_id: initialDocument.subcategory_id || '',
        is_template: initialDocument.is_template || false,
        template_id: initialDocument.template_id || '',
      });
    }
  }, [initialDocument]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset subcategory when category changes
      ...(name === 'category_id' && { subcategory_id: '' }),
    }));
  };

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Save document
  const saveDocument = async (status: 'draft' | 'publish' = 'draft') => {
    if (!formData.title.trim() || !formData.department_id) {
      toast({
        title: 'Validation Error',
        description: 'Title and Department are required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const documentData: UpdateSOPDocumentInput = {
        id: documentId,
        title: formData.title,
        title_ar: formData.title_ar,
        description: formData.description,
        description_ar: formData.description_ar,
        department_id: formData.department_id,
        category_id: formData.category_id || undefined,
        subcategory_id: formData.subcategory_id || undefined,
        content: { type: 'doc', content: [] }, // TODO: Get actual content from editor
        status: status === 'publish' ? 'under_review' : 'draft',
        change_summary: status === 'publish' ? 'Submitted for review' : 'Draft saved',
      };

      const result = await SOPService.updateDocument(documentId, documentData);

      if (result.data) {
        toast({
          title: 'Success',
          description: status === 'publish' 
            ? 'Document submitted for review' 
            : 'Draft saved successfully',
        });
        
        if (status === 'publish') {
          router.push(`/dashboard/sop/${documentId}`);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to save document');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save document',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDocument('publish');
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    await saveDocument('draft');
  };

  // Handle cancel
  const handleCancel = () => {
    router.push(`/dashboard/sop/${documentId}`);
  };

  if (isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {initialDocument ? 'Edit Document' : 'New Document'}
          </h1>
          <p className="text-muted-foreground">
            Create and edit your Standard Operating Procedure document
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? (
              <Icons.Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Icons.Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <Icons.Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Icons.Send className="h-4 w-4 mr-2" />
            )}
            Submit for Approval
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Content
          </button>
          <button
            type="button"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            type="button"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="rounded-md border bg-background">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Document Content</h3>
                <p className="text-sm text-muted-foreground">
                  Write your SOP content here. You can format text, add tables, and insert images.
                </p>
              </div>
              <div className="p-4 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* TODO: Implement rich text editor here */}
                <div className="prose max-w-none">
                  <p>Rich text editor will be implemented here...</p>
                  <p>Features to include:</p>
                  <ul>
                    <li>Text formatting (bold, italic, underline)</li>
                    <li>Headings and lists</li>
                    <li>Tables and images</li>
                    <li>Links and attachments</li>
                    <li>Version history</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter document title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title_ar">Title (Arabic)</Label>
                <Input
                  id="title_ar"
                  name="title_ar"
                  value={formData.title_ar}
                  onChange={handleInputChange}
                  placeholder="Enter Arabic title"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter document description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description_ar">Description (Arabic)</Label>
                <Textarea
                  id="description_ar"
                  name="description_ar"
                  value={formData.description_ar}
                  onChange={handleInputChange}
                  placeholder="Enter Arabic description"
                  rows={3}
                  dir="rtl"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Categorization</h3>
              
              <div className="space-y-2">
                <Label htmlFor="department_id">Department *</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => handleSelectChange('department_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange('category_id', value)}
                  disabled={!formData.department_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => cat.department_id === formData.department_id && !cat.parent_id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.category_id && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory_id">Subcategory</Label>
                  <Select
                    value={formData.subcategory_id}
                    onValueChange={(value) => handleSelectChange('subcategory_id', value)}
                    disabled={!formData.category_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(sub => sub.parent_id === formData.category_id)
                        .map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_template">Save as Template</Label>
                  <Switch
                    id="is_template"
                    checked={formData.is_template}
                    onCheckedChange={(checked) => handleSwitchChange('is_template', checked)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Save this document as a template for future use
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Workflow Settings</h3>
              
              <div className="space-y-2">
                <Label>Approval Workflow</Label>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    Configure the approval workflow for this document
                  </p>
                  
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        <Icons.User className="h-4 w-4" />
                        <span>Department Head</span>
                      </div>
                      <Icons.CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-50">
                      <div className="flex items-center space-x-2">
                        <Icons.Users className="h-4 w-4" />
                        <span>Property Manager</span>
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-50">
                      <div className="flex items-center space-x-2">
                        <Icons.Shield className="h-4 w-4" />
                        <span>Regional HR</span>
                      </div>
                      <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                  >
                    <Icons.Settings className="h-4 w-4 mr-2" />
                    Configure Workflow
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notifications</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_publish">
                      Notify on Publish
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when document is published
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_publish" 
                    defaultChecked 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_approval">
                      Notify on Approval
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when approval is completed
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_approval" 
                    defaultChecked 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_comment">
                      Notify on Comment
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when comments are added
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_comment" 
                    defaultChecked 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
