/**
 * DocumentPublishDialog - Dialog for publishing documents to Knowledge Base
 * 
 * This component provides a UI for converting document library files into
 * knowledge base articles with configurable metadata like title, description,
 * visibility, category, and acknowledgment requirements.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useProperty } from '@/contexts/PropertyContext';
import { useCategories } from '@/hooks/useKnowledge';
import { useDepartments } from '@/hooks/useDepartments';
import {
  usePublishDocumentToKnowledge,
  useCanPublishToKnowledge,
  type PublishToKnowledgeInput,
} from '@/hooks/usePublishDocumentToKnowledge';
import type { Document } from '@/lib/types';
import type { KnowledgeVisibility } from '@/types/knowledge';
import { FileText, BookOpen, Eye, Shield, Users, Building, Globe, Check, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface DocumentPublishDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const VISIBILITY_OPTIONS: {
  value: KnowledgeVisibility;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'department',
    label: 'Department Only',
    description: 'Visible only to members of the selected department',
    icon: Users,
  },
  {
    value: 'property',
    label: 'Property Wide',
    description: 'Visible to all staff at the selected property',
    icon: Building,
  },
  {
    value: 'all_properties',
    label: 'All Properties',
    description: 'Visible to all staff across all properties',
    icon: Globe,
  },
];

export function DocumentPublishDialog({
  document,
  open,
  onOpenChange,
  onSuccess,
}: DocumentPublishDialogProps) {
  const { t } = useTranslation();
  const { user, primaryRole } = useAuth();
  const { currentProperty } = useProperty();
  const { data: categories } = useCategories();
  const { departments } = useDepartments(currentProperty?.id);
  const publishMutation = usePublishDocumentToKnowledge();

  const canPublish = useCanPublishToKnowledge(document);
  const canAutoPublish = ['regional_admin', 'regional_hr', 'corporate_admin'].includes(
    primaryRole || ''
  );

  // Form state
  const [title, setTitle] = useState(document?.title || '');
  const [description, setDescription] = useState(document?.description || '');
  const [visibility, setVisibility] = useState<KnowledgeVisibility>('property');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Reset form when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDescription(document.description || '');
      setVisibility('property');
      setDepartmentId(document.department_id || '');
      setCategoryId('');
      setRequiresAcknowledgment(false);
      setAutoPublish(false);
      setTags([]);
    }
  }, [document?.id, open]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handlePublish = async () => {
    if (!document) return;

    if (!title.trim()) {
      toast.error(t('documents:publish.titleRequired', 'Title is required'));
      return;
    }

    if (visibility === 'department' && !departmentId) {
      toast.error(t('documents:publish.departmentRequired', 'Department is required for department visibility'));
      return;
    }

    const input: PublishToKnowledgeInput = {
      documentId: document.id,
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      propertyId: currentProperty?.id,
      departmentId: visibility === 'department' ? departmentId : undefined,
      categoryId: categoryId || undefined,
      requiresAcknowledgment,
      autoPublish: canAutoPublish && autoPublish,
      tags,
    };

    const result = await publishMutation.mutateAsync(input);

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  if (!document) return null;

  const selectedVisibility = VISIBILITY_OPTIONS.find((v) => v.value === visibility);
  const VisibilityIcon = selectedVisibility?.icon || Eye;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {t('documents:publish.title', 'Publish to Knowledge Base')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'documents:publish.description',
              'Convert this document into a knowledge base article that can be discovered and accessed by your team.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Document Preview */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{document.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {document.file_extension?.toUpperCase()} • {document.file_size} bytes
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('documents:publish.articleTitle', 'Article Title')}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('documents:publish.titlePlaceholder', 'Enter a title for the knowledge base article')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t('documents:publish.description', 'Description')}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t('documents:publish.descriptionPlaceholder', 'Briefly describe what this document contains')}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <Label>{t('documents:publish.visibility', 'Visibility')}</Label>
              <div className="grid grid-cols-1 gap-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = visibility === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department Selection (if visibility is department) */}
            {visibility === 'department' && (
              <div className="space-y-2">
                <Label htmlFor="department">
                  {t('documents:publish.department', 'Department')}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('documents:publish.selectDepartment', 'Select a department')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                {t('documents:publish.category', 'Category')}
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('documents:publish.selectCategory', 'Select a category (optional)')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t('documents:publish.tags', 'Tags')}</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('documents:publish.tagPlaceholder', 'Add a tag')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  {t('common:add', 'Add')}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Acknowledgment Requirement */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="acknowledgment" className="cursor-pointer">
                    {t('documents:publish.requiresAcknowledgment', 'Require Acknowledgment')}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'documents:publish.acknowledgmentDescription',
                    'Staff must acknowledge they have read this document'
                  )}
                </p>
              </div>
              <Switch
                id="acknowledgment"
                checked={requiresAcknowledgment}
                onCheckedChange={setRequiresAcknowledgment}
              />
            </div>

            {/* Auto-publish (only for privileged roles) */}
            {canAutoPublish && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="autoPublish" className="cursor-pointer">
                    {t('documents:publish.autoPublish', 'Publish Immediately')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'documents:publish.autoPublishDescription',
                      'Skip review and publish immediately. Otherwise, it will be saved as a draft.'
                    )}
                  </p>
                </div>
                <Switch
                  id="autoPublish"
                  checked={autoPublish}
                  onCheckedChange={setAutoPublish}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!canPublish.canPublish || publishMutation.isPending || !title.trim()}
            className="gap-2"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('documents:publish.publishing', 'Publishing...')}
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                {canAutoPublish && autoPublish
                  ? t('documents:publish.publishNow', 'Publish Now')
                  : t('documents:publish.submitForReview', 'Submit for Review')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
