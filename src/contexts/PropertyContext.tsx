import { CONSOLIDATED_PROPERTY_ID, isRealPropertyId } from '@/lib/propertyScope'
import type { Property } from '@/lib/types'
import { useTenant } from '@/contexts/TenantContext'
import React, { createContext, useContext, useMemo, useCallback } from 'react'

interface PropertyContextType {
    currentProperty: Property | null
    availableProperties: Property[]
    isLoading: boolean
    isMultiPropertyUser: boolean
    /** IDs of real properties the user has access to (excludes the consolidated pseudo-property). */
    propertyIds: string[]
    switchProperty: (propertyId: string) => void
    refreshProperties: () => Promise<void>
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

const createPseudoProperty = (name: string, address: string): Property => ({
    id: CONSOLIDATED_PROPERTY_ID,
    name,
    address,
    phone: '',
    is_active: true,
    latitude: null,
    longitude: null,
    created_at: new Date().toISOString()
})

export function PropertyProvider({ children }: { children: React.ReactNode }) {
    const { 
        availableHotels, 
        currentHotel, 
        setHotelScope, 
        isLoading, 
        refreshTenantData,
        isOrgAdmin,
        isPlatformAdmin
    } = useTenant()

    const availableProperties = useMemo<Property[]>(() => {
        const mapped: Property[] = availableHotels.map(h => ({
            id: h.id,
            name: h.name,
            address: h.address,
            phone: h.phone,
            is_active: h.is_active,
            latitude: null,
            longitude: null,
            created_at: h.created_at,
            brand_id: h.brand_id
        }))

        if (isOrgAdmin || isPlatformAdmin || mapped.length > 1) {
            const allOption = createPseudoProperty(
                'All Hotels (Organization Portfolio)',
                'All locations across current organization'
            )
            return [allOption, ...mapped]
        }

        return mapped
    }, [availableHotels, isOrgAdmin, isPlatformAdmin])

    const currentProperty = useMemo<Property | null>(() => {
        if (!currentHotel) {
            return availableProperties[0] || null
        }
        return availableProperties.find(p => p.id === currentHotel.id) || null
    }, [currentHotel, availableProperties])

    const switchProperty = useCallback((propertyId: string) => {
        if (propertyId === CONSOLIDATED_PROPERTY_ID) {
            setHotelScope(null)
        } else {
            setHotelScope(propertyId)
        }
    }, [setHotelScope])

    const refreshProperties = useCallback(async () => {
        await refreshTenantData()
    }, [refreshTenantData])

    const propertyIds = useMemo(() => 
        availableProperties
            .filter((property) => isRealPropertyId(property.id))
            .map(p => p.id),
        [availableProperties]
    )

    const isMultiPropertyUser = useMemo(() => 
        propertyIds.length > 1 || isOrgAdmin || isPlatformAdmin,
        [propertyIds.length, isOrgAdmin, isPlatformAdmin]
    )

    const value = useMemo(() => ({
        currentProperty,
        availableProperties,
        isLoading,
        isMultiPropertyUser,
        propertyIds,
        switchProperty,
        refreshProperties
    }), [
        currentProperty,
        availableProperties,
        isLoading,
        isMultiPropertyUser,
        propertyIds,
        switchProperty,
        refreshProperties
    ])

    return (
        <PropertyContext.Provider value={value}>
            {children}
        </PropertyContext.Provider>
    )
}

export function useProperty() {
    const context = useContext(PropertyContext)
    if (context === undefined) {
        throw new Error('useProperty must be used within a PropertyProvider')
    }
    return context
}
