'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SOPDocumentStatus } from '@/lib/types/sop';
import { useDepartments, type Department, type Category } from '@/hooks/useDepartments';

interface SOPFiltersProps {
  initialStatus?: SOPDocumentStatus;
  initialDepartmentId?: string;
  initialCategoryId?: string;
  initialQuery?: string;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'obsolete', label: 'Obsolete' },
];

export function SOPFilters({
  initialStatus,
  initialDepartmentId,
  initialCategoryId,
  initialQuery,
}: SOPFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { departments, categories, isLoading } = useDepartments();
  
  const [filters, setFilters] = useState({
    status: initialStatus || 'all',
    departmentId: initialDepartmentId || 'all',
    categoryId: initialCategoryId || 'all',
    query: initialQuery || '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Update filters when URL params change
    const status = searchParams.get('status') as SOPDocumentStatus || 'all';
    const departmentId = searchParams.get('department') || 'all';
    const categoryId = searchParams.get('category') || 'all';
    const query = searchParams.get('q') || '';

    setFilters({ status, departmentId, categoryId, query });
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    
    if (updated.status && updated.status !== 'all') {
      params.set('status', updated.status);
    } else {
      params.delete('status');
    }
    
    if (updated.departmentId && updated.departmentId !== 'all') {
      params.set('department', updated.departmentId);
    } else {
      params.delete('department');
    }
    
    if (updated.categoryId && updated.categoryId !== 'all') {
      params.set('category', updated.categoryId);
    } else {
      params.delete('category');
    }
    
    if (updated.query) {
      params.set('q', updated.query);
    } else {
      params.delete('q');
    }

    // Reset page when filters change
    params.delete('page');
    
    router.push(`?${params.toString()}`);
  };

  const handleReset = () => {
    updateFilters({
      status: 'all',
      departmentId: 'all',
      categoryId: 'all',
      query: '',
    });
  };

  const filteredCategories = categories.filter(
    (cat: Category) => filters.departmentId === 'all' || cat.department_id === filters.departmentId
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={filters.query}
              onChange={(e) => updateFilters({ query: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilters({ status: value as SOPDocumentStatus })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select
          value={filters.departmentId}
          onValueChange={(value) => {
            updateFilters({ 
              departmentId: value, 
              categoryId: 'all' // Reset category when department changes
            });
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept: Department) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0"
        >
          <Icons.Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
          {/* Category Filter */}
          <Select
            value={filters.categoryId}
            onValueChange={(value) => updateFilters({ categoryId: value })}
            disabled={filters.departmentId === 'all' || isLoading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {filteredCategories.map((category: Category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="shrink-0"
          >
            <Icons.RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.status !== 'all' || 
        filters.departmentId !== 'all' || 
        filters.categoryId !== 'all' || 
        filters.query) && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Status: {statusOptions.find(s => s.value === filters.status)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-blue-600 hover:text-blue-800"
                onClick={() => updateFilters({ status: 'all' })}
              >
                <Icons.X className="h-3 w-3" />
              </Button>
            </span>
          )}
          
          {filters.departmentId !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Department: {departments.find((d: Department) => d.id === filters.departmentId)?.name}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-green-600 hover:text-green-800"
                onClick={() => updateFilters({ departmentId: 'all', categoryId: 'all' })}
              >
                <Icons.X className="h-3 w-3" />
              </Button>
            </span>
          )}
          
          {filters.categoryId !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Category: {categories.find((c: Category) => c.id === filters.categoryId)?.name}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-purple-600 hover:text-purple-800"
                onClick={() => updateFilters({ categoryId: 'all' })}
              >
                <Icons.X className="h-3 w-3" />
              </Button>
            </span>
          )}
          
          {filters.query && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Search: "{filters.query}"
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-orange-600 hover:text-orange-800"
                onClick={() => updateFilters({ query: '' })}
              >
                <Icons.X className="h-3 w-3" />
              </Button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
