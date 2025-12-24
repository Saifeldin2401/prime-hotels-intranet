import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useRequest,
  useRequestAction,
  useRequestAttachments,
  useRequestComments,
  useRequestEvents,
  useRequestSteps,
  type RequestRow,
  type RequestStatus,
} from '@/hooks/useRequests'
import type { LeaveRequest, Profile } from '@/lib/types'

function statusBadge(status: RequestStatus) {
  const map: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    pending_supervisor_approval: { label: 'Pending Supervisor Approval', variant: 'outline' },
    pending_hr_review: { label: 'Pending HR Review', variant: 'outline' },
    approved: { label: 'Approved', variant: 'default' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    returned_for_correction: { label: 'Returned for Correction', variant: 'outline' },
    closed: { label: 'Closed', variant: 'secondary' },
  }

  const cfg = map[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, primaryRole } = useAuth()

  const [comment, setComment] = useState('')
  const [visibility, setVisibility] = useState<'all' | 'internal'>('all')

  const [actionDialog, setActionDialog] = useState<
    null | 'approve' | 'reject' | 'return' | 'forward' | 'close' | 'comment'
  >(null)
  const [forwardTo, setForwardTo] = useState<string>('')

  const requestQuery = useRequest(id)
  const stepsQuery = useRequestSteps(id)
  const eventsQuery = useRequestEvents(id)
  const commentsQuery = useRequestComments(id)
  const attachmentsQuery = useRequestAttachments(id)

  const actionMutation = useRequestAction()

  const request = requestQuery.data

  const isHr = primaryRole === 'regional_hr' || primaryRole === 'property_hr'
  const isAdmin = primaryRole === 'regional_admin'
  const isAssignee = !!user?.id && request?.current_assignee_id === user.id
  const canAct = isAssignee || isHr || isAdmin

  const leaveQuery = useQuery({
    queryKey: ['leave-request', request?.entity_id],
    enabled: !!request && request.entity_type === 'leave_request',
    queryFn: async () => {
      if (!request) throw new Error('Missing request')

      const { data, error } = await supabase
        .from('leave_requests')
        .select(
          `
          *,
          requester:profiles!leave_requests_requester_id_fkey(id, full_name, email, phone, job_title, hire_date, reporting_to),
          property:properties(id, name),
          department:departments(id, name)
        `.trim()
        )
        .eq('id', request.entity_id)
        .single()

      if (error) throw error
      return data as unknown as LeaveRequest
    },
  })

  const forwardTargetsQuery = useQuery({
    queryKey: ['request-forward-targets', request?.id, request?.metadata],
    enabled: !!request && canAct,
    queryFn: async () => {
      const propertyId = (request?.metadata as any)?.property_id as string | undefined

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          user_roles!inner(role),
          user_properties(property_id)
        `)
        .eq('is_active', true)
        .in('user_roles.role', ['department_head', 'property_hr', 'property_manager', 'regional_hr', 'regional_admin'])

      if (error) throw error

      const mapped = (data || []).map((p: any) => ({
        id: p.id as string,
        full_name: p.full_name as string | null,
        email: p.email as string,
        role: p.user_roles?.role as string,
        property_ids: (p.user_properties || []).map((up: any) => up.property_id as string),
      }))

      const filtered = propertyId
        ? mapped.filter((p) => p.role === 'regional_hr' || p.role === 'regional_admin' || p.property_ids.includes(propertyId))
        : mapped

      return filtered
    },
  })

  const timelineItems = useMemo(() => {
    const events = (eventsQuery.data || []).map((e) => ({
      kind: 'event' as const,
      created_at: e.created_at,
      actor: e.actor?.full_name || e.actor?.email || 'System',
      text: (() => {
        if (e.event_type === 'created') return 'Request created'
        if (e.event_type === 'submitted') return 'Request submitted'
        if (e.event_type === 'approved') return 'Approved'
        if (e.event_type === 'rejected') return 'Rejected'
        if (e.event_type === 'forwarded') return 'Forwarded'
        if (e.event_type === 'returned_for_correction') return 'Returned for correction'
        if (e.event_type === 'closed') return 'Closed'
        if (e.event_type === 'attachment_added') return 'Attachment added'
        if (e.event_type === 'comment_added') return 'Comment added'
        if (e.event_type === 'status_changed') {
          const from = (e.payload as any)?.from
          const to = (e.payload as any)?.to
          return `Status changed: ${from} → ${to}`
        }
        return e.event_type
      })(),
    }))

    const comments = (commentsQuery.data || []).map((c) => ({
      kind: 'comment' as const,
      created_at: c.created_at,
      actor: c.author?.full_name || c.author?.email || 'User',
      text: c.comment,
      visibility: c.visibility,
    }))

    return [...events, ...comments].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [commentsQuery.data, eventsQuery.data])

  const onSubmitAction = async (action: 'approve' | 'reject' | 'return' | 'forward' | 'close' | 'add_comment') => {
    if (!request?.id) return

    await actionMutation.mutateAsync({
      requestId: request.id,
      action,
      comment: comment || undefined,
      forwardTo: action === 'forward' ? forwardTo : undefined,
      visibility,
    })

    setComment('')
    setForwardTo('')
    setActionDialog(null)
  }

  const onUpload = async (file: File) => {
    if (!request?.id || !user?.id) return

    const storagePath = `${request.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('requests')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) throw uploadError

    const { error: dbError } = await supabase.from('request_attachments').insert({
      request_id: request.id,
      uploaded_by: user.id,
      storage_bucket: 'requests',
      storage_path: storagePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    })

    if (dbError) throw dbError
  }

  const onOpenAttachment = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('requests').createSignedUrl(storagePath, 60 * 10)
    if (error) throw error
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (!user) return null

  if (requestQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (requestQuery.isError || !request) {
    return (
      <div className="space-y-6">
        <PageHeader title="Request" description="Unable to load request." />
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    )
  }

  const requester = request.requester

  return (
    <div className="space-y-6 md:space-y-8 py-4 px-4 sm:py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <PageHeader
            title={`Request #${request.request_no}`}
            description={`${request.entity_type.replace('_', ' ')} • Submitted ${request.submitted_at ? format(new Date(request.submitted_at), 'MMM dd, yyyy') : '—'}`}
            className="pb-0"
          />
        </div>
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto order-first sm:order-last">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusBadge(request.status)}
        {request.current_assignee && (
          <Badge variant="outline" className="text-[10px] xs:text-xs">
            Assigned to: {request.current_assignee.full_name || request.current_assignee.email}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="w-full h-11 bg-muted/30 p-1">
              <TabsTrigger value="details" className="flex-1 text-xs sm:text-sm">
                Details
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 text-xs sm:text-sm">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex-1 text-xs sm:text-sm">
                Attachments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.entity_type === 'leave_request' ? (
                    leaveQuery.isLoading ? (
                      <div className="text-sm text-gray-600">Loading leave request…</div>
                    ) : leaveQuery.data ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Type</div>
                            <div className="font-medium capitalize">{leaveQuery.data.type}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Dates</div>
                            <div className="font-medium">
                              {format(new Date(leaveQuery.data.start_date), 'MMM dd, yyyy')} –{' '}
                              {format(new Date(leaveQuery.data.end_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                        {leaveQuery.data.reason && (
                          <div>
                            <div className="text-xs text-gray-500">Reason</div>
                            <div className="text-sm">{leaveQuery.data.reason}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Leave request not found.</div>
                    )
                  ) : request.entity_type === 'promotion' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">New Role</div>
                          <div className="font-medium capitalize">{(request.metadata as any)?.new_role?.replace('_', ' ')}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Effective Date</div>
                          <div className="font-medium">
                            {(request.metadata as any)?.effective_date ? format(new Date((request.metadata as any).effective_date), 'MMM dd, yyyy') : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : request.entity_type === 'transfer' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Target Property</div>
                          <div className="font-medium">{(request.metadata as any)?.target_property}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Effective Date</div>
                          <div className="font-medium">
                            {(request.metadata as any)?.effective_date ? format(new Date((request.metadata as any).effective_date), 'MMM dd, yyyy') : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No renderer for this request type yet.</div>
                  )}

                  <div className="pt-4 border-t space-y-3">
                    <div className="font-medium">Approval Steps</div>
                    {(stepsQuery.data || []).length === 0 ? (
                      <div className="text-sm text-gray-600">No steps found.</div>
                    ) : (
                      <div className="space-y-2">
                        {(stepsQuery.data || []).map((s) => (
                          <div key={s.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                Step {s.step_order}:{' '}
                                {s.assignee?.full_name || s.assignee?.email || s.assignee_id || 'Unassigned'}
                              </div>
                              <div className="text-xs text-gray-600">
                                Status: <span className="capitalize">{s.status}</span>
                                {s.acted_at ? ` • ${format(new Date(s.acted_at), 'MMM dd, yyyy HH:mm')}` : ''}
                              </div>
                              {s.comment ? <div className="text-sm mt-2">{s.comment}</div> : null}
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {s.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {canAct && (
                    <div className="pt-4 border-t grid grid-cols-2 xs:grid-cols-3 gap-2">
                      <Button onClick={() => setActionDialog('approve')} disabled={actionMutation.isPending} className="w-full">
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setActionDialog('reject')}
                        disabled={actionMutation.isPending}
                        className="w-full"
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActionDialog('return')}
                        disabled={actionMutation.isPending}
                        className="w-full text-[10px] xs:text-xs leading-tight"
                      >
                        Return for Correction
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActionDialog('forward')}
                        disabled={actionMutation.isPending}
                        className="w-full"
                      >
                        Forward
                      </Button>
                      {(isHr || isAdmin) && (
                        <Button
                          variant="secondary"
                          onClick={() => setActionDialog('close')}
                          disabled={actionMutation.isPending}
                          className="w-full"
                        >
                          Close
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setActionDialog('comment')}
                        disabled={actionMutation.isPending}
                        className="w-full text-xs"
                      >
                        Add Comment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineItems.length === 0 ? (
                    <div className="text-sm text-gray-600">No activity yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {timelineItems.map((item, idx) => (
                        <div key={`${item.kind}-${idx}-${item.created_at}`} className="border rounded-md p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium truncate">{item.actor}</div>
                            <div className="text-xs text-gray-600">
                              {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                          <div className="text-sm mt-2 whitespace-pre-wrap">{item.text}</div>
                          {'visibility' in item && item.visibility === 'internal' ? (
                            <div className="mt-2">
                              <Badge variant="outline">Internal</Badge>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        await onUpload(file)
                        e.currentTarget.value = ''
                      }}
                    />
                  </div>

                  {(attachmentsQuery.data || []).length === 0 ? (
                    <div className="text-sm text-gray-600">No attachments.</div>
                  ) : (
                    <div className="space-y-2">
                      {(attachmentsQuery.data || []).map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{a.file_name || a.storage_path}</div>
                            <div className="text-xs text-gray-600">
                              {a.file_type || 'file'}
                              {a.file_size ? ` • ${Math.round(a.file_size / 1024)} KB` : ''}
                              {a.created_at ? ` • ${format(new Date(a.created_at), 'MMM dd, yyyy')}` : ''}
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => onOpenAttachment(a.storage_path)}>
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="font-medium">{requester?.full_name || requester?.email || '—'}</div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm">{requester?.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="text-sm">{(requester as any)?.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Position</div>
                  <div className="text-sm">{(requester as any)?.job_title || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Joining Date</div>
                  <div className="text-sm">
                    {(requester as any)?.hire_date ? format(new Date((requester as any).hire_date), 'MMM dd, yyyy') : '—'}
                  </div>
                </div>
              </div>

              {isHr && leaveQuery.data?.requester?.reporting_to ? (
                <SupervisorCard supervisorId={leaveQuery.data.requester.reporting_to} />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
              <Select value={visibility} onValueChange={(v) => setVisibility(v as 'all' | 'internal')}>
                <SelectTrigger>
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visible to all viewers</SelectItem>
                  <SelectItem value="internal">Internal (HR/Admin only)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={actionMutation.isPending || !comment.trim()}
                onClick={() => onSubmitAction('add_comment')}
              >
                Add Comment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={actionDialog !== null} onOpenChange={(open) => (!open ? setActionDialog(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve'
                ? 'Approve'
                : actionDialog === 'reject'
                  ? 'Reject'
                  : actionDialog === 'return'
                    ? 'Return for correction'
                    : actionDialog === 'forward'
                      ? 'Forward'
                      : actionDialog === 'close'
                        ? 'Close'
                        : 'Add comment'}
            </DialogTitle>
            <DialogDescription>
              This action will be recorded in the request history and visible in the timeline.
            </DialogDescription>
          </DialogHeader>

          {actionDialog === 'forward' ? (
            <div className="space-y-3">
              <Select value={forwardTo} onValueChange={setForwardTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {(forwardTargetsQuery.data || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.full_name || p.email) + ` (${p.role})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Comment (optional)"
              />
            </div>
          ) : (
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Comment (recommended)"
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            {actionDialog === 'approve' ? (
              <Button disabled={actionMutation.isPending} onClick={() => onSubmitAction('approve')}>
                Approve
              </Button>
            ) : actionDialog === 'reject' ? (
              <Button
                variant="destructive"
                disabled={actionMutation.isPending}
                onClick={() => onSubmitAction('reject')}
              >
                Reject
              </Button>
            ) : actionDialog === 'return' ? (
              <Button disabled={actionMutation.isPending} onClick={() => onSubmitAction('return')}>
                Return
              </Button>
            ) : actionDialog === 'forward' ? (
              <Button disabled={actionMutation.isPending || !forwardTo} onClick={() => onSubmitAction('forward')}>
                Forward
              </Button>
            ) : actionDialog === 'close' ? (
              <Button disabled={actionMutation.isPending} onClick={() => onSubmitAction('close')}>
                Close
              </Button>
            ) : (
              <Button disabled={actionMutation.isPending || !comment.trim()} onClick={() => onSubmitAction('add_comment')}>
                Add Comment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SupervisorCard({ supervisorId }: { supervisorId: string }) {
  const supervisorQuery = useQuery({
    queryKey: ['profile', supervisorId],
    enabled: !!supervisorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, job_title, hire_date')
        .eq('id', supervisorId)
        .single()

      if (error) throw error
      return data as unknown as Profile
    },
  })

  if (!supervisorId) return null

  return (
    <div className="pt-3 border-t">
      <div className="text-xs text-gray-500">Supervisor</div>
      {supervisorQuery.isLoading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : supervisorQuery.data ? (
        <div className="text-sm">
          <div className="font-medium">{supervisorQuery.data.full_name || supervisorQuery.data.email}</div>
          <div className="text-gray-600">{supervisorQuery.data.job_title || '—'}</div>
        </div>
      ) : (
        <div className="text-sm text-gray-600">—</div>
      )}
    </div>
  )
}
