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
  const currentLang = i18n.language

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode).catch(err => console.error('LanguageSwitcher: Change failed', err))
    // document.dir update and persistence is handled in i18n.ts
  }

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages.find(l => l.code === 'en') || languages[0]

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
