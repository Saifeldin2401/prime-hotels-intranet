import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useAccountContext } from '@/hooks/useAccountContext'
import { platformService } from '@/services/platformService'
import { Settings, ShieldCheck, Flag, Clock, RefreshCw, Save, Bell } from 'lucide-react'

function SettingRow({
  s,
  onSave,
  disabled,
}: {
  s: { key: string; value: unknown; category: string; description?: string }
  onSave: (key: string, value: unknown) => void
  disabled: boolean
}) {
  const isBool = typeof s.value === 'boolean'
  const isScalar = isBool || typeof s.value === 'number' || typeof s.value === 'string'
  const [draft, setDraft] = useState(() =>
    isScalar ? String(s.value) : JSON.stringify(s.value, null, 2),
  )
  const dirty = isBool ? false : draft !== (isScalar ? String(s.value) : JSON.stringify(s.value, null, 2))

  const commit = () => {
    if (isBool) return
    let parsed: unknown = draft
    if (typeof s.value === 'number') parsed = Number(draft)
    else if (!isScalar) {
      try { parsed = JSON.parse(draft) } catch { return }
    }
    onSave(s.key, parsed)
  }

  return (
    <div className="p-3 rounded-xl border space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{s.key}</div>
          {s.description && <div className="text-[10px] text-muted-foreground">{s.description}</div>}
        </div>
        {isBool ? (
          <Switch checked={!!s.value} disabled={disabled} onCheckedChange={(v) => onSave(s.key, v)} />
        ) : dirty ? (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={disabled} onClick={commit}>
            <Save className="h-3 w-3 me-1" /> Save
          </Button>
        ) : null}
      </div>
      {!isBool && (
        isScalar ? (
          <Input value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)} className="h-8 text-xs font-mono" />
        ) : (
          <Textarea value={draft} disabled={disabled} onChange={(e) => setDraft(e.target.value)} rows={4} className="text-[11px] font-mono" />
        )
      )}
    </div>
  )
}

