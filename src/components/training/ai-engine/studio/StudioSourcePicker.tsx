import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, FileText, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SourceOption {
  id: string
  title: string
  kind?: string
  /** short excerpt / summary shown in the preview panel */
  preview?: string
}

interface StudioSourcePickerProps {
  options: SourceOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  isLoading?: boolean
  placeholder?: string
  emptyText?: string
}

export function StudioSourcePicker({
  options,
  selectedId,
  onSelect,
  isLoading,
  placeholder,
  emptyText,
}: StudioSourcePickerProps) {
  const { t } = useTranslation('training')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.title.toLowerCase().includes(q) || (o.kind || '').toLowerCase().includes(q)
    )
  }, [options, query])

  const selected = options.find((o) => o.id === selectedId) || null

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t('builder.quick.searchDocs', 'Search…')}
          className="h-9 text-xs ps-8 pe-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t('common.clear', 'Clear')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results list */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <ScrollArea className="max-h-[188px]">
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">{t('common.loading', 'Loading…')}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              {query
                ? t('builder.quick.noMatch', 'No matches for “{{q}}”.', { q: query })
                : emptyText || t('builder.quick.noDocs', 'Nothing here yet.')}
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((o) => {
                const isSel = o.id === selectedId
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(isSel ? null : o.id)}
                      className={cn(
                        'w-full text-start px-3 py-2 flex items-start gap-2.5 transition-colors',
                        isSel ? 'bg-purple-50/70 dark:bg-purple-950/40' : 'hover:bg-muted/50'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0',
                          isSel ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isSel ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-foreground truncate">{o.title}</span>
                        {o.kind && (
                          <span className="block text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                            {o.kind}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      {/* Preview of the selected item */}
      {selected && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('builder.quick.preview', 'Preview')}
            </span>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-red-500"
            >
              {t('common.clear', 'Clear')}
            </button>
          </div>
          <p className="text-xs font-semibold text-foreground">{selected.title}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {selected.preview?.trim() || t('builder.quick.noPreview', 'No preview text available for this item.')}
          </p>
        </div>
      )}
    </div>
  )
}
