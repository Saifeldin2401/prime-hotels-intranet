import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { GuestReviewSource, GuestReviewPlatform } from "@/lib/types"
import { Globe, Plus, Trash2, AlertCircle, CheckCircle2, Cloud, ExternalLink, RefreshCw, Activity, Zap, ShieldCheck, Filter, Play, Clock, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID, isGuestReviewEligiblePropertyId } from "@/lib/reviewsScope"

// Format time ago
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Format next poll time
function formatNextPoll(dateString: string | null): string {
  if (!dateString) return 'Not scheduled'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Overdue'
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  return date.toLocaleDateString()
}

export function OTASourceManager() {
  const { t } = useTranslation('reviews')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  // Form State
  const [newSource, setNewSource] = useState({
    property_id: "",
    platform: "booking" as GuestReviewPlatform,
    source_name: "",
    source_url: "",
    poll_frequency_hours: 6
  })

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("is_active", true)
      if (error) throw error
      return (data ?? []).filter((row) => isGuestReviewEligiblePropertyId(row.id))
    }
  })

  const { data: sources, isLoading, error: sourcesError } = useQuery({
    queryKey: ["guest-review-sources", selectedPropertyId],
    queryFn: async () => {
      let query = supabase
        .from("guest_review_sources")
        .select("*")
        .eq("is_active", true)
        .neq("property_id", GUEST_REVIEW_HEAD_OFFICE_PROPERTY_ID)
      if (selectedPropertyId !== "all") {
        query = query.eq("property_id", selectedPropertyId)
      }
      const { data, error } = await query.order("created_at", { ascending: false })
      if (error) throw error
      return data as GuestReviewSource[]
    }
  })

  // Collect Now Mutation for individual source
  const collectNowMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke('guest-review-collector', {
        body: { 
          source_id: sourceId,
          run_mode: 'manual',
          max_sources: 1
        }
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const totalNew = data?.total_new_reviews || 0
      toast({ 
        title: totalNew > 0 ? `Collected ${totalNew} new reviews` : 'No new reviews found',
        description: 'Collection completed successfully'
      })
      queryClient.invalidateQueries({ queryKey: ["guest-review-sources"] })
      queryClient.invalidateQueries({ queryKey: ["guest-reviews"] })
    },
    onError: (error: any) => {
      toast({ 
        title: 'Collection failed', 
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Sync All Mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('guest-review-collector', {
        body: { run_mode: 'backfill' }
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ 
        title: t('notifications.syncStarted'), 
        description: t('notifications.collectorTriggered')
      })
    },
    onError: (error: any) => {
      toast({ 
        title: t('notifications.syncFailed'), 
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const addSourceMutation = useMutation({
    mutationFn: async (source: typeof newSource) => {
      const { error } = await supabase.from("guest_review_sources").insert({
        ...source,
        health_status: 'healthy',
        is_active: true,
        polling_enabled: true
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-review-sources"] })
      toast({ title: t('notifications.sourceAdded'), description: t('notifications.otaSourceAdded') })
      setIsAddDialogOpen(false)
      setNewSource({
        property_id: "",
        platform: "booking",
        source_name: "",
        source_url: "",
        poll_frequency_hours: 6
      })
    },
    onError: (error: any) => {
      toast({ 
        title: t('notifications.error'), 
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const togglePollingMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("guest_review_sources")
        .update({ polling_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-review-sources"] })
      toast({ title: t('notifications.updated'), description: t('notifications.pollingUpdated') })
    }
  })

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guest_review_sources").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-review-sources"] })
      toast({ title: t('notifications.deleted'), description: t('notifications.sourceRemoved') })
    }
  })

  const getHealthIcon = (status: string) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "degraded": return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "disabled": return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Cloud className="h-4 w-4 text-muted-foreground" />
    }
  }

  const visiblePropertyCount = new Set((sources ?? []).map((s) => s.property_id)).size

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-hotel-navy text-white rounded-xl shadow-inner shadow-white/10 ring-1 ring-white/20">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-hotel-navy dark:text-hotel-gold leading-none">
                {t('sources.title')}
              </h2>
              <p className="text-sm font-medium text-muted-foreground mt-1 tracking-tight">
                {t('sources.subtitle')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-muted-foreground/10 backdrop-blur-sm">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[200px] h-10 border-none bg-background shadow-none font-bold text-xs uppercase tracking-widest">
              <Filter className="h-3.5 w-3.5 me-2 opacity-50" />
              <SelectValue placeholder={t('sources.allProperties')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('sources.globalChain')}</SelectItem>
              {properties?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="h-6 w-px bg-muted-foreground/20 mx-1 hidden sm:block" />
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => syncAllMutation.mutate()} 
            disabled={syncAllMutation.isPending}
            className="h-10 px-4 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-primary/5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 me-2", syncAllMutation.isPending && "animate-spin")} />
            {t('sources.syncAll')}
          </Button>

          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            className="h-10 px-6 font-bold text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(var(--primary),0.2)] hover:shadow-primary/30 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 me-2" />
            {t('sources.addSource')}
          </Button>
        </div>
      </div>

      {/* Glassmorphic Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t('sources.totalSources'), value: sources?.length || 0, icon: Activity, detail: t('sources.acrossProperties', { count: visiblePropertyCount }), color: "text-foreground" },
          { label: t('sources.activePolling'), value: sources?.filter(s => s.polling_enabled).length || 0, icon: Zap, detail: t('sources.realTimeScraping'), color: "text-emerald-600" },
          { label: t('sources.sourceHealth'), value: `${Math.round(((sources?.filter(s => s.health_status === 'healthy').length || 0) / (sources?.length || 1)) * 100)}%`, icon: ShieldCheck, detail: t('sources.operationalEfficiency'), color: "text-primary" },
          { label: t('sources.issuesFound'), value: sources?.filter(s => s.health_status !== 'healthy').length || 0, icon: AlertCircle, detail: t('sources.connectionChallenges'), color: "text-orange-600" }
        ].map((metric, i) => (
          <Card key={i} className="group relative border-none bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-xl shadow-none overflow-hidden transition-all duration-500 hover:translate-y-[-2px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-muted/50 via-primary/10 to-transparent" />
            <CardContent className="pt-8 pb-6 px-6 relative">
              <metric.icon className={cn("absolute top-6 right-6 h-10 w-10 opacity-5 group-hover:opacity-10 transition-opacity duration-500", metric.color)} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-2 opacity-80">{metric.label}</p>
              <h3 className={cn("text-4xl font-black tracking-tight leading-none mb-2", metric.color)}>{metric.value}</h3>
              <p className="text-[10px] font-bold text-muted-foreground/60">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-muted/20 animate-pulse border border-muted-foreground/5" />
          ))}
        </div>
      ) : sourcesError ? (
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">{t('sources.unableToLoad')}</CardTitle>
            <CardDescription className="text-destructive/90">
              {t('sources.permissionsError')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/90">
              {sourcesError instanceof Error ? sourcesError.message : String(sourcesError)}
            </p>
          </CardContent>
        </Card>
      ) : sources?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-24 text-center border-none bg-gradient-to-b from-muted/5 to-transparent rounded-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50" />
          <div className="relative">
            <div className="w-24 h-24 bg-card shadow-2xl rounded-3xl flex items-center justify-center mb-8 mx-auto ring-1 ring-muted-foreground/10 rotate-3 group hover:rotate-0 transition-transform duration-500">
              <Globe className="h-10 w-10 text-primary opacity-40" />
            </div>
            <h3 className="font-black text-2xl text-hotel-navy tracking-tight mb-3">{t('sources.noActiveSources')}</h3>
            <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto leading-relaxed font-medium">
              {t('sources.initializeNetwork')}
            </p>
            <div className="flex items-center justify-center gap-4 mt-10">
               <Button variant="outline" size="lg" onClick={() => setIsAddDialogOpen(true)} className="rounded-full px-8 h-12 font-bold text-xs uppercase tracking-widest border-muted-foreground/20 hover:bg-background">
                {t('sources.manualAdd')}
              </Button>
              <Button onClick={() => syncAllMutation.mutate()} size="lg" className="rounded-full px-8 h-12 font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                <Zap className="h-4 w-4 me-2 fill-current" />
                {t('sources.bulkSyncLinks')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sources?.map(source => {
            const property = properties?.find(p => p.id === source.property_id);
            return (
              <Card 
                key={source.id} 
                className="overflow-hidden border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-500 group flex flex-col bg-card"
              >
                <div 
                  className="h-1.5 w-full opacity-80" 
                  style={{ 
                    backgroundColor: source.platform === 'booking' ? '#003580' : 
                                   source.platform === 'expedia' ? '#00355f' : 
                                   source.platform === 'tripadvisor' ? '#34e0a1' : 
                                   source.platform === 'google' ? '#4285F4' : '#6366f1' 
                  }}
                />
                <CardHeader className="pb-4 pt-6 px-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1 px-2.5 rounded bg-muted/40 border border-muted-foreground/10">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-foreground/70">
                          {source.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/20">
                        {getHealthIcon(source.health_status)}
                        <span className={cn("text-[8px] font-black uppercase tracking-widest", 
                          source.health_status === 'healthy' ? "text-green-600" : 
                          source.health_status === 'degraded' ? "text-orange-500" :
                          source.health_status === 'disabled' ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {source.health_status === 'healthy' ? 'Healthy' :
                           source.health_status === 'degraded' ? 'Degraded' :
                           source.health_status === 'disabled' ? 'Disabled' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <Switch 
                      checked={source.polling_enabled} 
                      className="data-[state=checked]:bg-primary scale-90"
                      onCheckedChange={(checked) => togglePollingMutation.mutate({ id: source.id, enabled: checked })}
                    />
                  </div>
                  <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors leading-tight mb-1">
                    {source.source_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                    {property?.name || t('sources.chainHeadquarter')}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6 pb-6 mt-auto">
                  {/* REAL Monitoring Stats */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-muted-foreground/5">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.1em] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last Check
                      </span>
                      <p className={cn("text-xs font-black", 
                        !source.last_success_at ? "text-red-500" :
                        new Date().getTime() - new Date(source.last_success_at).getTime() > 24 * 60 * 60 * 1000 ? "text-orange-500" : "text-green-600"
                      )}>
                        {formatTimeAgo(source.last_success_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.1em] flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Errors
                      </span>
                      <p className={cn("text-xs font-black",
                        (source.consecutive_failures || 0) > 2 ? "text-red-500" :
                        (source.consecutive_failures || 0) > 0 ? "text-orange-500" : "text-green-600"
                      )}>
                        {source.consecutive_failures || 0} failures
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.1em]">Next Check</span>
                      <p className="text-xs font-black text-foreground/80">
                        {formatNextPoll(source.next_poll_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-[0.1em]">Interval</span>
                      <p className="text-xs font-black text-foreground/80">
                        {source.poll_frequency_hours}H
                      </p>
                    </div>
                  </div>
                  
                  {/* COLLECT NOW Button */}
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => collectNowMutation.mutate(source.id)}
                    disabled={collectNowMutation.isPending && collectNowMutation.variables === source.id}
                    className="w-full h-10 font-bold text-[10px] uppercase tracking-widest bg-hotel-navy hover:bg-hotel-navy/90 text-white"
                  >
                    {collectNowMutation.isPending && collectNowMutation.variables === source.id ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 me-2 animate-spin" />
                        Collecting...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 me-2" />
                        Collect Now
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest px-2 bg-transparent border-primary/20 hover:bg-primary/5 hover:text-primary rounded-lg" asChild>
                      <a href={source.source_url} target="_blank" rel="noreferrer">
                        <Globe className="h-3 w-3 me-1.5" />
                        View
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-muted-foreground/10 rounded-full"
                      onClick={() => {
                        if(confirm(t('sources.confirmDisconnect'))) {
                          deleteSourceMutation.mutate(source.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modern Add Source Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden">
          <div className="bg-hotel-navy p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Plus className="h-24 w-24" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight mb-2">{t('sources.connectChannel')}</DialogTitle>
            <DialogDescription className="text-white/60 font-medium">
              {t('sources.integrateOTA')}
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6 bg-card">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t('sources.internalName')}</Label>
                <Input 
                  value={newSource.source_name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, source_name: e.target.value }))}
                  placeholder="e.g. Booking.com Primary"
                  className="h-11 font-medium bg-muted/30 border-none focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t('filters.platform')}</Label>
                <Select 
                  value={newSource.platform} 
                  onValueChange={(val: GuestReviewPlatform) => setNewSource(prev => ({ ...prev, platform: val }))}
                >
                  <SelectTrigger className="h-11 bg-muted/30 border-none font-medium">
                    <SelectValue placeholder={t('filters.platform')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking">Booking.com</SelectItem>
                    <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                    <SelectItem value="google">Google Maps</SelectItem>
                    <SelectItem value="expedia">Expedia</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="hotels_com">Hotels.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t('sources.associateProperty')}</Label>
              <Select 
                value={newSource.property_id} 
                onValueChange={(val) => setNewSource(prev => ({ ...prev, property_id: val }))}
              >
                <SelectTrigger className="h-11 bg-muted/30 border-none font-medium">
                  <SelectValue placeholder={t('sources.selectProperty')} />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">{t('sources.channelListingURL')}</Label>
              <Input 
                value={newSource.source_url}
                onChange={(e) => setNewSource(prev => ({ ...prev, source_url: e.target.value }))}
                placeholder="https://www.booking.com/hotel/..."
                className="h-11 font-medium bg-muted/30 border-none focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('sources.scrapingInterval')}</Label>
                <span className="text-[10px] font-bold text-primary">{newSource.poll_frequency_hours}H</span>
              </div>
              <Input 
                type="number"
                min={1}
                max={48}
                value={newSource.poll_frequency_hours}
                onChange={(e) => setNewSource(prev => ({ ...prev, poll_frequency_hours: parseInt(e.target.value) || 6 }))}
                className="h-11 font-medium bg-muted/30 border-none focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-12 font-bold uppercase text-[10px] tracking-widest bg-transparent border-muted-foreground/20">
                {t('sources.cancel')}
              </Button>
              <Button 
                disabled={!newSource.property_id || !newSource.source_url || !newSource.source_name}
                onClick={() => addSourceMutation.mutate(newSource)}
                className="flex-1 h-12 font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
              >
                {t('sources.authorizeSource')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
