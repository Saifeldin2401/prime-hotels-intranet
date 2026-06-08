import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface UserSettings {
  reduced_motion: boolean
  high_contrast: boolean
  large_text: boolean
  keyboard_shortcuts: boolean
  theme: string
}

interface SettingsStore {
  settings: UserSettings
  loading: boolean
  initialized: boolean
  
  // Actions
  fetchSettings: (userId: string) => Promise<void>
  updateSettings: (userId: string, newSettings: Partial<UserSettings>) => Promise<void>
  reset: () => void
}

const defaultSettings: UserSettings = {
  reduced_motion: false,
  high_contrast: false,
  large_text: false,
  keyboard_shortcuts: true,
  theme: 'light'
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loading: false,
  initialized: false,

  fetchSettings: async (userId: string) => {
    if (!userId) return

    set({ loading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id !== userId) {
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('reduced_motion, high_contrast, large_text, keyboard_shortcuts, theme')
        .eq('user_id', userId)
        .limit(1)

      if (error) throw error

      const currentSettings = Array.isArray(data) ? data[0] : null

      if (currentSettings) {
        set({ settings: currentSettings, initialized: true })
        applyAccessibilityClasses(currentSettings)
      } else {
        // Create default settings if not exists
        const { error: insertError } = await supabase
          .from('user_settings')
          .upsert({ user_id: userId, ...defaultSettings }, { onConflict: 'user_id' })

        if (insertError) {
          const code = (insertError as { code?: string }).code
          if (code !== '42501' && code !== '401') {
            console.error('Error creating default settings:', insertError)
          }
        } else {
          set({ settings: defaultSettings, initialized: true })
          applyAccessibilityClasses(defaultSettings)
        }
      }
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== '401' && code !== 'PGRST301') {
        console.error('Failed to fetch user settings:', err)
      }
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: async (userId: string, newSettings: Partial<UserSettings>) => {
    if (!userId) return

    const updatedSettings = { ...get().settings, ...newSettings }
    set({ settings: updatedSettings })
    applyAccessibilityClasses(updatedSettings)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id !== userId) {
        return
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, ...newSettings },
          { onConflict: 'user_id' }
        )

      if (error) throw error
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== '42501' && code !== '401') {
        console.error('Failed to update user settings:', err)
      }
    }
  },

  reset: () => {
    set({ settings: defaultSettings, loading: false, initialized: false })
    applyAccessibilityClasses(defaultSettings)
  }
}))

function applyAccessibilityClasses(s: UserSettings) {
  if (typeof window === 'undefined') return
  const root = document.documentElement

  if (s.reduced_motion) root.classList.add('reduced-motion')
  else root.classList.remove('reduced-motion')

  if (s.high_contrast) root.classList.add('high-contrast')
  else root.classList.remove('high-contrast')

  if (s.large_text) root.classList.add('large-text')
  else root.classList.remove('large-text')
}
