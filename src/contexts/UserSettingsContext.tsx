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
            const { data, error } = await supabase
                .from('user_settings')
                .select('reduced_motion, high_contrast, large_text, keyboard_shortcuts, timezone, theme')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (data) {
                setSettings(data)
                applyAccessibilityClasses(data)
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
                    .insert(defaultSettings)

                if (insertError) console.error('Error creating default settings:', insertError)
                else {
                    setSettings(defaultSettings)
                    applyAccessibilityClasses(defaultSettings)
                }
            }
        } catch (err) {
            console.error('Failed to fetch user settings:', err)
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
            const { error } = await supabase
                .from('user_settings')
                .update(newSettings)
                .eq('user_id', user.id)

            if (error) throw error
        } catch (err) {
            console.error('Failed to update user settings:', err)
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
