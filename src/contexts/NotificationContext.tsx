import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Notification } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

interface NotificationContextType {
    notifications: Notification[]
    unreadCount: number
    markAsRead: { mutate: (id: string) => void; isPending: boolean }
    markAllAsRead: { mutate: () => void; isPending: boolean }
    isLoading: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const { preferences } = useNotificationPreferences()

    // Ref for accessing latest preferences in realtime callback
    const preferencesRef = useRef(preferences)
    useEffect(() => {
        preferencesRef.current = preferences
    }, [preferences])

    // 1. Fetch Notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50) // Increased limit slightly

            if (error) throw error



            return (data || []).map((n: any) => ({
                ...n,
                is_read: !!n.read_at
            })) as Notification[]
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes stale time
    })

    // 2. Realtime Subscription (Single Source of Truth)
    useEffect(() => {
        if (!user) return



        const channel = supabase
            .channel('global-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {

                    if (!payload.new) return

                    // 1. Invalidate Query to fetch new data
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })

                    // 2. Show Toast
                    const newNotification = payload.new as any
                    toast({
                        title: newNotification.title || 'New Notification',
                        description: newNotification.message,
                    })

                    // 3. Browser Notification (if enabled)
                    if (
                        preferencesRef.current?.browser_push_enabled &&
                        Notification.permission === 'granted'
                    ) {
                        new Notification(newNotification.title || 'New Notification', {
                            body: newNotification.message,
                            icon: '/favicon.ico'
                        })
                    }
                }
            )
            .subscribe()


        return () => {

            supabase.removeChannel(channel)
        }
    }, [user, queryClient, toast])

    // 3. Mutations
    const markAsRead = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
        }
    })

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            if (!user) return
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .is('read_at', null)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
        }
    })

    const unreadCount = notifications.filter((n) => !n.is_read).length

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead: { mutate: markAsRead.mutate, isPending: markAsRead.isPending },
                markAllAsRead: { mutate: markAllAsRead.mutate, isPending: markAllAsRead.isPending },
                isLoading
            }}
        >
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotificationsContext() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotificationsContext must be used within a NotificationProvider')
    }
    return context
}
