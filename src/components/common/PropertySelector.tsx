import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building, Lock, LayoutDashboard } from 'lucide-react'
import { useTranslation } from "react-i18next";

interface PropertySelectorProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  showAllProperties?: boolean
  disabled?: boolean
}

export function PropertySelector({
  value,
  onValueChange,
  placeholder = "Select property",
  showAllProperties = false,
  disabled = false
}: PropertySelectorProps) {
  const { t: t_ext } = useTranslation('extracted')
  const { properties, primaryRole } = useAuth()
  const { canAccessProperty } = usePermissions()

  const accessibleProperties = showAllProperties && primaryRole === 'regional_admin'
    ? properties // Admin can see all properties
    : properties // Users can only see their assigned properties

  if (accessibleProperties.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t_ext('no_properties_assigned', 'No properties assigned')}</span>
      </div>
    )
  }

  if (accessibleProperties.length === 1) {
    const property = accessibleProperties[0]
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md">
        <Building className="w-4 h-4" />
        <span className="text-sm font-medium">{property.name}</span>
      </div>
    )
  }

  return (
    <Select value={value ?? ''} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accessibleProperties.some(p => p.id === 'all') && (
          <SelectGroup>
            <SelectLabel>{t_ext('views', 'Views')}</SelectLabel>
            {accessibleProperties.filter(p => p.id === 'all').map(property => (
              <SelectItem key={property.id} value={property.id}>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{property.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {accessibleProperties.some(p => p.id === 'all') && accessibleProperties.some(p => p.id !== 'all') && (
          <SelectSeparator />
        )}

        {accessibleProperties.some(p => p.id !== 'all') && (
          <SelectGroup>
            <SelectLabel>{t_ext('properties', 'Properties')}</SelectLabel>
            {accessibleProperties.filter(p => p.id !== 'all').map((property) => {
              const hasAccess = canAccessProperty(property.id)
              return (
                <SelectItem
                  key={property.id}
                  value={property.id}
                  disabled={!hasAccess}
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>{property.name}</span>
                    {!hasAccess && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </SelectItem>
              )
            })}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}

interface PropertyAccessBadgeProps {
  propertyId?: string
  showDetails?: boolean
}

export function PropertyAccessBadge({ propertyId, showDetails = false }: PropertyAccessBadgeProps) {
    const { t: t_ext } = useTranslation('extracted');
  const { properties } = useAuth()
  const { canAccessProperty } = usePermissions()

  if (!propertyId || propertyId === 'all') {
    return <Badge variant="outline">{t_ext('consolidated_view_all', 'Consolidated View (All)')}</Badge>
  }

  const property = properties.find(p => p.id === propertyId)
  const hasAccess = canAccessProperty(propertyId)

  if (!property) {
    return <Badge variant="destructive">{t_ext('unknown_property', 'Unknown Property')}</Badge>
  }

  if (!hasAccess) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Lock className="w-3 h-3" />
        {showDetails ? property.name : 'No Access'}
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="flex items-center gap-1">
      <Building className="w-3 h-3" />
      {showDetails ? property.name : 'Has Access'}
    </Badge>
  )
}
