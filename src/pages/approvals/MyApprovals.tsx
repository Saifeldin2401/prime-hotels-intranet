import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  Filter
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Document, DocumentApproval, LeaveRequest, MaintenanceTicket } from '@/lib/types'

export default function MyApprovals() {
  const { user, primaryRole } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  // Fetch pending document approvals for the current user
  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-approvals', primaryRole],
    queryFn: async () => {
      if (!primaryRole) return []
      
      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          documents(
            id,
            title,
            content,
            version,
            status,
            visibility,
            created_at,
            updated_at,
            requires_acknowledgment,
            profiles!documents_created_by_fkey(
              full_name,
              email
            )
          )
        `)
        .eq('approver_role', primaryRole)
        .eq('status', 'pending')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (DocumentApproval & { 
        documents: Document & { profiles?: { full_name: string; email: string } }
      })[]
    },
  })

  // Fetch completed approvals (approved/rejected) for the current user
  const { data: completedApprovals, isLoading: completedLoading } = useQuery({
    queryKey: ['document-approvals-completed', user?.id, primaryRole],
    enabled: !!user && !!primaryRole,
    queryFn: async () => {
      if (!user || !primaryRole) return []

      const { data, error } = await supabase
        .from('document_approvals')
        .select(`
          *,
          documents!inner(
            id,
            title,
            description,
            status,
            visibility,
            property_id,
            department_id,
            created_by,
            file_url,
            file_name,
            file_size,
            created_at,
            updated_at,
            requires_acknowledgment,
            profiles!documents_created_by_fkey(
              full_name,
              email
            )
          )
        `)
        .eq('approver_role', primaryRole)
        .in('status', ['approved', 'rejected'])
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as (DocumentApproval & { 
        documents: Document & { profiles?: { full_name: string; email: string } }
      })[]
    },
  })

  // Fetch pending leave requests for the current user
  const { data: pendingLeaveRequests, isLoading: leaveLoading } = useQuery({
    queryKey: ['pending-leave-requests', user?.id, primaryRole],
    enabled: !!user && !!primaryRole,
    queryFn: async () => {
      if (!user || !primaryRole) return []

      // Determine which leave requests this role can approve
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profiles!leave_requests_requester_id_fkey(
            full_name,
            email
          ),
          properties(id, name),
          departments(id, name)
        `)
        .eq('status', 'pending')

      // Apply role-based filtering
      if (primaryRole === 'department_head') {
        // Department heads can approve leave for their departments
        // This would need to be filtered based on user's departments
        query = query.in('department_id', ['dept1', 'dept2']) // TODO: Get from user context
      } else if (primaryRole === 'property_hr') {
        // Property HR can approve department head leave
        query = query.is('department_id', 'not', null)
      } else if (primaryRole === 'regional_hr') {
        // Regional HR can approve property manager leave
        query = query.is('property_id', 'not', null)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as (LeaveRequest & { 
        profiles?: { full_name: string; email: string },
        properties?: { id: string; name: string },
        departments?: { id: string; name: string }
      })[]
    },
  })

  // Fetch pending maintenance tickets for the current user
  const { data: pendingMaintenanceTickets, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['pending-maintenance-tickets', user?.id, primaryRole],
    enabled: !!user && !!primaryRole,
    queryFn: async () => {
      if (!user || !primaryRole) return []

      // Property managers can approve critical maintenance tickets
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select(`
          *,
          profiles!maintenance_tickets_reported_by_id_fkey(
            full_name,
            email
          ),
          properties(id, name),
          departments(id, name)
        `)
        .eq('status', 'open')
        .in('priority', ['high', 'critical'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (MaintenanceTicket & { 
        profiles?: { full_name: string; email: string },
        properties?: { id: string; name: string },
        departments?: { id: string; name: string }
      })[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to approve documents')

      // Update the approval record
      const { error: approvalError } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('document_id', documentId)
        .eq('approver_role', primaryRole)
        .eq('status', 'pending')

      if (approvalError) throw approvalError

      // Check if all required approvals are complete
      const { data: remainingApprovals } = await supabase
        .from('document_approvals')
        .select('status')
        .eq('document_id', documentId)
        .eq('status', 'pending')
        .eq('is_active', true)

      // If no more pending approvals, update document status to published
      if (!remainingApprovals || remainingApprovals.length === 0) {
        const { error: docError } = await supabase
          .from('documents')
          .update({ status: 'published' })
          .eq('id', documentId)

        if (docError) throw docError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] })
      queryClient.invalidateQueries({ queryKey: ['document-approvals-completed'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to reject documents')

      // Update the approval record
      const { error: approvalError } = await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason,
        })
        .eq('document_id', documentId)
        .eq('approver_role', primaryRole)
        .eq('status', 'pending')

      if (approvalError) throw approvalError

      // Update document status to rejected
      const { error: docError } = await supabase
        .from('documents')
        .update({ status: 'rejected' })
        .eq('id', documentId)

      if (docError) throw docError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] })
      queryClient.invalidateQueries({ queryKey: ['document-approvals-completed'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  // Leave request mutations
  const approveLeaveMutation = useMutation({
    mutationFn: async (leaveRequestId: string) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to approve leave requests')

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leaveRequestId)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    },
  })

  const rejectLeaveMutation = useMutation({
    mutationFn: async ({ leaveRequestId, reason }: { leaveRequestId: string; reason: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to reject leave requests')

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          rejected_by_id: user.id,
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leaveRequestId)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    },
  })

  // Maintenance ticket mutations
  const assignMaintenanceMutation = useMutation({
    mutationFn: async ({ ticketId, assignedToId }: { ticketId: string; assignedToId: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to assign maintenance tickets')

      const { error } = await supabase
        .from('maintenance_tickets')
        .update({
          status: 'in_progress',
          assigned_to_id: assignedToId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .eq('status', 'open')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-maintenance-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
    },
  })

  const handleApprove = (documentId: string) => {
    approveMutation.mutate(documentId)
  }

  const handleReject = (documentId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason) {
      rejectMutation.mutate({ documentId, reason })
    }
  }

  const handleApproveLeave = (leaveRequestId: string) => {
    approveLeaveMutation.mutate(leaveRequestId)
  }

  const handleRejectLeave = (leaveRequestId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason) {
      rejectLeaveMutation.mutate({ leaveRequestId, reason })
    }
  }

  const handleAssignMaintenance = (ticketId: string) => {
    // For now, assign to self. In a real app, you'd show a staff selection modal
    if (user) {
      assignMaintenanceMutation.mutate({ ticketId, assignedToId: user.id })
    }
  }

  const handleViewDocument = (document: Document) => {
    window.open(document.file_url, '_blank')
  }

  const filterApprovals = (approvals: any[], query: string) => {
    if (!query) return approvals
    const lowerQuery = query.toLowerCase()
    return approvals.filter(approval => 
      approval.documents?.title?.toLowerCase().includes(lowerQuery) ||
      approval.documents?.description?.toLowerCase().includes(lowerQuery) ||
      approval.documents?.file_name?.toLowerCase().includes(lowerQuery) ||
      approval.title?.toLowerCase().includes(lowerQuery) ||
      approval.description?.toLowerCase().includes(lowerQuery) ||
      approval.reason?.toLowerCase().includes(lowerQuery)
    )
  }

  const filteredPendingDocuments = filterApprovals(pendingApprovals || [], searchQuery)
  const filteredPendingLeave = filterApprovals(pendingLeaveRequests || [], searchQuery)
  const filteredPendingMaintenance = filterApprovals(pendingMaintenanceTickets || [], searchQuery)
  const filteredCompleted = filterApprovals(completedApprovals || [], searchQuery)

  // Calculate total pending count
  const totalPendingCount = filteredPendingDocuments.length + filteredPendingLeave.length + filteredPendingMaintenance.length

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="My Approvals"
        description="Review and approve documents, leave requests, and maintenance tickets pending your attention"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search approvals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents" className="relative">
            Documents
            {filteredPendingDocuments.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0 text-xs">
                {filteredPendingDocuments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leave" className="relative">
            Leave Requests
            {filteredPendingLeave.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0 text-xs">
                {filteredPendingLeave.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="relative">
            Maintenance
            {filteredPendingMaintenance.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0 text-xs">
                {filteredPendingMaintenance.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading pending document approvals...</p>
            </div>
          ) : filteredPendingDocuments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending document approvals</h3>
                <p className="text-gray-600">
                  All documents have been reviewed. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPendingDocuments.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-lg">{approval.documents.title}</h3>
                          <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-xs">
                            {approval.documents.visibility === 'all_properties' && 'All properties'}
                            {approval.documents.visibility === 'property' && 'Property-specific'}
                            {approval.documents.visibility === 'department' && 'Department-specific'}
                            {approval.documents.visibility === 'role' && 'Role-specific'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {approval.documents.description || 'No description provided'}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{approval.documents.created_by?.full_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(approval.documents.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                          size="sm"
                          onClick={() => handleViewDocument(approval.documents)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(approval.document_id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(approval.document_id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          {leaveLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading pending leave requests...</p>
            </div>
          ) : filteredPendingLeave.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending leave requests</h3>
                <p className="text-gray-600">
                  No leave requests require your approval at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPendingLeave.map((leave) => (
                <Card key={leave.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-5 h-5 text-orange-500" />
                          <h3 className="font-semibold text-lg">Leave Request</h3>
                          <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-xs capitalize">
                            {leave.type}
                          </Badge>
                        </div>
                        
                        <div className="text-gray-600 mb-3">
                          <p className="font-medium">{leave.profiles?.full_name || 'Unknown'}</p>
                          <p>{leave.reason || 'No reason provided'}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Requested {formatRelativeTime(leave.created_at)}</span>
                          </div>
                        </div>

                        {(leave.properties || leave.departments) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {leave.properties && (
                              <Badge variant="secondary">{leave.properties.name}</Badge>
                            )}
                            {leave.departments && (
                              <Badge variant="secondary">{leave.departments.name}</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveLeave(leave.id)}
                          disabled={approveLeaveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectLeave(leave.id)}
                          disabled={rejectLeaveMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          {maintenanceLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading pending maintenance tickets...</p>
            </div>
          ) : filteredPendingMaintenance.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending maintenance tickets</h3>
                <p className="text-gray-600">
                  No critical maintenance tickets require your attention at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPendingMaintenance.map((ticket) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-red-500" />
                          <h3 className="font-semibold text-lg">{ticket.title}</h3>
                          <Badge variant={ticket.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                            {ticket.priority}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-800 border border-gray-600 rounded-md text-xs capitalize">
                            {ticket.category}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{ticket.profiles?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Reported {formatRelativeTime(ticket.created_at)}</span>
                          </div>
                          {ticket.room_number && (
                            <div className="flex items-center gap-1">
                              <span>Room: {ticket.room_number}</span>
                            </div>
                          )}
                        </div>

                        {(ticket.properties || ticket.departments) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {ticket.properties && (
                              <Badge variant="secondary">{ticket.properties.name}</Badge>
                            )}
                            {ticket.departments && (
                              <Badge variant="secondary">{ticket.departments.name}</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAssignMaintenance(ticket.id)}
                          disabled={assignMaintenanceMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading completed approvals...</p>
            </div>
          ) : filteredCompleted.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No completed approvals</h3>
                <p className="text-gray-600">
                  Your approval history will appear here once you start reviewing documents.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCompleted.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-lg">{approval.documents.title}</h3>
                          <StatusBadge status={approval.status} />
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {approval.documents.description || 'No description provided'}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{approval.documents.profiles?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {approval.status === 'approved' 
                                ? `Approved ${formatRelativeTime(approval.approved_at!)}`
                                : `Rejected ${formatRelativeTime(approval.rejected_at!)}`
                              }
                            </span>
                          </div>
                        </div>

                        {approval.status === 'rejected' && approval.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                            <p className="text-sm font-medium text-red-800 mb-1">Rejection reason:</p>
                            <p className="text-sm text-red-700">{approval.rejection_reason}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                          size="sm"
                          onClick={() => handleViewDocument(approval.documents)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
