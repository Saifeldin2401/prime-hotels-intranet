'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Department {
  id: string;
  name: string;
  name_ar?: string;
  short_code?: string;
}

export interface Category {
  id: string;
  name: string;
  name_ar?: string;
  department_id: string;
  parent_id?: string;
}

export interface Subcategory extends Category {
  parent_id: string;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch departments
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id, name, name_ar, short_code')
          .order('name');

        if (deptError) throw deptError;

        // Fetch categories
        const { data: catData, error: catError } = await supabase
          .from('sop_categories')
          .select('id, name, name_ar, department_id, parent_id')
          .order('name');

        if (catError) throw catError;

        setDepartments(deptData || []);
        setCategories(catData || []);
        
        // Separate subcategories from categories
        const subcats = (catData || []).filter(cat => cat.parent_id);
        setSubcategories(subcats);

      } catch (err) {
        console.error('Error fetching departments data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch departments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    departments,
    categories,
    subcategories,
    isLoading,
    error,
  };
}
