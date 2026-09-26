import { Focus, Headphones, Languages, Loader2, NotebookPen, Settings2, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlayerToolsMenuProps {
    fontSize: { value: 'sm' | 'base' | 'lg'; onChange: (v: 'sm' | 'base' | 'lg') => void }
    focusMode: { active: boolean; onToggle: () => void }
    audioNarrator: { active: boolean; onToggle: () => void }
    notes: { active: boolean; onToggle: () => void }
    translation?: {
        languages: { code: string; label: string }[]
        active: string | null
        activeLabel?: string
        onSelect: (code: string) => void
        onClear: () => void
        bilingual: boolean
        onToggleBilingual: () => void
        translating: boolean
    }
}

export function PlayerToolsMenu({ fontSize, focusMode, audioNarrator, notes, translation }: PlayerToolsMenuProps) {
    const { t } = useTranslation('training')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5" aria-label={t('player.tools', 'Tools')}>
                    {translation?.translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                    <span className="hidden lg:inline text-xs">{t('player.tools', 'Tools')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={focusMode.onToggle}>
                    <Focus className="me-2 h-4 w-4" />
                    {focusMode.active ? t('player.exitFocusMode', 'Exit focus mode') : t('player.focusMode', 'Focus mode')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={audioNarrator.onToggle}>
                    <Headphones className="me-2 h-4 w-4" />
                    {audioNarrator.active ? t('player.hideReadAloud', 'Hide read-aloud') : t('player.readAloud', 'Read aloud')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={notes.onToggle}>
                    <NotebookPen className="me-2 h-4 w-4" />
                    {notes.active ? t('player.hideNotes', 'Hide notes') : t('player.studyNotes', 'Study notes')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Type className="h-3.5 w-3.5" /> {t('player.textSize', 'Text size')}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={fontSize.value}
                    onValueChange={(v) => fontSize.onChange(v as 'sm' | 'base' | 'lg')}
                >
                    <DropdownMenuRadioItem value="sm">{t('player.small', 'Small')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="base">{t('player.default', 'Default')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="lg">{t('player.large', 'Large')}</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                {translation && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Languages className="me-2 h-4 w-4" />
                                {translation.active
                                    ? t('player.translated', { language: translation.activeLabel ?? translation.active, defaultValue: `Translated: ${translation.activeLabel ?? translation.active}` })
                                    : t('player.translate', 'Translate')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                                {translation.languages.map((lang) => (
                                    <DropdownMenuItem key={lang.code} onClick={() => translation.onSelect(lang.code)}>
                                        {lang.label}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={translation.bilingual}
                                    onCheckedChange={translation.onToggleBilingual}
                                >
                                    {t('player.showBilingual', 'Show bilingual')}
                                </DropdownMenuCheckboxItem>
                                {translation.active && (
                                    <DropdownMenuItem onClick={translation.onClear}>{t('player.viewOriginal', 'View original')}</DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
