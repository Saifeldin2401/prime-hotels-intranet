import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Star,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { GuestReview } from '@/lib/types';
import { getReviewEventTimestamp } from '@/lib/reviewDates';

type ReviewWithIssues = GuestReview & {
  issues?: Array<{
    category: string;
    severity?: string;
    confidence?: number;
    issue_summary_en?: string | null;
  }>;
  [key: string]: unknown;
};

interface MultiHotelDashboardProps {
  reviews: ReviewWithIssues[];
  propertyNameById: Map<string, string>;
  properties: { id: string; name: string }[];
  onReviewClick: (reviewId: string) => void;
  selectedIds: string[];
  onToggleSelect: (reviewId: string) => void;
  viewMode: 'grid' | 'list';
}

interface PropertyMetrics {
  id: string;
  name: string;
  totalReviews: number;
  avgRating: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  mixedCount: number;
  criticalCount: number;
  respondedCount: number;
  responseRate: number;
  pendingCount: number;
  topPlatforms: { name: string; count: number }[];
  recentReviews: ReviewWithIssues[];
  sentimentScore: number; // -100 to +100
}

function getPropertyColor(propertyName: string): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ];
  let hash = 0;
  for (let i = 0; i < propertyName.length; i++) {
    hash = propertyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function MiniStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i < Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-slate-300 dark:text-slate-600'
          )}
        />
      ))}
    </div>
  );
}

