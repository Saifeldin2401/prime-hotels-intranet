import { isRealPropertyId } from '@/lib/propertyScope';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface Department {
  id: string;
  name: string;
  name_ar?: string;
  property_id: string; // Ensure this is present
  manager_id?: string;
}

export function useDepartments(propertyId?: string) { // Optional filter
  const queryClient = useQueryClient();
  const { user, primaryRole, properties } = useAuth();

  // Auth helpers
  const isCorporateAdmin = ['administrator', 'super_admin', 'corporate_admin'].includes(primaryRole || '');
  const isRegionalAccess = ['administrator', 'super_admin', 'corporate_admin', 'training_manager', 'regional_admin', 'regional_hr'].includes(primaryRole || '');
  const isPropertyAdmin = ['property_manager', 'property_hr'].includes(primaryRole || '');
  const canManage = isRegionalAccess || isPropertyAdmin;

  // Determine which property IDs this user can actually see/manage
  const allowedPropertyIds = properties?.map(p => p.id) || [];
  const validatePropertyAccess = (idToValidate: string) => {
    if (isCorporateAdmin) return true; // administrators and corporate_admin can manage anywhere
    return allowedPropertyIds.includes(idToValidate);
  };

  const normalizedPropertyId = isRealPropertyId(propertyId) ? propertyId : undefined;

  // Fetch departments
  const { data: departments = [], isLoading, error } = useQuery({
    queryKey: ['departments', normalizedPropertyId],
    queryFn: async () => {
      // departments table uses is_active, not is_deleted
      let query = supabase.from('departments').select('*').eq('is_active', true).order('name');
      if (normalizedPropertyId) {
        query = query.eq('property_id', normalizedPropertyId);
      } else if (!isCorporateAdmin) {
        // Enforce visibility for non-corporate users
        if (allowedPropertyIds.length > 0) {
          query = query.in('property_id', allowedPropertyIds);
        } else {
          // If user has no properties and is not corporate, they shouldn't see any departments
          return [];
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Department[];
    }
  });

  // Create
  const createDepartment = useMutation({
    mutationFn: async (dept: Omit<Department, 'id'>) => {
      if (!user) throw new Error('Unauthenticated');
      if (!canManage) throw new Error('Unauthorized');
      if (!validatePropertyAccess(dept.property_id)) {
        throw new Error('Unauthorized: Property access denied');
      }

      const { data, error } = await supabase.from('departments').insert(dept).select().single();
      if (error) throw error;

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user.id,
        entity_type: 'department',
        entity_id: data.id,
        metadata: { action: 'create', details: { name: dept.name, property_id: dept.property_id } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError);
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  // Update
  const updateDepartment = useMutation({
    mutationFn: async (dept: Partial<Department> & { id: string }) => {
      if (!user) throw new Error('Unauthenticated');
      if (!canManage) throw new Error('Unauthorized');

      // Need to verify property access for the existing department first
      if (!isCorporateAdmin) {
        const { data: existingDept } = await supabase
          .from('departments')
          .select('property_id')
          .eq('id', dept.id)
          .single();

        if (!existingDept || !validatePropertyAccess(existingDept.property_id)) {
          throw new Error('Unauthorized: Target department property access denied');
        }
      }

      // Also verify they aren't trying to transfer it to a property they can't access
      if (dept.property_id && !validatePropertyAccess(dept.property_id)) {
        throw new Error('Unauthorized: Destination property access denied');
      }

      const { error } = await supabase.from('departments').update({ name: dept.name, manager_id: dept.manager_id, property_id: dept.property_id }).eq('id', dept.id);
      if (error) throw error;

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user.id,
        entity_type: 'department',
        entity_id: dept.id,
        metadata: { action: 'update', details: { updates: dept } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  // Delete
  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Unauthenticated');
      if (!canManage) throw new Error('Unauthorized');

      if (!isCorporateAdmin) {
        const { data: existingDept } = await supabase
          .from('departments')
          .select('property_id')
          .eq('id', id)
          .single();

        if (!existingDept || !validatePropertyAccess(existingDept.property_id)) {
          throw new Error('Unauthorized: Department property access denied');
        }
      }

      // Soft-delete by deactivating the department
      const { error } = await supabase.from('departments').update({ is_active: false }).eq('id', id);
      if (error) throw error;

      // Audit log
      supabase.from('system_events').insert({
        event_type: 'audit',
        actor_id: user.id,
        entity_type: 'department',
        entity_id: id,
        metadata: { action: 'delete', details: { deactivated: true } }
      }).then(({ error: auditError }) => {
        if (auditError) console.error('Failed to write audit log:', auditError);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  return {
    departments,
    isLoading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment
  };
}
