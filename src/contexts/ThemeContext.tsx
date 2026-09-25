import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Theme, ThemeMode } from '../lib/theme'
import { lightTheme } from '../lib/theme'
import { safeLocalStorage } from '@/lib/storage'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleDarkMode: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: lightTheme,
      mode: 'light',
      setMode: () => {},
      toggleDarkMode: () => {},
      isDark: false,
    }
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
  defaultMode?: ThemeMode
}

export function ThemeProvider({ children, defaultMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = safeLocalStorage.getItem('theme-mode')
    if (saved === 'dark' || saved === 'light') return saved
    return defaultMode ?? 'light'
  })

  const isDark = mode === 'dark'

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
    safeLocalStorage.setItem('theme-mode', mode)
  }, [mode])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
  }

  const toggleDarkMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme: lightTheme, mode, setMode, toggleDarkMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}
