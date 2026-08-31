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
import { useAccountContext } from '@/contexts/auth/AccountContext'
import { platformService } from '@/services/platformService'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Building2, Plus, MapPin, Building, Check, RefreshCw, MoreVertical, Edit2, Trash2, Power, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Hotel } from '@/lib/types/tenant'

export function HotelsManagement() {
  const { currentOrganization, availableHotels, availableBrands, isOrgAdmin, refreshTenantData } = useTenant()
  const { isPlatformOperator } = useAccountContext()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])

  const { data: entitlements, refetch: refetchEntitlements } = useQuery({
    queryKey: ['org-effective-entitlements', currentOrganization?.id],
    queryFn: () => currentOrganization?.id ? platformService.getEffectiveEntitlements(currentOrganization.id) : null,
    enabled: !!currentOrganization?.id
  })

  const isHotelLimitReached = !isPlatformOperator && !!entitlements && (entitlements.usage?.hotels ?? 0) >= (entitlements.max_hotels ?? 10)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [deletingHotel, setDeletingHotel] = useState<Hotel | null>(null)

  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [hotelCode, setHotelCode] = useState('')
  const [city, setCity] = useState('Riyadh')
  const [country, setCountry] = useState('Saudi Arabia')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [brandId, setBrandId] = useState<string>('none')
  const [isHeadquarters, setIsHeadquarters] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenAdd = () => {
    setName('')
    setNameAr('')
    setHotelCode('')
    setCity('Riyadh')
    setCountry('Saudi Arabia')
    setAddress('')
    setPhone('')
    setBrandId('none')
    setIsHeadquarters(false)
    setIsAddOpen(true)
  }

  const handleOpenEdit = (hotel: Hotel) => {
    setEditingHotel(hotel)
    setName(hotel.name)
    setNameAr(hotel.name_ar || '')
    setHotelCode(hotel.hotel_code || '')
    setCity(hotel.city || 'Riyadh')
    setCountry(hotel.country || 'Saudi Arabia')
    setAddress(hotel.address || '')
    setPhone(hotel.phone || '')
    setBrandId(hotel.brand_id || 'none')
    setIsHeadquarters(hotel.is_headquarters || false)
  }

  const handleSaveHotel = async () => {
    if (!currentOrganization?.id || !name.trim()) return
    if (!editingHotel && isHotelLimitReached) {
      toast({
        title: t('common:error', 'Error'),
        description: t('admin:hotel_limit_reached', 'Plan limit reached for hotels. Contact your platform administrator to upgrade.'),
        variant: 'destructive'
      })
      return
    }
    setIsSaving(true)

    try {
      if (editingHotel) {
        // Update existing hotel
        const { error } = await supabase
          .from('hotels')
          .update({
            brand_id: brandId === 'none' ? null : brandId,
            name: name.trim(),
            name_ar: nameAr.trim() || null,
            hotel_code: hotelCode.trim() || null,
            city: city.trim() || null,
            country: country.trim() || 'Saudi Arabia',
            address: address.trim() || null,
            phone: phone.trim() || null,
            is_headquarters: isHeadquarters,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingHotel.id)
          .eq('organization_id', currentOrganization.id)

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:hotel_updated_success', 'Hotel details updated successfully.')
        })
      } else {
        // Create new hotel
        const { error } = await supabase
          .from('hotels')
          .insert({
            organization_id: currentOrganization.id,
            brand_id: brandId === 'none' ? null : brandId,
            name: name.trim(),
            name_ar: nameAr.trim() || null,
            hotel_code: hotelCode.trim() || null,
            city: city.trim() || null,
            country: country.trim() || 'Saudi Arabia',
            address: address.trim() || null,
            phone: phone.trim() || null,
            is_headquarters: isHeadquarters,
            is_active: true,
            is_deleted: false,
          })

        if (error) throw error

        toast({
          title: t('common:success', 'Success'),
          description: t('admin:hotel_created_success', 'Hotel added to organization successfully.')
        })
      }

      await Promise.all([refreshTenantData(), refetchEntitlements()])
      setIsAddOpen(false)
      setEditingHotel(null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to save hotel',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (hotel: Hotel) => {
    if (!currentOrganization?.id) return
    try {
      const { error } = await supabase
        .from('hotels')
        .update({
          is_active: !hotel.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', hotel.id)
        .eq('organization_id', currentOrganization.id)

      if (error) throw error
      await refreshTenantData()
      toast({
        title: t('common:success', 'Success'),
        description: hotel.is_active 
          ? t('admin:hotel_deactivated', 'Hotel deactivated.')
          : t('admin:hotel_activated', 'Hotel activated.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to update hotel status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteHotel = async () => {
    if (!deletingHotel || !currentOrganization?.id) return
    try {
      const { error } = await supabase
        .from('hotels')
        .update({
          is_deleted: true,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deletingHotel.id)
        .eq('organization_id', currentOrganization.id)

      if (error) throw error
      await refreshTenantData()
      setDeletingHotel(null)
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:hotel_deleted', 'Hotel removed from organization.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to delete hotel',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>{t('admin:hotels_locations', 'Hotels & Operating Units')}</CardTitle>
          </div>
          <CardDescription>
            {t('admin:hotels_locations_desc', 'Manage hotels, properties, and physical locations belonging to your organization.')}
          </CardDescription>
        </div>
        {isOrgAdmin && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAdd}
              className="gap-2"
              disabled={isHotelLimitReached}
              title={isHotelLimitReached ? t('admin:hotel_limit_reached', 'Plan limit reached for hotels.') : undefined}
            >
              <Plus className="h-4 w-4" />
              {t('admin:add_hotel', 'Add Hotel')}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isHotelLimitReached && (
          <div className="p-3 mb-4 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              {t('admin:hotel_limit_reached_desc', 'Plan limit reached ({{current}} / {{max}} hotels). Contact your platform administrator to upgrade subscription.', {
                current: entitlements?.usage?.hotels ?? 0,
                max: entitlements?.max_hotels ?? 10
              })}
            </span>
          </div>
        )}

        {availableHotels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>{t('admin:no_hotels_found', 'No hotels added yet to this organization.')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:hotel', 'Hotel')}</TableHead>
                <TableHead>{t('admin:code', 'Code')}</TableHead>
                <TableHead>{t('admin:brand', 'Brand')}</TableHead>
                <TableHead>{t('admin:location', 'Location')}</TableHead>
                <TableHead>{t('admin:status', 'Status')}</TableHead>
                {isOrgAdmin && <TableHead className="text-end">{t('admin:actions', 'Actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableHotels.map((hotel) => {
                const brand = availableBrands.find(b => b.id === hotel.brand_id)
                return (
                  <TableRow key={hotel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="font-semibold text-sm">{hotel.name}</div>
                          {hotel.name_ar && <div className="text-xs text-muted-foreground font-arabic">{hotel.name_ar}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {hotel.hotel_code || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {brand ? (
                        <Badge variant="secondary" className="text-xs">
                          {brand.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {t('admin:independent', 'Independent')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{hotel.city ? `${hotel.city}, ${hotel.country}` : (hotel.country || '—')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={hotel.is_active ? 'default' : 'secondary'}>
                        {hotel.is_active ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
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
                            <DropdownMenuItem onClick={() => handleOpenEdit(hotel)}>
                              <Edit2 className="h-4 w-4 me-2" />
                              {t('common:edit', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(hotel)}>
                              <Power className="h-4 w-4 me-2" />
                              {hotel.is_active ? t('admin:deactivate', 'Deactivate') : t('admin:activate', 'Activate')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingHotel(hotel)}
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
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={isAddOpen || !!editingHotel} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false)
            setEditingHotel(null)
          }
        }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? t('admin:edit_hotel', 'Edit Hotel Location') : t('admin:add_new_hotel', 'Add New Hotel')}
              </DialogTitle>
              <DialogDescription>
                {t('admin:add_hotel_desc', 'Enter the hotel name, location, and operational details for this tenant.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel-name">{t('admin:hotel_name_en', 'Hotel Name (English)')}</Label>
                  <Input
                    id="hotel-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hotel Riyadh"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotel-name-ar">{t('admin:hotel_name_ar', 'Hotel Name (Arabic)')}</Label>
                  <Input
                    id="hotel-name-ar"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: فندق الرياض"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel-code">{t('admin:hotel_code', 'Hotel Code')}</Label>
                  <Input
                    id="hotel-code"
                    value={hotelCode}
                    onChange={(e) => setHotelCode(e.target.value.toUpperCase())}
                    placeholder="e.g. RUH-01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotel-brand">{t('admin:brand', 'Brand (Optional)')}</Label>
                  <Select value={brandId} onValueChange={setBrandId}>
                    <SelectTrigger id="hotel-brand">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin:no_brand', 'No Brand (Independent)')}</SelectItem>
                      {availableBrands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel-city">{t('admin:city', 'City')}</Label>
                  <Input
                    id="hotel-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Riyadh"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotel-phone">{t('admin:phone', 'Phone')}</Label>
                  <Input
                    id="hotel-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+966 11 000 0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotel-address">{t('admin:address', 'Address')}</Label>
                <Input
                  id="hotel-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. King Fahd Road, Al Olaya"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false)
                setEditingHotel(null)
              }}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSaveHotel} disabled={isSaving || !name.trim()}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {t('admin:save_hotel', 'Save Hotel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!deletingHotel} onOpenChange={(open) => !open && setDeletingHotel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin:confirm_delete_hotel', 'Delete Hotel Location?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin:confirm_delete_hotel_desc', 'Are you sure you want to remove this hotel from the organization? Associated departmental records and content will be archived.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteHotel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('common:delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
