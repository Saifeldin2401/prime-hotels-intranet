import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
    ChevronDown,
    Globe
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', nameKey: 'language.en', flag: '🇺🇸' },
  { code: 'ar', nameKey: 'language.ar', flag: '🇸🇦' }
]

interface LanguageSwitcherProps {
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  showLabel?: boolean
}

export function LanguageSwitcher({ className, variant = "outline", showLabel = true }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.language

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode).catch(err => console.error('LanguageSwitcher: Change failed', err))
    // document.dir update and persistence is handled in i18n.ts
  }

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages.find(l => l.code === 'en') || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size="sm" 
          className={className}
          aria-label={t('accessibility.change_language', 'Change language')}
        >
          <Globe className={cn("h-4 w-4", showLabel && "me-2")} />
          {showLabel && (
            <>
              <span className="me-2">{currentLanguage.flag}</span>
              {t(currentLanguage.nameKey)}
              <ChevronDown className="h-4 w-4 ms-2" />
            </>
          )}
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
            <span>{t(language.nameKey)}</span>
            {language.code === currentLang && (
              <span className="text-green-600">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
