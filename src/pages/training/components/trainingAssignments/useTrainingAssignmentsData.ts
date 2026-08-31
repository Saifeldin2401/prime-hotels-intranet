import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { learningService } from '@/services/learningService'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import type { LearningAssignment } from './types'

export function useTrainingAssignmentsData(manageModuleId: string | null) {
  const { currentOrganization } = useTenant()

  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('training_assignment_rules')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrganization?.id
  })

  const { data: moduleExemptions = [] } = useQuery({
    queryKey: ['learning-assignment-exemptions', currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignment_exemptions')
        .select('*')
        .eq('content_type', 'module')
      if (error) throw error
      return data || []
    }
  })

  const { data: modules, refetch: refetchAssignableModules } = useQuery({
    queryKey: ['training-modules', 'assignable', currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select('id, title, description, status, is_active')
        .eq('status', 'published')
        .eq('is_active', true)
        .order('title')
      if (error) throw error
      return data as TrainingModule[]
    }
  })

  const { data: moduleRoster, isLoading: isLoadingModuleRoster } = useQuery({
    queryKey: ['module-assignment-roster', manageModuleId],
    queryFn: () => learningService.getModuleAssignmentRoster(manageModuleId!),
    enabled: !!manageModuleId
  })

  const { data: userDepartments } = useQuery({
    queryKey: ['user-departments', 'memberships', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('user_id, department:departments(id, name)')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrganization?.id
  })

  const { data: userProperties } = useQuery({
    queryKey: ['user-properties', 'memberships', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('user_id, property:hotels(id, name)')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrganization?.id
  })

  const { data: users } = useQuery({
    queryKey: ['scoped-users-list', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('user_id, profile:profiles(id, full_name, email)')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
      if (error) throw error
      return (data || [])
        .map((m: any) => m.profile)
        .filter(Boolean)
    },
    enabled: !!currentOrganization?.id
  })

  const { data: departments } = useQuery({
    queryKey: ['scoped-departments-list', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property_id, property:hotels(name)')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data || []).map((d) => {
        const propertyName = Array.isArray(d.property) && d.property.length > 0
          ? d.property[0]?.name
          : (d.property as { name?: string } | null)?.name
        return {
          id: d.id,
          name: propertyName ? `${d.name} (${propertyName})` : d.name,
          propertyName: propertyName,
          rawName: d.name
        }
      })
    },
    enabled: !!currentOrganization?.id
  })

  const { data: properties } = useQuery({
    queryKey: ['scoped-hotels-for-assignment', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!currentOrganization?.id
  })

  const assignments = useMemo(() => {
    if (!rawAssignments || !modules) return []
    return rawAssignments.map(a => ({
      ...a,
      training_modules: modules.find(m => m.id === a.content_id)
    })) as LearningAssignment[]
  }, [rawAssignments, modules])

  return {
    assignments,
    departments,
    isLoadingAssignments,
    isLoadingModuleRoster,
    moduleExemptions,
    moduleRoster,
    modules,
    properties,
    refetchAssignableModules,
    userDepartments,
    userProperties,
    users,
    rawAssignments,
  }
}
