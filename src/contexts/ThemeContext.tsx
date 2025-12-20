import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Theme, ThemeMode } from '../lib/theme'
import { getTheme, applyTheme, lightTheme } from '../lib/theme'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleDarkMode: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultMode?: ThemeMode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>('light')

  const [theme, setTheme] = useState<Theme>(lightTheme)
  const isDark = false

  // Force light mode effect
  useEffect(() => {
    // Always remove dark class
    document.documentElement.classList.remove('dark')
    // Always ensure theme is light
    setTheme(lightTheme)
    applyTheme(lightTheme)
    localStorage.setItem('theme-mode', 'light')
  }, []) // Run once on mount to clear any existing preference

  const toggleDarkMode = () => {
    // Disabled
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggleDarkMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
