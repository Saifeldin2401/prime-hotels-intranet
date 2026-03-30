import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, TrendingUp, Building } from 'lucide-react';

interface GuestReview {
  id: string;
  rating?: number;
  platform?: string;
  property_id?: string;
  [key: string]: unknown;
}

interface QuickStatsSummaryProps {
  reviews: GuestReview[];
  propertyNameById: Map<string, string>;
}

export function QuickStatsSummary({ reviews }: QuickStatsSummaryProps) {
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews
      : 0;
  const platforms = new Set(reviews.map((r) => r.platform)).size;
  const properties = new Set(reviews.map((r) => r.property_id)).size;

  const stats = [
    {
      label: 'Total Reviews',
      value: totalReviews,
      icon: MessageSquare,
    },
    {
      label: 'Average Rating',
      value: averageRating.toFixed(1),
      icon: Star,
    },
    {
      label: 'Platforms',
      value: platforms,
      icon: TrendingUp,
    },
    {
      label: 'Properties',
      value: properties,
      icon: Building,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
