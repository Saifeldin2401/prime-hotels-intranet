import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import {
  Settings,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react'

export default function PlatformSettings() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['platform-system-settings'],
    queryFn: () => platformService.getSystemSettings(),
    staleTime: 1000 * 60,
  })

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Configuration & Feature Flags</h1>
            <p className="text-xs text-muted-foreground">
              Production runtime governance, AI provider routing defaults, and tenant isolation parameters.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          Refresh Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>AI Multi-Provider Gateway & Fallbacks</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Edge gateway failover cascades between Gemini, Groq, and Cloudflare.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Automatic Provider Cascading</div>
                <div className="text-[10px] text-muted-foreground">Fallback to Groq/Cloudflare upon 429 rate limit</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Enabled
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Bilingual Arabic Localization Shield</div>
                <div className="text-[10px] text-muted-foreground">Enforce RTL syntax and dual language blueprints</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Enforced
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Multi-Tenant Security & Operator Access</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Row-Level Security boundaries and operator impersonation parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Platform Assisted Access TTL</div>
                <div className="text-[10px] text-muted-foreground">Maximum duration for cross-tenant operator sessions</div>
              </div>
              <Badge variant="secondary" className="font-mono text-[11px]">60 Minutes</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <div className="font-semibold">Mandatory Operator Audit Reason</div>
                <div className="text-[10px] text-muted-foreground">Require formal reason logging before tenant entry</div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30 text-[10px]">
                Mandatory
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}