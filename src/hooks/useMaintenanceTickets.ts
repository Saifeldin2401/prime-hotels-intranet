import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import type { MaintenanceTicket, MaintenanceComment, MaintenanceAttachment } from '@/lib/types'
import { crudToasts } from '@/lib/toastHelpers'
import { scanFile } from '@/hooks/useVirusScan'

export function useMyMaintenanceTickets() {
  const { user } = useAuth()
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['maintenance-tickets', 'my', user?.id, currentProperty?.id],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('maintenance_tickets')
        .select(`
          *,
          reported_by:profiles!reported_by_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          assigned_to:profiles!assigned_to_id(id, full_name, email)
        `)
        .eq('reported_by_id', user.id)
        .eq('is_deleted', false) // Exclude soft-deleted tickets
        .order('created_at', { ascending: false })

      // Filter by current property if selected (and not 'all')
      if (currentProperty && currentProperty.id !== 'all') {
        query = query.eq('property_id', currentProperty.id)
      }

      const { data, error } = await query

      if (error) throw error
      return data as MaintenanceTicket[]
    },
    enabled: !!user?.id
  })
}

export function useAssignedMaintenanceTickets() {
  const { user, roles, properties, primaryRole, departments } = useAuth()
  const { currentProperty } = useProperty()

  return useQuery({
    queryKey: ['maintenance-tickets', 'assigned', user?.id, properties, currentProperty?.id, departments],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('maintenance_tickets')
        .select(`
          *,
          reported_by:profiles!reported_by_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          assigned_to:profiles!assigned_to_id(id, full_name, email)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Filter by current property if selected (and not 'all')
      if (currentProperty && currentProperty.id !== 'all') {
        query = query.eq('property_id', currentProperty.id)
      }

      // Filter based on user role and access
      const userRole = primaryRole || roles[0]?.role || 'staff'

      if (userRole === 'department_head') {
        // Department heads see tickets for their department(s) within their property
        const deptIds = departments?.map(d => d.id) || []
        const propIds = properties?.map(p => p.id) || []

        if (deptIds.length > 0) {
          query = query.in('department_id', deptIds)
        } else if (propIds.length > 0) {
          query = query.in('property_id', propIds)
        } else {
          query = query.eq('assigned_to_id', user.id)
        }
      } else if (userRole === 'property_manager' || userRole === 'property_hr') {
        // Property level roles see all tickets for their assigned property/properties
        const propIds = properties?.map(p => p.id) || []
        if (propIds.length > 0) {
          query = query.in('property_id', propIds)
        } else {
          query = query.eq('assigned_to_id', user.id)
        }
      } else if (userRole === 'regional_admin' || userRole === 'regional_hr') {
        // Regional staff - already handled by currentProperty filter if active
      } else {
        // Staff see only assigned to them
        query = query.eq('assigned_to_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching assigned tickets:', error)
        throw error
      }
      return data as MaintenanceTicket[]
    },
  })
}

export function useMaintenanceTicket(ticketId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['maintenance-tickets', 'single', ticketId],
    enabled: !!ticketId && !!user?.id,
    queryFn: async () => {
      if (!ticketId || !user?.id) return null

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select(`
          *,
          reported_by:profiles!reported_by_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          assigned_to:profiles!assigned_to_id(id, full_name, email),
          comments:maintenance_comments(
            *,
            author:profiles!author_id(id, full_name, email)
          ),
          attachments:maintenance_attachments(
            *,
            uploaded_by:profiles!uploaded_by_id(id, full_name, email)
          )
        `)
        .eq('id', ticketId)
        .single()

      if (error) throw error
      return data as MaintenanceTicket
    },
  })
}

export function useCreateMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user, properties } = useAuth()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      category: MaintenanceTicket['category']
      priority: MaintenanceTicket['priority']
      room_number?: string
      property_id?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      // Use provided property_id or default to user's first property
      const propertyId = data.property_id || (properties.length > 0 ? properties[0].id : null)

      const { data: result, error } = await supabase
        .from('maintenance_tickets')
        .insert({
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          room_number: data.room_number || null,
          property_id: propertyId,
          reported_by_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      // AUTO AI TRIAGE: Trigger AI analysis in background
      // Only if priority is default (medium) and description is substantial
      if (result && data.description && data.description.length > 20) {
        // Set triage status to 'pending' before starting
        await supabase
          .from('maintenance_tickets')
          .update({ ai_triage_status: 'pending' })
          .eq('id', result.id)

        // Call auto-triage edge function asynchronously (don't await for response)
        supabase.functions.invoke('auto-triage-ticket', {
          body: { ticket_id: result.id }
        }).then(async ({ data: triageResult, error: triageError }) => {
          if (triageError) {
            console.warn('Auto-triage failed:', triageError)
            // Update status to failed
            await supabase
              .from('maintenance_tickets')
              .update({
                ai_triage_status: 'failed',
                ai_triage_notes: triageError.message || 'Triage failed'
              })
              .eq('id', result.id)
          } else if (triageResult?.triage) {
            // AI auto-triaged ticket successfully
            // Status already updated by edge function to 'completed'
            // Invalidate to refresh with AI suggestions
            queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
          }
        }).catch(async (aiErr) => {
          console.warn('Auto-triage call failed:', aiErr)
          await supabase
            .from('maintenance_tickets')
            .update({
              ai_triage_status: 'failed',
              ai_triage_notes: 'Triage call failed'
            })
            .eq('id', result.id)
        })
      }

      return result as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.create.success('maintenance ticket')
    },
    onError: () => {
      crudToasts.create.error('create maintenance ticket')
    }
  })
}

export function useUpdateMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      updates
    }: {
      ticketId: string
      updates: Partial<MaintenanceTicket>
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single()

      if (error) throw error
      return data as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.update.success('Ticket')
    },
    onError: () => {
      crudToasts.update.error('ticket')
    }
  })
}

export function useAssignMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      assignedToId,
      ticketTitle,
      priority
    }: {
      ticketId: string
      assignedToId: string | null
      ticketTitle?: string
      priority?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      let notificationPayload = null
      if (assignedToId && ticketTitle) {
        notificationPayload = {
          type: 'maintenance_assigned',
          title: 'Maintenance Ticket Assigned',
          message: `You have been assigned a ${priority || 'ticket'}: "${ticketTitle}"`,
          link: `/maintenance/${ticketId}`,
          data: { ticketId, priority }
        }
      }

      const { data, error } = await supabase.rpc('assign_maintenance_ticket', {
        p_ticket_id: ticketId,
        p_assigner_id: user.id,
        p_assigned_to_id: assignedToId,
        p_notification_payload: notificationPayload
      })

      if (error) throw error
      return data as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['sidebar-counts'] })
      crudToasts.update.success('ticket assignment')
    },
    onError: (error) => {
      console.error('Assign Ticket Error:', error)
      crudToasts.update.error('ticket assignment')
    }
  })
}

export function useCompleteMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      laborHours,
      materialCost,
      notes,
      ticketTitle
    }: {
      ticketId: string
      laborHours?: number
      materialCost?: number
      notes?: string
      ticketTitle?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const notificationPayload = {
        type: 'maintenance_completed',
        title: 'Maintenance Ticket Completed',
        message: `Your maintenance request "${ticketTitle || 'Ticket'}" has been completed.`,
        link: `/maintenance/${ticketId}`,
        data: { ticketId }
      }

      const { data, error } = await supabase.rpc('complete_maintenance_ticket', {
        ticket_id: ticketId,
        completer_id: user.id,
        labor_hours: laborHours,
        material_cost: materialCost,
        notes: notes,
        notification_payload: notificationPayload
      })

      if (error) throw error
      return data as MaintenanceTicket
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.update.success('Ticket completed')
    },
    onError: () => {
      crudToasts.update.error('complete ticket')
    }
  })
}

export function useAddMaintenanceComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      comment,
      internalOnly = false
    }: {
      ticketId: string
      comment: string
      internalOnly?: boolean
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('maintenance_comments')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          comment,
          internal_only: internalOnly
        })
        .select(`
          *,
          author:profiles!author_id(id, full_name, email)
        `)
        .single()

      if (error) throw error
      return data as MaintenanceComment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.create.success('Comment')
    },
    onError: () => {
      crudToasts.create.error('comment')
    }
  })
}

export function useUploadMaintenanceAttachment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      file,
      description
    }: {
      ticketId: string
      file: File
      description?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      // Perform security scan
      const scanResult = await scanFile(file, {
        bucket: 'maintenance-attachments',
        context: 'maintenance_attachment'
      })
      if (!scanResult.safe) {
        throw new Error(scanResult.message || 'File failed security scan')
      }

      // Upload file to storage
      const fileName = `${ticketId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('maintenance-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('maintenance-attachments')
        .getPublicUrl(fileName)

      // Create attachment record
      const { data, error } = await supabase
        .from('maintenance_attachments')
        .insert({
          ticket_id: ticketId,
          uploaded_by_id: user.id,
          file_name: file.name,
          file_path: publicUrl || fileName,
          storage_bucket: 'maintenance-attachments',
          storage_path: fileName,
          file_type: file.type,
          file_size: file.size,
          description: description || null
        })
        .select(`
          *,
          uploaded_by:profiles!uploaded_by_id(id, full_name, email)
        `)
        .single()

      if (error) throw error
      return data as MaintenanceAttachment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
      crudToasts.create.success('Attachment')
    },
    onError: (error) => {
      // Show specific error if it's a security/virus scan error
      if (error instanceof Error && error.message.includes('Security')) {
        crudToasts.create.error('attachment', error.message)
      } else {
        crudToasts.create.error('attachment')
      }
    }
  })
}
