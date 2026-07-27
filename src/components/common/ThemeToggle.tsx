import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import {
    Check,
    Monitor,
    Moon,
    Palette,
    Sun
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  // getIcon function removed - unused

  const getLabel = () => {
    switch (mode) {
      case 'light':
        return t('theme.light_mode', 'Light mode')
      case 'dark':
        return t('theme.dark_mode', 'Dark mode')
      default:
        return t('theme.system_theme', 'System theme')
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 relative group"
          aria-label={t('accessibility.change_theme', 'Change theme')}
        >
          <div className="relative">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-hotel-gold" />
            <Monitor className="absolute h-4 w-4 rotate-0 scale-0 transition-all duration-300 opacity-50" />
          </div>
          <div className="absolute -bottom-1 -end-1 h-2 w-2 rounded-full bg-hotel-gold transition-all duration-300 scale-0 group-hover:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 animate-in slide-in-from-top-2 fade-in-0 duration-200"
        sideOffset={8}
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Palette className="h-3 w-3" />
            Theme
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setMode('light')}
          className="cursor-pointer group/item"
        >
          <div className="flex items-center gap-3 flex-1">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light</span>
          </div>
          <div className="ms-auto">
            {mode === 'light' && (
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setMode('dark')}
          className="cursor-pointer group/item"
        >
          <div className="flex items-center gap-3 flex-1">
            <Moon className="h-4 w-4 text-hotel-gold" />
            <span>Dark</span>
          </div>
          <div className="ms-auto">
            {mode === 'dark' && (
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setMode('system')}
          className="cursor-pointer group/item"
        >
          <div className="flex items-center gap-3 flex-1">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span>System</span>
          </div>
          <div className="ms-auto">
            {mode === 'system' && (
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            Current: {getLabel()}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
