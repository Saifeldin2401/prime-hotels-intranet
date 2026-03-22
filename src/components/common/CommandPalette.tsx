/**
 * CommandPalette (⌘K / Ctrl+K)
 * A global spotlight-style search overlay for quick navigation across the app.
 * Searches tasks, people, knowledge articles, pages, documents, and more.
 */

import { useRecentSearches, useSearch } from '@/hooks/useSearch'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    BookOpen,
    Briefcase,
    CheckSquare,
    Clock,
    Command,
    CornerDownLeft,
    FileText,
    GraduationCap,
    Hash,
    LayoutDashboard,
    Loader2,
    Megaphone,
    Search,
    Sparkles,
    User,
    Wrench
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const { t } = useTranslation('common')
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const { saveSearch, getRecentSearches, clearRecentSearches } = useRecentSearches()

    const { results, isLoading, hasResults } = useSearch(query, { limit: 12 })
    const recentSearches = getRecentSearches()

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    const getIcon = (type: string) => {
        const iconMap: Record<string, React.ReactNode> = {
            document: <FileText className="w-4 h-4" />,
            user: <User className="w-4 h-4" />,
            training: <GraduationCap className="w-4 h-4" />,
            announcement: <Megaphone className="w-4 h-4" />,
            sop: <BookOpen className="w-4 h-4" />,
            task: <CheckSquare className="w-4 h-4" />,
            ticket: <Wrench className="w-4 h-4" />,
            referral: <Briefcase className="w-4 h-4" />,
            page: <LayoutDashboard className="w-4 h-4" />,
        }
        return iconMap[type] || <FileText className="w-4 h-4" />
    }

    const getTypeColor = (type: string) => {
        const colorMap: Record<string, string> = {
            document: 'text-blue-500 bg-blue-50',
            user: 'text-purple-500 bg-purple-50',
            training: 'text-emerald-500 bg-emerald-50',
            announcement: 'text-amber-500 bg-amber-50',
            sop: 'text-indigo-500 bg-indigo-50',
            task: 'text-green-600 bg-green-50',
            ticket: 'text-orange-500 bg-orange-50',
            referral: 'text-pink-500 bg-pink-50',
            page: 'text-gray-500 bg-gray-100',
        }
        return colorMap[type] || 'text-gray-500 bg-gray-100'
    }

    const getTypeLabel = (type: string) => {
        const labelMap: Record<string, string> = {
            document: t('search.type_document', 'Document'),
            user: t('search.type_user', 'Person'),
            training: t('search.type_training', 'Training'),
            announcement: t('search.type_announcement', 'Announcement'),
            sop: t('search.type_sop', 'SOP'),
            task: t('search.type_task', 'Task'),
            ticket: t('search.type_ticket', 'Ticket'),
            referral: t('search.type_referral', 'Referral'),
            page: t('search.type_page', 'Page'),
        }
        return labelMap[type] || type
    }

    const handleSelect = useCallback((url: string) => {
        saveSearch(query)
        onOpenChange(false)
        setQuery('')
        navigate(url)
    }, [navigate, onOpenChange, query, saveSearch])

    const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        setSelectedIndex(0)
    }, [])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const items = results.length > 0 ? results : []
        const maxIndex = items.length - 1

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, maxIndex))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (items[selectedIndex]) {
                    handleSelect(items[selectedIndex].url)
                }
                break
            case 'Escape':
                e.preventDefault()
                onOpenChange(false)
                break
        }
    }, [results, selectedIndex, handleSelect, onOpenChange])

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
            selected?.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex])

    if (!open) return null

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                        onClick={() => onOpenChange(false)}
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed top-[15%] start-1/2 -translate-x-1/2 w-full max-w-2xl z-[101] px-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center border-b border-gray-100 px-5 py-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center me-3 shrink-0">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={handleQueryChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('search.command_palette_placeholder', 'Search pages, people, documents...')}
                                    className="flex-1 bg-transparent outline-none text-lg text-gray-900 placeholder:text-gray-400"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="ms-3 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md font-mono"
                                >
                                    ESC
                                </button>
                            </div>

                            {/* Results Area */}
                            <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
                                {/* No Query: Show Recent Searches */}
                                {!query.trim() && recentSearches.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between px-5 py-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {t('search.recent', 'Recent')}
                                            </span>
                                            <button
                                                onClick={() => { clearRecentSearches(); setQuery(' '); setQuery(''); }}
                                                className="text-[10px] text-gray-400 hover:text-gray-600"
                                            >
                                                {t('search.clear', 'Clear')}
                                            </button>
                                        </div>
                                        {recentSearches.slice(0, 5).map((search) => (
                                            <button
                                                key={search}
                                                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-start"
                                                onClick={() => setQuery(search)}
                                            >
                                                <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                                <span className="truncate">{search}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* No Query, No Recent: Quick Actions */}
                                {!query.trim() && recentSearches.length === 0 && (
                                    <div className="px-5 py-8 text-center space-y-3">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
                                            <Sparkles className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            {t('search.command_palette_hint', 'Type to search across the entire app')}
                                        </p>
                                    </div>
                                )}

                                {/* Search Results */}
                                {query.trim() && hasResults && (
                                    <div>
                                        {/* Group by type */}
                                        {(() => {
                                            const grouped = results.reduce((acc, r) => {
                                                if (!acc[r.type]) acc[r.type] = []
                                                acc[r.type].push(r)
                                                return acc
                                            }, {} as Record<string, typeof results>)

                                            let globalIndex = 0

                                            return Object.entries(grouped).map(([type, items]) => (
                                                <div key={type}>
                                                    <div className="px-5 py-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                            <Hash className="w-3 h-3" />
                                                            {getTypeLabel(type)}
                                                        </span>
                                                    </div>
                                                    {items.map((result) => {
                                                        const currentIndex = globalIndex++
                                                        return (
                                                            <button
                                                                key={result.id}
                                                                data-index={currentIndex}
                                                                onClick={() => handleSelect(result.url)}
                                                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                                className={cn(
                                                                    "w-full flex items-center gap-4 px-5 py-3 text-start transition-all",
                                                                    currentIndex === selectedIndex
                                                                        ? "bg-gray-900 text-white"
                                                                        : "text-gray-700 hover:bg-gray-50"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                                    currentIndex === selectedIndex
                                                                        ? "bg-white/15 text-white"
                                                                        : getTypeColor(result.type)
                                                                )}>
                                                                    {getIcon(result.type)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={cn(
                                                                        "text-sm font-semibold truncate",
                                                                        currentIndex === selectedIndex ? "text-white" : "text-gray-900"
                                                                    )}>
                                                                        {result.title}
                                                                    </p>
                                                                    {result.description && (
                                                                        <p className={cn(
                                                                            "text-xs truncate mt-0.5",
                                                                            currentIndex === selectedIndex ? "text-white/60" : "text-gray-400"
                                                                        )}>
                                                                            {result.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {currentIndex === selectedIndex && (
                                                                    <div className="flex items-center gap-1 text-white/50 shrink-0">
                                                                        <CornerDownLeft className="w-3.5 h-3.5" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            ))
                                        })()}
                                    </div>
                                )}

                                {/* Loading */}
                                {query.trim() && isLoading && !hasResults && (
                                    <div className="px-5 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400">{t('loading', 'Searching...')}</p>
                                    </div>
                                )}

                                {/* No Results */}
                                {query.trim() && !isLoading && !hasResults && (
                                    <div className="px-5 py-12 text-center space-y-2">
                                        <Search className="w-8 h-8 text-gray-200 mx-auto" />
                                        <p className="text-sm text-gray-500">
                                            {t('search.no_results', 'No results found for')} <strong>"{query}"</strong>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {t('search.no_results_hint', 'Try a different search term')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between text-[10px] text-gray-400">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[9px]">↑</kbd>
                                        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[9px]">↓</kbd>
                                        {t('search.navigate', 'Navigate')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[9px]">↵</kbd>
                                        {t('search.open', 'Open')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[9px]">esc</kbd>
                                        {t('search.close', 'Close')}
                                    </span>
                                </div>
                                <span className="flex items-center gap-1 font-semibold">
                                    <Command className="w-3 h-3" /> PRIME Connect
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
