import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, TrendingUp, TrendingDown, Building2, AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface GuestReview {
  id: string;
  rating_normalized_5?: number | null;
  platform?: string;
  property_id?: string;
  sentiment?: string | null;
  severity?: string | null;
  status?: string;
  critical_flag?: boolean;
  responded_at?: string | null;
  [key: string]: unknown;
}

interface QuickStatsSummaryProps {
  reviews: GuestReview[];
  propertyNameById: Map<string, string>;
}

export function QuickStatsSummary({ reviews, propertyNameById }: QuickStatsSummaryProps) {
  const { t } = useTranslation('reviews');

  const metrics = useMemo(() => {
    const totalReviews = reviews.length;
    const ratingsSum = reviews.reduce((acc, r) => acc + (r.rating_normalized_5 || 0), 0);
    const ratingsCount = reviews.filter(r => r.rating_normalized_5 != null && r.rating_normalized_5 > 0).length;
    const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;
    const properties = new Set(reviews.map((r) => r.property_id)).size;
    const criticalCount = reviews.filter(r => r.critical_flag || r.severity === 'critical').length;
    const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;
    const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
    const respondedCount = reviews.filter(r => r.status === 'responded' || r.status === 'closed').length;
    const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0;
    const pendingCount = reviews.filter(r => ['collected', 'analyzed', 'assigned', 'acknowledged', 'response_pending'].includes(r.status || '')).length;

    return { totalReviews, averageRating, properties, criticalCount, negativeCount, positiveCount, responseRate, pendingCount };
  }, [reviews]);

  const stats = [
    {
      label: t('analytics.reviews'),
      value: metrics.totalReviews.toLocaleString(),
      icon: MessageSquare,
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      accent: 'from-blue-500/10 to-transparent',
    },
    {
      label: t('analytics.avgRating'),
      value: metrics.averageRating.toFixed(1),
      icon: Star,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      accent: 'from-amber-500/10 to-transparent',
      suffix: (
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "h-2.5 w-2.5",
                i < Math.round(metrics.averageRating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-slate-300 dark:text-slate-600"
              )}
            />
          ))}
        </div>
      ),
    },
    {
      label: t('analytics.responseRate'),
      value: `${metrics.responseRate}%`,
      icon: Clock,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      accent: 'from-emerald-500/10 to-transparent',
      subtitle: t('stats.pendingCount').replace('{{count}}', String(metrics.pendingCount)),
    },
    {
      label: t('filters.property'),
      value: metrics.properties.toLocaleString(),
      icon: Building2,
      iconBg: 'bg-violet-50 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      accent: 'from-violet-500/10 to-transparent',
    },
    {
      label: t('analytics.positive'),
      value: metrics.positiveCount.toLocaleString(),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      accent: 'from-emerald-500/10 to-transparent',
    },
    {
      label: t('analytics.negative'),
      value: metrics.negativeCount.toLocaleString(),
      icon: TrendingDown,
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-600 dark:text-red-400',
      accent: 'from-red-500/10 to-transparent',
    },
    {
      label: t('severity.critical'),
      value: metrics.criticalCount.toLocaleString(),
      icon: AlertTriangle,
      iconBg: metrics.criticalCount > 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-slate-900',
      iconColor: metrics.criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400',
      accent: metrics.criticalCount > 0 ? 'from-red-500/10 to-transparent' : 'from-slate-500/5 to-transparent',
      highlight: metrics.criticalCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={cn(
            "relative overflow-hidden border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 shadow-sm hover:shadow-md transition-shadow duration-200",
            stat.highlight && "border-red-200 dark:border-red-800/60"
          )}
        >
          {/* Subtle gradient accent */}
          <div className={cn("absolute top-0 start-0 w-full h-16 bg-gradient-to-b", stat.accent)} />
          
          <CardContent className="relative p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={cn("p-2 rounded-lg", stat.iconBg)}>
                <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {stat.value}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              {stat.label}
            </p>
            {stat.suffix && stat.suffix}
            {stat.subtitle && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
