import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';

export interface Filters {
  propertyId: string;
  platform: string;
  status: string;
  severity: string;
  sentiment: string;
  query: string;
  sort: 'newest_critical' | 'newest' | 'critical' | 'oldest' | 'highest_rating' | 'lowest_rating';
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
  const [localQuery, setLocalQuery] = useState(filters.query);

  const handleSearch = () => {
    onFilterChange({ ...filters, query: localQuery });
  };

  const clearFilters = () => {
    setLocalQuery('');
    onFilterChange({
      propertyId: 'all',
      platform: 'all',
      status: 'all',
      severity: 'all',
      sentiment: 'all',
      query: '',
      sort: 'newest_critical',
    });
  };

  const hasActiveFilters =
    filters.propertyId !== 'all' ||
    filters.platform !== 'all' ||
    filters.status !== 'all' ||
    filters.severity !== 'all' ||
    filters.sentiment !== 'all' ||
    filters.query !== '';

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl border border-muted-foreground/10">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9 h-9"
        />
      </div>

      <select
        value={filters.propertyId}
        onChange={(e) => onFilterChange({ ...filters, propertyId: e.target.value })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">All Properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={filters.platform}
        onChange={(e) => onFilterChange({ ...filters, platform: e.target.value })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">All Platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={filters.severity}
        onChange={(e) => onFilterChange({ ...filters, severity: e.target.value })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">All Severities</option>
        {severities.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.sentiment}
        onChange={(e) => onFilterChange({ ...filters, sentiment: e.target.value })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">All Sentiments</option>
        {sentiments.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="all">All Statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.sort}
        onChange={(e) => onFilterChange({ ...filters, sort: e.target.value as Filters['sort'] })}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm"
      >
        <option value="newest_critical">Newest + Critical</option>
        <option value="newest">Newest First</option>
        <option value="critical">Most Critical</option>
        <option value="highest_rating">Highest Rating</option>
        <option value="lowest_rating">Lowest Rating</option>
        <option value="oldest">Oldest First</option>
      </select>

      <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">
        <Filter className="h-4 w-4 mr-2" />
        Apply
      </Button>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