export default function PlatformSettings() {
  const { toast } = useToast()
  const { user } = useAuth()
  const account = useAccountContext()
  const queryClient = useQueryClient()
  const canConfig = account.can('config.manage')
  const canSessionCfg = account.hasPlatformRole('system_owner')

  const { data: settings = [], isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['platform-system-settings'],
    queryFn: () => platformService.getSystemSettings(),
    staleTime: 1000 * 60,
  })

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['platform-feature-matrix'],
    queryFn: () => platformService.getFeatureMatrix(),
    staleTime: 1000 * 60,
  })

  const { data: cfg, refetch: refetchCfg } = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => platformService.getPlatformConfig(),
    staleTime: 1000 * 60,
  })

  const settingMutation = useMutation({
    mutationFn: (p: { key: string; value: unknown }) =>
      platformService.updateSystemSetting({ key: p.key, value: p.value, actorId: user?.id }),
    onSuccess: () => {
      toast({ title: 'Setting saved' })
      queryClient.invalidateQueries({ queryKey: ['platform-system-settings'] })
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  })

  const flagMutation = useMutation({
    mutationFn: (p: { key: string; enabled: boolean }) => platformService.setFeatureFlagDefault(p.key, p.enabled),
    onSuccess: () => {
      toast({ title: 'Feature default updated' })
      queryClient.invalidateQueries({ queryKey: ['platform-feature-matrix'] })
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  })

  const cfgMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => platformService.updatePlatformConfig(patch as any, user?.id),
    onSuccess: () => { toast({ title: 'Session policy updated' }); refetchCfg() },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  })

  const { data: notificationPolicies = [], isLoading: notifLoading, refetch: refetchNotifs } = useQuery({
    queryKey: ['platform-notification-policies'],
    queryFn: () => platformService.getNotificationPolicies(),
    staleTime: 1000 * 60,
  })

  const notifPolicyMutation = useMutation({
    mutationFn: (p: { key: string; patch: Parameters<typeof platformService.updateNotificationPolicy>[1] }) =>
      platformService.updateNotificationPolicy(p.key, p.patch),
    onSuccess: () => {
      toast({ title: 'Notification policy updated' })
      queryClient.invalidateQueries({ queryKey: ['platform-notification-policies'] })
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  })

  const grouped = useMemo(() => {
    const m = new Map<string, typeof settings>()
    for (const s of settings) {
      const list = m.get(s.category) || []
      list.push(s)
      m.set(s.category, list)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [settings])

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><Settings className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-bold">Platform Configuration</h1>
            <p className="text-xs text-muted-foreground">Feature flags, global settings, notification policies, and operator session policy.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchSettings(); refetchCfg(); refetchNotifs() }} className="text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5 me-1.5" /> Refresh
        </Button>
      </div>

      {!canConfig && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200">
          Your platform role is read-only for configuration. Editing requires the <strong>config.manage</strong> permission.
        </div>
      )}

      {/* Feature flags */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Flag className="h-4 w-4 text-emerald-600" /> Feature Flags (platform defaults)</CardTitle>
          <CardDescription className="text-xs">
            The default availability of each capability. Per-tenant overrides and plan gating are managed per organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {matrixLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(matrix?.flags || []).map((f) => (
                <div key={f.key} className="p-3 rounded-xl border flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {f.label}
                      {f.min_plan_code && (
                        <Badge variant="outline" className="text-[9px] capitalize">{f.min_plan_code}+</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{f.description}</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">{f.key}</div>
                  </div>
                  <Switch
                    checked={f.default_enabled}
                    disabled={!canConfig || flagMutation.isPending}
                    onCheckedChange={(v) => flagMutation.mutate({ key: f.key, enabled: v })}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification policies */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Bell className="h-4 w-4 text-amber-600" /> Platform Notification Policies</CardTitle>
          <CardDescription className="text-xs">
            Platform defaults and tenant override permissions for automated notifications and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          {notifLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notificationPolicies.map((np) => (
                <div key={np.key} className="p-3.5 rounded-xl border flex items-start justify-between gap-3 bg-card/60">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {np.name}
                      <Badge variant="outline" className="text-[9px] capitalize">{np.category}</Badge>
                    </div>
                    {np.description && <div className="text-[10px] text-muted-foreground leading-snug">{np.description}</div>}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <span className="font-mono">{np.key}</span>
                      <span>•</span>
                      <span>{np.allow_tenant_override ? 'Tenant overrides allowed' : 'Locked by platform'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Switch
                      checked={np.default_enabled}
                      disabled={!canConfig || notifPolicyMutation.isPending}
                      onCheckedChange={(v) => notifPolicyMutation.mutate({ key: np.key, patch: { default_enabled: v } })}
                    />
                    <span className="text-[9px] text-muted-foreground">{np.default_enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operator session policy */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-blue-600" /> Operator Assisted-Access Policy</CardTitle>
          <CardDescription className="text-xs">
            Server-enforced parameters for platform operators entering customer environments. {canSessionCfg ? '' : 'Editing requires the System Owner role.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Default session TTL (minutes)</Label>
            <Input type="number" min={5} max={480} defaultValue={cfg?.default_session_ttl_minutes ?? 30}
              disabled={!canSessionCfg}
              onBlur={(e) => { const v = Number(e.target.value); if (v && v !== cfg?.default_session_ttl_minutes) cfgMutation.mutate({ default_session_ttl_minutes: v }) }}
              className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Maximum session TTL (minutes)</Label>
            <Input type="number" min={5} max={1440} defaultValue={cfg?.max_session_ttl_minutes ?? 480}
              disabled={!canSessionCfg}
              onBlur={(e) => { const v = Number(e.target.value); if (v && v !== cfg?.max_session_ttl_minutes) cfgMutation.mutate({ max_session_ttl_minutes: v }) }}
              className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Minimum access-reason length</Label>
            <Input type="number" min={0} max={500} defaultValue={cfg?.min_session_reason_length ?? 10}
              disabled={!canSessionCfg}
              onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== cfg?.min_session_reason_length) cfgMutation.mutate({ min_session_reason_length: v }) }}
              className="h-8" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border">
            <div>
              <div className="font-semibold text-[11px]">Require a written access reason</div>
              <div className="text-[10px] text-muted-foreground">Block tenant entry without a logged justification</div>
            </div>
            <Switch checked={!!cfg?.require_session_reason} disabled={!canSessionCfg}
              onCheckedChange={(v) => cfgMutation.mutate({ require_session_reason: v })} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 p-3 rounded-xl bg-slate-500/5 border">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              Legacy role fallback (super_admin / corporate_admin auto-operator):{' '}
              <strong>{cfg?.legacy_role_fallback_enabled ? 'ENABLED' : 'disabled'}</strong>
              {cfg?.legacy_role_fallback_enabled && ' — disable once every operator is provisioned in the directory.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Global system settings */}
      <Card className="border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2"><Settings className="h-4 w-4 text-slate-600" /> Global System Settings</CardTitle>
          <CardDescription className="text-xs">Platform-wide defaults from <span className="font-mono">system_settings</span>. (Per-tenant overrides land in a later phase.)</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2 space-y-5">
          {settingsLoading ? (
            <div className="py-6 text-center text-xs text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : grouped.map(([category, items]) => (
            <div key={category}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{category}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((s) => (
                  <SettingRow
                    key={s.key}
                    s={s}
                    disabled={!canConfig || settingMutation.isPending}
                    onSave={(key, value) => settingMutation.mutate({ key, value })}
                  />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
