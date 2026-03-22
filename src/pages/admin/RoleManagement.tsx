import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermissions } from '@/hooks/usePermissions'
import { ROLES, ROLE_HIERARCHY, type AppRole } from '@/lib/constants'
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, formatPermissionLabel } from '@/lib/permissionCatalog'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    CheckCircle,
    Columns,
    Edit,
    Loader2,
    Lock,
    Search,
    Shield,
    Users,
    XCircle
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Fallback hardcoded permissions for role assignment dialog

interface RolePermissionRow {
  id: string
  role: string
  permission: string
  granted: boolean
}

export default function RoleManagement() {
  const { hasPermission } = usePermissions()
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff')
  const [_viewMode, _setViewMode] = useState<'list' | 'comparison'>('list')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch role permissions from DB
  const { data: dbPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('permission')
      if (error) throw error
      return data as RolePermissionRow[]
    },
  })

  // Build permission matrix from DB data
  const permissionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, boolean>> = {}
    for (const role of ROLE_HIERARCHY) {
      matrix[role] = {}
      for (const permission of ALL_PERMISSIONS) {
        const dbEntry = dbPermissions.find(p => p.role === role && p.permission === permission)
        matrix[role][permission] = dbEntry?.granted ?? false
      }
    }
    return matrix
  }, [dbPermissions])

  // Toggle a permission
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ role, permission, granted }: { role: string; permission: string; granted: boolean }) => {
      const existing = dbPermissions.find(p => p.role === role && p.permission === permission)
      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ granted, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role, permission, granted })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update permission',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // User queries
  const { data: users = [] } = useQuery({
    queryKey: ['users', debouncedSearchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(*),
          user_properties(*),
          user_departments(*)
        `)
        .ilike('full_name', `%${debouncedSearchQuery}%`)
        .limit(50)

      if (error) throw error
      return data
    },
    enabled: hasPermission('users.view')
  })

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existingRoles, error: existingRolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      if (existingRolesError) throw existingRolesError

      const { error: upsertError } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role },
          { onConflict: 'user_id,role', ignoreDuplicates: true }
        )
      if (upsertError) throw upsertError

      const staleRoles = (existingRoles || [])
        .map((r) => r.role)
        .filter((existingRole): existingRole is string => !!existingRole && existingRole !== role)
      if (staleRoles.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', staleRoles)
        if (deleteError) throw deleteError
      }
    },
    onSuccess: () => {
      setShowAssignDialog(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleAssignRole = () => {
    if (selectedUser && selectedRole) {
      assignRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole })
    }
  }

  const getRoleDisplayName = (role: AppRole) => {
    return t(`common:roles.${role}`, { defaultValue: ROLES[role]?.label || role })
  }


  if (!hasPermission('users.view')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('roles.access_denied')}</h2>
          <p className="text-muted-foreground">{t('roles.access_denied_desc')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('roles.title')}
        description={t('roles.description')}
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">{t('roles.user_roles')}</TabsTrigger>
          <TabsTrigger value="permissions">{t('roles.permissions')}</TabsTrigger>
          <TabsTrigger value="comparison">
            <Columns className="w-4 h-4 me-1" />
            Comparison
          </TabsTrigger>
        </TabsList>

        {/* Users Tab - existing functionality */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('roles.user_roles')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('roles.search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 rtl:pl-3 rtl:pr-10"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getRoleDisplayName(user.user_roles?.[0]?.role || 'staff')}
                      </Badge>
                      {hasPermission('users.assign_roles') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setSelectedRole(user.user_roles?.[0]?.role || 'staff')
                            setShowAssignDialog(true)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab - Dynamic from DB */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {t('roles.permissions_by_role')}
                </CardTitle>
                {permissionsLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ROLE_HIERARCHY.map((role) => (
                  <div key={role} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{getRoleDisplayName(role)}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          Level {ROLES[role]?.level}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Object.values(permissionMatrix[role] || {}).filter(Boolean).length} / {ALL_PERMISSIONS.length}
                      </span>
                    </div>

                    {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                      <div key={category} className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          {category}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {permissions.map((permission) => {
                            const isGranted = permissionMatrix[role]?.[permission] ?? false
                            return (
                              <div key={permission} className="flex items-center justify-between gap-2 text-sm p-1.5 rounded hover:bg-muted/50">
                                <span className="capitalize text-xs">{formatPermissionLabel(permission)}</span>
                                {hasPermission('users.assign_roles') ? (
                                  <Switch
                                    checked={isGranted}
                                    onCheckedChange={(checked) => {
                                      togglePermissionMutation.mutate({ role, permission, granted: checked })
                                    }}
                                    className="scale-75"
                                  />
                                ) : (
                                  isGranted ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                  )
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab - Side-by-side role comparison */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Columns className="w-5 h-5" />
                Role Comparison Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start p-2 font-medium text-muted-foreground sticky start-0 bg-background min-w-[150px]">
                        Permission
                      </th>
                      {ROLE_HIERARCHY.map((role) => (
                        <th key={role} className="p-2 text-center font-medium min-w-[90px]">
                          <div className="truncate">{ROLES[role]?.label.split(' ')[0]}</div>
                          <div className="text-[10px] text-muted-foreground font-normal truncate">
                            {ROLES[role]?.label.split(' ').slice(1).join(' ')}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                      <>
                        <tr key={`cat-${category}`}>
                          <td
                            colSpan={ROLE_HIERARCHY.length + 1}
                            className="p-2 pt-4 font-medium text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30"
                          >
                            {category}
                          </td>
                        </tr>
                        {permissions.map((permission) => (
                          <tr key={permission} className="border-b border-muted/50 hover:bg-muted/20">
                            <td className="p-2 capitalize sticky start-0 bg-background">
                              {formatPermissionLabel(permission)}
                            </td>
                            {ROLE_HIERARCHY.map((role) => {
                              const isGranted = permissionMatrix[role]?.[permission] ?? false
                              return (
                                <td key={`${role}-${permission}`} className="p-2 text-center">
                                  {isGranted ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-200 mx-auto" />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.assign_role')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('roles.user')}</Label>
              <p className="text-sm font-medium">{selectedUser?.full_name || selectedUser?.email}</p>
            </div>
            <div>
              <Label>{t('roles.role')}</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_HIERARCHY.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                {t('roles.cancel')}
              </Button>
              <Button onClick={handleAssignRole} disabled={assignRoleMutation.isPending}>
                {t('roles.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

