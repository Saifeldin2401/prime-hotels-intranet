import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Search, LayoutGrid, List, MessageSquare, ShieldAlert, Send, Globe, Settings, CheckCircle2, User, Zap, BarChart3, Building2, Activity, Star, Clock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Bell, BellRing, Radio, Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ReviewListItem } from '@/components/reviews/ReviewListItem'
import { OTASourceManager } from '@/components/reviews/OTASourceManager'
import { ReviewMonitoringDashboard } from '@/components/reviews/ReviewMonitoringDashboard'
import { BulkOperationsToolbar } from '@/components/reviews/BulkOperationsToolbar'
import { ReviewAnalyticsDashboard } from '@/components/reviews/ReviewAnalyticsDashboard'
import { MultiHotelDashboard } from '@/components/reviews/MultiHotelDashboard'
import { QuickStatsSummary } from '@/components/reviews/QuickStatsSummary'
import { CompactFilterBar, type Filters } from '@/components/reviews/CompactFilterBar'
import { ReviewTrendsChart } from '@/components/reviews/ReviewTrendsChart'
import { PropertyComparisonChart } from '@/components/reviews/PropertyComparisonChart'
import { DateRangePicker } from '@/components/reviews/DateRangePicker'
import { ResponseTemplates, type ResponseTemplate } from '@/components/reviews/ResponseTemplates'
import { AIResponseGenerator } from '@/components/reviews/AIResponseGenerator'
import { ReviewComments } from '@/components/reviews/ReviewComments'
import { ActivityTimeline } from '@/components/reviews/ActivityTimeline'
import { ExportReviewsButton } from '@/components/reviews/ExportReviewsButton'
import { SavedFilterPresets } from '@/components/reviews/SavedFilterPresets'
import { KeywordCloud } from '@/components/reviews/KeywordCloud'
import { SentimentBreakdownChart } from '@/components/reviews/SentimentBreakdownChart'

