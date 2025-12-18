import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Department {
  id: string;
  name: string;
  name_ar?: string;
  property_id: string; // Ensure this is present
  manager_id?: string;
}

export function useDepartments(propertyId?: string) { // Optional filter
  const queryClient = useQueryClient();

  // Fetch departments
  const { data: departments = [], isLoading, error } = useQuery({
    queryKey: ['departments', propertyId],
    queryFn: async () => {
      let query = supabase.from('departments').select('*').eq('is_deleted', false).order('name');
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Department[];
    }
  });

  // Create
  const createDepartment = useMutation({
    mutationFn: async (dept: Omit<Department, 'id'>) => {
      const { data, error } = await supabase.from('departments').insert(dept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  // Update
  const updateDepartment = useMutation({
    mutationFn: async (dept: Partial<Department> & { id: string }) => {
      const { error } = await supabase.from('departments').update({ name: dept.name, manager_id: dept.manager_id }).eq('id', dept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    }
  });

  // Delete
  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;
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
