import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { ROLES, type AppRole } from '@/lib/constants'
import { WIDGET_REGISTRY, type WidgetId } from '@/pages/dashboard/components/WidgetRegistry'
import { useMemo } from 'react'

export function useWidgetPermissions() {
    const { primaryRole, properties, departments } = useAuth()
    const { currentProperty } = useProperty()

    /**
     * Evaluates if the current user has access to a specific widget
     * based on their role level and the registry definition.
     */
    const canAccessWidget = useMemo(() => {
        return (widgetId: WidgetId) => {
            const config = WIDGET_REGISTRY[widgetId]
            if (!config) return false

            const requiredRoles = config.requiredRoles

            // Universal access definition
            if (requiredRoles.includes('all')) {
                return true
            }

            if (!primaryRole) {
                return false
            }

            const currentLevel = ROLES[primaryRole]?.level ?? Number.MAX_SAFE_INTEGER
            const hasDirectAccess = requiredRoles.includes(primaryRole)

            // Check if user inherits access (e.g. GM inheriting from Manager)
            const hasInheritedAccess = requiredRoles.some((allowed) => {
                if (allowed === 'all') return true
                const allowedRole = allowed as AppRole
                const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
                return currentLevel <= allowedLevel
            })

            if (!hasDirectAccess && !hasInheritedAccess) {
                return false
            }

            // Department ABAC Evaluation (if specified by registry)
            if (config.requiredDepartments && config.requiredDepartments.length > 0) {
                const userDeptNames = departments.map(d => d.name)
                const hasDeptAccess = config.requiredDepartments.some(reqDept => userDeptNames.includes(reqDept))
                if (!hasDeptAccess && !['corporate_admin', 'regional_admin', 'property_manager'].includes(primaryRole)) {
                    // High-level roles bypass strict department checks
                    return false
                }
            }

            return true
        }
    }, [primaryRole, departments, properties])

    /**
     * Get an array of fully resolved, permitted widgets for the current context.
     */
    const permittedWidgets = useMemo(() => {
        const keys = Object.keys(WIDGET_REGISTRY) as WidgetId[]
        return keys.filter(canAccessWidget)
    }, [canAccessWidget])

    return {
        canAccessWidget,
        permittedWidgets,
        activeScope: {
            property: currentProperty,
            departments: departments
        }
    }
}
