import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Globe,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language)

  // Set initial direction on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred-language') || i18n.language
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
    setCurrentLang(savedLang)
  }, [i18n.language])

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    setCurrentLang(langCode)

    // Save preference to localStorage
    localStorage.setItem('preferred-language', langCode)

    // Update document direction for Arabic
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr'
  }

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Globe className="h-4 w-4 mr-2" />
          <span className="mr-2">{currentLanguage.flag}</span>
          {currentLanguage.name}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-2"
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {language.code === currentLang && (
              <span className="text-green-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
