---
name: Hooks Development
description: Guidelines for creating and using custom React hooks in PRIME Hotels
---

# Hooks Development Skill

## Overview
PRIME Hotels uses custom React hooks extensively to encapsulate business logic, data fetching, and state management.

## Hook Organization

### Directory Structure
```
src/hooks/
├── learning/              # Learning/training specific hooks
├── training/              # Training module hooks
├── useAuth.ts             # Authentication
├── useTraining.ts         # Training operations
├── useKnowledge.ts        # Knowledge base operations
├── useTasks.ts            # Task management
├── useDocuments.ts        # Document operations
├── useMaintenanceTickets.ts
├── useLeaveRequests.ts
├── useNotifications.ts
├── usePermissions.ts
├── useForm.ts             # Form handling
├── useDashboardStats.ts   # Dashboard statistics
└── ... (79+ hooks)
```

## Hook Naming Conventions

- Prefix with `use` (required by React)
- Use descriptive names: `useMaintenanceTickets` not `useMT`
- For data fetching: `use{Entity}` (e.g., `useTasks`, `useDocuments`)
- For operations: `use{Entity}{Action}` (e.g., `useTaskCreate`)
- For utilities: `use{Feature}` (e.g., `usePagination`, `useDebounce`)

## Creating a Custom Hook

### Basic Template

```typescript
// src/hooks/useMyHook.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import type { MyEntity } from '@/lib/types';

interface UseMyHookOptions {
  initialFilters?: Partial<MyFilters>;
  enabled?: boolean;
}

interface MyFilters {
  status?: string;
  propertyId?: string;
}

export function useMyHook(options: UseMyHookOptions = {}) {
  const { initialFilters = {}, enabled = true } = options;
  const { toast } = useToast();
  const { t } = useTranslation('namespace');
  const queryClient = useQueryClient();

  // Local state
  const [filters, setFilters] = useState<MyFilters>(initialFilters);

  // Query key for cache management
  const queryKey = useMemo(() => ['my-entities', filters], [filters]);

  // Fetch data
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('my_table')
        .select('*, related_table(id, name)')
        .eq('is_active', true);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MyEntity[];
    },
    enabled
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newEntity: Partial<MyEntity>) => {
      const { data, error } = await supabase
        .from('my_table')
        .insert(newEntity)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-entities'] });
      toast({
        title: t('messages.createSuccess'),
        variant: 'success'
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.createError'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MyEntity> & { id: string }) => {
      const { data, error } = await supabase
        .from('my_table')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-entities'] });
      toast({
        title: t('messages.updateSuccess'),
        variant: 'success'
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('messages.updateError'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('my_table')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-entities'] });
      toast({
        title: t('messages.deleteSuccess'),
        variant: 'success'
      });
    }
  });

  // Memoized helpers
  const updateFilters = useCallback((newFilters: Partial<MyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    // Data
    data: data ?? [],
    isLoading,
    error,
    
    // Filters
    filters,
    updateFilters,
    resetFilters,
    
    // Mutations
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Utilities
    refetch
  };
}
```

## Existing Hooks Reference

