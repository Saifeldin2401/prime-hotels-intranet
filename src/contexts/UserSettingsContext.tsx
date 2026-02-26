import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

interface UserSettings {
    reduced_motion: boolean
    high_contrast: boolean
    large_text: boolean
    keyboard_shortcuts: boolean
    timezone: string
    theme: string
}

interface UserSettingsContextType extends UserSettings {
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>
    refreshSettings: () => Promise<void>
    loading: boolean
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined)

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<UserSettings>({
        reduced_motion: false,
        high_contrast: false,
        large_text: false,
        keyboard_shortcuts: true,
        timezone: 'Asia/Riyadh',
        theme: 'light'
    })

    const applyAccessibilityClasses = (s: UserSettings) => {
        const root = document.documentElement

        if (s.reduced_motion) root.classList.add('reduced-motion')
        else root.classList.remove('reduced-motion')

        if (s.high_contrast) root.classList.add('high-contrast')
        else root.classList.remove('high-contrast')

        if (s.large_text) root.classList.add('large-text')
        else root.classList.remove('large-text')
    }

    const fetchSettings = async () => {
        if (!user) return

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session || session.user.id !== user.id) {
                return
            }

            const { data, error } = await supabase
                .from('user_settings')
                .select('reduced_motion, high_contrast, large_text, keyboard_shortcuts, timezone, theme')
                .eq('user_id', user.id)
                .limit(1)

            if (error) throw error

            const currentSettings = Array.isArray(data) ? data[0] : null

            if (currentSettings) {
                setSettings(currentSettings)
                applyAccessibilityClasses(currentSettings)
            } else {
                // Create default settings if not exists
                const defaultSettings = {
                    user_id: user.id,
                    reduced_motion: false,
                    high_contrast: false,
                    large_text: false,
                    keyboard_shortcuts: true,
                    timezone: 'Asia/Riyadh',
                    theme: 'light'
                }
                const { error: insertError } = await supabase
                    .from('user_settings')
                    .upsert(defaultSettings, { onConflict: 'user_id' })

                if (insertError) {
                    // During auth transitions, RLS can reject transient unauthenticated writes.
                    // Keep in-memory defaults and retry naturally on next refresh.
                    const code = (insertError as { code?: string }).code
                    if (code !== '42501' && code !== '401') {
                        console.error('Error creating default settings:', insertError)
                    }
                }
                else {
                    setSettings(defaultSettings)
                    applyAccessibilityClasses(defaultSettings)
                }
            }
        } catch (err) {
            const code = (err as { code?: string }).code
            if (code !== '401' && code !== 'PGRST301') {
                console.error('Failed to fetch user settings:', err)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSettings()
        } else {
            setLoading(false)
        }
    }, [user])

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        if (!user) return

        const updated = { ...settings, ...newSettings }
        setSettings(updated)
        applyAccessibilityClasses(updated)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session || session.user.id !== user.id) {
                return
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert(
                    { user_id: user.id, ...newSettings },
                    { onConflict: 'user_id' }
                )

            if (error) throw error
        } catch (err) {
            const code = (err as { code?: string }).code
            if (code !== '42501' && code !== '401') {
                console.error('Failed to update user settings:', err)
            }
        }
    }

    return (
        <UserSettingsContext.Provider value={{ ...settings, updateSettings, refreshSettings: fetchSettings, loading }}>
            {children}
        </UserSettingsContext.Provider>
    )
}

export function useUserSettings() {
    const context = useContext(UserSettingsContext)
    if (context === undefined) {
        throw new Error('useUserSettings must be used within a UserSettingsProvider')
    }
    return context
}
