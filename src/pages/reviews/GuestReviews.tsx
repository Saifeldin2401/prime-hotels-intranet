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
import { RefreshCw, Search, LayoutGrid, List, MessageSquare, ShieldAlert, Send, Globe, Settings, CheckCircle2, User, Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useEffect, useMemo, useState } from 'react'
import { ReviewListItem } from '@/components/reviews/ReviewListItem'
import { OTASourceManager } from '@/components/reviews/OTASourceManager'
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
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [filters, setFilters] = useState({
    propertyId: 'all',
    platform: 'all',
    status: 'all',
    severity: 'all',
    sentiment: 'all',
    query: '',
  })

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
        .order('collected_at', { ascending: false })
        .limit(200)

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
      toast({ title: 'Updated', description: 'Assignment updated.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
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
      toast({ title: 'Saved', description: 'Response updated.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
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
      toast({ title: 'Reanalyzed', description: 'AI analysis has been re-run.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    }
  })

  const testSlackMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('guest-review-notifier', { body: { test_mode: true } })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Slack test sent', description: 'Check your Slack channel for the test message.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
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
      toast({ title: 'Sync started', description: 'Collector triggered for active review sources.' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' })
    },
  })

  const reviews = reviewsQuery.data ?? []
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
    return Array.from(new Set(reviews.map((row) => row.platform))).sort()
  }, [reviews])

  const statuses = useMemo(() => {
    return Array.from(new Set(reviews.map((row) => row.status))).sort()
  }, [reviews])

  const severities = useMemo(() => {
    return Array.from(new Set(reviews.map((row) => row.severity).filter(Boolean).map(String))).sort()
  }, [reviews])

  const sentiments = useMemo(() => {
    return Array.from(new Set(reviews.map((row) => row.sentiment).filter(Boolean).map(String))).sort()
  }, [reviews])

  const selectedResponse = responseQuery.data
  const selectedReview = selectedReviewQuery.data

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-hotel-navy dark:bg-hotel-gold rounded-full" />
            <div>
              <h1 className="text-4xl font-black tracking-tight text-hotel-navy dark:text-hotel-gold leading-none">
                Guest Review Intelligence
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-2 tracking-tight max-w-xl">
                Multi-platform sentiment monitoring & automated escalation hub for Prime Hotel Properties.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 bg-muted/30 p-1 rounded-xl border border-muted-foreground/10 backdrop-blur-sm">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => testSlackMutation.mutate()} 
            disabled={testSlackMutation.isPending}
            className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest bg-transparent border-muted-foreground/20 hover:bg-primary/5 text-muted-foreground"
          >
            <ShieldAlert className="h-3.5 w-3.5 me-2" />
            Test Slack
          </Button>
          <div className="w-px h-6 bg-muted-foreground/10 self-center" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => reviewsQuery.refetch()} 
            disabled={reviewsQuery.isFetching}
            className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest bg-transparent border-muted-foreground/20 hover:bg-primary/5 text-muted-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 me-2', reviewsQuery.isFetching ? 'animate-spin' : '')} />
            Refresh Hub
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <div className="flex items-center justify-between border-b pb-1 border-muted-foreground/10">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger 
              value="overview" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <LayoutGrid className="h-3.5 w-3.5 me-2" />
              Intelligence Feed
            </TabsTrigger>
            <TabsTrigger 
              value="sources" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Globe className="h-3.5 w-3.5 me-2" />
              Source Management
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="px-0 pb-3 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto font-black text-[11px] uppercase tracking-[0.2em] shadow-none"
            >
              <Settings className="h-3.5 w-3.5 me-2" />
              Control Center
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'outline'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode !== 'grid' && "bg-transparent border-muted-foreground/10")} 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'outline'} 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg", viewMode !== 'list' && "bg-transparent border-muted-foreground/10")} 
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-700">
          {/* Enhanced Filtering Command Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-card/40 p-3 rounded-2xl border border-muted-foreground/5 backdrop-blur-sm">
            <div className="lg:col-span-4 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                value={filters.query} 
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))} 
                placeholder="Search across reviewer, title or context..." 
                className="pl-12 h-12 border-none bg-background/50 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl font-medium"
              />
            </div>
            
            <div className="lg:col-span-8 flex flex-wrap gap-3 justify-end">
              <Select value={filters.propertyId} onValueChange={(v) => setFilters(p => ({ ...p, propertyId: v }))}>
                <SelectTrigger className="w-[180px] h-12 border-none bg-background shadow-none font-bold text-[10px] uppercase tracking-widest rounded-xl">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global Chain</SelectItem>
                  {propertiesQuery.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.severity} onValueChange={(v) => setFilters(p => ({ ...p, severity: v }))}>
                <SelectTrigger className="w-[140px] h-12 border-none bg-background shadow-none font-bold text-[10px] uppercase tracking-widest rounded-xl">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {severities.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.sentiment} onValueChange={(v) => setFilters(p => ({ ...p, sentiment: v }))}>
                <SelectTrigger className="w-[140px] h-12 border-none bg-background shadow-none font-bold text-[10px] uppercase tracking-widest rounded-xl">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  {sentiments.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-xl bg-transparent border-muted-foreground/10 hover:bg-background"
                onClick={() => setFilters({
                  propertyId: 'all', platform: 'all', status: 'all', severity: 'all', sentiment: 'all', query: ''
                })}
              >
                <RefreshCw className="h-4 w-4 opacity-50" />
              </Button>
            </div>
          </div>

          {reviewsQuery.isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 rounded-3xl bg-muted/20 animate-pulse border border-muted-foreground/5" />)}
            </div>
          ) : reviews.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-32 text-center border-none bg-gradient-to-b from-muted/5 to-transparent rounded-[3rem] overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
              <div className="relative">
                <div className="w-24 h-24 bg-card shadow-2xl rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-muted-foreground/10 rotate-3">
                  <MessageSquare className="h-10 w-10 text-primary opacity-40" />
                </div>
                <h3 className="text-2xl font-black text-hotel-navy tracking-tight mb-3">No reviews discovered</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
                  Refine your intelligence criteria or verify that your OTA sources are successfully polling.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-8 rounded-full px-8 h-12 font-bold text-xs uppercase tracking-widest border-muted-foreground/20"
                  onClick={() => setFilters({ propertyId: 'all', platform: 'all', status: 'all', severity: 'all', sentiment: 'all', query: '' })}
                >
                  Reset Parameters
                </Button>
              </div>
            </Card>
          ) : (
            <div className={cn(
              "gap-6",
              viewMode === 'grid' ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
            )}>
              {reviews.map((review) => (
                <ReviewListItem 
                  key={review.id} 
                  review={review} 
                  propertyName={propertyNameById.get(review.property_id) || 'Unknown Property'} 
                  ownerName={ownerNameByReviewId.get(review.id)}
                  onClick={openReview}
                />
              ))}
            </div>
          )}
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
                  <CardTitle className="text-2xl font-black tracking-tight text-hotel-navy">Intelligence Control Center</CardTitle>
                  <CardDescription className="text-sm font-medium">Use operational actions here and open full admin settings when needed.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="grid md:grid-cols-2 gap-8 py-10 border-t border-muted-foreground/5">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Scraping Logic</h4>
                  <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                    Automated scraping intervals are managed at the individual source level. For chain-wide overrides, please contact system administration.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Notification Webhooks</h4>
                  <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                    Slack and Email integrations are currently active. AI-driven critical alerts are dispatched immediately upon detection.
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
                  Sync Reviews Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/reviews/settings')}
                  className="h-11 font-bold text-[11px] uppercase tracking-widest bg-transparent"
                >
                  Open Full Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <DialogContent 
          className="sm:max-w-4xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-950 max-h-[90vh] flex flex-col [&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:opacity-70 hover:[&>button]:opacity-100 [&>button]:z-50 [&>button]:bg-black/20 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:transition-all"
          bodyClassName="p-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedReview?.review_title || 'Guest review details'}
            </DialogTitle>
            <DialogDescription>
              Detailed guest review analysis, assignments, and response management.
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <>
              {/* Premium Header */}
              <div className="bg-hotel-navy p-6 md:p-8 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-hotel-gold">
                  <Zap className="h-32 w-32" />
                </div>
                
                <DialogHeader className="p-0 bg-transparent border-none text-left flex flex-col items-start gap-4 space-y-0 relative z-10 w-full pr-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-[10px] font-bold tracking-widest uppercase px-3 h-6">
                      {selectedReview.platform}
                    </Badge>
                    <Badge className={cn("text-[10px] font-bold tracking-widest uppercase px-3 h-6 border-none shadow-sm", severityBadgeClass(selectedReview.severity))}>
                      {selectedReview.severity || 'NORMAL'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                      {selectedReview.review_title || 'Review Intelligence'}
                    </h2>
                    <p className="text-sm font-medium text-white/80 mt-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedReview.reviewer_name || 'Anonymous Guest'}
                      <span className="opacity-50">•</span>
                      {propertyNameById.get(selectedReview.property_id)}
                    </p>
                  </div>
                </DialogHeader>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white dark:bg-slate-950">
                {/* Executive Summary */}
                <section className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-hotel-gold/10 rounded-lg">
                        <Zap className="h-4 w-4 text-hotel-gold saturate-150" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold">Executive AI Summary</h3>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => reanalyzeMutation.mutate()} 
                      disabled={reanalyzeMutation.isPending}
                      className="h-8 text-[10px] tracking-widest uppercase font-bold text-slate-500 hover:bg-hotel-navy hover:text-white dark:hover:bg-hotel-gold dark:hover:text-hotel-navy transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-2", reanalyzeMutation.isPending && "animate-spin")} /> Re-Analyze
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-medium leading-relaxed italic text-slate-700 dark:text-slate-300 pr-4">
                      "{selectedReview.manager_brief_en || "Intelligence module currently processing this feedback..."}"
                    </p>
                    {selectedReview.summary_ar && (
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                        <p className="text-sm font-arabic font-bold leading-loose text-slate-600 dark:text-slate-400 text-right" dir="rtl">
                          {selectedReview.summary_ar}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <Tabs defaultValue="response" className="w-full">
                  <TabsList className="w-full h-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl grid grid-cols-2 mb-8 border border-slate-200 dark:border-slate-800">
                    <TabsTrigger value="response" className="py-3 rounded-lg font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-hotel-navy dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-hotel-gold data-[state=active]:shadow-sm">
                      <Send className="h-4 w-4 mr-2" />
                      Response Engine
                    </TabsTrigger>
                    <TabsTrigger value="content" className="py-3 rounded-lg font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-hotel-navy dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-hotel-gold data-[state=active]:shadow-sm">
                      <List className="h-4 w-4 mr-2" />
                      Raw Intelligence
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="response" className="space-y-8 animate-in fade-in duration-500 m-0">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold ml-1">Internal Notes & Action Plan</Label>
                      <Textarea 
                        value={responseDraft.internal_notes} 
                        onChange={(e) => setResponseDraft(p => ({ ...p, internal_notes: e.target.value }))} 
                        placeholder="Operational steps taken or team member assigned..."
                        className="min-h-[100px] text-sm resize-y rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-hotel-gold/50 shadow-sm"
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                         <div className="flex items-center justify-between ml-1">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold">Verified English Response</Label>
                           <Badge variant="secondary" className="text-[8px] font-bold h-5 px-2 bg-hotel-gold/10 text-hotel-gold border border-hotel-gold/20 shadow-sm">AI ASSISTED</Badge>
                         </div>
                        <Textarea 
                          value={responseDraft.edited_response_en} 
                          onChange={(e) => setResponseDraft(p => ({ ...p, edited_response_en: e.target.value }))} 
                          placeholder="Craft the official response here..."
                          className="min-h-[160px] text-sm resize-y rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-hotel-gold/50 shadow-sm"
                        />
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between ml-1 flex-row-reverse">
                           <Label className="text-[10px] font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold mt-1" dir="rtl">الرد المعتمد باللغة العربية</Label>
                           <Badge variant="secondary" className="text-[8px] font-bold h-5 px-2 bg-hotel-gold/10 text-hotel-gold border border-hotel-gold/20 shadow-sm whitespace-nowrap">ترجمة ذكية</Badge>
                         </div>
                        <Textarea 
                          value={responseDraft.edited_response_ar} 
                          onChange={(e) => setResponseDraft(p => ({ ...p, edited_response_ar: e.target.value }))} 
                          dir="rtl"
                          placeholder="صغ الرد الرسمي هنا..."
                          className="min-h-[160px] text-sm font-arabic font-bold resize-y rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-hotel-gold/50 text-right shadow-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors duration-500",
                        responseDraft.posted_externally ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-500" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}>
                        {responseDraft.posted_externally ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6 opacity-70" />}
                      </div>
                       <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 text-slate-900 dark:text-slate-100">Status: {responseDraft.posted_externally ? "Published Externally" : "Internal Review"}</p>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Marking as posted updates the global dashboard status.</p>
                      </div>
                      <Switch 
                        checked={responseDraft.posted_externally} 
                        onCheckedChange={(checked) => setResponseDraft(p => ({ ...p, posted_externally: checked }))}
                        className="data-[state=checked]:bg-green-500 scale-110"
                      />
                    </div>

                    <Button 
                      className="w-full h-14 rounded-2xl font-bold text-xs uppercase tracking-widest bg-hotel-navy hover:bg-hotel-navy/90 text-white shadow-xl shadow-hotel-navy/20 dark:bg-hotel-gold dark:text-hotel-navy dark:hover:bg-hotel-gold/90 transition-all active:scale-[0.98]" 
                      onClick={() => saveResponseMutation.mutate()} 
                      disabled={saveResponseMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-3" />
                      Commit Final Response
                    </Button>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-8 animate-in fade-in duration-500 m-0">
                    <section className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-hotel-navy dark:bg-hotel-gold" />
                        Platform Guest Verbatim
                      </h3>
                      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed italic pr-4">
                          "{selectedReview.review_text}"
                        </p>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-hotel-navy dark:text-hotel-gold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        Identified Operational Issues
                      </h3>
                      <div className="space-y-4">
                        {issuesQuery.data?.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 dark:text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50 font-medium text-sm">
                            No distinct operational anomalies detected.
                          </div>
                        ) : (
                          issuesQuery.data?.map(issue => (
                            <div key={issue.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:border-hotel-navy/40 dark:hover:border-hotel-gold/40 transition-colors shadow-sm">
                              <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-white dark:bg-slate-950 text-[9px] font-bold uppercase tracking-widest px-2 h-5 text-hotel-navy dark:text-hotel-gold border-slate-200 dark:border-slate-700 shadow-sm">
                                    {issue.category.replace(/_/g, ' ')}
                                  </Badge>
                                  <Badge className={cn("text-[8px] font-bold uppercase tracking-widest px-2 h-5 border-none shadow-sm", severityBadgeClass(issue.severity))}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{issue.issue_summary_en}</h4>
                                {issue.evidence_text && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic border-l-2 border-slate-300 dark:border-slate-700 pl-3 leading-relaxed">
                                    "{issue.evidence_text}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
          {!selectedReview && (
            <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-sm font-medium text-muted-foreground">
              {selectedReviewId
                ? 'This review is no longer available or you no longer have access to it.'
                : 'Select a review to inspect its details.'}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
