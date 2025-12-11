import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Search, 
  Clock, 
  TrendingUp, 
  Filter, 
  X, 
  ChevronDown,
  FileText,
  Users,
  Calendar,
  MapPin,
  Tag,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

interface SearchSuggestion {
  id: string
  text: string
  type: 'recent' | 'popular' | 'document' | 'user' | 'tag'
  category?: string
  count?: number
  icon?: React.ReactNode
}

interface SearchFilter {
  id: string
  label: string
  type: 'select' | 'date' | 'multiselect'
  options?: { value: string; label: string }[]
  value?: string | string[]
}

interface AdvancedSearchProps {
  placeholder?: string
  onSearch: (query: string, filters?: Record<string, any>) => void
  suggestions?: SearchSuggestion[]
  filters?: SearchFilter[]
  className?: string
  showFilters?: boolean
  recentSearches?: string[]
}

export function AdvancedSearch({
  placeholder = "Search...",
  onSearch,
  suggestions = [],
  filters = [],
  className,
  showFilters = true,
  recentSearches = []
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Filter suggestions based on query
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setActiveSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (activeSuggestionIndex >= 0) {
            const suggestion = filteredSuggestions[activeSuggestionIndex]
            setQuery(suggestion.text)
            setIsOpen(false)
            onSearch(suggestion.text, selectedFilters)
          }
          break
        case 'Escape':
          setIsOpen(false)
          setActiveSuggestionIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeSuggestionIndex, filteredSuggestions, onSearch, selectedFilters])

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), selectedFilters)
      setIsOpen(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    setIsOpen(false)
    onSearch(suggestion.text, selectedFilters)
  }

  const handleFilterChange = (filterId: string, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  const clearFilter = (filterId: string) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[filterId]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setSelectedFilters({})
  }

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'popular':
        return <TrendingUp className="w-4 h-4 text-orange-500" />
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />
      case 'user':
        return <Users className="w-4 h-4 text-green-500" />
      case 'tag':
        return <Tag className="w-4 h-4 text-purple-500" />
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />
    }
  }

  const activeFilterCount = Object.keys(selectedFilters).length

  return (
    <div className={cn("relative w-full max-w-2xl", className)} ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
              setActiveSuggestionIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isOpen) {
                handleSearch()
              }
            }}
            placeholder={placeholder}
            className="pl-10 pr-20 h-11 border-0 shadow-lg bg-gradient-to-r from-card to-card/80 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery('')}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={cn(
                  "h-6 w-6 p-0 hover:bg-muted relative",
                  activeFilterCount > 0 && "text-primary"
                )}
              >
                <Filter className="w-3 h-3" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
            <Button
              onClick={handleSearch}
              size="sm"
              className="h-6 px-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (filteredSuggestions.length > 0 || recentSearches.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 border-0 shadow-2xl animate-fade-in">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {recentSearches.length > 0 && query === '' && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick({ id: `recent-${index}`, text: search, type: 'recent' })}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors flex items-center gap-3"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtered Suggestions */}
            {filteredSuggestions.length > 0 && (
              <div className="p-3">
                <div className="space-y-1">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 animate-slide-up",
                        activeSuggestionIndex === index 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-accent/50"
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {suggestion.icon || getSuggestionIcon(suggestion.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{suggestion.text}</span>
                          {suggestion.count && (
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.count}
                            </Badge>
                          )}
                        </div>
                        {suggestion.category && (
                          <span className="text-xs text-muted-foreground">{suggestion.category}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFiltersPanel && showFilters && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-40 border-0 shadow-2xl animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Filters</h3>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2">
                  <label className="text-sm font-medium">{filter.label}</label>
                  {filter.type === 'select' && (
                    <select
                      value={selectedFilters[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="">All</option>
                      {filter.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {filter.type === 'date' && (
                    <input
                      type="date"
                      value={selectedFilters[filter.id] || ''}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedFilters).map(([filterId, value]) => {
                    const filter = filters.find(f => f.id === filterId)
                    if (!filter || !value) return null
                    
                    return (
                      <Badge
                        key={filterId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {filter.label}: {Array.isArray(value) ? value.join(', ') : value}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearFilter(filterId)}
                          className="h-3 w-3 p-0 hover:bg-muted-foreground/20"
                        >
                          <X className="w-2 h-2" />
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
