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
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
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

const TYPE_LABEL: Record<ContentType, string> = {
  course: 'Course',
  article: 'Article',
  assessment: 'Assessment',
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
        (r.review.submitted_by ?? '').toLowerCase().includes(needle),
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
        variables.action === 'approve' ? 'Approved.' : 'Sent back for changes.',
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
      toast.success('Flag cleared.')
      queryClient.invalidateQueries({ queryKey: ['source-change-flags'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not clear flag')
    },
  })

  const scanMutation = useMutation({
    mutationFn: scanSourceChanges,
    onSuccess: (count) => {
      toast.success(`Scan complete: ${count} new flag${count === 1 ? '' : 's'}.`)
      queryClient.invalidateQueries({ queryKey: ['source-change-flags'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Scan failed')
    },
  })

  if (!isManager) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ClipboardCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Review queue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need a content-manager role to review submitted content.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Content review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses, articles and assessments awaiting review.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          Scan source docs
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Type</Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | ContentType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="course">Courses</SelectItem>
              <SelectItem value="article">Articles</SelectItem>
              <SelectItem value="assessment">Assessments</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Owner (id)</Label>
          <Input
            className="w-[260px]"
            placeholder="Filter by owner / submitter id"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Source-change flags */}
      {(flagsQuery.data?.length ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Courses needing re-review ({flagsQuery.data?.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flagsQuery.data?.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2 text-sm"
              >
                <span>
                  Course <code className="text-xs">{flag.training_module_id.slice(0, 8)}</code>{' '}
                  &mdash; source doc updated{' '}
                  {formatDistanceToNow(new Date(flag.source_updated_at), { addSuffix: true })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveFlagMutation.mutate(flag.id)}
                  disabled={resolveFlagMutation.isPending}
                >
                  Clear
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Queue */}
      {queueQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <p className="font-medium">Nothing waiting for review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.review.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="outline">{TYPE_LABEL[item.review.content_type]}</Badge>
                    <h3 className="truncate font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(item.review.submitted_at), { addSuffix: true })}
                    {item.ownerId ? ` · owner ${item.ownerId.slice(0, 8)}` : ''}
                  </p>
                  {item.review.review_notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      &ldquo;{item.review.review_notes}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setNotes('')
                      setPending({ item, action: 'approve' })
                    }}
                  >
                    <CheckCircle2 className="me-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNotes('')
                      setPending({ item, action: 'requestChanges' })
                    }}
                  >
                    <MessageSquare className="me-1 h-4 w-4" />
                    Request changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === 'approve' ? 'Approve content' : 'Request changes'}
            </DialogTitle>
            <DialogDescription>
              {pending?.item.title} &mdash; {pending && TYPE_LABEL[pending.item.review.content_type]}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="mb-1 block text-sm">
              {pending?.action === 'approve' ? 'Notes (optional)' : 'What needs to change?'}
            </Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pending && decisionMutation.mutate(pending)}
              disabled={
                decisionMutation.isPending ||
                (pending?.action === 'requestChanges' && !notes.trim())
              }
            >
              {decisionMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
