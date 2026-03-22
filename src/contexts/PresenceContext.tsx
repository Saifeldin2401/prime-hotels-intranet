
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface PresenceState {
    onlineUsers: {
        user_id: string
        online_at: string
        email: string
        full_name?: string
        avatar_url?: string
        role?: string
    }[]
}

type PresencePayload = PresenceState['onlineUsers'][number]

const PresenceContext = createContext<PresenceState | undefined>(undefined)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth()
    const [onlineUsers, setOnlineUsers] = useState<PresenceState['onlineUsers']>([])

    useEffect(() => {
        if (!user) return

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState<PresencePayload>()
                const users: PresencePayload[] = []
                for (const key in newState) {
                    const firstPresence = newState[key]?.[0]
                    if (firstPresence) {
                        users.push(firstPresence)
                    }
                }
                setOnlineUsers(users)
            })
            .on('presence', { event: 'join' }, () => {
                // console.log('join', key, newPresences)
            })
            .on('presence', { event: 'leave' }, () => {
                // console.log('leave', key, leftPresences)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                        email: user.email,
                        full_name: profile?.full_name,
                        avatar_url: profile?.avatar_url,
                        role: profile?.job_title || 'Team Member' // Use job_title as role fallback
                    })
                }
            })

        return () => {
            channel.unsubscribe()
        }
    }, [user, profile])

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    )
}

export function usePresence() {
    const context = useContext(PresenceContext)
    if (context === undefined) {
        throw new Error('usePresence must be used within a PresenceProvider')
    }
    return context
}
