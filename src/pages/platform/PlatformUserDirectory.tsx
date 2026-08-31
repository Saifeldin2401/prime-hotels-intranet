import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { platformService } from '@/services/platformService'
import {
  Users,
  Search,
  Building2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformUserDirectory() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const { user: currentActor } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [newPlatformRole, setNewPlatformRole] = useState<string>('platform_support')

  const { data: orgs = [] } = useQuery({
    queryKey: ['platform-orgs-filter'],
    queryFn: () => platformService.getOrganizations(),
    staleTime: 1000 * 60 * 5,
  })

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['platform-global-user-directory', search, selectedOrgId, selectedRole],
    queryFn: () =>
      platformService.getPlatformUserDirectory({
        search: search || undefined,
        organizationId: selectedOrgId !== 'all' ? selectedOrgId : undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
        limit: 100,
      }),
    staleTime: 1000 * 15,
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (params: { userId: string; isActive: boolean }) =>
      platformService.toggleUserActiveStatus({
        userId: params.userId,
        isActive: params.isActive,
        actorId: currentActor?.id,
      }),
    onSuccess: (_, vars) => {
      toast({
        title: vars.isActive ? 'User Activated' : 'User Suspended',
        description: 'The user account status has been updated across the platform.',
      })
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: 'Status Update Failed', description: err.message, variant: 'destructive' })
    },
  })

  const assignRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string }) =>
      platformService.assignPlatformRole({ userId: params.userId, role: params.role }),
    onSuccess: () => {
      toast({
        title: 'Platform Role Granted',
        description: 'The user is now an internal platform operator with the selected role.',
      })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: 'Role Assignment Failed', description: err.message, variant: 'destructive' })
    },
  })

  const revokeRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string }) =>
      platformService.revokePlatformRole({ userId: params.userId, role: params.role }),
    onSuccess: () => {
      toast({ title: 'Operator Access Revoked', description: 'The platform role was removed.' })
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['platform-global-user-directory'] })
    },
    onError: (err: any) => {
      toast({ title: 'Revoke Failed', description: err.message, variant: 'destructive' })
    },
  })

  const PLATFORM_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'system_owner', label: 'System Owner (full root control)' },
    { value: 'platform_admin', label: 'Platform Admin (tenants, operators, billing, content)' },
    { value: 'platform_training_manager', label: 'Platform Training Manager' },
    { value: 'platform_knowledge_manager', label: 'Platform Knowledge Manager' },
    { value: 'platform_operations', label: 'Platform Operations' },
    { value: 'platform_support', label: 'Platform Support (assisted tenant access only)' },
    { value: 'platform_instructor', label: 'Platform Instructor' },
  ]

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Global User Directory & Access Governance</h1>
              <p className="text-xs text-muted-foreground">
                Platform-wide multi-tenant user directory, internal platform roles, and tenant memberships.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
            <RefreshCw className="h-3.5 w-3.5 me-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 h-9 text-xs"
          />
        </div>

        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Customer Organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customer Organizations</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="system_owner">Platform · System Owner</SelectItem>
            <SelectItem value="platform_admin">Platform · Admin</SelectItem>
            <SelectItem value="platform_support">Platform · Support</SelectItem>
            <SelectItem value="platform_operations">Platform · Operations</SelectItem>
            <SelectItem value="organization_owner">Tenant · Organization Owner</SelectItem>
            <SelectItem value="organization_admin">Tenant · Organization Admin</SelectItem>
            <SelectItem value="training_manager">Tenant · Training Manager</SelectItem>
            <SelectItem value="hotel_admin">Tenant · Hotel Admin</SelectItem>
            <SelectItem value="department_manager">Tenant · Department Manager</SelectItem>
            <SelectItem value="learner">Tenant · Learner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">User & Contact</TableHead>
              <TableHead className="text-xs font-bold">Primary Tenant / Memberships</TableHead>
              <TableHead className="text-xs font-bold">Platform Role</TableHead>
              <TableHead className="text-xs font-bold">Account Status</TableHead>
              <TableHead className="text-xs font-bold">Created</TableHead>
              <TableHead className="text-xs font-bold text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading global user directory...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  No users found matching query filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
                        {u.full_name?.slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.full_name || 'Anonymous User'}</span>
                          {u.is_platform_user && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-bold">
                              Operator
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {u.primary_organization_name || 'Global SaaS Platform'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.membership_count > 0 ? (
                          <span>{u.membership_count} Active Tenant Memberships</span>
                        ) : (
                          <span className="text-slate-400">Direct Platform Account</span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {u.platform_role ? (
                      <Badge variant="secondary" className="text-[10px] font-bold capitalize">
                        <ShieldCheck className="h-3 w-3 me-1 text-blue-600" />
                        {u.platform_role.replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">None (Tenant User)</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        u.is_active
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-[11px] text-muted-foreground">
                    {format(new Date(u.created_at), 'dd MMM yyyy')}
                  </TableCell>

                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(u)
                          setNewPlatformRole(u.platform_role || 'platform_support')
                        }}
                        className="h-7 text-[11px] px-2"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 me-1" />
                        Role
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            userId: u.id,
                            isActive: !u.is_active,
                          })
                        }
                        className={`h-7 text-[11px] px-2 ${u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <span>Manage Platform Operator Role</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Grant or modify platform-wide operator privileges for <strong>{editingUser.full_name}</strong> ({editingUser.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Platform Operator Role</Label>
                <Select value={newPlatformRole} onValueChange={setNewPlatformRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingUser.platform_role && (
                <div className="text-[11px] text-muted-foreground">
                  Currently holds: <strong className="capitalize">{String(editingUser.platform_role).replace(/_/g, ' ')}</strong>.
                  Granting a new role replaces it.
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Privileged Operator Access
                </div>
                <div className="text-[11px] leading-relaxed">
                  Operators are internal staff — separate from any tenant account. Depending on role they can open audited
                  sessions into customer environments, deploy master content, and view cross-tenant telemetry. Every grant is audited.
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingUser.platform_role && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    revokeRoleMutation.mutate({ userId: editingUser.id, role: editingUser.platform_role })
                  }
                  disabled={revokeRoleMutation.isPending}
                  className="text-rose-600 border-rose-300 hover:bg-rose-50 me-auto"
                >
                  {revokeRoleMutation.isPending ? 'Revoking…' : 'Revoke operator access'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  assignRoleMutation.mutate({ userId: editingUser.id, role: newPlatformRole })
                }
                disabled={assignRoleMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {assignRoleMutation.isPending ? 'Granting…' : 'Grant Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}