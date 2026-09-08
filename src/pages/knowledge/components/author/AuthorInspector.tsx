import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { MultiDepartmentSelector } from '@/components/shared/MultiDepartmentSelector'
import { VisualContentBuilder } from '@/components/knowledge'
import type { KnowledgeVisibility } from '@/types/knowledge'
import {
  Building2,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderOpen,
  Gauge,
  Image as ImageIcon,
  LifeBuoy,
  List,
  Loader2,
  Paperclip,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface AuthorInspectorProps {
  activeTab?: 'publishing' | 'media' | 'governance'
  onActiveTabChange?: (tab: 'publishing' | 'media' | 'governance') => void
  formData: any
  onUpdateField: (field: string, value: any) => void
  departments: any[]
  properties: any[]
  categories: any[]
  trainingModules?: Array<{ id: string; title: string }>
  currentProperty: any
  currentBrand: any
  currentHotel: any
  isPlatformAdmin: boolean
  user: any
  visibilityOptions: Array<{ value: KnowledgeVisibility; label: string; description: string }>
  visibilitySummary: string
  // Media actions
  onOpenDocumentPicker: () => void
  onOpenMediaPicker: () => void
  onOpenVideoPicker: () => void
  isUploadingPdf: boolean
  onUploadPdf: (file: File) => void
  // AI summary
  onGenerateSummary: () => void
  isGeneratingSummary: boolean
  // Versioning
  isEditing: boolean
  releaseNotes: string
  onReleaseNotesChange: (v: string) => void
  masterDeploymentCount?: number | null
}

export function AuthorInspector({
  activeTab = 'publishing',
  onActiveTabChange,
  formData,
  onUpdateField,
  departments,
  properties,
  categories,
  trainingModules,
  currentProperty,
  currentBrand,
  currentHotel,
  isPlatformAdmin,
  user,
  visibilityOptions,
  visibilitySummary,
  onOpenDocumentPicker,
  onOpenMediaPicker,
  onOpenVideoPicker,
  isUploadingPdf,
  onUploadPdf,
  onGenerateSummary,
  isGeneratingSummary,
  isEditing,
  releaseNotes,
  onReleaseNotesChange,
  masterDeploymentCount,
}: AuthorInspectorProps) {
  const { t } = useTranslation(['knowledge', 'common'])
  const [currentTab, setCurrentTab] = useState<'publishing' | 'media' | 'governance'>(activeTab)
  const [showComplianceNotes, setShowComplianceNotes] = useState(false)

  const handleTabChange = (val: string) => {
    const nextTab = val as 'publishing' | 'media' | 'governance'
    setCurrentTab(nextTab)
    onActiveTabChange?.(nextTab)
  }

  return (
    <div className="space-y-3">
      {/* 3-Tab Selector */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/60 p-1">
          <TabsTrigger value="publishing" className="text-xs h-7 gap-1 font-medium data-[state=active]:bg-background">
            <Settings className="w-3.5 h-3.5" />
            <span>Publishing</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs h-7 gap-1 font-medium data-[state=active]:bg-background">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Media</span>
            {(formData.video_url || formData.file_url) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </TabsTrigger>
          <TabsTrigger value="governance" className="text-xs h-7 gap-1 font-medium data-[state=active]:bg-background">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Governance</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: PUBLISHING & SCOPE                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="publishing" className="space-y-4 mt-3">
          
          {/* 1. Department & Classification */}
          <Card className="shadow-xs border-border">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <List className="h-3.5 w-3.5 text-hotel-gold" />
                <span>Team & Classification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {t('editor.main_team_topic', 'Department / Team')} <span className="text-red-500">*</span>
                </Label>
                <GroupedDepartmentSelector
                  departments={departments}
                  properties={properties}
                  value={formData.department_id || 'none'}
                  onValueChange={(v) => {
                    onUpdateField('department_id', v === 'none' ? null : v)
                    onUpdateField('category_id', null)
                  }}
                  placeholder={t('editor.select_department', 'Select main team...')}
                  generalLabel={t('editor.general_department')}
                  className="w-full text-xs"
                />
              </div>

              {formData.department_id && (
                <div className="pt-2 border-t border-dashed">
                  <Label className="text-xs font-semibold mb-1 block">
                    {t('editor.category_optional', 'Sub-Category (Optional)')}
                  </Label>
                  <Select
                    value={formData.category_id || 'none'}
                    onValueChange={(v) => onUpdateField('category_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="w-full text-xs bg-background">
                      <SelectValue placeholder={t('editor.category_optional', 'Sub-Category (Optional)')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('editor.general_category', 'General Topic')}</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Audience & Scope */}
          <Card className="shadow-xs border-border">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-hotel-gold" />
                <span>Audience & Hotel Scope</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3.5">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {t('editor.viewer_group', 'Viewer Scope')}
                </Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => onUpdateField('visibility', v as KnowledgeVisibility)}
                >
                  <SelectTrigger className="w-full text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-xs">{o.label}</span>
                          <span className="text-[10px] text-muted-foreground">{o.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.visibility === 'specific_departments' && (
                  <div className="mt-2.5">
                    <Label className="text-xs font-semibold mb-1 block">
                      {t('editor.visibility.specific_departments_label', 'Select Teams')}
                    </Label>
                    <MultiDepartmentSelector
                      departments={departments}
                      properties={properties}
                      value={formData.specific_department_ids}
                      onValueChange={(v) => onUpdateField('specific_department_ids', v)}
                      placeholder={t('editor.visibility.select_depts', 'Select teams...')}
                    />
                  </div>
                )}

                {user && (formData.visibility === 'property' || formData.visibility === 'department') && (
                  <div className="mt-2.5">
                    <Label className="text-xs font-semibold mb-1 block">
                      {t('editor.which_hotel', 'Hotel Property')}
                    </Label>
                    <Select
                      value={formData.target_property_id || 'current'}
                      onValueChange={(v) => onUpdateField('target_property_id', v === 'current' ? null : v)}
                    >
                      <SelectTrigger className="w-full text-xs bg-background">
                        <Building2 className="me-1.5 h-3.5 w-3.5 opacity-50" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">
                          Current Hotel ({currentProperty?.name || 'Head Office'})
                        </SelectItem>
                        {properties
                          ?.filter((p) => p.id !== currentProperty?.id && p.id !== 'all')
                          .map((prop) => (
                            <SelectItem key={prop.id} value={prop.id}>
                              {prop.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="mt-2 p-2 rounded bg-muted/40 border text-[11px] text-muted-foreground">
                  {visibilitySummary}
                </div>
              </div>

              {/* Multi-Tenant Scope Level */}
              <div className="pt-2 border-t space-y-1">
                <Label className="text-xs font-semibold block">Tenant Scope Level</Label>
                <Select
                  value={formData.scope_type}
                  onValueChange={(v) => onUpdateField('scope_type', v as any)}
                >
                  <SelectTrigger className="w-full text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">Organization-wide (All brands & hotels)</SelectItem>
                    <SelectItem value="brand">Brand-specific ({currentBrand?.name || 'Brand'})</SelectItem>
                    <SelectItem value="hotel">Hotel-specific ({currentHotel?.name || 'Hotel'})</SelectItem>
                    <SelectItem value="department">Department-specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mandatory Read Confirmation */}
              <div className="pt-2 border-t flex items-center justify-between">
                <Label className="text-xs font-medium cursor-pointer" htmlFor="ack-switch">
                  {t('editor.require_read_confirmation', 'Mandatory Read Confirmation')}
                </Label>
                <Switch
                  id="ack-switch"
                  checked={formData.requires_acknowledgment}
                  onCheckedChange={(v) => onUpdateField('requires_acknowledgment', v)}
                />
              </div>

              {/* Linked Training Course */}
              <div className="pt-2 border-t space-y-1">
                <Label className="text-xs font-semibold block">Linked Training Course</Label>
                <Select
                  value={formData.linked_training_id || 'none'}
                  onValueChange={(v) => onUpdateField('linked_training_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="w-full text-xs bg-background">
                    <SelectValue placeholder={t('editor.select_training_module', 'Select course...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('editor.no_linked_training', 'None (No course linked)')}</SelectItem>
                    {trainingModules?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Master SOP Template Toggle */}
              {isPlatformAdmin && (
                <div className="pt-2 border-t flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer" htmlFor="master-switch">
                      Master SOP Template
                    </Label>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                      Publish to Platform Master Library for cross-tenant distribution
                    </p>
                  </div>
                  <Switch
                    id="master-switch"
                    checked={formData.is_master_template}
                    onCheckedChange={(v) => onUpdateField('is_master_template', v)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Executive TL;DR Summary */}
          <Card className="shadow-xs border-border">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5 text-hotel-gold" />
                  <span>Executive Summary (TL;DR)</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGenerateSummary}
                  disabled={isGeneratingSummary || !formData.content}
                  className="h-6 text-[10px] text-hotel-navy dark:text-hotel-gold hover:bg-hotel-gold/10 px-1.5 gap-1"
                >
                  <Sparkles className="w-3 h-3 text-hotel-gold" />
                  AI Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  English
                </Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => onUpdateField('summary', e.target.value)}
                  placeholder="2-3 sentence overview of this SOP..."
                  rows={2}
                  maxLength={300}
                  className="text-xs bg-background"
                />
              </div>

              <div className="space-y-1 pt-1 border-t border-dashed">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  العربية
                </Label>
                <Textarea
                  value={formData.summary_ar}
                  onChange={(e) => onUpdateField('summary_ar', e.target.value)}
                  dir="rtl"
                  placeholder="ملخص تنفيذي موجز بالعربية..."
                  rows={2}
                  maxLength={300}
                  className="text-xs bg-background"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: MEDIA & ATTACHMENTS                                               */}
        {/* ========================================================================= */}
        <TabsContent value="media" className="space-y-4 mt-3">
          
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenDocumentPicker}
              className="text-xs h-8 font-medium gap-1 px-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
              <span className="truncate">Doc Library</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenMediaPicker}
              className="text-xs h-8 font-medium gap-1 px-1.5"
            >
              <ImageIcon className="h-3.5 w-3.5 text-hotel-gold shrink-0" />
              <span className="truncate">Images</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenVideoPicker}
              className="text-xs h-8 font-medium gap-1 px-1.5 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50/60 dark:hover:bg-rose-950/20"
            >
              <VideoIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Link Video</span>
            </Button>
          </div>

          {/* Linked Video Card with Interactive Player */}
          {formData.video_url && (
            <div className="space-y-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <VideoIcon className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="font-semibold text-foreground truncate">
                    {decodeURIComponent(formData.video_url.split('/').pop()?.split('?')[0] || 'Linked Video')}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5 shrink-0">
                  ✓ Linked
                </Badge>
              </div>

              {/* Video Preview Player */}
              <div className="relative rounded-md overflow-hidden bg-black aspect-video max-h-36 flex items-center justify-center border border-slate-700/30">
                {formData.video_url.includes('youtube.com') || formData.video_url.includes('youtu.be') ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-white bg-red-950/40 p-2 text-center">
                    <VideoIcon className="w-7 h-7 text-red-500 mb-1" />
                    <span className="text-[11px] font-medium">YouTube Video Attached</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-xs text-white underline h-6 p-0 mt-0.5"
                      onClick={() => window.open(formData.video_url, '_blank')}
                    >
                      Open to watch
                    </Button>
                  </div>
                ) : (
                  <video
                    src={formData.video_url}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain max-h-36"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
                  onClick={onOpenVideoPicker}
                >
                  <RefreshCw className="w-3 h-3 me-1" /> Replace
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(formData.video_url, '_blank')}
                    title="Open video in new tab"
                  >
                    <ExternalLink className="w-3 h-3 me-1" /> Open
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100/50 dark:hover:bg-rose-950/50"
                    onClick={() => onUpdateField('video_url', '')}
                  >
                    <Trash2 className="w-3 h-3 me-1" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Attached Document (PDF) */}
          {formData.file_url && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/30 text-xs">
              <span className="truncate text-foreground font-medium">
                📎 {decodeURIComponent(formData.file_url.split('/').pop()?.split('?')[0] || formData.file_url)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5">
                  Linked
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                  onClick={() => onUpdateField('file_url', '')}
                  title="Remove attached document"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* PDF Upload */}
          <div className="p-3 rounded-lg border border-dashed bg-muted/20 space-y-2">
            <Label className="text-xs font-semibold block">Upload SOP Document (PDF)</Label>
            <Input
              type="file"
              accept=".pdf"
              disabled={isUploadingPdf}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadPdf(file)
              }}
              className="text-xs h-8 file:text-xs"
            />
            {isUploadingPdf && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning & uploading document...</span>
              </div>
            )}
          </div>

          {/* External Web Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold block">External Reference URL</Label>
            <Input
              value={formData.file_url}
              onChange={(e) => onUpdateField('file_url', e.target.value)}
              placeholder="https://..."
              className="text-xs h-8 bg-background"
            />
          </div>

          {/* Step-by-Step Visual Gallery */}
          {(formData.content_type === 'visual' || (formData.images && formData.images.length > 0)) && (
            <div className="pt-2 border-t">
              <Label className="text-xs font-semibold mb-2 block">Step-by-Step Image Gallery</Label>
              <VisualContentBuilder
                images={formData.images}
                onChange={(imgs) => onUpdateField('images', imgs)}
              />
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: GOVERNANCE & AI COMPLIANCE                                         */}
        {/* ========================================================================= */}
        <TabsContent value="governance" className="space-y-4 mt-3">
          
          {/* AI Compliance Scorecard */}
          {formData.ai_compliance_score != null ? (
            <Card className="shadow-xs border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  <Gauge className="h-3.5 w-3.5 text-emerald-600" />
                  <span>AI Five-Star Compliance Audit</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white font-bold px-2 py-0.5">
                    Score: {formData.ai_compliance_score}/100
                  </Badge>
                  {formData.ai_compliance_checked_at && (
                    <span className="text-[10px] text-muted-foreground">
                      Audited {new Date(formData.ai_compliance_checked_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {formData.ai_compliance_notes?.length > 0 && (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComplianceNotes((v) => !v)}
                      className="h-6 px-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 me-1 transition-transform ${showComplianceNotes ? 'rotate-180' : ''}`} />
                      {showComplianceNotes ? 'Hide audit notes' : `Show ${formData.ai_compliance_notes.length} compliance findings`}
                    </Button>

                    {showComplianceNotes && (
                      <ul className="mt-1.5 space-y-1 ps-1">
                        {formData.ai_compliance_notes.map((note: string, idx: number) => (
                          <li key={idx} className="text-[11px] text-muted-foreground flex gap-1.5">
                            <span className="text-emerald-500 shrink-0">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {(formData.ai_model_used || formData.ai_provider_used) && (
                  <p className="text-[10px] text-muted-foreground pt-1 border-t border-dashed">
                    Generated via {[formData.ai_provider_used, formData.ai_model_used].filter(Boolean).join(' / ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>No automated compliance score recorded for this draft.</span>
            </div>
          )}

          {/* Master Content Deployments */}
          {formData.is_master_template && masterDeploymentCount != null && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5">
                <span>Master Deployment Status</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Deployed across {masterDeploymentCount} hotel properties.
              </p>
            </div>
          )}

          {/* Version Release Notes */}
          {isEditing && (
            <Card className="shadow-xs border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                  <Tag className="h-3.5 w-3.5 text-hotel-gold" />
                  <span>Version Revision Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                <Textarea
                  value={releaseNotes}
                  onChange={(e) => onReleaseNotesChange(e.target.value)}
                  placeholder="Explain what changed in this version update (e.g. Updated PMS check-in step 3)..."
                  rows={3}
                  className="text-xs bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Recorded in the audit trail for hotel compliance and revision history.
                </p>
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AuthorInspector
