import { useState } from 'react'
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
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Crown, Plus, Check, RefreshCw, MoreVertical, Edit2, Trash2, Power } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Brand } from '@/lib/types/tenant'

export function BrandsManagement() {
  const { currentOrganization, availableBrands, isOrgAdmin, refreshTenantData } = useTenant()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null)

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [code, setCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenAdd = () => {
    setName('')
    setNameAr('')
    setCode('')
    setIsAddOpen(true)
  }

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setName(brand.name)
    setNameAr(brand.name_ar || '')
    setCode(brand.code || '')
  }

  const handleSaveBrand = async () => {
    if (!currentOrganization?.id || !name.trim()) return
    setIsSaving(true)

    try {
      if (editingBrand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({
            name: name.trim(),
            name_ar: nameAr.trim() || null,
            code: code.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBrand.id)
          .eq('organization_id', currentOrganization.id)

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:brand_updated_success', 'Brand updated successfully.')
        })
      } else {
        // Create new brand
        const { error } = await supabase
          .from('brands')
          .insert({
            organization_id: currentOrganization.id,
            name: name.trim(),
            name_ar: nameAr.trim() || null,
            code: code.trim() || null,
            is_active: true,
            is_deleted: false,
          })

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:brand_created_success', 'Brand division created successfully.')
        })
      }

      await refreshTenantData()
      setIsAddOpen(false)
      setEditingBrand(null)
      setName('')
      setNameAr('')
      setCode('')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to save brand',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (brand: Brand) => {
    if (!currentOrganization?.id) return
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          is_active: !brand.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id)
        .eq('organization_id', currentOrganization.id)

      if (error) throw error
      await refreshTenantData()
      toast({
        title: t('common:success', 'Success'),
        description: brand.is_active 
          ? t('admin:brand_deactivated', 'Brand deactivated.')
          : t('admin:brand_activated', 'Brand activated.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update brand status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteBrand = async () => {
    if (!deletingBrand || !currentOrganization?.id) return
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          is_deleted: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deletingBrand.id)
        .eq('organization_id', currentOrganization.id)

      if (error) throw error
      await refreshTenantData()
      setDeletingBrand(null)
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:brand_deleted', 'Brand removed successfully.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to delete brand',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>{t('admin:brand_divisions', 'Brand Portfolios & Divisions')}</CardTitle>
          </div>
          <CardDescription>
            {t('admin:brand_divisions_desc', 'Optional brand subdivisions within your organization (e.g. Luxury, Suites, Express).')}
          </CardDescription>
        </div>
        {isOrgAdmin && (
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('admin:add_brand', 'Add Brand')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {availableBrands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>{t('admin:no_brands_found', 'No brand divisions defined. All training & knowledge can be assigned organization-wide or by hotel.')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:brand', 'Brand')}</TableHead>
                <TableHead>{t('admin:code', 'Code')}</TableHead>
                <TableHead>{t('admin:status', 'Status')}</TableHead>
                {isOrgAdmin && <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableBrands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="text-sm font-semibold">{brand.name}</div>
                      {brand.name_ar && <div className="text-xs text-muted-foreground font-arabic">{brand.name_ar}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {brand.code || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                      {brand.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(brand)}>
                            <Edit2 className="h-4 w-4 me-2" />
                            {t('common:edit', 'Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(brand)}>
                            <Power className="h-4 w-4 me-2" />
                            {brand.is_active ? t('admin:deactivate', 'Deactivate') : t('admin:activate', 'Activate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingBrand(brand)}
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
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={isAddOpen || !!editingBrand} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false)
            setEditingBrand(null)
          }
        }}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? t('admin:edit_brand', 'Edit Brand Division') : t('admin:add_new_brand', 'Create Brand Portfolio')}
              </DialogTitle>
              <DialogDescription>
                {t('admin:add_brand_desc', 'Add or update a distinct brand subdivision to group your hotels and courses.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">{t('admin:brand_name_en', 'Brand Name (English)')}</Label>
                <Input
                  id="brand-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Altus Luxury Collection"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-name-ar">{t('admin:brand_name_ar', 'Brand Name (Arabic)')}</Label>
                <Input
                  id="brand-name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: تشكيلة برايم الفاخرة"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-code">{t('admin:brand_code', 'Brand Code')}</Label>
                <Input
                  id="brand-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PLC"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false)
                setEditingBrand(null)
              }}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSaveBrand} disabled={isSaving || !name.trim()}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {t('admin:save_brand', 'Save Brand')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!deletingBrand} onOpenChange={(open) => !open && setDeletingBrand(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin:confirm_delete_brand', 'Delete Brand Division?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin:confirm_delete_brand_desc', 'Are you sure you want to delete this brand division? Existing hotels under this brand will remain intact.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteBrand} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common:delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
