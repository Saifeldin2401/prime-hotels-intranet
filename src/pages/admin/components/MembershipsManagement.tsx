import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Check, RefreshCw, MoreVertical, Edit2, Trash2, Power, Search, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TenantRole } from '@/lib/types/tenant'

interface MemberRow {
  id: string
  organization_id: string
  user_id: string
  role: TenantRole
  brand_id: string | null
  department_id: string | null
  is_primary: boolean
  is_active: boolean
  created_at: string
  profile?: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    job_title: string | null
  } | null
  brand?: {
    id: string
    name: string
  } | null
  department?: {
    id: string
    name: string
  } | null
}

interface ProfileOption {
  id: string
  full_name: string
  email: string
  job_title: string | null
}

const ROLE_OPTIONS: { value: TenantRole; label: string }[] = [
  { value: 'organization_owner', label: 'Organization Owner' },
  { value: 'organization_admin', label: 'Organization Admin' },
  { value: 'training_manager', label: 'Training Manager' },
  { value: 'knowledge_manager', label: 'Knowledge Manager' },
  { value: 'brand_admin', label: 'Brand Admin' },
  { value: 'department_manager', label: 'Department Manager' },
  { value: 'instructor', label: 'Instructor / Trainer' },
  { value: 'learner', label: 'Learner / Associate' },
]

