import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, Lock } from 'lucide-react'

interface DepartmentSelectorProps {
  value?: string
  onValueChange?: (value: string) => void
  propertyId?: string
  placeholder?: string
  showAllDepartments?: boolean
  disabled?: boolean
}

export function DepartmentSelector({ 
  value, 
  onValueChange, 
  propertyId,
  placeholder = "Select department",
  showAllDepartments = false,
  disabled = false
}: DepartmentSelectorProps) {
  const { departments, properties } = useAuth()
  const { canAccessDepartment, canAccessProperty } = usePermissions()

  // Filter departments by property if propertyId is provided
  const accessibleDepartments = departments.filter(dept => {
    if (propertyId) {
      return dept.property_id === propertyId
    }
    return true
  })

  // Check if user has access to the property for these departments
  const hasPropertyAccess = propertyId ? canAccessProperty(propertyId) : true

  if (!hasPropertyAccess && propertyId) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Lock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No property access</span>
      </div>
    )
  }

  if (accessibleDepartments.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {propertyId ? 'No departments in this property' : 'No departments assigned'}
        </span>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accessibleDepartments.map((department) => {
          const hasAccess = canAccessDepartment(department.id)
          const property = properties.find(p => p.id === department.property_id)
          
          return (
            <SelectItem 
              key={department.id} 
              value={department.id}
              disabled={!hasAccess}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{department.name}</span>
                {property && (
                  <span className="text-xs text-muted-foreground">
                    ({property.name})
                  </span>
                )}
                {!hasAccess && <Lock className="w-3 h-3 text-muted-foreground" />}
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

interface DepartmentAccessBadgeProps {
  departmentId?: string
  showDetails?: boolean
  showProperty?: boolean
}

export function DepartmentAccessBadge({ 
  departmentId, 
  showDetails = false,
  showProperty = false
}: DepartmentAccessBadgeProps) {
  const { departments, properties } = useAuth()
  const { canAccessDepartment } = usePermissions()

  if (!departmentId) {
    return <Badge variant="outline">All Departments</Badge>
  }

  const department = departments.find(d => d.id === departmentId)
  const hasAccess = canAccessDepartment(departmentId)

  if (!department) {
    return <Badge variant="destructive">Unknown Department</Badge>
  }

  const property = properties.find(p => p.id === department.property_id)

  if (!hasAccess) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Lock className="w-3 h-3" />
        {showDetails ? department.name : 'No Access'}
        {showProperty && property && (
          <span className="text-xs">({property.name})</span>
        )}
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="flex items-center gap-1">
      <Users className="w-3 h-3" />
      {showDetails ? department.name : 'Has Access'}
      {showProperty && property && (
        <span className="text-xs">({property.name})</span>
      )}
    </Badge>
  )
}
