import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { MaintenanceTicket, MaintenanceComment, MaintenanceAttachment } from '@/lib/types'

export function useMyMaintenanceTickets() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['maintenance-tickets', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select(`
          *,
          reported_by:profiles!reported_by_id(id, full_name, email),
          property:properties(id, name),
          department:departments(id, name),
          assigned_to:profiles!assigned_to_id(id, full_name, email)
        `)
        .eq('reported_by_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as MaintenanceTicket[]
    },
    enabled: !!user?.id
  })
}

export function useAssignedMaintenanceTickets() {
  const { user, roles, properties } = useAuth()

  return useQuery({
    queryKey: ['maintenance-tickets', 'assigned', user?.id, properties],
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
        .order('created_at', { ascending: false })

      // Filter based on user role and access
      const userRole = roles[0]?.role || 'staff'

      if (userRole === 'department_head' || userRole === 'property_manager') {
        // Staff can see tickets assigned to them or for their properties
        if (properties && properties.length > 0) {
          const propertyIds = properties.map(p => p.id).join(',')
          // Use proper OR syntax ensuring valid SQL generation
          query = query.or(`assigned_to_id.eq.${user.id},property_id.in.(${propertyIds})`)
        } else {
          // If no properties, only see assigned to self
          query = query.eq('assigned_to_id', user.id)
        }
      } else if (userRole === 'regional_admin' || userRole === 'regional_hr') {
        // Regional staff can see all tickets
        // No additional filter needed
      } else {
        // Regular staff can only see their own reported tickets (though this hook is typically for assigned, we fallback to reported)
        query = query.eq('reported_by_id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching assigned tickets:', error)
        throw error
      }
      return data as MaintenanceTicket[]
    },
    enabled: !!user?.id
  })
}


export function useMaintenanceTicket(ticketId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['maintenance-tickets', 'single', ticketId],
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
    enabled: !!ticketId && !!user?.id
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
      return result as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
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
    }
  })
}

export function useAssignMaintenanceTicket() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      ticketId,
      assignedToId
    }: {
      ticketId: string
      assignedToId: string | null
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .update({
          assigned_to_id: assignedToId,
          status: assignedToId ? 'in_progress' : 'open'
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) throw error
      return data as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
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
      notes
    }: {
      ticketId: string
      laborHours?: number
      materialCost?: number
      notes?: string
    }) => {
      if (!user?.id) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .update({
          status: 'completed',
          labor_hours: laborHours || null,
          material_cost: materialCost || null,
          notes: notes || null
        })
        .eq('id', ticketId)
        .select()
        .single()

      if (error) throw error
      return data as MaintenanceTicket
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
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
          file_path: publicUrl,
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
    }
  })
}
