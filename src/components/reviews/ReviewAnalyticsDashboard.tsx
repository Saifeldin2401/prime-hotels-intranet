import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Star, Calendar } from 'lucide-react';

interface GuestReview {
  id: string;
  rating?: number;
  platform?: string;
  collected_at?: string;
  sentiment?: string;
  [key: string]: unknown;
}

interface ReviewAnalyticsDashboardProps {
  reviews: GuestReview[];
  propertyNameById: Map<string, string>;
  properties: { id: string; name: string }[];
}

export function ReviewAnalyticsDashboard({
  reviews,
}: ReviewAnalyticsDashboardProps) {
  const ratingDistribution = reviews.reduce((acc, r) => {
    const rating = Math.floor(r.rating || 0);
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const platformDistribution = reviews.reduce((acc, r) => {
    const platform = r.platform || 'Unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-8 text-sm">{rating}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${((ratingDistribution[rating] || 0) / reviews.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-sm text-right">
                    {ratingDistribution[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              By Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(platformDistribution)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="text-sm">{platform}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-3xl font-bold">{reviews.length}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
