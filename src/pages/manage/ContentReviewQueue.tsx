/**
 * ContentReviewQueue
 * ----------------------------------------------------------------------------
 * The shared governance review queue: every piece of content (course / article
 * / assessment) currently sitting in `in_review`, plus courses whose grounding
 * document has moved on since the course was last reviewed.
 *
 * Managers approve or request changes inline. Filter by content type / owner.
 *
 * Route: /manage/review-queue  (see src/routes/modules/ManageRoutes.tsx)
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Columns,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { isContentManagerRole, type ContentType } from '@/lib/contentLifecycle'
import {
  approve as approveTransition,
  listOpenSourceChangeFlags,
  listReviewQueue,
  requestChanges as requestChangesTransition,
  resolveSourceChangeFlag,
  scanSourceChanges,
  type ReviewQueueItem,
} from '@/services/contentLifecycleService'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<ContentType, { label: string; icon: any; badgeClass: string }> = {
  course: {
    label: 'Training Course',
    icon: GraduationCap,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  article: {
    label: 'SOP / Article',
    icon: FileText,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
  },
  assessment: {
    label: 'Assessment Quiz',
    icon: HelpCircle,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
}

type PendingAction = { item: ReviewQueueItem; action: 'approve' | 'requestChanges' }

export default function ContentReviewQueue() {
  const { roles, primaryRole } = useAuth()
  const queryClient = useQueryClient()

  const isManager = useMemo(() => {
    if (isContentManagerRole(primaryRole)) return true
    return (roles ?? []).some((r) => isContentManagerRole(r?.role))
  }, [roles, primaryRole])

  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [previewItem, setPreviewItem] = useState<ReviewQueueItem | null>(null)
  const [notes, setNotes] = useState('')

  const queueQuery = useQuery({
    queryKey: ['content-review-queue', typeFilter],
    queryFn: () =>
      listReviewQueue(typeFilter === 'all' ? undefined : { contentType: typeFilter }),
  })

  const flagsQuery = useQuery({
    queryKey: ['source-change-flags'],
    queryFn: listOpenSourceChangeFlags,
  })

  const items = useMemo(() => {
    const rows = queueQuery.data ?? []
    if (!ownerFilter.trim()) return rows
    const needle = ownerFilter.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (r.ownerId ?? '').toLowerCase().includes(needle) ||
        (r.review.submitted_by ?? '').toLowerCase().includes(needle) ||
        (r.title ?? '').toLowerCase().includes(needle),
    )
  }, [queueQuery.data, ownerFilter])

  const decisionMutation = useMutation({
    mutationFn: async ({ item, action }: PendingAction) => {
      const input = {
        contentType: item.review.content_type,
        contentId: item.review.content_id,
        actor: 'manager' as const,
        notes: notes.trim() || undefined,
      }
      return action === 'approve'
        ? approveTransition(input)
        : requestChangesTransition(input)
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === 'approve' ? 'Content approved and published.' : 'Sent back to author with changes requested.',
      )
      queryClient.invalidateQueries({ queryKey: ['content-review-queue'] })
      setPending(null)
      setNotes('')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Review action failed')
    },
  })

  const resolveFlagMutation = useMutation({
    mutationFn: (flagId: string) => resolveSourceChangeFlag(flagId),
    onSuccess: () => {
      toast.success('Flag resolved.')
      queryClient.invalidateQueries({ queryKey: ['source-change-flags'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not clear flag')
    },
  })

  const scanMutation = useMutation({
    mutationFn: scanSourceChanges,
    onSuccess: (count) => {
      toast.success(`Source scan complete: ${count} course${count === 1 ? '' : 's'} flagged for update.`)
      queryClient.invalidateQueries({ queryKey: ['source-change-flags'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Scan failed')
    },
  })

  const QUICK_REASONS = [
    'Approved - meets five-star luxury standards',
    'Please align quiz items with updated SOP steps',
    'Update department scope and permissions',
    'Re-verify Arabic translations before final sign-off',
  ]

  if (!isManager) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ClipboardCheck className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-serif font-bold text-slate-900">Review Access Restricted</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          You need a content manager or governance reviewer role to inspect and approve submitted hotel procedures and training courses.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-hotel-navy via-[#1b2a47] to-[#0f172a] text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-hotel-gold/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-hotel-gold">Quality & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white flex items-center gap-3">
            <span>Content Governance & Review Queue</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Centralized approval hub for training courses, standard operating procedures, and checkpoint assessments across all hotel properties.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-xs font-bold text-xs h-9"
          >
            {scanMutation.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin text-hotel-gold" />
            ) : (
              <RefreshCw className="me-2 h-4 w-4 text-hotel-gold" />
            )}
            Scan Source Docs
          </Button>
        </div>
      </div>

      {/* Filter Surface */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | ContentType)}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-slate-50 border-slate-200 font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content Types</SelectItem>
                <SelectItem value="course">Training Courses</SelectItem>
                <SelectItem value="article">SOPs & Policies</SelectItem>
                <SelectItem value="assessment">Assessments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              className="w-[260px] h-9 ps-8 text-xs bg-slate-50 border-slate-200"
              placeholder="Filter by title or owner..."
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500">
          <span className="font-bold text-slate-800">{items.length}</span> item{items.length === 1 ? '' : 's'} awaiting decision
        </div>
      </div>

      {/* Source-Change Flags Banner */}
      {(flagsQuery.data?.length ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-bold text-amber-900">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Courses Out of Sync with SOPs ({flagsQuery.data?.length})
              </span>
              <span className="text-[11px] font-normal text-amber-700">Source SOPs were revised after course approval</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagsQuery.data?.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    Course <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{flag.training_module_id.slice(0, 8)}</code>
                    {' '}— Grounding document was updated{' '}
                    <strong>{formatDistanceToNow(new Date(flag.source_updated_at), { addSuffix: true })}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                  onClick={() => resolveFlagMutation.mutate(flag.id)}
                  disabled={resolveFlagMutation.isPending}
                >
                  Mark Re-verified
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review Queue Items */}
      {queueQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-slate-900">All Content is Approved</h3>
            <p className="text-sm text-slate-500 mt-1">
              There are no courses, articles, or quizzes currently pending managerial review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.review.content_type] || TYPE_CONFIG.article
            const Icon = config.icon

            return (
              <Card
                key={item.review.id}
                className="border-slate-200/80 hover:border-hotel-gold/60 transition-all duration-200 shadow-2xs hover:shadow-md bg-white rounded-xl overflow-hidden"
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-hotel-navy/5 text-hotel-navy shrink-0 border border-hotel-navy/10 mt-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[10px] font-bold uppercase tracking-wider h-5 px-2 py-0 border", config.badgeClass)}>
                          {config.label}
                        </Badge>
                        <h3 className="font-serif font-bold text-base text-slate-900 truncate">{item.title}</h3>
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold h-5 px-2 py-0 animate-pulse">
                          Pending Review
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Submitted {formatDistanceToNow(new Date(item.review.submitted_at), { addSuffix: true })}</span>
                        {item.ownerId && <span>· Owner: <code className="font-mono">{item.ownerId.slice(0, 8)}</code></span>}
                      </p>
                      {item.review.review_notes && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                          &ldquo;{item.review.review_notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 font-semibold"
                      onClick={() => setPreviewItem(item)}
                    >
                      <Eye className="me-1.5 h-3.5 w-3.5 text-slate-500" />
                      Inspect Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs"
                      onClick={() => {
                        setNotes('')
                        setPending({ item, action: 'approve' })
                      }}
                    >
                      <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold text-xs h-9"
                      onClick={() => {
                        setNotes('')
                        setPending({ item, action: 'requestChanges' })
                      }}
                    >
                      <MessageSquare className="me-1.5 h-3.5 w-3.5" />
                      Request Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Decision Dialog */}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-hotel-gold">
                {pending?.action === 'approve' ? 'Final Approval' : 'Revisions Required'}
              </span>
            </div>
            <DialogTitle className="font-serif text-xl font-bold text-slate-900">
              {pending?.action === 'approve' ? 'Approve & Publish Content' : 'Request Changes from Author'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {pending?.item.title} &mdash; {pending && TYPE_CONFIG[pending.item.review.content_type]?.label}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {pending?.action === 'requestChanges' && (
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Quick Presets:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNotes(preset)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {pending?.action === 'approve' ? 'Approval Notes (optional)' : 'Detailed Feedback / Instructions for Author'}
              </Label>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={pending?.action === 'approve' ? 'Add optional sign-off remarks...' : 'Clearly explain what sections need adjustment...'}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => pending && decisionMutation.mutate(pending)}
              disabled={
                decisionMutation.isPending ||
                (pending?.action === 'requestChanges' && !notes.trim())
              }
              className={cn(
                "text-xs font-bold text-white shadow-sm",
                pending?.action === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {decisionMutation.isPending && <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" />}
              {pending?.action === 'approve' ? 'Sign Off & Publish' : 'Send Back for Revisions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Inspector Modal */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn("text-[10px] font-bold uppercase", previewItem && TYPE_CONFIG[previewItem.review.content_type]?.badgeClass)}>
                {previewItem && TYPE_CONFIG[previewItem.review.content_type]?.label}
              </Badge>
              <Badge className="bg-amber-500 text-white text-[10px] font-bold">Pending Review</Badge>
            </div>
            <DialogTitle className="font-serif text-xl font-bold text-slate-900">
              {previewItem?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Content ID:</span>
                <code className="font-mono text-slate-800">{previewItem?.review.content_id}</code>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Submitted by:</span>
                <span className="font-medium text-slate-800">{previewItem?.review.submitted_by || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Submission Date:</span>
                <span className="font-medium text-slate-800">{previewItem && new Date(previewItem.review.submitted_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Owner ID:</span>
                <code className="font-mono text-slate-800">{previewItem?.ownerId || 'Unassigned'}</code>
              </div>
            </div>

            {previewItem?.review.review_notes && (
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Author's Submission Remarks:</span>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 italic">
                  {previewItem.review.review_notes}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!previewItem) return
                if (previewItem.review.content_type === 'article') {
                  window.open(`/knowledge/${previewItem.review.content_id}`, '_blank')
                } else if (previewItem.review.content_type === 'course') {
                  window.open(`/learning/training/${previewItem.review.content_id}`, '_blank')
                } else {
                  window.open(`/assessments/questions/${previewItem.review.content_id}`, '_blank')
                }
              }}
              className="text-xs"
            >
              <Eye className="me-1.5 h-3.5 w-3.5" />
              Open Live Resource
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPreviewItem(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
