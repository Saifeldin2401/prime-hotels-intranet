import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building, Lock } from 'lucide-react'

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
  const { properties, primaryRole } = useAuth()
  const { canAccessProperty } = usePermissions()

  const accessibleProperties = showAllProperties && primaryRole === 'regional_admin' 
    ? properties // Admin can see all properties
    : properties // Users can only see their assigned properties

  if (accessibleProperties.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No properties assigned</span>
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
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accessibleProperties.map((property) => {
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
      </SelectContent>
    </Select>
  )
}

interface PropertyAccessBadgeProps {
  propertyId?: string
  showDetails?: boolean
}

export function PropertyAccessBadge({ propertyId, showDetails = false }: PropertyAccessBadgeProps) {
  const { properties } = useAuth()
  const { canAccessProperty } = usePermissions()

  if (!propertyId) {
    return <Badge variant="outline">All Properties</Badge>
  }

  const property = properties.find(p => p.id === propertyId)
  const hasAccess = canAccessProperty(propertyId)

  if (!property) {
    return <Badge variant="destructive">Unknown Property</Badge>
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
