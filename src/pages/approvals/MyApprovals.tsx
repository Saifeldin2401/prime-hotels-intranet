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
import { CardLoading } from '@/components/common/LoadingStates'
import { crudToasts } from '@/lib/toastHelpers'
import {
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  Filter,
  AlertTriangle
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Document, DocumentApproval, LeaveRequest, MaintenanceTicket } from '@/lib/types'
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export default function MyApprovals() {
  const { t, i18n } = useTranslation('approvals')
  const isRTL = i18n.dir() === 'rtl'
  const dateLocale = i18n.language.startsWith('ar') ? ar : enUS
  const { user, primaryRole, departments, properties } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const queryClient = useQueryClient()
  const { notifyRequestApproved, notifyRequestRejected, notifyMaintenanceAssigned } = useNotificationTriggers()

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
        // Use the departments from the authenticated user's context
        const userDepartmentIds = departments?.map(d => d.id) || []

        if (userDepartmentIds.length > 0) {
          query = query.in('department_id', userDepartmentIds)
        } else {
          // If department head has no assigned department, return no requests to be safe
          console.warn('Department Head has no assigned departments for filtering')
          return []
        }
      } else if (primaryRole === 'property_hr') {
        // Property HR can approve department head leave
        query = query.not('department_id', 'is', null)
      } else if (primaryRole === 'regional_hr') {
        // Regional HR can approve property manager leave
        query = query.not('property_id', 'is', null)
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

  // Fetch staff members for assignment (filtering by current property)
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-members', properties?.[0]?.id],
    enabled: !!properties?.[0]?.id && assignDialogOpen,
    queryFn: async () => {
      const propertyId = properties?.[0]?.id
      if (!propertyId) return []

      const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            user_roles!inner(role),
            user_properties!inner(property_id)
        `)
        .eq('user_roles.role', 'staff')
        .eq('user_properties.property_id', propertyId)

      if (error) {
        console.error('Error fetching staff:', error)
        return []
      }

      return data.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email
      }))
    }
  })

  const approveMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to approve documents')

      // Get document details
      const { data: document } = await supabase
        .from('documents')
        .select('created_by, title')
        .eq('id', documentId)
        .single()

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

        // Notify document creator that their document was approved
        if (document?.created_by) {
          await notifyRequestApproved(
            document.created_by,
            'document',
            documentId,
            document.title || 'Document'
          )
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] })
      queryClient.invalidateQueries({ queryKey: ['document-approvals-completed'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      crudToasts.approve.success('Document')
    },
    onError: () => {
      crudToasts.approve.error('document')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to reject documents')

      // Get document details
      const { data: document } = await supabase
        .from('documents')
        .select('created_by, title')
        .eq('id', documentId)
        .single()

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

      // Notify document creator that their document was rejected
      if (document?.created_by) {
        await notifyRequestRejected(
          document.created_by,
          'document',
          documentId,
          document.title || 'Document',
          reason
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] })
      queryClient.invalidateQueries({ queryKey: ['document-approvals-completed'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      crudToasts.reject.success('Document')
    },
    onError: () => {
      crudToasts.reject.error('document')
    }
  })

  // Leave request mutations
  const approveLeaveMutation = useMutation({
    mutationFn: async (leaveRequestId: string) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to approve leave requests')

      // First, get the leave request details to notify the requester
      const { data: leaveRequest } = await supabase
        .from('leave_requests')
        .select('requester_id, start_date, end_date, type')
        .eq('id', leaveRequestId)
        .single()

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

      // Send notification to the requester
      if (leaveRequest) {
        await notifyRequestApproved(
          leaveRequest.requester_id,
          'leave_request',
          leaveRequestId,
          `Leave Request (${leaveRequest.type})`
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      crudToasts.approve.success('Leave request')
    },
    onError: () => {
      crudToasts.approve.error('leave request')
    }
  })

  const rejectLeaveMutation = useMutation({
    mutationFn: async ({ leaveRequestId, reason }: { leaveRequestId: string; reason: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to reject leave requests')

      // Get leave request details
      const { data: leaveRequest } = await supabase
        .from('leave_requests')
        .select('requester_id, start_date, end_date, type')
        .eq('id', leaveRequestId)
        .single()

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

      // Send notification to requester
      if (leaveRequest) {
        await notifyRequestRejected(
          leaveRequest.requester_id,
          'leave_request',
          leaveRequestId,
          `Leave Request (${leaveRequest.type})`,
          reason
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      crudToasts.reject.success('Leave request')
    },
    onError: () => {
      crudToasts.reject.error('leave request')
    }
  })

  // Maintenance ticket mutations
  const assignMaintenanceMutation = useMutation({
    mutationFn: async ({ ticketId, assignedToId }: { ticketId: string; assignedToId: string }) => {
      if (!user || !primaryRole) throw new Error('User must be signed in with a valid role to assign maintenance tickets')

      // Get ticket details
      const { data: ticket } = await supabase
        .from('maintenance_tickets')
        .select('title, category, priority')
        .eq('id', ticketId)
        .single()

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

      // Send notification to assigned staff
      if (ticket) {
        await notifyMaintenanceAssigned(
          assignedToId,
          ticketId,
          ticket.title,
          ticket.priority
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-maintenance-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.update.success('Maintenance ticket')
    },
    onError: () => {
      crudToasts.update.error('maintenance ticket')
    }
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
    setSelectedTicketId(ticketId)
    setAssignDialogOpen(true)
  }

  const confirmAssignment = () => {
    if (selectedTicketId && selectedStaffId) {
      assignMaintenanceMutation.mutate({ ticketId: selectedTicketId, assignedToId: selectedStaffId })
      setAssignDialogOpen(false)
      setSelectedTicketId(null)
      setSelectedStaffId('')
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
        title={t('title')}
        description={t('description')}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className={cn("absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={t('search_placeholder', 'Search approvals...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn("h-11", isRTL ? "pr-10" : "pl-10")}
          />
        </div>
        <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors h-11 w-full sm:w-auto" size="sm">
          <Filter className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
          {t('filter', 'Filters')}
        </Button>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
            <TabsTrigger value="documents" className="relative text-xs sm:text-sm whitespace-nowrap">
              <span className="hidden sm:inline">{t('documents_tab')}</span>
              <span className="sm:hidden">{t('documents_tab')}</span>
              {filteredPendingDocuments.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0 text-[10px] sm:text-xs">
                  {filteredPendingDocuments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leave" className="relative text-xs sm:text-sm whitespace-nowrap">
              <span className="hidden sm:inline">{t('leaves_tab')}</span>
              <span className="sm:hidden">{t('leaves_tab')}</span>
              {filteredPendingLeave.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0 text-[10px] sm:text-xs">
                  {filteredPendingLeave.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="relative text-xs sm:text-sm whitespace-nowrap">
              <span className="hidden sm:inline">{t('maintenance_tab')}</span>
              <span className="sm:hidden">{t('maintenance_tab')}</span>
              {filteredPendingMaintenance.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 sm:ml-2 px-1.5 sm:px-2 py-0 text-[10px] sm:text-xs">
                  {filteredPendingMaintenance.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm whitespace-nowrap">
              {t('completed_tab')}
            </TabsTrigger>
          </TabsList>
        </div>

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
                <h3 className="text-lg font-semibold mb-2">{t('all_caught_up_documents')}</h3>
                <p className="text-gray-600">
                  {t('all_caught_up_documents_desc')}
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
                          <Eye className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('view')}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApprove(approval.document_id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(approval.document_id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('reject')}
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
                <h3 className="text-lg font-semibold mb-2">{t('no_pending_leaves')}</h3>
                <p className="text-gray-600">
                  {t('no_pending_leaves_desc')}
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
                            <span>Requested {formatDistanceToNow(new Date(leave.created_at), { addSuffix: true, locale: dateLocale })}</span>
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
                <h3 className="text-lg font-semibold mb-2">{t('no_pending_maintenance')}</h3>
                <p className="text-gray-600">
                  {t('no_pending_maintenance_desc')}
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
                            <span>Reported {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: dateLocale })}</span>
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
                          <CheckCircle className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('assign')}
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
                <h3 className="text-lg font-semibold mb-2">{t('no_completed_approvals')}</h3>
                <p className="text-gray-600">
                  {t('no_completed_approvals_desc')}
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
                                ? `Approved ${formatDistanceToNow(new Date(approval.approved_at!), { addSuffix: true, locale: dateLocale })}`
                                : `Rejected ${formatDistanceToNow(new Date(approval.rejected_at!), { addSuffix: true, locale: dateLocale })}`
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
                          <Eye className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('view')}
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

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assign_dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('assign_dialog_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="staff-select">{t('select_staff_placeholder')}</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder={t('select_staff_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {staffMembers?.map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={confirmAssignment} disabled={!selectedStaffId || assignMaintenanceMutation.isPending}>
              {assignMaintenanceMutation.isPending ? t('assign') + '...' : t('assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
