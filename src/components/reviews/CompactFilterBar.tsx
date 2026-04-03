import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface Filters {
  propertyId: string;
  platform: string;
  status: string;
  severity: string;
  sentiment: string;
  query: string;
  sort: 'newest' | 'critical' | 'oldest' | 'highest_rating' | 'lowest_rating';
}

interface CompactFilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  properties: { id: string; name: string }[];
  platforms: string[];
  severities: string[];
  sentiments: string[];
  statuses: string[];
}

export function CompactFilterBar({
  filters,
  onFilterChange,
  properties,
  platforms,
  severities,
  sentiments,
  statuses,
}: CompactFilterBarProps) {
  const { t } = useTranslation('reviews');
  const [localQuery, setLocalQuery] = useState(filters.query);
  const [expanded, setExpanded] = useState(false);

  const handleSearch = useCallback(() => {
    onFilterChange({ ...filters, query: localQuery });
  }, [filters, localQuery, onFilterChange]);

  const clearFilters = useCallback(() => {
    setLocalQuery('');
    onFilterChange({
      propertyId: 'all',
      platform: 'all',
      status: 'all',
      severity: 'all',
      sentiment: 'all',
      query: '',
      sort: 'newest',
    });
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.propertyId !== 'all' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.severity !== 'all' ||
    filters.sentiment !== 'all' ||
    filters.query !== '';

  const activeFilterCount = [
    filters.propertyId !== 'all',
    filters.platform !== 'all',
    filters.status !== 'all',
    filters.severity !== 'all',
    filters.sentiment !== 'all',
    filters.query !== '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Primary bar — search + sort + toggle */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              // Auto-search when clearing
              if (e.target.value === '') {
                onFilterChange({ ...filters, query: '' });
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="ps-9 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm shadow-sm focus-visible:ring-primary/30"
          />
        </div>

        {/* Sort selector */}
        <Select
          value={filters.sort}
          onValueChange={(value) => onFilterChange({ ...filters, sort: value as Filters['sort'] })}
        >
          <SelectTrigger className="w-[180px] h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm shadow-sm">
            <ArrowUpDown className="h-3.5 w-3.5 me-1.5 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort.newest')}</SelectItem>
            <SelectItem value="oldest">{t('sort.oldest')}</SelectItem>
            <SelectItem value="critical">{t('sort.mostCritical')}</SelectItem>
            <SelectItem value="highest_rating">{t('sort.highestRating')}</SelectItem>
            <SelectItem value="lowest_rating">{t('sort.lowestRating')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter toggle */}
        <Button
          variant={expanded ? "secondary" : "outline"}
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "h-10 px-3 rounded-xl gap-1.5 shadow-sm",
            expanded && "bg-primary/10 text-primary border-primary/20"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{t('filters.title')}</span>
          {activeFilterCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 px-2.5 rounded-xl text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expanded filter row */}
      {expanded && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60 animate-in slide-in-from-top-1 duration-200">
          {/* Property */}
          <Select
            value={filters.propertyId}
            onValueChange={(value) => onFilterChange({ ...filters, propertyId: value })}
          >
            <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <SelectValue placeholder={t('filters.property')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')} {t('filters.property')}</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Platform */}
          <Select
            value={filters.platform}
            onValueChange={(value) => onFilterChange({ ...filters, platform: value })}
          >
            <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <SelectValue placeholder={t('filters.platform')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')} {t('filters.platform')}</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Severity */}
          <Select
            value={filters.severity}
            onValueChange={(value) => onFilterChange({ ...filters, severity: value })}
          >
            <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <SelectValue placeholder={t('filters.severity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')} {t('filters.severity')}</SelectItem>
              {severities.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sentiment */}
          <Select
            value={filters.sentiment}
            onValueChange={(value) => onFilterChange({ ...filters, sentiment: value })}
          >
            <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <SelectValue placeholder={t('filters.sentiment')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')} {t('filters.sentiment')}</SelectItem>
              {sentiments.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs">
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')} {t('filters.status')}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
