/**
 * usePins Hook
 * 
 * React Query hooks for managing user pins/favorites.
 * Allows users to pin important items to their dashboard for quick access.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

// ============================================================================
// Types
// ============================================================================

export type PinItemType = 'document' | 'sop' | 'training' | 'task' | 'announcement' | 'knowledge'

export interface UserPin {
  id: string
  user_id: string
  item_type: PinItemType
  item_id: string
  pinned_at: string
  display_order: number
}

export interface PinWithDetails {
  pin_id: string
  item_type: PinItemType
  item_id: string
  pinned_at: string
  display_order: number
  title: string
  description: string | null
  url: string
}

export interface PinReorderItem {
  pin_id: string
  display_order: number
}

// Maximum number of pinned items allowed
export const MAX_PINS = 10

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all pins for the current user with their details
 */
export function usePins() {
  const { user } = useAuth()
  const { t } = useTranslation('dashboard')

  return useQuery({
    queryKey: ['user-pins', user?.id],
    queryFn: async (): Promise<PinWithDetails[]> => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .rpc('get_user_pins_with_details', {
          p_user_id: user.id
        })

      if (error) {
        console.error('Error fetching pins:', error)
        throw new Error(t('pins.errors.fetch_failed', 'Failed to load pinned items'))
      }

      return (data || []).map((item: Record<string, unknown>) => ({
        pin_id: item.pin_id,
        item_type: item.item_type,
        item_id: item.item_id,
        pinned_at: item.pinned_at,
        display_order: item.display_order,
        title: item.title,
        description: item.description,
        url: item.url
      }))
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  })
}

/**
 * Check if a specific item is pinned by the current user
 */
export function useIsPinned(itemType: PinItemType, itemId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-pins-check', user?.id, itemType, itemId],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id || !itemId) return false

      const { data, error } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .maybeSingle()

      if (error) {
        console.error('Error checking pin status:', error)
        return false
      }

      return !!data
    },
    enabled: !!user?.id && !!itemId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

/**
 * Get the count of pinned items for the current user
 */
export function usePinsCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['user-pins-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0

      const { count, error } = await supabase
        .from('user_pins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching pins count:', error)
        return 0
      }

      return count || 0
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Add a pin for an item
 * Shows optimistic update
 */
export function useAddPin() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation('dashboard')

  return useMutation({
    mutationFn: async ({ 
      itemType, 
      itemId, 
      title: _title 
    }: { 
      itemType: PinItemType
      itemId: string
      title?: string
    }): Promise<UserPin> => {
      if (!user?.id) throw new Error(t('pins.errors.not_authenticated', 'User must be authenticated'))

      // Check if already at max pins
      const { count } = await supabase
        .from('user_pins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count && count >= MAX_PINS) {
        throw new Error(t('pins.errors.max_reached', 'Maximum {{max}} pinned items reached. Unpin something first.', { max: MAX_PINS }))
      }

      // Get current max display order
      const { data: maxOrderData } = await supabase
        .from('user_pins')
        .select('display_order')
        .eq('user_id', user.id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      const nextOrder = (maxOrderData?.display_order || 0) + 1

      const { data, error } = await supabase
        .from('user_pins')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          display_order: nextOrder
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error(t('pins.errors.already_pinned', 'This item is already pinned'))
        }
        throw new Error(t('pins.errors.add_failed', 'Failed to pin item'))
      }

      return data as UserPin
    },
    onMutate: async ({ itemType, itemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-pins'] })
      await queryClient.cancelQueries({ queryKey: ['user-pins-check'] })
      await queryClient.cancelQueries({ queryKey: ['user-pins-count'] })

      // Snapshot previous values
      const previousPins = queryClient.getQueryData(['user-pins', user?.id])
      const previousCheck = queryClient.getQueryData(['user-pins-check', user?.id, itemType, itemId])
      const previousCount = queryClient.getQueryData(['user-pins-count', user?.id])

      // Optimistically update check query
      queryClient.setQueryData(['user-pins-check', user?.id, itemType, itemId], true)

      // Optimistically update count
      if (typeof previousCount === 'number') {
        queryClient.setQueryData(['user-pins-count', user?.id], previousCount + 1)
      }

      return { previousPins, previousCheck, previousCount }
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousPins) {
        queryClient.setQueryData(['user-pins', user?.id], context.previousPins)
      }
      if (context?.previousCheck !== undefined) {
        queryClient.setQueryData(['user-pins-check', user?.id, variables.itemType, variables.itemId], context.previousCheck)
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['user-pins-count', user?.id], context.previousCount)
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['user-pins'] })
      queryClient.invalidateQueries({ queryKey: ['user-pins-count'] })
      toast.success(t('pins.success.added', 'Pinned to dashboard'))
    },
  })
}

