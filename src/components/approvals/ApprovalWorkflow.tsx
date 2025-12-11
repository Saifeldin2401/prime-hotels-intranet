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
  MessageSquare
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

interface ApprovalWorkflowProps {
  entityType: string
  entityId: string
  entityTitle: string
  onApprovalComplete?: () => void
}

export function ApprovalWorkflow({ 
  entityType, 
  entityId, 
  entityTitle, 
  onApprovalComplete 
}: ApprovalWorkflowProps) {
  const { profile, primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const { data: approvalRequest, isLoading } = useQuery({
    queryKey: ['approval-request', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          current_approver:profiles(full_name, email),
          requestor:profiles(full_name, email),
          approval_steps:approval_steps(
            *,
            approver:profiles(full_name, email),
            step_roles:roles(name)
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!(entityType && entityId)
  })

  const createApprovalRequestMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('User not authenticated')

      // Create approval request based on entity type and role hierarchy
      const approvalFlow = getApprovalFlow(entityType)
      
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          requestor_id: profile.id,
          current_approver_id: approvalFlow.firstApproverId,
          status: 'pending',
          priority: 'medium',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Create approval steps
      const steps = approvalFlow.steps.map((step: any, index: number) => ({
        approval_request_id: data.id,
        step_order: index + 1,
        approver_id: step.approverId,
        role_id: step.roleId,
        status: index === 0 ? 'pending' : 'waiting',
        created_at: new Date().toISOString()
      }))

      await supabase.from('approval_steps').insert(steps)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-request', entityType, entityId] })
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    }
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approvalRequest || !profile) throw new Error('Invalid request')

      // Update current step
      const { error: stepError } = await supabase
        .from('approval_steps')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approver_comment: comment
        })
        .eq('approval_request_id', approvalRequest.id)
        .eq('approver_id', profile.id)
        .eq('status', 'pending')

      if (stepError) throw stepError

      // Check if there are more steps
      const { data: nextStep } = await supabase
        .from('approval_steps')
        .select('*')
        .eq('approval_request_id', approvalRequest.id)
        .eq('status', 'waiting')
        .order('step_order', { ascending: true })
        .limit(1)
        .single()

      if (nextStep) {
        // Move to next step
        await supabase
          .from('approval_steps')
          .update({ status: 'pending' })
          .eq('id', nextStep.id)

        await supabase
          .from('approval_requests')
          .update({
            current_approver_id: nextStep.approver_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', approvalRequest.id)
      } else {
        // All steps approved
        await supabase
          .from('approval_requests')
          .update({
            status: 'approved',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', approvalRequest.id)

        onApprovalComplete?.()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-request', entityType, entityId] })
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      setComment('')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!approvalRequest || !profile) throw new Error('Invalid request')

      // Reject the request
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalRequest.id)

      if (error) throw error

      // Update current step
      await supabase
        .from('approval_steps')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approver_comment: comment
        })
        .eq('approval_request_id', approvalRequest.id)
        .eq('approver_id', profile.id)
        .eq('status', 'pending')

      onApprovalComplete?.()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-request', entityType, entityId] })
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
      setComment('')
    }
  })

  const getApprovalFlow = (type: string) => {
    // Define approval flows based on entity type and user role
    const flows: Record<string, any> = {
      document: {
        firstApproverId: 'property-manager-id', // Would be determined by property
        steps: [
          { approverId: 'property-manager-id', roleId: 'property-manager' },
          { approverId: 'regional-hr-id', roleId: 'regional-hr' }
        ]
      },
      training: {
        firstApproverId: 'department-head-id',
        steps: [
          { approverId: 'department-head-id', roleId: 'department-head' },
          { approverId: 'property-manager-id', roleId: 'property-manager' }
        ]
      },
      sop: {
        firstApproverId: 'property-hr-id',
        steps: [
          { approverId: 'property-hr-id', roleId: 'property-hr' },
          { approverId: 'regional-admin-id', roleId: 'regional-admin' }
        ]
      }
    }

    return flows[type] || flows.document
  }

  const handleApprove = () => {
    approveMutation.mutate()
  }

  const handleReject = () => {
    rejectMutation.mutate()
  }

  const handleStartApproval = () => {
    createApprovalRequestMutation.mutate()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading approval status...</div>
        </CardContent>
      </Card>
    )
  }

  // No approval request exists
  if (!approvalRequest) {
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
            <p className="text-sm text-gray-600">
              This {entityType} requires approval before it can be published.
            </p>
            <Button onClick={handleStartApproval} disabled={createApprovalRequestMutation.isPending}>
              {createApprovalRequestMutation.isPending ? 'Starting...' : 'Start Approval Process'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canApprove = approvalRequest.current_approver_id === profile?.id && approvalRequest.status === 'pending'
  const isCompleted = ['approved', 'rejected'].includes(approvalRequest.status)

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
          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{entityTitle}</h3>
              <p className="text-sm text-gray-600">
                Requested by {approvalRequest.requestor?.full_name} • {formatRelativeTime(approvalRequest.created_at)}
              </p>
            </div>
            <Badge className={statusColors[approvalRequest.status as keyof typeof statusColors]}>
              {approvalRequest.status}
            </Badge>
          </div>

          {/* Approval Steps */}
          <div className="space-y-2">
            <h4 className="font-medium">Approval Chain</h4>
            {approvalRequest.approval_steps?.map((step: any) => {
              const isCurrentStep = step.status === 'pending'
              const isCompleted = step.status === 'approved'
              const isRejected = step.status === 'rejected'

              return (
                <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isRejected ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : isCurrentStep ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.approver?.full_name}</div>
                    <div className="text-sm text-gray-600">{step.step_roles?.name}</div>
                    {step.approver_comment && (
                      <div className="text-sm text-gray-500 mt-1">
                        <MessageSquare className="inline h-3 w-3 mr-1" />
                        {step.approver_comment}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {step.approved_at ? formatRelativeTime(step.approved_at) : 'Pending'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current Approver Actions */}
          {canApprove && (
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
                  onClick={handleApprove} 
                  disabled={approveMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </Button>
                <Button 
                  onClick={handleReject} 
                  variant="outline"
                  disabled={rejectMutation.isPending}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </div>
          )}

          {/* Completed Status */}
          {isCompleted && (
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                {approvalRequest.status === 'approved' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Approved and published
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Rejected
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
