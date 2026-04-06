/**
 * useGuestReviews Hook
 * 
 * Fetches guest reviews filtered by user's property and department.
 * Optimized for mobile dashboard with quick stats and recent reviews.
 */

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import type { GuestReview } from '@/lib/types'
import { buildReviewDateRange, filterReviewsByDateRange, getReviewEventTimestamp } from '@/lib/reviewDates'
import { useQuery } from '@tanstack/react-query'

interface GuestReviewStats {
  totalReviews: number
  averageRating: number
  responseRate: number
  pendingResponses: number
  criticalReviews: number
  recentReviews: GuestReview[]
}

export function useGuestReviews(options?: { 
  limit?: number
  daysBack?: number
  propertyId?: string
  enabled?: boolean 
}) {
  const { user, profile } = useAuth()
  const { currentProperty } = useProperty()
  const { limit = 5, daysBack = 30, propertyId: overridePropertyId, enabled = true } = options || {}

  const userDepartmentId = profile?.departments?.[0]?.id
  // Use override propertyId if provided, otherwise fall back to current property
  const effectivePropertyId = overridePropertyId !== undefined ? overridePropertyId : currentProperty?.id

  return useQuery({
    queryKey: ['guest-reviews', user?.id, effectivePropertyId, userDepartmentId, limit, daysBack],
    queryFn: async (): Promise<GuestReviewStats> => {
      if (!user) {
        return {
          totalReviews: 0,
          averageRating: 0,
          responseRate: 0,
          pendingResponses: 0,
          criticalReviews: 0,
          recentReviews: []
        }
      }

      const reviewWindow = buildReviewDateRange({ daysBack })

      let query = supabase
        .from('guest_reviews')
        .select('id, property_id, platform, reviewer_name, review_title, review_text, rating_normalized_5, status, critical_flag, severity, published_at, collected_at, created_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('collected_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (reviewWindow.fromIso) {
        query = query.or(
          `published_at.gte.${reviewWindow.fromIso},and(published_at.is.null,collected_at.gte.${reviewWindow.fromIso}),and(published_at.is.null,collected_at.is.null,created_at.gte.${reviewWindow.fromIso})`,
        )
      }

      // Filter by property if specified (for head office users or specific property views)
      if (effectivePropertyId && effectivePropertyId !== 'all') {
        query = query.eq('property_id', effectivePropertyId)
      }

      // For department-specific users, we might filter by department relevance
      // This could be based on review tags, mentioned departments, etc.
      // For now, we'll show all reviews for the property

      const { data: reviews, error } = await query

      if (error) {
        console.error('Error fetching guest reviews:', error)
        throw error
      }

      const reviewList = filterReviewsByDateRange((reviews || []) as GuestReview[], {
        daysBack,
      })

      // Calculate stats
      const totalReviews = reviewList.length
      
      // Average rating (using 5-star scale)
      const ratedReviews = reviewList.filter(r => r.rating_normalized_5 != null)
      const averageRating = ratedReviews.length > 0
        ? ratedReviews.reduce((sum, r) => sum + (r.rating_normalized_5 || 0), 0) / ratedReviews.length
        : 0

      // Response rate
      const respondedReviews = reviewList.filter(r => 
        ['responded', 'closed'].includes(r.status)
      ).length
      const responseRate = totalReviews > 0 
        ? Math.round((respondedReviews / totalReviews) * 100) 
        : 0

      // Pending responses
      const pendingResponses = reviewList.filter(r => 
        ['collected', 'analyzed', 'assigned', 'response_pending'].includes(r.status)
      ).length

      // Critical reviews
      const criticalReviews = reviewList.filter(r => 
        r.critical_flag || r.severity === 'critical' || r.severity === 'high'
      ).length

      // Get most recent reviews with high priority first
      const recentReviews = reviewList
        .sort((a, b) => {
          // Prioritize critical reviews
          const aCritical = a.critical_flag || a.severity === 'critical' ? 2 : a.severity === 'high' ? 1 : 0
          const bCritical = b.critical_flag || b.severity === 'critical' ? 2 : b.severity === 'high' ? 1 : 0
          if (bCritical !== aCritical) return bCritical - aCritical

          return getReviewEventTimestamp(b) - getReviewEventTimestamp(a)
        })
        .slice(0, limit)

      return {
        totalReviews,
        averageRating,
        responseRate,
        pendingResponses,
        criticalReviews,
        recentReviews
      }
    },
    enabled: enabled && !!user,
    refetchInterval: 60000, // Refetch every 1 minute for fresher data
    staleTime: 15000, // Align with GuestReviews.tsx (15 seconds)
    gcTime: 300000, // Keep in cache for 5 minutes
  })
}

/**
 * Format review rating with stars
 */
export function formatRating(rating: number | null): string {
  if (rating == null) return 'N/A'
  return rating.toFixed(1)
}

/**
 * Get rating color based on score
 */
export function getRatingColor(rating: number | null): string {
  if (rating == null) return 'text-gray-400'
  if (rating >= 4.5) return 'text-emerald-600'
  if (rating >= 4.0) return 'text-green-600'
  if (rating >= 3.0) return 'text-amber-600'
  if (rating >= 2.0) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get rating background color
 */
export function getRatingBgColor(rating: number | null): string {
  if (rating == null) return 'bg-gray-100'
  if (rating >= 4.5) return 'bg-emerald-100'
  if (rating >= 4.0) return 'bg-green-100'
  if (rating >= 3.0) return 'bg-amber-100'
  if (rating >= 2.0) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    google: 'Google',
    booking: 'Booking.com',
    expedia: 'Expedia',
    tripadvisor: 'TripAdvisor',
    agoda: 'Agoda',
    hotels_com: 'Hotels.com',
    airbnb: 'Airbnb',
    manual_import: 'Manual'
  }
  return names[platform] || platform
}

/**
 * Format relative time
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
