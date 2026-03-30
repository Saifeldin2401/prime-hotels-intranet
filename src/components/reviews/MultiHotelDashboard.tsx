import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Star, MessageSquare } from 'lucide-react';

interface GuestReview {
  id: string;
  property_id?: string;
  rating?: number;
  [key: string]: unknown;
}

interface MultiHotelDashboardProps {
  reviews: GuestReview[];
  propertyNameById: Map<string, string>;
  properties: { id: string; name: string }[];
  onReviewClick: (reviewId: string) => void;
  selectedIds: string[];
  onToggleSelect: (reviewId: string) => void;
  viewMode: 'grid' | 'list';
}

export function MultiHotelDashboard({
  reviews,
  propertyNameById,
  properties,
  selectedIds,
  onToggleSelect,
}: MultiHotelDashboardProps) {
  const reviewsByProperty = reviews.reduce((acc, r) => {
    const pid = r.property_id || 'unknown';
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(r);
    return acc;
  }, {} as Record<string, GuestReview[]>);

  return (
    <div className="space-y-6">
      {properties.map((property) => {
        const propertyReviews = reviewsByProperty[property.id] || [];
        const avgRating =
          propertyReviews.length > 0
            ? propertyReviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
              propertyReviews.length
            : 0;

        return (
          <Card key={property.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {property.name}
                </div>
                <div className="flex items-center gap-4 text-sm font-normal">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {propertyReviews.length} reviews
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {avgRating.toFixed(1)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propertyReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No reviews for this property
                </p>
              ) : (
                <div className="space-y-2">
                  {propertyReviews.slice(0, 5).map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <Checkbox
                        checked={selectedIds.includes(review.id)}
                        onCheckedChange={() => onToggleSelect(review.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Review {review.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{review.rating || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