export function MembershipsManagement() {
  const { currentOrganization, availableBrands, isOrgAdmin } = useTenant()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])
  const queryClient = useQueryClient()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null)
  const [deletingMember, setDeletingMember] = useState<MemberRow | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  // Form State
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<TenantRole>('learner')
  const [selectedBrandId, setSelectedBrandId] = useState<string>('none')
  const [selectedDeptId, setSelectedDeptId] = useState<string>('none')
  const [isSaving, setIsSaving] = useState(false)

  // Fetch available departments for current org
  const { data: departments = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['membership-depts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      const { data } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
      return data || []
    },
    enabled: !!currentOrganization?.id
  })

  // Fetch profiles for the add user dropdown
  const { data: allProfiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['all-profiles-for-membership'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title')
        .eq('is_active', true)
        .order('full_name')
        .limit(200)

      if (error) {
        console.warn('Error fetching profiles:', error)
        return []
      }
      return data || []
    }
  })

  // Fetch all organization memberships
  const { data: members = [], isLoading, refetch } = useQuery<MemberRow[]>({
    queryKey: ['org-memberships', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []

      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          brand_id,
          department_id,
          is_primary,
          is_active,
          created_at,
          profile:profiles(id, full_name, email, avatar_url, job_title),
          brand:brands(id, name),
          department:departments(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching organization memberships:', error)
        return []
      }

      return (data || []) as unknown as MemberRow[]
    },
    enabled: !!currentOrganization?.id
  })

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (filterRole !== 'all' && m.role !== filterRole) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      const name = m.profile?.full_name?.toLowerCase() || ''
      const email = m.profile?.email?.toLowerCase() || ''
      const jobTitle = m.profile?.job_title?.toLowerCase() || ''
      return name.includes(term) || email.includes(term) || jobTitle.includes(term)
    })
  }, [members, filterRole, searchTerm])

  const handleOpenAdd = () => {
    setSelectedUserId(allProfiles[0]?.id || '')
    setSelectedRole('learner')
    setSelectedBrandId('none')
    setSelectedDeptId('none')
    setIsAddOpen(true)
  }

  const handleOpenEdit = (member: MemberRow) => {
    setEditingMember(member)
    setSelectedRole(member.role)
    setSelectedBrandId(member.brand_id || 'none')
    setSelectedDeptId(member.department_id || 'none')
  }

  const handleSaveMembership = async () => {
    if (!currentOrganization?.id) return
    setIsSaving(true)

    try {
      const brandVal = selectedBrandId === 'none' ? null : selectedBrandId
      const deptVal = selectedDeptId === 'none' ? null : selectedDeptId

      if (editingMember) {
        // Update existing membership
        const { error } = await supabase
          .from('organization_memberships')
          .update({
            role: selectedRole,
            brand_id: brandVal,
            department_id: deptVal,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMember.id)
          .eq('organization_id', currentOrganization.id)

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:membership_updated', 'User membership and role updated.')
        })
      } else {
        // Create new membership
        if (!selectedUserId) {
          throw new Error('Please select a user to add.')
        }

        const { data: existing, error: lookupError } = await supabase
          .from('organization_memberships')
          .select('id')
          .eq('organization_id', currentOrganization.id)
          .eq('user_id', selectedUserId)
          .limit(1)
          .maybeSingle()
        if (lookupError) throw lookupError

        const fields = {
          role: selectedRole,
          brand_id: brandVal,
          department_id: deptVal,
          is_primary: true,
          is_active: true,
        }
        const { error } = existing
          ? await supabase
            .from('organization_memberships')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          : await supabase
            .from('organization_memberships')
            .insert({ organization_id: currentOrganization.id, user_id: selectedUserId, ...fields })

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:membership_created', 'User added to organization.')
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['org-memberships'] })
      await queryClient.invalidateQueries({ queryKey: ['tenant-role-counts'] })
      await refetch()
      setIsAddOpen(false)
      setEditingMember(null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to save membership',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (member: MemberRow) => {
    try {
      const { error } = await supabase
        .from('organization_memberships')
        .update({
          is_active: !member.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id)

      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['org-memberships'] })
      await refetch()
      toast({
        title: t('common:success', 'Success'),
        description: member.is_active
          ? t('admin:membership_deactivated', 'Membership deactivated.')
          : t('admin:membership_activated', 'Membership activated.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteMember = async () => {
    if (!deletingMember) return
    try {
      const { error } = await supabase
        .from('organization_memberships')
        .delete()
        .eq('id', deletingMember.id)

      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['org-memberships'] })
      await queryClient.invalidateQueries({ queryKey: ['tenant-role-counts'] })
      await refetch()
      setDeletingMember(null)
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:membership_deleted', 'User membership removed.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to remove membership',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>{t('admin:user_memberships', 'Organization Members & Roles')}</CardTitle>
          </div>
          <CardDescription>
            {t('admin:user_memberships_desc', 'Who belongs to this organization, their role and their department.')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 me-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common:refresh', 'Refresh')}
          </Button>
          {isOrgAdmin && (
            <Button onClick={handleOpenAdd} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {t('admin:add_member', 'Assign Member')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin:search_members', 'Search by name, email, or title...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 text-sm"
            />
          </div>

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Shield className="h-4 w-4 me-2 text-muted-foreground" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin:all_roles', 'All Roles')}</SelectItem>
              {ROLE_OPTIONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        {/* Members Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin me-2" />
            {t('common:loading', 'Loading members...')}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">{t('admin:no_members_found', 'No organization members found.')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('admin:add_first_member_hint', 'Click Assign Member to add employees to this organization.')}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin:member', 'Member')}</TableHead>
                  <TableHead>{t('admin:role', 'Tenant Role')}</TableHead>
                  <TableHead>{t('admin:dept_scope', 'Department')}</TableHead>
                  <TableHead>{t('admin:status', 'Status')}</TableHead>
                  {isOrgAdmin && <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => {
                  const roleDef = ROLE_OPTIONS.find(r => r.value === m.role)
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border">
                            <AvatarImage src={m.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {m.profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{m.profile?.full_name || 'User'}</span>
                            <span className="text-xs text-muted-foreground">{m.profile?.email || '—'}</span>
                            {m.profile?.job_title && (
                              <span className="text-[10px] text-muted-foreground/80">{m.profile.job_title}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {roleDef?.label || m.role}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {m.department ? (
                          <span className="text-xs font-medium">{m.department.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={m.is_active ? 'default' : 'secondary'}>
                          {m.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                        </Badge>
                      </TableCell>

                      {isOrgAdmin && (
                        <TableCell className="text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(m)}>
                                <Edit2 className="h-4 w-4 me-2" />
                                {t('common:edit', 'Edit Role')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(m)}>
                                <Power className="h-4 w-4 me-2" />
                                {m.is_active ? t('admin:deactivate', 'Deactivate') : t('admin:activate', 'Activate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingMember(m)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('admin:remove_from_org', 'Remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add / Edit Member Dialog */}
        <Dialog open={isAddOpen || !!editingMember} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false)
            setEditingMember(null)
          }
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? t('admin:edit_member_role', 'Edit Member Assignment') : t('admin:assign_new_member', 'Assign Member to Organization')}
              </DialogTitle>
              <DialogDescription>
                {t('admin:member_dialog_desc', 'Set this person’s role and department.')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* User Selection (Only when adding) */}
              {!editingMember && (
                <div className="space-y-2">
                  <Label htmlFor="user-select">{t('admin:select_user', 'Select User')}</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Choose a user profile..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {allProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tenant Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role-select">{t('admin:tenant_role', 'Tenant Role')}</Label>
                <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as TenantRole)}>
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand Scope (Optional) */}
              {availableBrands.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="brand-select">{t('admin:brand_scope', 'Brand Scope (Optional)')}</Label>
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger id="brand-select">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin:all_brands', 'All Brands')}</SelectItem>
                      {availableBrands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Department Scope (Optional) */}
              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="dept-select">{t('admin:department', 'Department Scope (Optional)')}</Label>
                  <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                    <SelectTrigger id="dept-select">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin:all_departments', 'All Departments')}</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false)
                setEditingMember(null)
              }}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSaveMembership} disabled={isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {t('admin:save_member', 'Save Assignment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin:confirm_remove_member', 'Remove Member from Organization?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin:confirm_remove_member_desc', 'This will remove the user from this organization and revoke their tenant role. Their global user profile remains active.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common:delete', 'Remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
