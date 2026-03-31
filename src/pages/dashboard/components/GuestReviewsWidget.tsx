/**
 * GuestReviewsWidget
 * 
 * Dashboard widget for displaying guest reviews with property filtering.
 * Supports both mobile and desktop views.
 * Head office users can view and filter reviews from different properties.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuestReviews, formatRating, getRatingColor, getRatingBgColor, getPlatformName } from '@/hooks/useGuestReviews'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { cn } from '@/lib/utils'
import { Star, ChevronRight, Building2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface GuestReviewsWidgetProps {
  focusMode?: string
}

export function GuestReviewsWidget({ focusMode }: GuestReviewsWidgetProps) {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()
  const { user, profile, primaryRole } = useAuth()
  const { currentProperty, availableProperties } = useProperty()
  
  // Head office users can filter by property
  const isHeadOfficeUser = ['corporate_admin', 'regional_admin', 'regional_hr'].includes(primaryRole || '')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(currentProperty?.id || 'all')
  
  // Fetch reviews - head office can see all or filter by property, others see only their property
  const effectivePropertyId = isHeadOfficeUser ? selectedPropertyId : (currentProperty?.id || 'all')
  
  const { data: reviewData, isLoading } = useGuestReviews({
    limit: 5,
    daysBack: 30,
    propertyId: effectivePropertyId === 'all' ? undefined : effectivePropertyId,
  })

  // Get property name for display
  const selectedPropertyName = useMemo(() => {
    if (effectivePropertyId === 'all') return 'All Properties'
    const prop = availableProperties?.find(p => p.id === effectivePropertyId)
    return prop?.name || 'Selected Property'
  }, [effectivePropertyId, availableProperties])

  if (isLoading) {
    return (
      <Card className="border border-slate-200/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <CardTitle className="text-lg">{t('widgets.guest_reviews.title', 'Guest Reviews')}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!reviewData || reviewData.totalReviews === 0) {
    return (
      <Card className="border border-slate-200/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <CardTitle className="text-lg">{t('widgets.guest_reviews.title', 'Guest Reviews')}</CardTitle>
            </div>
            {isHeadOfficeUser && availableProperties && availableProperties.length > 0 && (
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t('widgets.guest_reviews.select_property', 'Select Property')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('widgets.guest_reviews.all_properties', 'All Properties')}</SelectItem>
                  {availableProperties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">{t('reviews.no_reviews')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('reviews.check_back')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            <CardTitle className="text-lg">{t('widgets.guest_reviews.title', 'Guest Reviews')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isHeadOfficeUser && availableProperties && availableProperties.length > 0 && (
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Select Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {availableProperties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => navigate('/reviews')}
            >
              {t('actions.view_all', 'View All')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
        {effectivePropertyId !== 'all' && (
          <p className="text-xs text-muted-foreground mt-1">{selectedPropertyName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 text-center border border-amber-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className={cn("text-xl font-bold", getRatingColor(reviewData.averageRating))}>
                {formatRating(reviewData.averageRating)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
              {t('widgets.guest_reviews.avg_rating', 'Avg Rating')}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center border border-blue-100">
            <p className="text-xl font-bold text-blue-600">{reviewData.totalReviews}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
              {t('widgets.guest_reviews.total', 'Total')}
            </p>
          </div>
          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-3 text-center border border-rose-100">
            <p className="text-xl font-bold text-rose-600">{reviewData.pendingResponses}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">
              {t('widgets.guest_reviews.pending', 'Pending')}
            </p>
          </div>
        </div>

        {/* Recent Reviews List */}
        <ScrollArea className="h-[240px]">
          <div className="space-y-2">
            {reviewData.recentReviews.map((review) => (
              <div
                key={review.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors",
                  review.critical_flag ? "border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/30" : "border-slate-200"
                )}
                onClick={() => navigate('/reviews')}
              >
                <div className="flex items-start gap-3">
                  {/* Rating Badge */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    getRatingBgColor(review.rating_normalized_5)
                  )}>
                    <span className={cn("text-sm font-bold", getRatingColor(review.rating_normalized_5))}>
                      {formatRating(review.rating_normalized_5)}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">
                        {review.reviewer_name || t('reviews.anonymous_guest', 'Anonymous Guest')}
                      </p>
                      {review.critical_flag && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t('widgets.guest_reviews.critical', 'Critical')}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {review.review_title || review.review_text?.substring(0, 80) + '...'}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {getPlatformName(review.platform)}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(new Date(review.collected_at), { addSuffix: true })}
                      </span>
                      {isHeadOfficeUser && effectivePropertyId === 'all' && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          • {availableProperties?.find(p => p.id === review.property_id)?.name || t('reviews.unknown_property', 'Unknown')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{reviewData.responseRate}%</span> {t('widgets.guest_reviews.response_rate', 'response rate')}
            </div>
            {reviewData.criticalReviews > 0 && (
              <div className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">{reviewData.criticalReviews}</span> {t('widgets.guest_reviews.critical', 'critical')}
              </div>
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs"
            onClick={() => navigate('/reviews')}
          >
            {t('widgets.guest_reviews.manage_reviews', 'Manage Reviews')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
