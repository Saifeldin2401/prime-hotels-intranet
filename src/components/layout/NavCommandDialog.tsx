import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@/components/ui/command"
import { useNavigation } from "@/hooks/useNavigation"
import { useNavigationStore } from "@/stores/navigationStore"
import { Star } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

interface NavCommandDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NavCommandDialog({ open, onOpenChange }: NavCommandDialogProps) {
    const { t } = useTranslation(['nav', 'common'])
    const navigate = useNavigate()
    const { groupedNavigation, favoriteItems, recentItems } = useNavigation()
    const { isFavorite, toggleFavorite } = useNavigationStore()
    const [search, setSearch] = useState('')

    // Keydown listener for Cmd+K or Ctrl+K shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onOpenChange(!open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [open, onOpenChange])

    const handleSelect = (path: string) => {
        onOpenChange(false)
        setSearch('')
        setTimeout(() => {
            navigate(path)
        }, 10)
    }

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder={t('search_placeholder', { defaultValue: 'Type a command or search page...' })}
                value={search}
                onValueChange={setSearch}
            />
            <CommandList className="max-h-[380px] p-2">
                <CommandEmpty>{t('common:no_results', { defaultValue: 'No matching pages found.' })}</CommandEmpty>

                {/* Favorites Group */}
                {favoriteItems.length > 0 && !search && (
                    <>
                        <CommandGroup heading={t('groups.favorites', { defaultValue: 'Favorites & Shortcuts' })}>
                            {favoriteItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <CommandItem
                                        key={`fav-${item.path}`}
                                        value={`fav ${item.title} ${item.path}`.toLowerCase()}
                                        onSelect={() => handleSelect(item.resolvedPath)}
                                        onClick={() => handleSelect(item.resolvedPath)}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span className="font-medium text-sm">
                                                {t(item.title, { defaultValue: item.title })}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleFavorite(item.path)
                                            }}
                                            className="text-amber-500 hover:text-amber-600 p-1"
                                            title="Unpin"
                                        >
                                            <Star className="h-3.5 w-3.5 fill-amber-500" />
                                        </button>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        <CommandSeparator className="my-1" />
                    </>
                )}

                {/* Recently Visited */}
                {recentItems.length > 0 && !search && (
                    <>
                        <CommandGroup heading={t('groups.recents', { defaultValue: 'Recently Visited' })}>
                            {recentItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <CommandItem
                                        key={`rec-${item.path}`}
                                        value={`recent ${item.title} ${item.path}`.toLowerCase()}
                                        onSelect={() => handleSelect(item.resolvedPath)}
                                        onClick={() => handleSelect(item.resolvedPath)}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                                            <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                                                {t(item.title, { defaultValue: item.title })}
                                            </span>
                                        </div>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        <CommandSeparator className="my-1" />
                    </>
                )}

                {/* All Navigation Groups */}
                {groupedNavigation.map((group) => {
                    if (group.items.length === 0) return null
                    const groupTitle = t(group.config.title, { defaultValue: group.config.id })

                    return (
                        <CommandGroup key={group.config.id} heading={groupTitle}>
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const title = t(item.title, { defaultValue: item.title })
                                const isFav = isFavorite(item.path)

                                return (
                                    <CommandItem
                                        key={item.path}
                                        value={`${title} ${item.path} ${item.keywords?.join(' ') || ''}`.toLowerCase()}
                                        onSelect={() => handleSelect(item.resolvedPath)}
                                        onClick={() => handleSelect(item.resolvedPath)}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-4 w-4 text-hotel-gold shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {title}
                                                </span>
                                                {item.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {item.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleFavorite(item.path)
                                            }}
                                            className="text-slate-400 hover:text-amber-500 p-1 opacity-60 hover:opacity-100 transition-all"
                                        >
                                            <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-amber-500 text-amber-500' : ''}`} />
                                        </button>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    )
                })}
            </CommandList>
        </CommandDialog>
    )
}
