import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { 
  supportedLanguages, 
  type SupportedLanguage, 
  getTranslation, 
  isRTL, 
  getDirection 
} from '@/lib/i18n'

interface I18nContextType {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  t: (path: string) => string
  isRTL: boolean
  direction: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
  defaultLanguage?: SupportedLanguage
}

export function I18nProvider({ children, defaultLanguage = 'en' }: I18nProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    // Get saved language from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prime-hotels-language') as SupportedLanguage
      if (saved && supportedLanguages.includes(saved)) {
        return saved
      }
    }
    return defaultLanguage
  })

  const isRTLLanguage = isRTL(language)
  const direction = getDirection(language)

  // Update document direction when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction
      document.documentElement.lang = language
    }
  }, [language, direction])

  // Save language preference to localStorage
  const handleSetLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage)
    if (typeof window !== 'undefined') {
      localStorage.setItem('prime-hotels-language', newLanguage)
    }
  }

  // Translation function
  const t = (path: string): string => {
    return getTranslation(language, path)
  }

  const value: I18nContextType = {
    language,
    setLanguage: handleSetLanguage,
    t,
    isRTL: isRTLLanguage,
    direction
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Hook for easier translation usage
export function useTranslation() {
  const { t, language, isRTL, direction } = useI18n()
  return { t, language, isRTL, direction }
}
