import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useTenant } from '@/contexts/TenantContext'
import { platformService } from '@/services/platformService'
import { ShieldAlert, LogOut, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function PlatformAdminBanner() {
  const { currentOrganization } = useTenant()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: activeSession } = useQuery({
    queryKey: ['active-platform-operator-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_access_sessions')
        .select('*')
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return null
      return data
    },
    refetchInterval: 15000,
  })

  const exitSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await platformService.endPlatformAccessSession(sessionId)
    },
    onSuccess: () => {
      toast({ title: 'Exited Customer Environment', description: 'Returned to Platform Control Center.' })
      queryClient.invalidateQueries({ queryKey: ['active-platform-operator-session'] })
      navigate('/platform')
    },
    onError: (err: any) => {
      toast({ title: 'Exit Error', description: err.message, variant: 'destructive' })
    },
  })

  if (!activeSession) return null

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg border-b border-amber-700/30 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-black/20 text-white">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <span>Platform Administration Mode:</span>
        <span className="bg-black/15 px-2 py-0.5 rounded text-black font-extrabold flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {currentOrganization?.name || 'Customer Organization'}
        </span>
        <span className="hidden sm:inline text-[11px] font-normal opacity-90">
          (Acting as {activeSession.acting_role || 'Organization Admin'} • Reason: {activeSession.access_reason})
        </span>
      </div>

      <Button
        size="sm"
        onClick={() => exitSessionMutation.mutate(activeSession.id)}
        disabled={exitSessionMutation.isPending}
        className="h-7 text-[11px] bg-slate-950 hover:bg-slate-900 text-white font-bold px-3 border border-black/30"
      >
        <LogOut className="h-3 w-3 me-1" />
        Exit to Platform Control Center
      </Button>
    </div>
  )
}