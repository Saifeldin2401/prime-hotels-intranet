import { supabase } from '@/lib/supabase'
import type { TrainingModule } from '@/lib/types'
import { learningService } from '@/services/learningService'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { LearningAssignment } from './types'

export function useTrainingAssignmentsData(manageModuleId: string | null) {
  const { data: rawAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['learning-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_assignments')
        .select('*')
        .eq('content_type', 'module')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  const { data: moduleExemptions = [] } = useQuery({
    queryKey: ['learning-assignment-exemptions'],
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
    queryKey: ['training-modules', 'assignable'],
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
    queryKey: ['user-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_departments').select('user_id, department:departments(id, name)')
      if (error) throw error
      return data
    }
  })

  const { data: userProperties } = useQuery({
    queryKey: ['user-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_properties').select('user_id, property:properties(id, name)')
      if (error) throw error
      return data
    }
  })

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
      if (error) throw error
      return data || []
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name, property_id, property:properties(name)').order('name')
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
    }
  })

  const { data: properties } = useQuery({
    queryKey: ['properties-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data || []
    }
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
  }
}