### Data Fetching Hooks

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useTasks` | Task management | CRUD, filtering, status updates |
| `useTraining` | Training modules | Assignments, progress tracking |
| `useKnowledge` | Knowledge articles | Categories, search, acknowledgments |
| `useDocuments` | Document management | Versions, approvals, downloads |
| `useMaintenanceTickets` | Maintenance tickets | Status workflow, assignments |
| `useLeaveRequests` | Leave management | Request/approval workflow |
| `useAnnouncements` | Announcements | Scheduling, targeting, reads |
| `useUsers` | User management | Roles, properties, departments |
| `useMessaging` | Internal messaging | Conversations, attachments |
| `useNotifications` | Notifications | Read status, preferences |

### Statistics Hooks

| Hook | Purpose |
|------|---------|
| `useDashboardStats` | Main dashboard metrics |
| `useStaffDashboardStats` | Staff-specific stats |
| `useApprovalStats` | Approval queue metrics |
| `useMaintenanceStats` | Maintenance KPIs |
| `useDepartmentKPIs` | Department performance |
| `useAnalyticsStats` | Analytics dashboard |

### Utility Hooks

| Hook | Purpose |
|------|---------|
| `usePermissions` | Role-based permissions |
| `useForm` | Form state management |
| `usePagination` | Pagination state |
| `useSearch` | Global search |
| `useRTL` | RTL direction detection |
| `useAutoSave` | Auto-save functionality |
| `useDebounce` | Debounced values |
| `useSessionTimeout` | Session management |
| `useInactivityTimeout` | Inactivity detection |

### AI/ML Hooks

| Hook | Purpose |
|------|---------|
| `useAIDocumentSummarizer` | AI document summaries |
| `useAIFeedbackAnalyzer` | Feedback analysis |
| `useAIOnboardingPath` | AI-generated onboarding |
| `useAITicketTriage` | Maintenance triage |

## Hook Patterns

### Pattern 1: Query with Filters
```typescript
export function useFilteredData() {
  const [filters, setFilters] = useState({});
  
  const { data } = useQuery({
    queryKey: ['data', filters],
    queryFn: () => fetchData(filters)
  });
  
  return { data, filters, setFilters };
}
```

### Pattern 2: CRUD Operations
```typescript
export function useCrudOperations() {
  const queryClient = useQueryClient();
  
  const create = useMutation({
    mutationFn: createEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entities'] })
  });
  
  const update = useMutation({
    mutationFn: updateEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entities'] })
  });
  
  const remove = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entities'] })
  });
  
  return { create, update, remove };
}
```

### Pattern 3: Compound Hook
```typescript
export function useFeature() {
  // Combine multiple hooks
  const { data } = useData();
  const { permissions } = usePermissions();
  const { user } = useUserData();
  
  // Derive computed values
  const canEdit = permissions.includes('edit') && data?.author_id === user?.id;
  
  return { data, canEdit, user };
}
```

### Pattern 4: Subscription Hook
```typescript
export function useRealtimeData() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const subscription = supabase
      .channel('table-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'my_table' },
        (payload) => {
          // Handle change
          setData(prev => [...prev, payload.new]);
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return data;
}
```

## Best Practices

### 1. Always Handle Loading and Error States
```typescript
const { data, isLoading, error } = useMyHook();

if (isLoading) return <Loading />;
if (error) return <Error error={error} />;
```

### 2. Use Proper Dependencies
```typescript
// ✅ Correct - stable dependencies
const fetchData = useCallback(async () => {
  // fetch logic
}, [userId, filters]);

// ❌ Wrong - creating new object each render
const fetchData = useCallback(async () => {
  // fetch logic
}, [{ user: userId }]); // Object reference changes!
```

### 3. Avoid Conditional Hooks
```typescript
// ❌ Wrong - conditional hook call
if (user) {
  const { data } = useUserData(user.id);
}

// ✅ Correct - use enabled option
const { data } = useUserData(user?.id, { enabled: !!user });
```

### 4. Clean Up Subscriptions
```typescript
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
}, []);
```

### 5. Memoize Expensive Computations
```typescript
const processedData = useMemo(() => {
  return data?.map(item => expensiveTransform(item));
}, [data]);
```

## Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from './useMyHook';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('should fetch data', async () => {
  const { result } = renderHook(() => useMyHook(), {
    wrapper: createWrapper()
  });
  
  await waitFor(() => {
    expect(result.current.data).toHaveLength(3);
  });
});
```

## Checklist

Before committing a new hook:

- [ ] Follows `use{Name}` naming convention
- [ ] Returns consistent structure (data, loading, error)
- [ ] Handles error states with toast notifications
- [ ] Uses translations for user-facing messages
- [ ] Memoizes callbacks with `useCallback`
- [ ] Memoizes computed values with `useMemo`
- [ ] Cleans up subscriptions in `useEffect`
- [ ] Has TypeScript types for all parameters and returns
- [ ] Documented with JSDoc comments
