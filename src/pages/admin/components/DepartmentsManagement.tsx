import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Briefcase, Plus, Building2, Check, RefreshCw, MoreVertical, Edit2, Trash2, Power, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface DepartmentItem {
  id: string
  organization_id?: string
  hotel_id?: string | null
  property_id?: string | null
  name: string
  name_ar?: string | null
  code?: string | null
  is_active: boolean
  is_deleted?: boolean
  created_at?: string
  hotel?: {
    id: string
    name: string
  } | null
}

export function DepartmentsManagement() {
  const { currentOrganization, availableHotels, isOrgAdmin } = useTenant()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])
  const queryClient = useQueryClient()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null)
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterHotelId, setFilterHotelId] = useState<string>('all')

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [code, setCode] = useState('')
  const [hotelId, setHotelId] = useState<string>('org_wide')
  const [isSaving, setIsSaving] = useState(false)

  // Query departments for current organization
  const { data: departments = [], isLoading, refetch } = useQuery<DepartmentItem[]>({
    queryKey: ['tenant-departments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return []

      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          organization_id,
          hotel_id,
          property_id,
          name,
          is_active,
          is_deleted,
          created_at
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
        .order('name')

      if (error) {
        console.warn('Failed to fetch departments:', error)
        // Fallback: try fetching all active departments
        const { data: fallbackData } = await supabase
          .from('departments')
          .select('id, property_id, name, is_active')
          .eq('is_active', true)
          .limit(50)
        return (fallbackData || []) as DepartmentItem[]
      }

      return (data || []) as DepartmentItem[]
    },
    enabled: !!currentOrganization?.id
  })

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      const matchesHotel = filterHotelId === 'all' || 
        (filterHotelId === 'org_wide' && !dept.hotel_id && !dept.property_id) ||
        dept.hotel_id === filterHotelId ||
        dept.property_id === filterHotelId

      if (!matchesHotel) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        dept.name.toLowerCase().includes(term) ||
        (dept.name_ar && dept.name_ar.toLowerCase().includes(term)) ||
        (dept.code && dept.code.toLowerCase().includes(term))
      )
    })
  }, [departments, filterHotelId, searchTerm])

  const handleOpenAdd = () => {
    setName('')
    setNameAr('')
    setCode('')
    setHotelId('org_wide')
    setIsAddOpen(true)
  }

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept)
    setName(dept.name)
    setNameAr(dept.name_ar || '')
    setCode(dept.code || '')
    setHotelId(dept.hotel_id || dept.property_id || 'org_wide')
  }

  const handleSaveDepartment = async () => {
    if (!currentOrganization?.id || !name.trim()) return
    setIsSaving(true)

    try {
      const selectedHotelId = hotelId === 'org_wide' ? null : hotelId

      if (editingDept) {
        // Update
        const { error } = await supabase
          .from('departments')
          .update({
            name: name.trim(),
            hotel_id: selectedHotelId,
            property_id: selectedHotelId,
          })
          .eq('id', editingDept.id)

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:department_updated', 'Department updated successfully.')
        })
      } else {
        // Create
        const { error } = await supabase
          .from('departments')
          .insert({
            organization_id: currentOrganization.id,
            hotel_id: selectedHotelId,
            property_id: selectedHotelId,
            name: name.trim(),
            is_active: true,
            is_deleted: false
          })

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:department_created', 'Department created successfully.')
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['tenant-departments'] })
      await refetch()
      setIsAddOpen(false)
      setEditingDept(null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to save department',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (dept: DepartmentItem) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update({
          is_active: !dept.is_active
        })
        .eq('id', dept.id)

      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['tenant-departments'] })
      await refetch()
      toast({
        title: t('common:success', 'Success'),
        description: dept.is_active
          ? t('admin:dept_deactivated', 'Department deactivated.')
          : t('admin:dept_activated', 'Department activated.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update department status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteDepartment = async () => {
    if (!deletingDept) return
    try {
      const { error } = await supabase
        .from('departments')
        .update({
          is_deleted: true,
          is_active: false
        })
        .eq('id', deletingDept.id)

      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['tenant-departments'] })
      await refetch()
      setDeletingDept(null)
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:dept_deleted', 'Department removed.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to delete department',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>{t('admin:departments_structure', 'Departments & Operational Units')}</CardTitle>
          </div>
          <CardDescription>
            {t('admin:departments_structure_desc', 'Configure functional departments across the organization or per hotel location.')}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 me-2", isLoading && "animate-spin")} />
            {t('common:refresh', 'Refresh')}
          </Button>
          {isOrgAdmin && (
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('admin:add_department', 'Add Department')}
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
              placeholder={t('admin:search_departments', 'Search departments...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 text-sm"
            />
          </div>

          <Select value={filterHotelId} onValueChange={setFilterHotelId}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <Building2 className="h-4 w-4 me-2 text-muted-foreground" />
              <SelectValue placeholder="Scope by hotel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin:all_locations', 'All Scopes')}</SelectItem>
              <SelectItem value="org_wide">{t('admin:org_wide_only', 'Organization-Wide Only')}</SelectItem>
              {availableHotels.map(hotel => (
                <SelectItem key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin me-2" />
            {t('common:loading', 'Loading departments...')}
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">{t('admin:no_departments_found', 'No departments found.')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('admin:no_departments_hint', 'Add departments to organize teams, SOPs, and learning paths.')}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin:department_name', 'Department')}</TableHead>
                  <TableHead>{t('admin:scope_location', 'Location Scope')}</TableHead>
                  <TableHead>{t('admin:status', 'Status')}</TableHead>
                  {isOrgAdmin && <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => {
                  const targetHotel = availableHotels.find(h => h.id === (dept.hotel_id || dept.property_id))
                  return (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {dept.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{dept.name}</div>
                            {dept.name_ar && <div className="text-xs text-muted-foreground font-arabic">{dept.name_ar}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {targetHotel ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span>{targetHotel.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-muted font-normal">
                            {t('admin:org_wide', 'Organization-wide')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                          {dept.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
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
                              <DropdownMenuItem onClick={() => handleOpenEdit(dept)}>
                                <Edit2 className="h-4 w-4 me-2" />
                                {t('common:edit', 'Edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(dept)}>
                                <Power className="h-4 w-4 me-2" />
                                {dept.is_active ? t('admin:deactivate', 'Deactivate') : t('admin:activate', 'Activate')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingDept(dept)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {t('common:delete', 'Delete')}
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

        {/* Create / Edit Dialog */}
        <Dialog open={isAddOpen || !!editingDept} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false)
            setEditingDept(null)
          }
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>
                {editingDept ? t('admin:edit_department', 'Edit Department') : t('admin:add_new_department', 'Create Department')}
              </DialogTitle>
              <DialogDescription>
                {t('admin:dept_dialog_desc', 'Set the department title and whether it applies across all locations or a specific hotel.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">{t('admin:dept_name_en', 'Department Name (English)')}</Label>
                <Input
                  id="dept-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Food & Beverage / Front Office"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-name-ar">{t('admin:dept_name_ar', 'Department Name (Arabic)')}</Label>
                <Input
                  id="dept-name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: الأغذية والمشروبات / المكاتب الأمامية"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-hotel">{t('admin:hotel_scope', 'Location Scope')}</Label>
                <Select value={hotelId} onValueChange={setHotelId}>
                  <SelectTrigger id="dept-hotel">
                    <SelectValue placeholder="Select location scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_wide">{t('admin:all_locations_org', 'Organization-Wide (All Hotels)')}</SelectItem>
                    {availableHotels.map(h => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} {h.city ? `(${h.city})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false)
                setEditingDept(null)
              }}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSaveDepartment} disabled={isSaving || !name.trim()}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {t('admin:save_department', 'Save Department')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Alert Dialog */}
        <AlertDialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin:confirm_delete_dept', 'Delete Department?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin:confirm_delete_dept_desc', 'Are you sure you want to remove this department? Any associated users will retain their primary profile.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common:delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
