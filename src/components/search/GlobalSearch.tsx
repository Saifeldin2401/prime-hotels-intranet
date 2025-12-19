import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, FileText, User, GraduationCap, Megaphone, BookOpen, AlertCircle, X } from 'lucide-react'
import { useSearch, useSearchSuggestions, useRecentSearches } from '@/hooks/useSearch'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'


interface GlobalSearchProps {
    className?: string
    onClose?: () => void
}

export function GlobalSearch({ className, onClose }: GlobalSearchProps) {
    const { t } = useTranslation(['nav', 'common'])
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Debounce query for hook
    const [debouncedQuery, setDebouncedQuery] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    const { results, isLoading, hasResults } = useSearch(debouncedQuery, {
        limit: 10,
        includeDocuments: true,
        includeUsers: true,
        includeTraining: true,
        includeAnnouncements: true,
        includeSOPs: true
    })

    const { suggestions } = useSearchSuggestions(debouncedQuery)
    const { getRecentSearches, saveSearch } = useRecentSearches()
    const recentSearches = getRecentSearches()

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                onClose?.()
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef, onClose])

    const handleSelect = (url: string) => {
        saveSearch(query)
        setIsOpen(false)
        setQuery('')
        navigate(url)
        onClose?.()
    }

    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [debouncedQuery])

    // Group results
    const groupedResults = useMemo(() => {
        if (!results.length) return {}
        return results.reduce((acc, result) => {
            const group = result.type === 'page' ? 'Pages' :
                result.type === 'user' ? 'Staff' :
                    result.type === 'sop' ? 'SOPs' : 'Content'
            if (!acc[group]) acc[group] = []
            acc[group].push(result)
            return acc
        }, {} as Record<string, typeof results>)
    }, [results])

    const flatResults = useMemo(() => {
        return Object.values(groupedResults).flat()
    }, [groupedResults])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (isOpen) setSelectedIndex(prev => (prev + 1) % flatResults.length)
                else setIsOpen(true)
                break
            case 'ArrowUp':
                e.preventDefault()
                if (isOpen) setSelectedIndex(prev => (prev - 1 + flatResults.length) % flatResults.length)
                break
            case 'Enter':
                e.preventDefault()
                if (isOpen && flatResults[selectedIndex]) {
                    handleSelect(flatResults[selectedIndex].url)
                } else if (query.trim().length > 0) {
                    setIsOpen(true)
                }
                break
            case 'Escape':
                setIsOpen(false)
                onClose?.()
                break
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'user': return <User className="h-4 w-4 text-blue-500" />
            case 'document': return <FileText className="h-4 w-4 text-orange-500" />
            case 'training': return <GraduationCap className="h-4 w-4 text-green-500" />
            case 'announcement': return <Megaphone className="h-4 w-4 text-purple-500" />
            case 'sop': return <BookOpen className="h-4 w-4 text-teal-500" />
            case 'page': return <div className="h-4 w-4 text-indigo-500 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-current" /></div>
            default: return <Search className="h-4 w-4 text-gray-400" />
        }
    }

    return (
        <div ref={wrapperRef} className={cn("relative w-full max-w-2xl mx-6 hidden md:block group", className)}>
            <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-hotel-gold animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-hotel-gold transition-colors" />
                    )}
                </div>
                <input
                    type="text"
                    placeholder={t('nav:search_placeholder')}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-hotel-navy-light border border-hotel-navy-dark rounded-full py-2 ps-10 pe-10 text-sm text-white placeholder-gray-400 focus:bg-hotel-navy-light focus:border-hotel-gold focus:ring-1 focus:ring-hotel-gold focus:outline-none transition-all duration-300"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            setIsOpen(false)
                        }}
                        className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-white"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 text-start">

                    <div className="flex flex-col sm:flex-row">
                        {/* Main Results Area */}
                        <div className="flex-1 min-w-0 border-b sm:border-b-0 sm:border-e border-gray-100 dark:border-slate-800">
                            {query.trim().length === 0 ? (
                                <div className="p-4">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Searches</h3>
                                    {recentSearches.length > 0 ? (
                                        <div className="space-y-1">
                                            {recentSearches.map((term, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setQuery(term)}
                                                    className="w-full text-start px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
                                                >
                                                    <Search className="h-3.5 w-3.5 text-gray-400" />
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No recent searches</p>
                                    )}
                                </div>
                            ) : hasResults ? (
                                <div className="py-2 max-h-[60vh] overflow-y-auto">
                                    {Object.entries(groupedResults).map(([group, groupResults]) => (
                                        <div key={group} className="mb-2 last:mb-0">
                                            <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/50">
                                                {group}
                                            </div>
                                            {groupResults.map((result) => {
                                                const isSelected = flatResults[selectedIndex]?.id === result.id
                                                return (
                                                    <button
                                                        type="button"
                                                        key={`${result.type}-${result.id}`}
                                                        onClick={() => handleSelect(result.url)}
                                                        onMouseEnter={() => {
                                                            const idx = flatResults.findIndex(r => r.id === result.id)
                                                            if (idx !== -1) setSelectedIndex(idx)
                                                        }}
                                                        className={cn(
                                                            "w-full text-start px-4 py-2.5 transition-colors flex items-center gap-3",
                                                            isSelected ? "bg-hotel-navy-light/10 dark:bg-slate-800" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "p-1.5 rounded-lg flex-shrink-0",
                                                            isSelected ? "bg-white shadow-sm" : "bg-gray-100 dark:bg-slate-900"
                                                        )}>
                                                            {getIcon(result.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className={cn("text-sm font-medium truncate", isSelected ? "text-hotel-navy dark:text-hotel-gold" : "text-gray-900 dark:text-gray-100")}>
                                                                    {result.title}
                                                                </span>
                                                                {result.category && (
                                                                    <span className="text-[10px] text-gray-400 ms-2 flex-shrink-0 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                        {result.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {result.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[90%]">
                                                                    {result.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                                Enter
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    {isLoading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="h-6 w-6 text-hotel-gold animate-spin mb-2" />
                                            <p className="text-sm">{t('common:loading', 'Searching...')}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm font-medium">{t('common:no_results', 'No results found')}</p>
                                            <p className="text-xs mt-1 text-gray-400">{t('common:try_different_search', 'Try adjusting your search terms')}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="w-full sm:w-1/3 min-w-[200px] bg-gray-50/50 dark:bg-slate-900/50 p-4 block border-t sm:border-t-0 sm:border-s border-gray-100 dark:border-slate-800">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                {query ? 'Recommended' : 'Popular'}
                            </h3>
                            <div className="space-y-2">
                                {suggestions.length > 0 ? suggestions.map((sug) => (
                                    <button
                                        key={sug.id}
                                        type="button"
                                        onClick={() => {
                                            if (sug.type === 'page' || sug.type === 'document') {
                                                // Handle direct navigation if we put urls in suggestions
                                                setQuery(sug.text)
                                            } else {
                                                setQuery(sug.text)
                                            }
                                        }}
                                        className="w-full text-start p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 group/item"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-hotel-gold/50 group-hover/item:bg-hotel-gold transition-colors" />
                                        {sug.text}
                                    </button>
                                )) : (
                                    <div className="text-sm text-gray-400">
                                        <p className="mb-2">Try searching for:</p>
                                        <ul className="space-y-1 ml-2">
                                            <li>• SOPs</li>
                                            <li>• Employee Handbook</li>
                                            <li>• Training</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2 px-4 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">↑↓</span>
                            <span>Navigate</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">↵</span>
                            <span>Select</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">ESC</span>
                            <span>to close</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
