import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Shield, 
  Edit, 
  Search,
  Lock,
  CheckCircle
} from 'lucide-react'
import type { AppRole } from '@/lib/constants'
import type { Permission } from '@/hooks/usePermissions'

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  regional_admin: [
    'training.view', 'training.create', 'training.edit', 'training.delete', 'training.assign', 'training.report',
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.assign_roles',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.approve',
    'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
    'system.view_logs', 'system.manage_settings', 'system.export_data'
  ],
  regional_hr: [
    'training.view', 'training.create', 'training.edit', 'training.assign', 'training.report',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.approve',
    'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
    'system.export_data'
  ],
  property_manager: [
    'training.view', 'training.create', 'training.edit', 'training.assign', 'training.report',
    'users.view', 'users.edit',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.approve',
    'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete'
  ],
  property_hr: [
    'training.view', 'training.assign',
    'users.view',
    'documents.view', 'documents.create', 'documents.edit',
    'announcements.view'
  ],
  department_head: [
    'training.view', 'training.assign',
    'users.view',
    'documents.view',
    'announcements.view'
  ],
  staff: [
    'training.view',
    'documents.view',
    'announcements.view'
  ]
}

export default function RoleManagement() {
  const { properties, departments } = useAuth()
  const { hasPermission } = usePermissions()
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const isRTL = lang === 'ar'

  const t = {
    en: {
      roleManagement: 'Role Management',
      userRoles: 'User Roles',
      permissions: 'Permissions',
      assignRole: 'Assign Role',
      editRole: 'Edit Role',
      removeRole: 'Remove Role',
      search: 'Search',
      user: 'User',
      currentRole: 'Current Role',
      properties: 'Properties',
      departments: 'Departments',
      permissionsByRole: 'Permissions by Role',
      role: 'Role',
      hasAccess: 'Has Access',
      noAccess: 'No Access',
      save: 'Save',
      cancel: 'Cancel'
    },
    ar: {
      roleManagement: 'إدارة الأدوار',
      userRoles: 'أدوار المستخدمين',
      permissions: 'الصلاحيات',
      assignRole: 'تعيين دور',
      editRole: 'تعديل دور',
      removeRole: 'إزالة دور',
      search: 'بحث',
      user: 'المستخدم',
      currentRole: 'الدور الحالي',
      properties: 'الممتلكات',
      departments: 'الأقسام',
      permissionsByRole: 'الصلاحيات حسب الدور',
      role: 'الدور',
      hasAccess: 'لديه وصول',
      noAccess: 'لا يوجد وصول',
      save: 'حفظ',
      cancel: 'إلغاء'
    }
  }[lang]

  // State
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff')

  // Queries
  const { data: users = [] } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(*),
          user_properties(*),
          user_departments(*)
        `)
        .ilike('full_name', `%${searchQuery}%`)
        .limit(50)

      if (error) throw error
      return data
    }
  })

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role })

      if (error) throw error
    },
    onSuccess: () => {
      setShowAssignDialog(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const removeRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const queryClient = useQueryClient()

  const handleAssignRole = () => {
    if (selectedUser && selectedRole) {
      assignRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole })
    }
  }

  const getRoleDisplayName = (role: AppRole) => {
    const roleNames = {
      regional_admin: 'Regional Admin',
      regional_hr: 'Regional HR',
      property_manager: 'Property Manager',
      property_hr: 'Property HR',
      department_head: 'Department Head',
      staff: 'Staff'
    }
    return roleNames[role] || role
  }

  if (!hasPermission('users.view')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access role management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <PageHeader
        title={t.roleManagement}
        description={isRTL ? 'إدارة أدوار المستخدمين والصلاحيات' : 'Manage user roles and permissions'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">{t.userRoles}</TabsTrigger>
          <TabsTrigger value="permissions">{t.permissions}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t.userRoles}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user: any) => (
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

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t.permissionsByRole}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => (
                  <div key={role} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">{getRoleDisplayName(role as AppRole)}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="capitalize">{permission.replace('.', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.assignRole}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.user}</Label>
              <p className="text-sm font-medium">{selectedUser?.full_name || selectedUser?.email}</p>
            </div>
            <div>
              <Label>{t.role}</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_PERMISSIONS).map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleDisplayName(role as AppRole)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleAssignRole} disabled={assignRoleMutation.isPending}>
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
