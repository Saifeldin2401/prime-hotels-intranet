import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Theme, ThemeMode } from '../lib/theme'
import { getTheme, applyTheme } from '../lib/theme'

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

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode
    return saved || defaultMode
  })
  
  const [theme, setTheme] = useState<Theme>(() => getTheme(mode))
  const [isDark, setIsDark] = useState(() => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return mode === 'dark'
  })

  useEffect(() => {
    const newTheme = getTheme(mode)
    const newIsDark = mode === 'system' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : mode === 'dark'
    
    setTheme(newTheme)
    setIsDark(newIsDark)
    applyTheme(newTheme)
    const root = document.documentElement
    if (newIsDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  useEffect(() => {
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        const newTheme = getTheme(mode)
        setTheme(newTheme)
        setIsDark(mediaQuery.matches)
        applyTheme(newTheme)
        const root = document.documentElement
        if (mediaQuery.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [mode])

  const toggleDarkMode = () => {
    setMode(isDark ? 'light' : 'dark')
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