type ReviewWithIssues = GuestReview & {
  issues?: Array<{
    category: string
    severity?: string
    confidence?: number
    issue_summary_en?: string | null
  }>
  [key: string]: unknown
}
import { ReviewPreviewTooltip } from '@/components/reviews/ReviewPreviewTooltip'
import { useReviewShortcuts, useFilterShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { GuestReview } from '@/lib/types'
import { GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID, isGuestReviewEligiblePropertyId } from '@/lib/reviewsScope'
import { useNavigate } from 'react-router-dom'

type PropertyLite = { id: string; name: string }

type AssignmentRow = {
  id: string
  responsibility_code: string
  status: string
  due_at: string
  escalation_level: number
  assignee_profile_id: string | null
  acknowledged_at: string | null
  started_at: string | null
  closed_at: string | null
  created_at: string
}

type IssueRow = {
  id: string
  category: string
  severity: string
  confidence: number
  evidence_text: string | null
  issue_summary_en: string | null
}

type ResponseRow = {
  id: string
  review_id: string
  draft_response_en: string | null
  draft_response_ar: string | null
  edited_response_en: string | null
  edited_response_ar: string | null
  internal_notes: string | null
  posted_externally: boolean
  proof_url: string | null
}

type ReviewOwnerRow = {
  review_id: string
  responsibility_code: string
  is_secondary: boolean
  created_at: string
  assignee_profile_id: string | null
}

type ProfileNameLite = {
  id: string
  full_name: string | null
  email: string | null
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

const severityBadgeClass = (severity?: string | null) => {
  const value = String(severity || '').toLowerCase()
  switch (value) {
    case 'critical': return 'bg-red-500/10 text-red-600 border-red-200'
    case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-200'
    case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200'
    case 'low': return 'bg-green-500/10 text-green-600 border-green-200'
    default: return 'bg-muted/50 text-muted-foreground'
  }
}

export default function GuestReviews() {
  const { t } = useTranslation('reviews')
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  const [filters, setFilters] = useState<Filters>({
    propertyId: 'all',
    platform: 'all',
    status: 'all',
    severity: 'all',
    sentiment: 'all',
    query: '',
    sort: 'newest',
  })

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  // Monitoring system states
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [newReviewCount, setNewReviewCount] = useState(0)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date())
  const [recentReviews, setRecentReviews] = useState<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Monitoring system: Check for new reviews every 30 seconds
  const checkForNewReviews = useCallback(async () => {
    if (!isMonitoring) return
    
    try {
      const { data, error } = await supabase
        .from('guest_reviews')
        .select('id, reviewer_name, platform, severity, critical_flag, collected_at')
        .gt('collected_at', lastCheckedAt.toISOString())
        .order('collected_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const newIds = new Set(recentReviews)
        let criticalCount = 0
        
        data.forEach((review) => {
          if (!newIds.has(review.id)) {
            newIds.add(review.id)
            if (review.critical_flag || review.severity === 'critical') {
              criticalCount++
            }
          }
        })
        
        if (newIds.size > recentReviews.size) {
          setRecentReviews(newIds)
          setNewReviewCount(prev => prev + (newIds.size - recentReviews.size))
          
          // Show toast notification
          const newCount = newIds.size - recentReviews.size
          toast({
            title: `${newCount} New Review${newCount > 1 ? 's' : ''} Detected`,
            description: criticalCount > 0 
              ? `⚠️ ${criticalCount} critical review${criticalCount > 1 ? 's' : ''} require attention`
              : 'New guest feedback has arrived',
            variant: criticalCount > 0 ? 'destructive' : 'default',
          })
          
          // Play sound if enabled and critical
          if (soundEnabled && criticalCount > 0 && audioRef.current) {
            audioRef.current.play().catch(() => {})
          }
          
          // Refresh the reviews list
          queryClient.invalidateQueries({ queryKey: ['guest-reviews'] })
        }
      }
      
      setLastCheckedAt(new Date())
    } catch (err) {
      console.error('Error checking for new reviews:', err)
    }
  }, [isMonitoring, lastCheckedAt, recentReviews, soundEnabled, toast, queryClient])

  // Set up monitoring interval
  useEffect(() => {
    if (isMonitoring) {
      monitoringIntervalRef.current = setInterval(checkForNewReviews, 30000) // Check every 30 seconds
    }
    
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current)
      }
    }
  }, [isMonitoring, checkForNewReviews])

  // Clear new review badge when user clicks to view
  const clearNewReviews = () => {
    setNewReviewCount(0)
    setRecentReviews(new Set())
  }

  // Mark a review as "seen" (remove from recent)
  const markReviewSeen = (reviewId: string) => {
    setRecentReviews(prev => {
      const next = new Set(prev)
      next.delete(reviewId)
      return next
    })
  }

  const propertiesQuery = useQuery({
    queryKey: ['guest-review-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(500)
      if (error) throw error
      return ((data ?? []) as PropertyLite[]).filter((row) => isGuestReviewEligiblePropertyId(row.id))
    },
  })

  const reviewsQuery = useQuery({
    queryKey: ['guest-reviews', filters],
    queryFn: async () => {
      let query = supabase
        .from('guest_reviews')
        .select('*')
        .neq('property_id', GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID)

      // FIXED: Filter out reviews older than 90 days based on published_at (original review date)
      // This prevents old reviews from appearing when they're newly collected
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`published_at.gte.${ninetyDaysAgo},and(published_at.is.null,collected_at.gte.${ninetyDaysAgo})`)

      // Apply sorting based on filter selection
      // FIXED: Use collected_at consistently as the system-of-record timestamp
      switch (filters.sort) {
        case 'newest':
          // Sort by published_at (newest first)
          query = query
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('collected_at', { ascending: false })
          break
        case 'oldest':
          // Sort by published_at (oldest first)
          query = query
            .order('published_at', { ascending: true, nullsFirst: false })
            .order('collected_at', { ascending: true })
          break
        case 'critical':
          // Sort by severity (critical first), then by published_at
          query = query
            .order('severity', { ascending: false })
            .order('critical_flag', { ascending: false })
            .order('published_at', { ascending: false, nullsFirst: false })
          break
        case 'highest_rating':
          // Sort by rating (highest first), then by published_at
          query = query
            .order('rating_normalized_5', { ascending: false })
            .order('published_at', { ascending: false, nullsFirst: false })
          break
        case 'lowest_rating':
          // Sort by rating (lowest first), then by published_at
          query = query
            .order('rating_normalized_5', { ascending: true })
            .order('published_at', { ascending: false, nullsFirst: false })
          break
        default:
          // Default to newest first
          query = query
            .order('published_at', { ascending: false, nullsFirst: false })
      }

      query = query.limit(200)

      if (filters.propertyId !== 'all') query = query.eq('property_id', filters.propertyId)
      if (filters.platform !== 'all') query = query.eq('platform', filters.platform)
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.severity !== 'all') query = query.eq('severity', filters.severity)
      if (filters.sentiment !== 'all') query = query.eq('sentiment', filters.sentiment)

      if (filters.query.trim()) {
        query = query.or(`review_text.ilike.%${filters.query.trim()}%,review_title.ilike.%${filters.query.trim()}%,reviewer_name.ilike.%${filters.query.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as GuestReview[]
    },
    staleTime: 15_000,
  })

  const reviewIdsForOwnerLookup = useMemo(
    () => (reviewsQuery.data ?? []).map((row) => row.id),
    [reviewsQuery.data],
  )

  const reviewOwnersQuery = useQuery({
    queryKey: ['guest-review-owner-map', reviewIdsForOwnerLookup],
    enabled: reviewIdsForOwnerLookup.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_review_assignments')
        .select('review_id, responsibility_code, is_secondary, created_at, assignee_profile_id')
        .in('review_id', reviewIdsForOwnerLookup)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as ReviewOwnerRow[]
    },
  })

  const assigneeProfileIds = useMemo(
    () => Array.from(new Set((reviewOwnersQuery.data ?? []).map((row) => row.assignee_profile_id).filter(Boolean))) as string[],
    [reviewOwnersQuery.data],
  )

  const assigneeProfilesQuery = useQuery({
    queryKey: ['guest-review-owner-profiles', assigneeProfileIds],
    enabled: assigneeProfileIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', assigneeProfileIds)

      if (error) throw error
      return (data ?? []) as ProfileNameLite[]
    },
  })

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const prop of propertiesQuery.data ?? []) {
      map.set(prop.id, prop.name)
    }
    return map
  }, [propertiesQuery.data])

  const selectedReviewQuery = useQuery({
    queryKey: ['guest-review', selectedReviewId],
    enabled: Boolean(selectedReviewId),
    queryFn: async () => {
      if (!selectedReviewId) return null
      const { data, error } = await supabase
        .from('guest_reviews')
        .select('*')
        .eq('id', selectedReviewId)
        .maybeSingle()

      if (error) throw error
      return (data ?? null) as GuestReview | null
    },
    retry: false,
  })

  const issuesQuery = useQuery({
    queryKey: ['guest-review-issues', selectedReviewId],
    enabled: Boolean(selectedReviewId),
    queryFn: async () => {
      if (!selectedReviewId) return []
      const { data, error } = await supabase
        .from('guest_review_issues')
        .select('id, category, severity, confidence, evidence_text, issue_summary_en')
        .eq('review_id', selectedReviewId)
        .order('severity', { ascending: false })

      if (error) throw error
      return (data ?? []) as IssueRow[]
    },
  })

  const assignmentsQuery = useQuery({
    queryKey: ['guest-review-assignments', selectedReviewId],
    enabled: Boolean(selectedReviewId),
    queryFn: async () => {
      if (!selectedReviewId) return []
      const { data, error } = await supabase
        .from('guest_review_assignments')
        .select('id, responsibility_code, status, due_at, escalation_level, assignee_profile_id, acknowledged_at, started_at, closed_at, created_at')
        .eq('review_id', selectedReviewId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as AssignmentRow[]
    },
  })

  const responseQuery = useQuery({
    queryKey: ['guest-review-response', selectedReviewId],
    enabled: Boolean(selectedReviewId),
    queryFn: async () => {
      if (!selectedReviewId) return null
      const { data, error } = await supabase
        .from('guest_review_responses')
        .select('id, review_id, draft_response_en, draft_response_ar, edited_response_en, edited_response_ar, internal_notes, posted_externally, proof_url')
        .eq('review_id', selectedReviewId)
        .maybeSingle()

      if (error) throw error
      return (data ?? null) as ResponseRow | null
    },
  })

  const [responseDraft, setResponseDraft] = useState({
    edited_response_en: '',
    edited_response_ar: '',
    internal_notes: '',
    proof_url: '',
    posted_externally: false,
  })

  const hydrateResponseDraft = (row: ResponseRow | null) => {
    setResponseDraft({
      edited_response_en: row?.edited_response_en ?? row?.draft_response_en ?? '',
      edited_response_ar: row?.edited_response_ar ?? row?.draft_response_ar ?? '',
      internal_notes: row?.internal_notes ?? '',
      proof_url: row?.proof_url ?? '',
      posted_externally: Boolean(row?.posted_externally),
    })
  }

  const openReview = (reviewId: string) => {
    setSelectedReviewId(reviewId)
    setSheetOpen(true)
  }

  const updateAssignmentMutation = useMutation({
    mutationFn: async (payload: { assignmentId: string; action: 'ack' | 'start' | 'close' }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (payload.action === 'ack') {
        updates.status = 'acknowledged'
        updates.acknowledged_at = new Date().toISOString()
      }
      if (payload.action === 'start') {
        updates.status = 'action_in_progress'
        updates.started_at = new Date().toISOString()
      }
      if (payload.action === 'close') {
        updates.status = 'closed'
        updates.closed_at = new Date().toISOString()
      }

      const { error } = await supabase.from('guest_review_assignments').update(updates).eq('id', payload.assignmentId)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-review-assignments', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-review', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-reviews'] })
      toast({ title: t('notifications.updated'), description: t('notifications.assignmentUpdated') })
    },
    onError: (error) => {
      toast({ title: t('notifications.error'), description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    }
  })

  const saveResponseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReviewId) throw new Error('Missing review id')

      const existing = responseQuery.data
      const payload = {
        review_id: selectedReviewId,
        edited_response_en: responseDraft.edited_response_en || null,
        edited_response_ar: responseDraft.edited_response_ar || null,
        internal_notes: responseDraft.internal_notes || null,
        proof_url: responseDraft.proof_url || null,
        posted_externally: responseDraft.posted_externally,
        last_edited_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        const { error } = await supabase.from('guest_review_responses').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('guest_review_responses').insert(payload)
        if (error) throw error
      }

      const { error: reviewError } = await supabase
        .from('guest_reviews')
        .update({ status: responseDraft.posted_externally ? 'responded' : 'response_pending', responded_at: responseDraft.posted_externally ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
        .eq('id', selectedReviewId)

      if (reviewError) throw reviewError
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-review-response', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-review', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-reviews'] })
      toast({ title: t('notifications.saved'), description: t('notifications.responseUpdated') })
    },
    onError: (error) => {
      toast({ title: t('notifications.error'), description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    }
  })

  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReviewId) throw new Error('Missing review id')
      const { error } = await supabase.functions.invoke('guest-review-analyzer', { body: { review_id: selectedReviewId, force: true } })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-review', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-review-issues', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-review-assignments', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-review-response', selectedReviewId] })
      await queryClient.invalidateQueries({ queryKey: ['guest-reviews'] })
      toast({ title: t('notifications.reanalyzed'), description: t('notifications.aiAnalysisRerun') })
    },
    onError: (error) => {
      toast({ title: t('notifications.error'), description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    }
  })


  const collectorMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('guest-review-collector', {
        body: { run_mode: 'backfill' },
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: t('notifications.syncStarted'), description: t('notifications.collectorTriggered') })
    },
    onError: (error) => {
      toast({ title: t('notifications.error'), description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    },
  })

  const reviews = reviewsQuery.data ?? []
  
  // Sort reviews based on selected sort option
  // FIXED: Consistently use collected_at as system-of-record timestamp
  const sortedReviews = useMemo(() => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, null: 0 }
    const sorted = [...reviews]
    
    switch (filters.sort) {
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.collected_at).getTime()
          const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.collected_at).getTime()
          return dateB - dateA
        })
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.collected_at).getTime()
          const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.collected_at).getTime()
          return dateA - dateB
        })
      case 'critical':
        return sorted.sort((a, b) => {
          const sevA = severityOrder[a.severity as keyof typeof severityOrder] || 0
          const sevB = severityOrder[b.severity as keyof typeof severityOrder] || 0
          if (sevA !== sevB) return sevB - sevA
          const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.collected_at).getTime()
          const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.collected_at).getTime()
          return dateB - dateA
        })
      case 'highest_rating':
        return sorted.sort((a, b) => {
          const rateA = a.rating_normalized_5 || 0
          const rateB = b.rating_normalized_5 || 0
          if (rateA !== rateB) return rateB - rateA
          const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.collected_at).getTime()
          const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.collected_at).getTime()
          return dateB - dateA
        })
      case 'lowest_rating':
        return sorted.sort((a, b) => {
          const rateA = a.rating_normalized_5 || 0
          const rateB = b.rating_normalized_5 || 0
          if (rateA !== rateB) return rateA - rateB
          const dateA = a.published_at ? new Date(a.published_at).getTime() : new Date(a.collected_at).getTime()
          const dateB = b.published_at ? new Date(b.published_at).getTime() : new Date(b.collected_at).getTime()
          return dateB - dateA
        })
      default:
        return sorted
    }
  }, [reviews, filters.sort])

  const ownerNameByReviewId = useMemo(() => {
    const rows = reviewOwnersQuery.data ?? []
    const profileById = new Map((assigneeProfilesQuery.data ?? []).map((row) => [row.id, row]))
    const primary = new Map<string, string>()
    const secondary = new Map<string, string>()

    for (const row of rows) {
      const profile = row.assignee_profile_id ? profileById.get(row.assignee_profile_id) : null
      const assigneeName = profile?.full_name?.trim() || profile?.email?.trim()
      if (!assigneeName) continue

      if (!row.is_secondary && !primary.has(row.review_id)) {
        primary.set(row.review_id, assigneeName)
        continue
      }

      if (row.is_secondary && !secondary.has(row.review_id)) {
        secondary.set(row.review_id, assigneeName)
      }
    }

    const merged = new Map<string, string>()
    for (const [reviewId, name] of secondary.entries()) merged.set(reviewId, name)
    for (const [reviewId, name] of primary.entries()) merged.set(reviewId, name)
    return merged
  }, [reviewOwnersQuery.data, assigneeProfilesQuery.data])

  const platforms = useMemo(() => {
    return ['agoda', 'airbnb', 'booking', 'expedia', 'google', 'hotels_com', 'manual_import', 'tripadvisor']
  }, [])

  const statuses = useMemo(() => {
    return ['collected', 'analyzed', 'assigned', 'acknowledged', 'response_pending', 'responded', 'closed', 'escalated']
  }, [])

  const severities = useMemo(() => {
    return ['low', 'medium', 'high', 'critical']
  }, [])

  const sentiments = useMemo(() => {
    return ['positive', 'neutral', 'negative', 'mixed']
  }, [])

  const selectedResponse = responseQuery.data
  const selectedReview = selectedReviewQuery.data

  // Keyboard shortcuts
  useReviewShortcuts({
    onClose: () => setSheetOpen(false),
    onRespond: () => setSheetOpen(true),
    enabled: sheetOpen,
  })

  useFilterShortcuts({
    onFocusSearch: () => (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus(),
    onClearFilters: () => setFilters({ propertyId: 'all', platform: 'all', status: 'all', severity: 'all', sentiment: 'all', query: '', sort: 'newest' }),
    enabled: !sheetOpen,
  })

  useEffect(() => {
    if (sheetOpen) {
      hydrateResponseDraft(selectedResponse ?? null)
    }
  }, [sheetOpen, selectedResponse])

  const onSheetOpenChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedReviewId(null)
      return
    }
    if (open && selectedResponse) {
      hydrateResponseDraft(selectedResponse)
    }
  }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const REVIEWS_PER_PAGE = 24
  const totalPages = Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE)
  const paginatedReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-hotel-navy dark:bg-hotel-gold rounded-full" />
            <div>
              <h1 className="text-4xl font-black tracking-tight text-hotel-navy dark:text-hotel-gold leading-none">
                {t('title')}
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-2 tracking-tight max-w-xl">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 backdrop-blur-sm items-center shadow-sm">
          {/* Live Monitoring Indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
            isMonitoring ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}>
            <Radio className={cn("h-3.5 w-3.5", isMonitoring && "animate-pulse")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isMonitoring ? t('monitoring.live') : t('monitoring.paused')}
            </span>
          </div>

          {/* New Reviews Badge */}
          {newReviewCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={clearNewReviews}
              className="h-9 px-3 font-bold text-[10px] uppercase tracking-wider animate-in zoom-in"
            >
              <BellRing className="h-3.5 w-3.5 me-1.5 animate-pulse" />
              {newReviewCount} {t('monitoring.new')}
            </Button>
          )}

          {/* Sound Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "h-9 px-3 font-bold text-[10px] uppercase tracking-wider border-slate-200 dark:border-slate-700",
              soundEnabled ? "bg-primary/10 text-primary border-primary/30" : ""
            )}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 me-1.5" /> : <VolumeX className="h-3.5 w-3.5 me-1.5" />}
            {t('monitoring.sound')}
          </Button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => reviewsQuery.refetch()} 
            disabled={reviewsQuery.isFetching}
            className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest bg-transparent border-slate-200 dark:border-slate-700 hover:bg-primary/5 text-muted-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 me-2', reviewsQuery.isFetching ? 'animate-spin' : '')} />
            {t('actions.refreshHub')}
          </Button>
        </div>
      </div>

      {/* Audio element for notification sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanu8LdnHgUuh9Dz2YU2Bhxqv+zplkcODVGm5O+4ZSAEMYrO89GFNwYdcfDr4ZdJDQtPp+XysWUeBjiS1/LNfi0GI33R8tOENAcdcO/r4phJDQxPp+XyxGUhBjqT1/PQfS4GI3/R8tSFNwYccPDs4phJDQxPp+TwxmUgBjiT1/PQfS4GI3/R8tSFNwYccPDs4phJDQxPp+TwxmUgBjiT1/PQfS4GI3/R8tSFNwYccPDs4phJDQxPp+TwxmUgBjiT1/PQfS4GI3/R8tSFNwYccPDs4phJDQxPp+TwxmUgBjiT1/PQfS4GI3/R8tSFNwYccPDs4phJDQw=="
        preload="auto"
      />

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex items-center justify-between border-b pb-1 border-muted-foreground/10">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger 
              value="overview" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <LayoutGrid className="h-3.5 w-3.5 me-2" />
              {t('tabs.overview')}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <BarChart3 className="h-3.5 w-3.5 me-2" />
              {t('tabs.analytics')}
            </TabsTrigger>
            <TabsTrigger 
              value="properties" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Building2 className="h-3.5 w-3.5 me-2" />
              {t('tabs.properties')}
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Activity className="h-3.5 w-3.5 me-2" />
              {t('tabs.monitoring')}
            </TabsTrigger>
            <TabsTrigger 
              value="sources" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Globe className="h-3.5 w-3.5 me-2" />
              {t('tabs.sources')}
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Settings className="h-3.5 w-3.5 me-2" />
              {t('tabs.settings')}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'outline'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode !== 'grid' && "bg-transparent border-muted-foreground/10")} 
              onClick={() => setViewMode('grid')}
              aria-label={t('accessibility.grid_view', 'Grid view')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'outline'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode !== 'list' && "bg-transparent border-muted-foreground/10")} 
              onClick={() => setViewMode('list')}
              aria-label={t('accessibility.list_view', 'List view')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-700">
          {/* Quick Stats Summary */}
          <QuickStatsSummary reviews={reviews as ReviewWithIssues[]} propertyNameById={propertyNameById} />

          {/* Bulk Operations Toolbar */}
          <BulkOperationsToolbar
            reviews={reviews as ReviewWithIssues[]}
            selectedIds={selectedReviewIds}
            onSelectionChange={setSelectedReviewIds}
            propertyNameById={propertyNameById}
            filters={filters}
          />

          {/* Compact Filter Bar */}
          <CompactFilterBar
            filters={filters}
            onFilterChange={setFilters}
            properties={propertiesQuery.data ?? []}
            platforms={platforms}
            severities={severities}
            sentiments={sentiments}
            statuses={statuses}
          />

          {reviewsQuery.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/60 p-5 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-2 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, j) => (
                      <div key={j} className="h-3 w-3 bg-slate-100 dark:bg-slate-800 rounded" />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-24 text-center border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
              <div className="relative">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 shadow-lg rounded-2xl flex items-center justify-center mb-6 mx-auto ring-1 ring-slate-200 dark:ring-slate-700">
                  <MessageSquare className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight mb-2">{t('empty.title')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('empty.description')}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 rounded-xl px-6 h-10 font-semibold text-xs border-slate-300 dark:border-slate-600"
                  onClick={() => setFilters({ propertyId: 'all', platform: 'all', status: 'all', severity: 'all', sentiment: 'all', query: '', sort: 'newest' })}
                >
                  {t('actions.resetParameters')}
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Review count */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('pagination.showing')}
                  <span className="font-semibold text-foreground mx-1">{paginatedReviews.length}</span>
                  {t('pagination.of')}
                  <span className="font-semibold text-foreground mx-1">{sortedReviews.length}</span>
                  {t('analytics.reviews').toLowerCase()}
                </p>
              </div>

              <div className={cn(
                "gap-4",
                viewMode === 'grid' ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
              )}>
                {paginatedReviews.map((review) => (
                  <ReviewListItem 
                    key={review.id} 
                    review={review} 
                    propertyName={propertyNameById.get(review.property_id) || t('reviewCard.unknownProperty')} 
                    ownerName={ownerNameByReviewId.get(review.id)}
                    onClick={(id) => {
                      markReviewSeen(id)
                      openReview(id)
                    }}
                    isSelected={selectedReviewIds.includes(review.id)}
                    isNew={recentReviews.has(review.id)}
                    onToggleSelect={(id) => {
                      if (selectedReviewIds.includes(id)) {
                        setSelectedReviewIds(selectedReviewIds.filter((i) => i !== id))
                      } else {
                        setSelectedReviewIds([...selectedReviewIds, id])
                      }
                    }}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-lg text-xs font-semibold border-slate-200 dark:border-slate-700"
                  >
                    {t('pagination.previous')}
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number
                      if (totalPages <= 7) {
                        page = i + 1
                      } else if (currentPage <= 4) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i
                      } else {
                        page = currentPage - 3 + i
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "h-9 w-9 p-0 rounded-lg text-xs font-semibold",
                            currentPage === page && "bg-primary text-primary-foreground"
                          )}
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-9 px-3 rounded-lg text-xs font-semibold border-slate-200 dark:border-slate-700"
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8 animate-in fade-in duration-700">
          {/* Executive Intelligence header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight">{t('analytics.title')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('analytics.subtitle')}
              </p>
            </div>
          </div>

          {/* Top charts row: trends + property comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReviewTrendsChart reviews={reviews} />
            <PropertyComparisonChart reviews={reviews} properties={propertiesQuery.data ?? []} />
          </div>

          {/* Issue category analysis + keyword cloud */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SentimentBreakdownChart reviews={reviews as ReviewWithIssues[]} />
            <KeywordCloud reviews={reviews} maxKeywords={30} />
          </div>

          {/* Full executive analytics dashboard */}
          <ReviewAnalyticsDashboard
            reviews={reviews}
            propertyNameById={propertyNameById}
            properties={propertiesQuery.data ?? []}
          />
        </TabsContent>

        <TabsContent value="properties" className="space-y-8 animate-in fade-in duration-700">
          <MultiHotelDashboard
            reviews={reviews as ReviewWithIssues[]}
            propertyNameById={propertyNameById}
            properties={propertiesQuery.data ?? []}
            onReviewClick={openReview}
            selectedIds={selectedReviewIds}
            onToggleSelect={(id) => {
              if (selectedReviewIds.includes(id)) {
                setSelectedReviewIds(selectedReviewIds.filter((i) => i !== id))
              } else {
                setSelectedReviewIds([...selectedReviewIds, id])
              }
            }}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6 animate-in fade-in duration-700">
          <ReviewMonitoringDashboard />
        </TabsContent>

        <TabsContent value="sources">
          <OTASourceManager />
        </TabsContent>

        <TabsContent value="settings">
          <Card className="border-none bg-gradient-to-br from-card to-muted/20 rounded-3xl overflow-hidden">
            <CardHeader className="p-10 pb-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-hotel-navy text-white rounded-2xl">
                  <Settings className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black tracking-tight text-hotel-navy">{t('settings.title')}</CardTitle>
                  <CardDescription className="text-sm font-medium">{t('settings.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="grid md:grid-cols-2 gap-8 py-10 border-t border-muted-foreground/5">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{t('settings.scrapingLogic.title')}</h4>
                  <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                    {t('settings.scrapingLogic.description')}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{t('settings.webhooks.title')}</h4>
                  <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                    {t('settings.webhooks.description')}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 p-6 bg-muted/20 rounded-[2rem] border border-muted-foreground/10 mt-4">
                <Button
                  onClick={() => collectorMutation.mutate()}
                  disabled={collectorMutation.isPending}
                  className="h-11 font-bold text-[11px] uppercase tracking-widest"
                >
                  <RefreshCw className={cn('h-4 w-4 me-2', collectorMutation.isPending && 'animate-spin')} />
                  {t('actions.syncNow')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/reviews/settings')}
                  className="h-11 font-bold text-[11px] uppercase tracking-widest bg-transparent"
                >
                  {t('actions.openFullSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <DialogContent 
          className="sm:max-w-5xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-950 max-h-[90vh] flex flex-col [&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:opacity-70 hover:[&>button]:opacity-100 [&>button]:z-50 [&>button]:bg-black/20 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:transition-all"
          bodyClassName="p-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedReview?.review_title || t('dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
              {/* Refined Premium Header */}
              <div className="relative bg-hotel-navy p-6 md:px-8 md:py-7 flex-shrink-0 border-b border-white/10">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-hotel-gold">
                  <Zap className="h-24 w-24" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pr-10">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-[9px] font-bold tracking-widest uppercase px-2.5 h-5">
                        {selectedReview.platform}
                      </Badge>
                      <Badge className={cn("text-[9px] font-bold tracking-widest uppercase px-2.5 h-5 border-none shadow-sm", severityBadgeClass(selectedReview.severity))}>
                        {selectedReview.severity || t('status.normal')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <h2 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight truncate">
                        {selectedReview.review_title || t('dialog.title')}
                      </h2>
                      <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {selectedReview.reviewer_name || t('reviewCard.anonymous')}
                        </span>
                        <span className="opacity-30">|</span>
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {propertyNameById.get(selectedReview.property_id)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Rating Block */}
                  <div className="shrink-0 flex flex-col items-start md:items-end gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < Math.round(selectedReview.rating_normalized_5 || 0)
                              ? "fill-hotel-gold text-hotel-gold"
                              : "fill-white/10 text-white/10"
                          )}
                        />
                      ))}
                      <span className="text-xl font-black text-white ms-2">
                        {selectedReview.rating_normalized_5?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-hotel-gold uppercase tracking-[0.1em]">
                      {t('analytics.rating')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Split Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Side: Intelligence & Feedback (Verbatim) */}
                <div className="flex-1 overflow-y-auto border-e border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 p-6 md:p-8 space-y-8 custom-scrollbar">
                  {/* Guest Verbatim Card */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-hotel-navy dark:text-hotel-gold flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t('rawIntelligence.platformVerbatim')}
                      </h3>
                      {selectedReview.collected_at && (
                         <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(selectedReview.collected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="p-5 md:p-7 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-4 start-4 text-primary/10 select-none">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM14.017 21C14.017 19.8954 13.1216 19 12.017 19H9.017C7.91243 19 7.017 19.8954 7.017 21V23C7.017 24.1046 7.91243 25 9.017 25H12.017C13.1216 25 14.017 24.1046 14.017 21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C11.1216 16 12.017 16.8954 12.017 18V21C12.017 22.1046 11.1216 23 10.017 23H7.017C5.91243 23 5.017 22.1046 5.017 21Z" transform="translate(-5 -15)"/></svg>
                      </div>
                      <p className="text-base font-medium leading-relaxed text-slate-800 dark:text-slate-200 relative z-10 ps-2">
                        {selectedReview.review_text}
                      </p>
                    </div>
                  </div>

                  {/* Executive AI Brief */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-hotel-navy dark:text-hotel-gold flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 fill-hotel-gold/30" />
                        {t('executiveSummary.title')}
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => reanalyzeMutation.mutate()} 
                        disabled={reanalyzeMutation.isPending}
                        className="h-7 text-[9px] tracking-widest uppercase font-bold text-primary hover:bg-primary/5 transition-colors"
                      >
                        <RefreshCw className={cn("h-3 w-3 me-2", reanalyzeMutation.isPending && "animate-spin")} /> {t('actions.reanalyze')}
                      </Button>
                    </div>
                    
                    <div className="space-y-4 bg-hotel-gold/5 dark:bg-hotel-gold/10 border border-hotel-gold/20 rounded-2xl p-6 relative overflow-hidden">
                      <p className="text-sm font-bold italic leading-relaxed text-slate-800 dark:text-slate-200">
                        "{selectedReview.manager_brief_en || t('executiveSummary.processing')}"
                      </p>
                      {selectedReview.summary_ar && (
                        <div className="pt-4 border-t border-hotel-gold/20">
                          <p className="text-sm font-arabic font-black leading-loose text-slate-700 dark:text-slate-300 text-right" dir="rtl">
                            {selectedReview.summary_ar}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Findings */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-hotel-navy dark:text-hotel-gold flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {t('rawIntelligence.operationalIssues')}
                    </h3>
                    <div className="grid gap-3">
                      {issuesQuery.data?.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 text-xs font-medium">
                          {t('rawIntelligence.noAnomalies')}
                        </div>
                      ) : (
                        issuesQuery.data?.map(issue => (
                          <div key={issue.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3 shadow-sm hover:border-hotel-gold/40 transition-colors">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider h-5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                {issue.category.replace(/_/g, ' ')}
                              </Badge>
                              <Badge className={cn("text-[8px] font-black uppercase tracking-wider h-5 border-none", severityBadgeClass(issue.severity))}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{issue.issue_summary_en}</h4>
                            {issue.evidence_text && (
                              <p className="text-xs text-muted-foreground italic border-s-2 border-slate-200 dark:border-slate-700 ps-3 py-0.5">
                                "{issue.evidence_text}"
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Response Drafting & Action */}
                <div className="w-full md:w-[400px] lg:w-[450px] overflow-y-auto bg-white dark:bg-slate-950 p-6 md:p-8 space-y-6 custom-scrollbar border-t md:border-t-0">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 bg-hotel-navy text-white rounded-lg">
                      <Send className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-hotel-navy dark:text-hotel-gold">
                      {t('responseEngine.title')}
                    </h3>
                  </div>

                  {/* Internal Notes */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ps-1">
                      {t('responseEngine.internalNotes')}
                    </Label>
                    <Textarea 
                      value={responseDraft.internal_notes} 
                      onChange={(e) => setResponseDraft(p => ({ ...p, internal_notes: e.target.value }))} 
                      placeholder={t('responseEngine.internalNotesPlaceholder')}
                      className="min-h-[100px] text-sm rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-hotel-gold shadow-none"
                    />
                  </div>

                  {/* Response Fields */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ps-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('responseEngine.englishResponse')}</Label>
                        <Badge className="text-[8px] font-bold h-4 bg-hotel-gold/10 text-hotel-gold border border-hotel-gold/20">{t('responseEngine.aiAssisted')}</Badge>
                      </div>
                      <Textarea 
                        value={responseDraft.edited_response_en} 
                        onChange={(e) => setResponseDraft(p => ({ ...p, edited_response_en: e.target.value }))} 
                        className="min-h-[140px] text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-hotel-gold"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ps-1 flex-row-reverse text-right">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-arabic">{t('responseEngine.arabicResponse')}</Label>
                        <Badge className="text-[8px] font-bold h-4 bg-hotel-gold/10 text-hotel-gold border border-hotel-gold/20 font-arabic">{t('responseEngine.smartTranslation')}</Badge>
                      </div>
                      <Textarea 
                        value={responseDraft.edited_response_ar} 
                        onChange={(e) => setResponseDraft(p => ({ ...p, edited_response_ar: e.target.value }))} 
                        dir="rtl"
                        className="min-h-[140px] text-sm font-arabic font-bold text-right bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-hotel-gold"
                      />
                    </div>
                  </div>

                  {/* Status Toggle Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                      responseDraft.posted_externally ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    )}>
                      {responseDraft.posted_externally ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {t('responseEngine.status', { status: responseDraft.posted_externally ? t('status.publishedExternally') : t('status.internalReview') })}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-medium truncate">
                        {t('responseEngine.statusDescription')}
                      </p>
                    </div>
                    <Switch 
                      checked={responseDraft.posted_externally} 
                      onCheckedChange={(checked) => setResponseDraft(p => ({ ...p, posted_externally: checked }))}
                      className="scale-90 data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  <Button 
                    className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-hotel-navy hover:bg-hotel-navy/90 text-white shadow-lg shadow-hotel-navy/10 dark:bg-hotel-gold dark:text-hotel-navy dark:hover:bg-hotel-gold/90 transition-all active:scale-[0.98] mt-2 group" 
                    onClick={() => saveResponseMutation.mutate()} 
                    disabled={saveResponseMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 me-2.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    {t('actions.commitResponse')}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {!selectedReview && (
            <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-sm font-medium text-muted-foreground">
              {selectedReviewId
                ? t('dialog.reviewUnavailable')
                : t('dialog.selectReview')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
