import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { EditorContent, useEditor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import { BubbleMenu as BubbleMenuComponent } from './BubbleMenu';
import { Toolbar } from './Toolbar';
import { SOPService, SOPDocument } from '@/lib/api/sop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/hooks/useAuth';

type SOPEditorProps = {
  documentId?: string;
  onSave?: (document: SOPDocument) => void;
  onCancel?: () => void;
  readOnly?: boolean;
};

export function SOPEditor({ documentId, onSave, onCancel, readOnly = false }: SOPEditorProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  // Fetch document if in edit mode
  const { data: documentData, isLoading } = useQuery(
    ['sop-document', documentId],
    () => SOPService.getDocumentById(documentId!), 
    {
      enabled: !!documentId,
      onSuccess: (data) => {
        if (data.data) {
          const doc = data.data;
          setFormData({
            title: doc.title,
            title_ar: doc.title_ar || '',
            description: doc.description || '',
            description_ar: doc.description_ar || '',
            department_id: doc.department_id,
            category_id: doc.category_id || '',
            subcategory_id: doc.subcategory_id || '',
            is_template: doc.is_template || false,
            template_id: doc.template_id || '',
          });
          
          // Set editor content if available
          if (doc.current_version?.content) {
            editor?.commands.setContent(doc.current_version.content);
          }
        }
      },
      onError: (error) => {
        console.error('Error fetching document:', error);
        toast({
          title: t('error'),
          description: t('sop.editor.errorLoadingDocument'),
          variant: 'destructive',
        });
      },
    }
  );

  // Fetch departments and categories
  const { departments, categories, subcategories, isLoading: isLoadingDepartments } = useDepartments();

  // Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '<p>Start writing your SOP here...</p>',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Handle content updates if needed
    },
  });

  // Handle file uploads
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!editor) return;

    const file = acceptedFiles[0];
    if (!file) return;

    // Handle image uploads
    if (file.type.startsWith('image/')) {
      try {
        // In a real app, upload the file to your storage service
        // const filePath = await uploadFile(file);
        // const url = getFileUrl(filePath);
        
        // For now, create a local URL for the image
        const url = URL.createObjectURL(file);
        
        // Add image to the editor
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: t('error'),
          description: t('sop.editor.errorUploadingImage'),
          variant: 'destructive',
        });
      }
    }
  }, [editor, t, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    noClick: true,
  });

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
    if (!editor) return;

    setIsSaving(true);
    
    try {
      const content = editor.getJSON();
      const documentData = {
        ...formData,
        content,
        status: status === 'publish' ? 'under_review' : 'draft',
        change_summary: status === 'publish' ? 'Submitted for review' : 'Draft saved',
      };

      let result;
      if (documentId) {
        // Update existing document
        result = await SOPService.updateDocument(documentId, documentData);
      } else {
        // Create new document
        result = await SOPService.createDocument(documentData);
      }

      if (result.data) {
        toast({
          title: t('success'),
          description: status === 'publish' 
            ? t('sop.editor.documentSubmittedForReview') 
            : t('sop.editor.draftSaved'),
        });
        
        // Invalidate queries to refresh the list
        await queryClient.invalidateQueries(['sop-documents']);
        
        // Call onSave callback if provided
        if (onSave) {
          onSave(result.data);
        } else if (!documentId) {
          // Navigate to the edit page for the new document
          navigate(`/sop/documents/${result.data.id}/edit`);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to save document');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('sop.editor.errorSavingDocument'),
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
    if (onCancel) {
      onCancel();
    } else if (documentId) {
      navigate(`/sop/documents/${documentId}`);
    } else {
      navigate('/sop/documents');
    }
  };

  if (isLoading || isLoadingDepartments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Document Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {documentId ? t('sop.editor.editDocument') : t('sop.editor.newDocument')}
            </h2>
            <p className="text-muted-foreground">
              {t('sop.editor.documentDescription')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Icons.save className="h-4 w-4 mr-2" />
              )}
              {t('saveDraft')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSaving || readOnly}
            >
              {isSaving ? (
                <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Icons.send className="h-4 w-4 mr-2" />
              )}
              {t('submitForApproval')}
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
              {t('sop.editor.content')}
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
              {t('sop.editor.details')}
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
              {t('sop.editor.settings')}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="rounded-md border bg-background">
              <Toolbar editor={editor} />
              <div className="px-4 py-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
                <EditorContent editor={editor} className="prose max-w-none" />
                
                {editor && (
                  <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <BubbleMenuComponent editor={editor} />
                  </BubbleMenu>
                )}
                
                {isDragActive && (
                  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center">
                      <Icons.upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-medium">{t('sop.editor.dropFilesHere')}</h3>
                      <p className="text-muted-foreground mt-1">
                        {t('sop.editor.dropFilesDescription')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('sop.editor.basicInformation')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">{t('sop.editor.title')} *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder={t('sop.editor.titlePlaceholder')}
                  disabled={readOnly}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title_ar">{t('sop.editor.titleArabic')}</Label>
                <Input
                  id="title_ar"
                  name="title_ar"
                  value={formData.title_ar}
                  onChange={handleInputChange}
                  placeholder={t('sop.editor.titleArabicPlaceholder')}
                  dir="rtl"
                  disabled={readOnly}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('sop.editor.description')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t('sop.editor.descriptionPlaceholder')}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description_ar">{t('sop.editor.descriptionArabic')}</Label>
                <Textarea
                  id="description_ar"
                  name="description_ar"
                  value={formData.description_ar}
                  onChange={handleInputChange}
                  placeholder={t('sop.editor.descriptionArabicPlaceholder')}
                  dir="rtl"
                  rows={3}
                  disabled={readOnly}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('sop.editor.categorization')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="department_id">{t('sop.editor.department')} *</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => handleSelectChange('department_id', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('sop.editor.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {i18n.language === 'ar' && dept.name_ar ? dept.name_ar : dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category_id">{t('sop.editor.category')}</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange('category_id', value)}
                  disabled={!formData.department_id || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('sop.editor.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => cat.department_id === formData.department_id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {i18n.language === 'ar' && category.name_ar ? category.name_ar : category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.category_id && (
                <div className="space-y-2">
                  <Label htmlFor="subcategory_id">{t('sop.editor.subcategory')}</Label>
                  <Select
                    value={formData.subcategory_id}
                    onValueChange={(value) => handleSelectChange('subcategory_id', value)}
                    disabled={!formData.category_id || readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('sop.editor.selectSubcategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        .filter(sub => sub.parent_id === formData.category_id)
                        .map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {i18n.language === 'ar' && subcategory.name_ar ? subcategory.name_ar : subcategory.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_template">{t('sop.editor.saveAsTemplate')}</Label>
                  <Switch
                    id="is_template"
                    checked={formData.is_template}
                    onCheckedChange={(checked) => handleSwitchChange('is_template', checked)}
                    disabled={readOnly}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('sop.edider.templateDescription')}
                </p>
              </div>
              
              {formData.is_template && (
                <div className="space-y-2">
                  <Label htmlFor="template_id">{t('sop.editor.basedOnTemplate')}</Label>
                  <Select
                    value={formData.template_id}
                    onValueChange={(value) => handleSelectChange('template_id', value)}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('sop.editor.selectTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* TODO: Fetch and list available templates */}
                      <SelectItem value="">{t('sop.editor.noTemplate')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('sop.editor.workflowSettings')}</h3>
              
              <div className="space-y-2">
                <Label>{t('sop.editor.approvalWorkflow')}</Label>
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t('sop.editor.approvalWorkflowDescription')}
                  </p>
                  
                  {/* TODO: Add workflow steps configuration */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        <Icons.user className="h-4 w-4" />
                        <span>{t('sop.editor.departmentHead')}</span>
                      </div>
                      <Icons.checkCircle className="h-4 w-4 text-green-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-50">
                      <div className="flex items-center space-x-2">
                        <Icons.users className="h-4 w-4" />
                        <span>{t('sop.editor.propertyManager')}</span>
                      </div>
                      <Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded opacity-50">
                      <div className="flex items-center space-x-2">
                        <Icons.shieldCheck className="h-4 w-4" />
                        <span>{t('sop.editor.regionalHR')}</span>
                      </div>
                      <Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    disabled={readOnly}
                    onClick={() => {
                      // TODO: Open workflow configuration modal
                    }}
                  >
                    <Icons.settings className="h-4 w-4 mr-2" />
                    {t('sop.editor.configureWorkflow')}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('sop.editor.notifications')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_publish">
                      {t('sop.editor.notifyOnPublish')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('sop.editor.notifyOnPublishDescription')}
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_publish" 
                    defaultChecked 
                    disabled={readOnly} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_approval">
                      {t('sop.editor.notifyOnApproval')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('sop.editor.notifyOnApprovalDescription')}
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_approval" 
                    defaultChecked 
                    disabled={readOnly} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify_on_comment">
                      {t('sop.editor.notifyOnComment')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('sop.editor.notifyOnCommentDescription')}
                    </p>
                  </div>
                  <Switch 
                    id="notify_on_comment" 
                    defaultChecked 
                    disabled={readOnly} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2">
        <Button 
          variant="default" 
          size="lg" 
          className="rounded-full w-12 h-12 p-0 shadow-lg"
          onClick={handleSubmit}
          disabled={isSaving || readOnly}
          title={t('submitForApproval')}
        >
          {isSaving ? (
            <Icons.spinner className="h-5 w-5 animate-spin" />
          ) : (
            <Icons.send className="h-5 w-5" />
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full w-12 h-12 p-0 shadow-lg"
          onClick={handleSaveDraft}
          disabled={isSaving}
          title={t('saveDraft')}
        >
          {isSaving ? (
            <Icons.spinner className="h-5 w-5 animate-spin" />
          ) : (
            <Icons.save className="h-5 w-5" />
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full w-12 h-12 p-0 shadow-lg"
          onClick={() => {
            // TODO: Open preview modal
          }}
          title={t('preview')}
        >
          <Icons.eye className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
