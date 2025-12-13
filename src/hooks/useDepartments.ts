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
          .select('id, name')
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
        // Fallback to hardcoded departments if API fails (e.g. 400 Bad Request)
        console.warn('Using fallback department data');
        setDepartments([
          { id: '7d9e787b-6166-4232-8388-461b5f2c0908', name: 'Front Office' },
          { id: '2436d662-1c88-445e-8465-794d8df8ceb4', name: 'Housekeeping' },
          { id: 'ff96a9ed-355a-4647-83d5-3bdbe99bb337', name: 'Food & Beverage' },
          { id: '4b5418e9-4e58-4738-b9a1-9b2d627cdb77', name: 'Maintenance' },
          { id: 'ede272f3-e9f0-40b0-b821-afdc9e4a6848', name: 'Security' },
          { id: 'c9b76c1c-d71a-4898-89e7-19ceefef236c', name: 'Management' }
        ]);
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