function SentimentBar({ positive, negative, neutral, mixed, total }: {
  positive: number; negative: number; neutral: number; mixed: number; total: number;
}) {
  if (total === 0) return null;
  const pPct = (positive / total) * 100;
  const nPct = (negative / total) * 100;
  const mPct = (mixed / total) * 100;
  // neutral fills the rest

  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
      {pPct > 0 && (
        <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${pPct}%` }} />
      )}
      {neutral > 0 && (
        <div className="bg-slate-400 transition-all duration-500" style={{ width: `${((neutral / total) * 100)}%` }} />
      )}
      {mPct > 0 && (
        <div className="bg-amber-400 transition-all duration-500" style={{ width: `${mPct}%` }} />
      )}
      {nPct > 0 && (
        <div className="bg-red-500 transition-all duration-500" style={{ width: `${nPct}%` }} />
      )}
    </div>
  );
}

function PropertyCard({
  metrics,
  onReviewClick,
  isExpanded,
  onToggleExpand,
}: {
  metrics: PropertyMetrics;
  onReviewClick: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { t } = useTranslation('reviews');
  const color = getPropertyColor(metrics.name);
  const ratingGrade =
    metrics.avgRating >= 4.5 ? { label: t('analytics.excellentRating'), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' } :
    metrics.avgRating >= 4.0 ? { label: t('analytics.good'), color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' } :
    metrics.avgRating >= 3.5 ? { label: t('analytics.average'), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' } :
    metrics.avgRating >= 3.0 ? { label: t('analytics.belowAvg'), color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' } :
    { label: t('analytics.poor'), color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' };

  const sentimentIcon = metrics.sentimentScore > 20
    ? <TrendingUp className="h-4 w-4 text-emerald-500" />
    : metrics.sentimentScore < -20
      ? <TrendingDown className="h-4 w-4 text-red-500" />
      : <Minus className="h-4 w-4 text-slate-400" />;

  return (
    <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 shadow-sm hover:shadow-md transition-shadow">
      {/* Color accent */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <CardContent className="p-0">
        {/* Main row — always visible */}
        <button
          onClick={onToggleExpand}
          className="w-full text-start p-5 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
        >
          {/* Property icon */}
          <div
            className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Building2 className="h-5 w-5" />
          </div>

          {/* Property name + quick stats */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {metrics.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {metrics.totalReviews} {t('analytics.reviews').toLowerCase()}
              </span>
              <span className="flex items-center gap-1">
                {sentimentIcon}
                {metrics.sentimentScore > 0 ? '+' : ''}{metrics.sentimentScore}
              </span>
              {metrics.criticalCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  {metrics.criticalCount} {t('severity.critical').toLowerCase()}
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="shrink-0 text-end">
            <div className="flex items-center gap-2">
              <MiniStarRating rating={metrics.avgRating} />
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {metrics.avgRating > 0 ? metrics.avgRating.toFixed(1) : '—'}
              </span>
            </div>
            <Badge className={cn('text-[9px] font-semibold mt-1 border-0', ratingGrade.bg, ratingGrade.color)}>
              {metrics.avgRating > 0 ? ratingGrade.label : t('analytics.noData')}
            </Badge>
          </div>

          {/* Response rate */}
          <div className="shrink-0 text-end hidden sm:block">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {metrics.responseRate}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              {t('analytics.responseRate')}
            </p>
          </div>

          {/* Expand toggle */}
          <div className="shrink-0 ms-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1 duration-200">
            {/* Sentiment breakdown */}
            <div className="px-5 pt-4 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t('analytics.sentimentDistribution')}
              </p>
              <SentimentBar
                positive={metrics.positiveCount}
                negative={metrics.negativeCount}
                neutral={metrics.neutralCount}
                mixed={metrics.mixedCount}
                total={metrics.totalReviews}
              />
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t('sentiment.positive')} {metrics.positiveCount}
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-slate-400" />
                  {t('sentiment.neutral')} {metrics.neutralCount}
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  {t('sentiment.mixed')} {metrics.mixedCount}
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {t('sentiment.negative')} {metrics.negativeCount}
                </span>
              </div>
            </div>

            {/* Platform breakdown */}
            {metrics.topPlatforms.length > 0 && (
              <div className="px-5 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('analytics.platformPerformance')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.topPlatforms.map(p => (
                    <Badge key={p.name} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                      {p.name} · {p.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Operational stats row */}
            <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800 mx-5 rounded-lg overflow-hidden mb-4">
              <div className="bg-white dark:bg-slate-900 p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{metrics.respondedCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('analytics.responded')}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 text-center">
                <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{metrics.pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('analytics.pendingResponse')}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 text-center">
                <p className={cn("text-lg font-bold tabular-nums", metrics.criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100")}>{metrics.criticalCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('severity.critical')}</p>
              </div>
            </div>

            {/* Recent reviews */}
            {metrics.recentReviews.length > 0 && (
              <div className="px-5 pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('propertyDashboard.recentReviews')}
                </p>
                <div className="space-y-2">
                  {metrics.recentReviews.map(review => (
                    <button
                      key={review.id}
                      onClick={() => onReviewClick(review.id)}
                      className="w-full text-start p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                          {review.review_title || review.reviewer_name || t('reviewCard.anonymous')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {review.summary_en || review.review_text}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {review.rating_normalized_5 != null && (
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold tabular-nums">{review.rating_normalized_5.toFixed(1)}</span>
                          </div>
                        )}
                        {review.severity === 'critical' && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[9px] border-0 px-1.5">
                            {t('severity.critical')}
                          </Badge>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MultiHotelDashboard({
  reviews,
  propertyNameById,
  properties,
  onReviewClick,
}: MultiHotelDashboardProps) {
  const { t } = useTranslation('reviews');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'reviews' | 'critical'>('reviews');

  const propertyMetrics: PropertyMetrics[] = useMemo(() => {
    const reviewsByProperty = reviews.reduce((acc, r) => {
      const pid = r.property_id || 'unknown';
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(r);
      return acc;
    }, {} as Record<string, ReviewWithIssues[]>);

    return properties.map(property => {
      const pReviews = reviewsByProperty[property.id] || [];
      const ratingsValid = pReviews.filter(r => r.rating_normalized_5 != null && (r.rating_normalized_5 as number) > 0);
      const avgRating = ratingsValid.length > 0
        ? ratingsValid.reduce((acc, r) => acc + (r.rating_normalized_5 as number), 0) / ratingsValid.length
        : 0;

      const positiveCount = pReviews.filter(r => r.sentiment === 'positive').length;
      const negativeCount = pReviews.filter(r => r.sentiment === 'negative').length;
      const neutralCount = pReviews.filter(r => r.sentiment === 'neutral').length;
      const mixedCount = pReviews.filter(r => r.sentiment === 'mixed').length;
      const criticalCount = pReviews.filter(r => r.critical_flag || r.severity === 'critical').length;
      const respondedCount = pReviews.filter(r => r.status === 'responded' || r.status === 'closed').length;
      const pendingCount = pReviews.filter(r => ['collected', 'analyzed', 'assigned', 'acknowledged', 'response_pending'].includes(r.status || '')).length;
      const responseRate = pReviews.length > 0 ? Math.round((respondedCount / pReviews.length) * 100) : 0;

      // Platform breakdown
      const platformCounts: Record<string, number> = {};
      for (const r of pReviews) {
        const p = r.platform || 'unknown';
        platformCounts[p] = (platformCounts[p] || 0) + 1;
      }
      const topPlatforms = Object.entries(platformCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Sentiment score: +1 for positive, -1 for negative, 0 for neutral/mixed
      const sentimentScore = pReviews.length > 0
        ? Math.round(((positiveCount - negativeCount) / pReviews.length) * 100)
        : 0;

      // Latest 5 reviews
      const recentReviews = [...pReviews]
        .sort((a, b) => getReviewEventTimestamp(b) - getReviewEventTimestamp(a))
        .slice(0, 5);

      return {
        id: property.id,
        name: property.name,
        totalReviews: pReviews.length,
        avgRating,
        positiveCount,
        negativeCount,
        neutralCount,
        mixedCount,
        criticalCount,
        respondedCount,
        responseRate,
        pendingCount,
        topPlatforms,
        recentReviews,
        sentimentScore,
      };
    });
  }, [reviews, properties]);

  // Sort properties
  const sortedMetrics = useMemo(() => {
    const sorted = [...propertyMetrics];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'rating':
        return sorted.sort((a, b) => b.avgRating - a.avgRating);
      case 'reviews':
        return sorted.sort((a, b) => b.totalReviews - a.totalReviews);
      case 'critical':
        return sorted.sort((a, b) => b.criticalCount - a.criticalCount || b.totalReviews - a.totalReviews);
      default:
        return sorted;
    }
  }, [propertyMetrics, sortBy]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(properties.map(p => p.id)));
  const collapseAll = () => setExpandedIds(new Set());

  return (
    <div className="space-y-4">
      {/* Header with sort controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('propertyDashboard.title')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('propertyDashboard.subtitle').replace('{{count}}', String(properties.length))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {(['reviews', 'rating', 'critical', 'name'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors',
                  sortBy === key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {key === 'reviews' ? t('analytics.volume') :
                 key === 'rating' ? t('analytics.rating') :
                 key === 'critical' ? t('severity.critical') :
                 t('propertyDashboard.name')}
              </button>
            ))}
          </div>
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="sm"
            onClick={expandedIds.size > 0 ? collapseAll : expandAll}
            className="text-[10px] font-semibold uppercase tracking-wider h-8"
          >
            {expandedIds.size > 0 ? t('propertyDashboard.collapseAll') : t('propertyDashboard.expandAll')}
          </Button>
        </div>
      </div>

      {/* Property cards */}
      <div className="space-y-3">
        {sortedMetrics.map(metrics => (
          <PropertyCard
            key={metrics.id}
            metrics={metrics}
            onReviewClick={onReviewClick}
            isExpanded={expandedIds.has(metrics.id)}
            onToggleExpand={() => toggleExpand(metrics.id)}
          />
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('analytics.noReviewData')}</p>
        </div>
      )}
    </div>
  );
}
