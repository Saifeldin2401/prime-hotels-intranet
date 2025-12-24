import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  RotateCcw
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { getApproverForRequest } from '@/lib/approvalService'
import { toast } from 'sonner'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_supervisor_approval: 'bg-yellow-100 text-yellow-800',
  pending_hr_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  returned_for_correction: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-100 text-gray-800'
}

interface ApprovalWorkflowProps {
  entityType: string
  entityId: string
  entityTitle: string
  propertyId?: string | null
  onApprovalComplete?: () => void
}

export function ApprovalWorkflow({
  entityType,
  entityId,
  entityTitle,
  propertyId,
  onApprovalComplete
}: ApprovalWorkflowProps) {
  const { profile, primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  // Query for existing request using the unified requests table
  const { data: request, isLoading } = useQuery({
    queryKey: ['request', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          requester:profiles!requests_requester_id_fkey(id, full_name, email),
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email),
          supervisor:profiles!requests_supervisor_id_fkey(id, full_name, email),
          request_steps(
            *,
            assignee:profiles(id, full_name, email)
          ),
          request_comments(
            *,
            author:profiles(id, full_name, email)
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!(entityType && entityId)
  })

  // Create a new request in the unified system
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('User not authenticated')

      // Get supervisor/approver dynamically
      const approver = await getApproverForRequest(profile.id, propertyId || null)

      // Create the request
      const { data: newRequest, error } = await supabase
        .from('requests')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          requester_id: profile.id,
          supervisor_id: approver?.id || null,
          current_assignee_id: approver?.id || null,
          status: 'pending_supervisor_approval',
          submitted_at: new Date().toISOString(),
          metadata: { title: entityTitle }
        })
        .select()
        .single()

      if (error) throw error

      // Create the first approval step
      if (approver) {
        await supabase.from('request_steps').insert({
          request_id: newRequest.id,
          step_order: 1,
          assignee_id: approver.id,
          assignee_role: 'supervisor',
          status: 'pending',
          created_by: profile.id
        })
      }

      return newRequest
    },
    onSuccess: () => {
      toast.success('Request submitted for approval')
      queryClient.invalidateQueries({ queryKey: ['request', entityType, entityId] })
    },
    onError: (error) => {
      toast.error('Failed to submit request: ' + error.message)
    }
  })

  // Use the RPC to apply actions
  const applyActionMutation = useMutation({
    mutationFn: async ({ action, forwardTo }: { action: string; forwardTo?: string }) => {
      if (!request) throw new Error('No request found')

      const { data, error } = await supabase.rpc('request_apply_action', {
        p_request_id: request.id,
        p_action: action,
        p_comment: comment || null,
        p_forward_to: forwardTo || null,
        p_visibility: 'all'
      })

      if (error) throw error
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.message || 'Action failed')
      }

      return data
    },
    onSuccess: (_, variables) => {
      const actionMessages: Record<string, string> = {
        approve: 'Request approved',
        reject: 'Request rejected',
        return: 'Request returned for correction',
        forward: 'Request forwarded',
        add_comment: 'Comment added'
      }
      toast.success(actionMessages[variables.action] || 'Action completed')
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['request', entityType, entityId] })

      if (['approve', 'reject'].includes(variables.action)) {
        onApprovalComplete?.()
      }
    },
    onError: (error) => {
      toast.error('Action failed: ' + error.message)
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading approval status...</div>
        </CardContent>
      </Card>
    )
  }

  // No request exists - show option to start approval
  if (!request) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This {entityType.replace('_', ' ')} requires approval before it can be published.
            </p>
            <Button
              onClick={() => createRequestMutation.mutate()}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canTakeAction = request.current_assignee_id === profile?.id &&
    !['approved', 'rejected', 'closed'].includes(request.status)
  const isCompleted = ['approved', 'rejected', 'closed'].includes(request.status)

  // Sort steps by order
  const sortedSteps = [...(request.request_steps || [])].sort((a, b) => a.step_order - b.step_order)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Approval Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{entityTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Requested by {request.requester?.full_name || 'Unknown'} • {formatRelativeTime(request.created_at)}
              </p>
            </div>
            <Badge className={statusColors[request.status] || statusColors.draft}>
              {request.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Approval Steps */}
          {sortedSteps.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Approval Chain</h4>
              {sortedSteps.map((step) => {
                const isCurrentStep = step.status === 'pending'
                const isApproved = step.status === 'approved'
                const isRejected = step.status === 'rejected'
                const isReturned = step.status === 'returned'

                return (
                  <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      {isApproved ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : isRejected ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : isReturned ? (
                        <RotateCcw className="h-5 w-5 text-orange-500" />
                      ) : isCurrentStep ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{step.assignee?.full_name || 'Unassigned'}</div>
                      <div className="text-sm text-muted-foreground capitalize">{step.assignee_role}</div>
                      {step.comment && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <MessageSquare className="inline h-3 w-3 mr-1" />
                          {step.comment}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.acted_at ? formatRelativeTime(step.acted_at) : 'Pending'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Comments Section */}
          {request.request_comments && request.request_comments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Comments</h4>
              {request.request_comments.map((c: any) => (
                <div key={c.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{c.author?.full_name}</span>
                    <span className="text-muted-foreground">• {formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1">{c.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Current Approver Actions */}
          {canTakeAction && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium">Your Action Required</h4>
              <Textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => applyActionMutation.mutate({ action: 'approve' })}
                  disabled={applyActionMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => applyActionMutation.mutate({ action: 'return' })}
                  variant="outline"
                  disabled={applyActionMutation.isPending}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Return
                </Button>
                <Button
                  onClick={() => applyActionMutation.mutate({ action: 'reject' })}
                  variant="destructive"
                  disabled={applyActionMutation.isPending}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Add Comment (for non-assignees who can view) */}
          {!canTakeAction && !isCompleted && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium">Add Comment</h4>
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <Button
                onClick={() => applyActionMutation.mutate({ action: 'add_comment' })}
                disabled={applyActionMutation.isPending || !comment.trim()}
                variant="outline"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          )}

          {/* Completed Status */}
          {isCompleted && (
            <div className="pt-4 border-t">
              <div className="text-sm">
                {request.status === 'approved' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Approved and published
                  </div>
                ) : request.status === 'rejected' ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Rejected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    Closed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
