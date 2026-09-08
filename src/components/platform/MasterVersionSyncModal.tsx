import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService, type MasterContentDiff } from '@/services/platformService'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  FileText,
  Globe,
  GraduationCap,
  Layers,
  ListChecks,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

function stripHtml(html?: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

interface MasterVersionSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetContentId: string
  targetTitle: string
  contentType: 'sop' | 'course'
  currentVersion?: number
  onSyncComplete?: (newVersion: number) => void
}

export function MasterVersionSyncModal({
  open,
  onOpenChange,
  targetContentId,
  targetTitle,
  contentType,
  currentVersion = 1,
  onSyncComplete
}: MasterVersionSyncModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t, i18n } = useTranslation(['admin', 'training', 'knowledge', 'common'])
  const isRTL = i18n.dir() === 'rtl'

  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [diffData, setDiffData] = useState<MasterContentDiff | null>(null)
  const [triggerRetraining, setTriggerRetraining] = useState(true)
  const [triggerReacknowledgment, setTriggerReacknowledgment] = useState(true)
  const [diffLang, setDiffLang] = useState<'en' | 'ar'>('en')
  const [isSyncing, setIsSyncing] = useState(false)
  const [diffViewTab, setDiffViewTab] = useState<'overview' | 'comparison' | 'checklists'>('overview')

  useEffect(() => {
    if (open && targetContentId) {
      loadDiff()
    } else {
      setDiffData(null)
    }
  }, [open, targetContentId, contentType])

  const loadDiff = async () => {
    setIsLoadingDiff(true)
    try {
      const diff = await platformService.getMasterContentDiff(targetContentId, contentType)
      setDiffData(diff)
    } catch (err) {
      console.error('Failed to load master diff:', err)
    } finally {
      setIsLoadingDiff(false)
    }
  }

  const handleSync = async () => {
    if (!targetContentId || !user) return
    setIsSyncing(true)
    try {
      const res = await platformService.syncContentWithMaster({
        targetContentId,
        contentType,
        triggerRetraining: contentType === 'course' ? triggerRetraining : false,
        triggerReacknowledgment: contentType === 'sop' ? triggerReacknowledgment : false,
        updatedBy: user.id
      })

      if (res.success) {
        toast({
          title: t('common:success', 'Synchronized Successfully'),
          description: contentType === 'course' && triggerRetraining
            ? t('training:sync_success_retraining', 'Course synchronized to v{{version}} and mandatory retraining assigned to enrolled learners.', { version: res.updatedVersion })
            : triggerReacknowledgment
            ? t('knowledge:sync_success_sop_reack', 'SOP synchronized to v{{version}} and mandatory staff re-acknowledgment activated.', { version: res.updatedVersion })
            : t('knowledge:sync_success_sop', 'Content successfully updated to master version v{{version}}.', { version: res.updatedVersion })
        })
        onSyncComplete?.(res.updatedVersion)
        onOpenChange(false)
      } else {
        throw new Error(res.message || 'Synchronization failed')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to synchronize with master',
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const deployedVer = diffData?.deployedVersion ?? currentVersion ?? 1
  const masterVer = diffData?.masterVersion ?? deployedVer + 1
  const hasUpdate = diffData?.hasUpdateAvailable ?? (masterVer > deployedVer)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header with gradient banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 pb-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Crown className="h-4 w-4 text-amber-400" />
              <span>{t('admin:platform_master_sync', 'Platform Master Synchronization')}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              {contentType === 'sop' ? (
                <BookOpen className="h-5 w-5 text-indigo-300" />
              ) : (
                <GraduationCap className="h-5 w-5 text-indigo-300" />
              )}
              <span className="truncate">{targetTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-1">
              {t(
                'admin:master_sync_desc',
                'Synchronize your local tenant copy with upstream standards published by the Platform Training & Standards team.'
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Version Transition Display */}
          <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">{t('admin:current_tenant_version', 'Your Version')}:</span>
              <Badge variant="secondary" className="bg-white/20 text-white font-mono text-xs">
                v{deployedVer}.0
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-amber-300">
              <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">{t('admin:upstream_master_version', 'Master Version')}:</span>
              <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs">
                v{masterVer}.0
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isLoadingDiff ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-60" />
              <p className="text-sm">{t('admin:comparing_master_version', 'Comparing upstream master changes...')}</p>
            </div>
          ) : (
            <>
              {/* Sync Status Banner */}
              <div
                className={cn(
                  "p-3.5 rounded-lg border flex items-start gap-3 text-xs",
                  hasUpdate
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                )}
              >
                {hasUpdate ? (
                  <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {hasUpdate
                      ? t('admin:upstream_updates_available', 'Upstream Master Updates Available')
                      : t('admin:up_to_date_title', 'Already Aligned with Master Library')}
                  </div>
                  <p className="mt-0.5 opacity-90">
                    {hasUpdate
                      ? t(
                          'admin:upstream_updates_msg',
                          'The global master repository contains an updated revision with refined standards and material. Synchronizing will apply the master revisions to your local copy.'
                        )
                      : t(
                          'admin:up_to_date_msg',
                          'Your tenant copy is up to date with the latest platform master edition.'
                        )}
                  </p>
                </div>
              </div>

              {/* Diff Tabs */}
              <Tabs value={diffViewTab} onValueChange={(val: any) => setDiffViewTab(val)}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="overview" className="text-xs">
                    {t('admin:sync_overview', 'Sync Summary')}
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="text-xs">
                    {t('admin:content_comparison', 'Procedure & Content')}
                  </TabsTrigger>
                  <TabsTrigger value="checklists" className="text-xs">
                    {t('admin:checklists_diff', 'Checklists & Notes')}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-muted/40 rounded-lg border">
                      <span className="text-muted-foreground block mb-1">{t('admin:content_type', 'Content Type')}</span>
                      <span className="font-semibold capitalize flex items-center gap-1.5">
                        {contentType === 'sop' ? <FileText className="h-3.5 w-3.5 text-blue-600" /> : <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />}
                        {contentType === 'sop' ? 'Standard Operating Procedure (SOP)' : 'Training Curriculum & Course'}
                      </span>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border">
                      <span className="text-muted-foreground block mb-1">{t('admin:last_synced', 'Last Synced')}</span>
                      <span className="font-semibold font-mono">
                        {diffData?.lastSyncedAt
                          ? new Date(diffData.lastSyncedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : t('admin:never_synced', 'Initial Deployment')}
                      </span>
                    </div>
                  </div>

                  {/* Corporate Release Notes */}
                  {diffData?.releaseNotes && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>Corporate Revision Release Notes (v{masterVer}.0)</span>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed ps-5">
                        {diffData.releaseNotes}
                      </p>
                    </div>
                  )}

                  {/* Local Property Addendum Reassurance */}
                  {diffData?.localAddendum && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Local Property Addendum Preserved</span>
                        <p className="text-[11px] opacity-85 mt-0.5">
                          Your hotel property has custom local addendum notes. They will remain intact and will not be overwritten by this upstream synchronization.
                        </p>
                      </div>
                    </div>
                  )}

                  {diffData?.blueprintDifferences && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-600" />
                        {t('admin:curriculum_structure', 'Curriculum Structure & Specs')}
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-muted-foreground block">{t('admin:sections', 'Sections')}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {diffData.blueprintDifferences.masterSectionsCount || 0} {t('admin:sections_label', 'modules')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">{t('admin:duration', 'Duration')}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {diffData.blueprintDifferences.estimatedDurationMinutes || 45} {t('admin:minutes', 'min')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">{t('admin:level', 'Difficulty')}</span>
                          <span className="font-bold capitalize text-slate-900 dark:text-slate-100">
                            {diffData.blueprintDifferences.difficultyLevel || 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Side by Side Comparison with Bilingual Switch */}
                <TabsContent value="comparison" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" />
                      <span>Language Comparison View:</span>
                    </span>
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border text-xs">
                      <button
                        type="button"
                        onClick={() => setDiffLang('en')}
                        className={cn(
                          "px-2.5 py-1 rounded font-medium transition-all text-xs",
                          diffLang === 'en' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        English (EN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiffLang('ar')}
                        className={cn(
                          "px-2.5 py-1 rounded font-medium transition-all text-xs font-arabic",
                          diffLang === 'ar' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        العربية (AR)
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-2 bg-muted/60 p-2 font-semibold border-b">
                      <div>{t('admin:local_copy', 'Your Tenant Copy')} (v{deployedVer}.0)</div>
                      <div className="text-primary">{t('admin:upstream_master', 'Platform Master')} (v{masterVer}.0)</div>
                    </div>

                    {/* Title comparison */}
                    <div className="grid grid-cols-2 p-3 border-b gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                          {t('admin:title', 'Title')}
                        </span>
                        <p className="font-medium text-foreground">
                          {diffLang === 'ar'
                            ? (diffData?.targetTitleAr || 'لا يوجد عنوان بالعربية')
                            : (diffData?.targetTitle || targetTitle)}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-2 rounded">
                        <span className="text-[10px] text-primary uppercase font-bold block mb-0.5">
                          {t('admin:master_title', 'Master Title')}
                        </span>
                        <p className="font-medium text-primary">
                          {diffLang === 'ar'
                            ? (diffData?.masterTitleAr || 'لا يوجد عنوان بالعربية')
                            : (diffData?.masterTitle || targetTitle)}
                        </p>
                      </div>
                    </div>

                    {/* Description comparison */}
                    <div className="grid grid-cols-2 p-3 border-b gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                          {t('admin:description', 'Description')}
                        </span>
                        <p className="text-muted-foreground line-clamp-3">
                          {diffLang === 'ar'
                            ? (diffData?.targetDescriptionAr || 'لا يوجد وصف بالعربية')
                            : (diffData?.targetDescription || 'No local description')}
                        </p>
                      </div>
                      <div className="bg-primary/5 p-2 rounded">
                        <span className="text-[10px] text-primary uppercase font-bold block mb-0.5">
                          {t('admin:master_description', 'Master Description')}
                        </span>
                        <p className="text-foreground line-clamp-3">
                          {diffLang === 'ar'
                            ? (diffData?.masterDescriptionAr || 'لا يوجد وصف بالعربية')
                            : (diffData?.masterDescription || 'No master description')}
                        </p>
                      </div>
                    </div>

                    {/* Procedure Content Body Excerpt */}
                    {contentType === 'sop' && (
                      <div className="grid grid-cols-2 p-3 gap-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                            Procedure Body (Local)
                          </span>
                          <p className="text-muted-foreground text-[11px] line-clamp-5 whitespace-pre-line leading-relaxed">
                            {stripHtml(diffLang === 'ar' ? diffData?.targetContentAr : diffData?.targetContent) || 'No content body recorded'}
                          </p>
                        </div>
                        <div className="bg-primary/5 p-2 rounded">
                          <span className="text-[10px] text-primary uppercase font-bold block mb-0.5">
                            Procedure Body (Master Edition)
                          </span>
                          <p className="text-foreground text-[11px] line-clamp-5 whitespace-pre-line leading-relaxed">
                            {stripHtml(diffLang === 'ar' ? diffData?.masterContentAr : diffData?.masterContent) || 'No master content body'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Checklists & Notes */}
                <TabsContent value="checklists" className="space-y-3 pt-2">
                  <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <ListChecks className="h-4 w-4 text-emerald-600" />
                        <span>Interactive Operational Checklists ({diffData?.masterChecklistItems?.length || 0} Steps in Master)</span>
                      </span>
                    </div>

                    {(!diffData?.masterChecklistItems || diffData.masterChecklistItems.length === 0) ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        This procedure relies on narrative SOP guidelines without step-by-step checklists.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {diffData.masterChecklistItems.map((item: any, idx: number) => {
                          const itemText = typeof item === 'string' ? item : item.text || item.title || `Verification Step ${idx + 1}`
                          return (
                            <div key={idx} className="p-2 rounded-md bg-background border flex items-start gap-2 text-xs">
                              <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-foreground font-medium">{itemText}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Retraining Option for Courses */}
              {contentType === 'course' && (
                <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="retraining-checkbox"
                      checked={triggerRetraining}
                      onCheckedChange={(checked) => setTriggerRetraining(Boolean(checked))}
                      className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor="retraining-checkbox"
                        className="text-xs font-bold text-amber-950 cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                        {t('training:require_mandatory_retraining', 'Require Mandatory Retraining for Enrolled Learners')}
                      </label>
                      <p className="text-[11px] text-amber-900/80">
                        {t(
                          'training:retraining_explanation',
                          'Resets course completion status for all enrolled employees and sends notifications prompting them to complete the updated master syllabus.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mandatory Re-Acknowledgment Option for SOPs */}
              {contentType === 'sop' && (
                <div className="mt-4 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="reack-checkbox"
                      checked={triggerReacknowledgment}
                      onCheckedChange={(checked) => setTriggerReacknowledgment(Boolean(checked))}
                      className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor="reack-checkbox"
                        className="text-xs font-bold text-amber-950 dark:text-amber-200 cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                        {t('knowledge:require_mandatory_reack', 'Require Mandatory Re-Acknowledgment from Hotel Staff')}
                      </label>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                        {t(
                          'knowledge:reack_explanation',
                          'Resets previous staff sign-offs for v{{deployedVer}} and flags this v{{masterVer}} revision as mandatory reading for assigned department employees.',
                          { deployedVer, masterVer }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            {t('common:cancel', 'Cancel')}
          </Button>

          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || isLoadingDiff}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {t('admin:syncing_now', 'Synchronizing...')}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {t('admin:apply_master_sync', 'Synchronize to v{{version}}', { version: masterVer })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