/**
 * Remove a pin
 * Shows optimistic update
 */
export function useRemovePin() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation('dashboard')

  return useMutation({
    mutationFn: async ({
      itemType,
      itemId
    }: {
      itemType: PinItemType
      itemId: string
    }): Promise<void> => {
      if (!user?.id) throw new Error(t('pins.errors.not_authenticated', 'User must be authenticated'))

      const { error } = await supabase
        .from('user_pins')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)

      if (error) {
        throw new Error(t('pins.errors.remove_failed', 'Failed to unpin item'))
      }
    },
    onMutate: async ({ itemType, itemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-pins'] })
      await queryClient.cancelQueries({ queryKey: ['user-pins-check'] })
      await queryClient.cancelQueries({ queryKey: ['user-pins-count'] })

      // Snapshot previous values
      const previousPins = queryClient.getQueryData(['user-pins', user?.id])
      const previousCheck = queryClient.getQueryData(['user-pins-check', user?.id, itemType, itemId])
      const previousCount = queryClient.getQueryData(['user-pins-count', user?.id])

      // Optimistically update check query
      queryClient.setQueryData(['user-pins-check', user?.id, itemType, itemId], false)

      // Optimistically update count
      if (typeof previousCount === 'number') {
        queryClient.setQueryData(['user-pins-count', user?.id], Math.max(0, previousCount - 1))
      }

      // Optimistically remove from pins list
      if (previousPins && Array.isArray(previousPins)) {
        queryClient.setQueryData(
          ['user-pins', user?.id],
          previousPins.filter((pin: PinWithDetails) => 
            !(pin.item_type === itemType && pin.item_id === itemId)
          )
        )
      }

      return { previousPins, previousCheck, previousCount }
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousPins) {
        queryClient.setQueryData(['user-pins', user?.id], context.previousPins)
      }
      if (context?.previousCheck !== undefined) {
        queryClient.setQueryData(['user-pins-check', user?.id, variables.itemType, variables.itemId], context.previousCheck)
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['user-pins-count', user?.id], context.previousCount)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins'] })
      queryClient.invalidateQueries({ queryKey: ['user-pins-count'] })
      toast.success(t('pins.success.removed', 'Unpinned from dashboard'))
    },
  })
}

/**
 * Toggle pin status for an item (add if not pinned, remove if pinned)
 */
export function useTogglePin() {
  const { user } = useAuth()
  const addPin = useAddPin()
  const removePin = useRemovePin()
  const { t } = useTranslation('dashboard')

  return useMutation({
    mutationFn: async ({
      itemType,
      itemId,
      title,
      isCurrentlyPinned
    }: {
      itemType: PinItemType
      itemId: string
      title?: string
      isCurrentlyPinned: boolean
    }): Promise<void> => {
      if (!user?.id) throw new Error(t('pins.errors.not_authenticated', 'User must be authenticated'))

      if (isCurrentlyPinned) {
        await removePin.mutateAsync({ itemType, itemId })
      } else {
        await addPin.mutateAsync({ itemType, itemId, title })
      }
    },
  })
}

/**
 * Reorder pins
 */
export function useReorderPins() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation('dashboard')

  return useMutation({
    mutationFn: async (pinOrders: PinReorderItem[]): Promise<boolean> => {
      if (!user?.id) throw new Error(t('pins.errors.not_authenticated', 'User must be authenticated'))

      const pinOrdersJson = JSON.stringify(
        pinOrders.map(item => ({
          pin_id: item.pin_id,
          display_order: item.display_order
        }))
      )

      const { data, error } = await supabase
        .rpc('reorder_user_pins', {
          p_user_id: user.id,
          p_pin_orders: pinOrdersJson
        })

      if (error) {
        console.error('Error reordering pins:', error)
        throw new Error(t('pins.errors.reorder_failed', 'Failed to reorder pins'))
      }

      return data as boolean
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pins'] })
    },
  })
}
