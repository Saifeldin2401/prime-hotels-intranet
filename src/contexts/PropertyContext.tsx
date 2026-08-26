import { useAuth } from '@/hooks/useAuth'
import {
    CONSOLIDATED_PROPERTY_ID,
    isRealPropertyId,
    roleSupportsConsolidatedView,
} from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/lib/types'
import { safeLocalStorage } from '@/lib/storage'
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

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

const mapDbPropertyToProperty = (p: {
    id: string
    name: string
    address?: string | null
    phone?: string | null
    is_active?: boolean | null
    created_at?: string | null
    company_id?: string | null
    brand_id?: string | null
    latitude?: number | null
    longitude?: number | null
}): Property => ({
    id: p.id,
    name: p.name,
    address: p.address ?? null,
    phone: p.phone ?? null,
    is_active: p.is_active ?? true,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    created_at: p.created_at ?? new Date().toISOString(),
    company_id: p.company_id ?? null,
    brand_id: p.brand_id ?? null,
})

const toProperty = (value: unknown): Property | null => {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
        return null
    }

    const candidate = value as Record<string, unknown>
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
        return null
    }

    return {
        id: candidate.id,
        name: candidate.name,
        address: typeof candidate.address === 'string' ? candidate.address : null,
        phone: typeof candidate.phone === 'string' ? candidate.phone : null,
        is_active: typeof candidate.is_active === 'boolean' ? candidate.is_active : true,
        latitude: typeof candidate.latitude === 'number' ? candidate.latitude : null,
        longitude: typeof candidate.longitude === 'number' ? candidate.longitude : null,
        created_at: typeof candidate.created_at === 'string' ? candidate.created_at : new Date().toISOString(),
        company_id: typeof candidate.company_id === 'string' ? candidate.company_id : null,
        brand_id: typeof candidate.brand_id === 'string' ? candidate.brand_id : null,
    }
}

export function PropertyProvider({ children }: { children: React.ReactNode }) {
    const { user, primaryRole } = useAuth()
    const [currentProperty, setCurrentProperty] = useState<Property | null>(null)
    const [availableProperties, setAvailableProperties] = useState<Property[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // System roles that have access to all properties at group level.
    const isCorporateRole = roleSupportsConsolidatedView(primaryRole)

    const fetchProperties = async (retryCount = 0) => {
        if (!user) {
            setAvailableProperties([])
            setCurrentProperty(null)
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            let props: Property[] = []

            if (isCorporateRole) {
                // Corporate users fetch ALL properties
                const { data, error } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('is_active', true)
                    .order('name')

                if (error) {
                    if ((error.code === 'PGRST303' || error.message?.includes('JWT issued at future')) && retryCount < 2) {
                        await new Promise((r) => setTimeout(r, 1000))
                        return fetchProperties(retryCount + 1)
                    }
                    throw error
                }

                // Add Group-level option for corporate users (also acts as Head Office)
                const allOption = createPseudoProperty(
                    'All Properties (Group Portfolio)',
                    'ALTUS Group Portfolio & Regional Operations'
                )

                // Filter out redundant head office and deduplicate properties by ID
                const rawProps = (data || []).filter(p => p.name !== 'ALTUS Head Office').map(mapDbPropertyToProperty)
                const filteredData = Array.from(
                    new Map(rawProps.map(p => [p.id, p])).values()
                )
                props = [allOption, ...filteredData]
            } else {
                // Property users fetch ONLY assigned properties via user_properties
                const { data, error } = await supabase
                    .from('user_properties')
                    .select('property:properties(*)')
                    .eq('user_id', user.id)

                if (error) {
                    if ((error.code === 'PGRST303' || error.message?.includes('JWT issued at future')) && retryCount < 2) {
                        await new Promise((r) => setTimeout(r, 1000))
                        return fetchProperties(retryCount + 1)
                    }
                    throw error
                }

                const mappedProperties = (data ?? [])
                    .map((item) => toProperty(item.property))
                    .filter((p): p is Property => !!p)

                const uniqueProperties = Array.from(
                    new Map(mappedProperties.map((property) => [property.id, property])).values()
                ).sort((a, b) => a.name.localeCompare(b.name))

                // If user is assigned to 2+ properties, add a cluster aggregation option
                if (uniqueProperties.length > 1) {
                    const clusterNames = uniqueProperties.map((property) => property.name).join(' & ')
                    const clusterOption = createPseudoProperty(
                        'All Properties (Group Portfolio)',
                        clusterNames
                    )
                    props = [clusterOption, ...uniqueProperties]
                } else {
                    props = uniqueProperties
                }
            }

            setAvailableProperties(props)

            // Determine current property
            if (props.length > 0) {
                // 1. Try to restore from local storage
                const savedId = safeLocalStorage.getItem('altus_current_property_id')
                const savedProp = props.find(p => p.id === savedId)

                if (savedProp) {
                    setCurrentProperty(savedProp)
                } else {
                    // 2. Default to the first available
                    setCurrentProperty(props[0])
                    safeLocalStorage.setItem('altus_current_property_id', props[0].id)
                }
            } else {
                setCurrentProperty(null)
            }

        } catch (error: any) {
            if (error?.code !== 'PGRST303' && !error?.message?.includes('JWT issued at future')) {
                console.error('Error fetching properties:', error)
            }
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchProperties()
    }, [user, primaryRole])

    // Memoize callbacks to prevent unnecessary re-renders
    const switchProperty = useCallback((propertyId: string) => {
        setCurrentProperty(prev => {
            const prop = availableProperties.find(p => p.id === propertyId)
            if (prop) {
                safeLocalStorage.setItem('altus_current_property_id', propertyId)
                return prop
            }
            return prev
        })
    }, [availableProperties])

    const refreshProperties = useCallback(() => fetchProperties(), [])

    // Real property IDs (excludes the consolidated pseudo-property).
    const propertyIds = useMemo(() => 
        availableProperties
            .filter((property) => isRealPropertyId(property.id))
            .map(p => p.id),
        [availableProperties]
    )

    // Memoize derived values
    const isMultiPropertyUser = useMemo(() => 
        propertyIds.length > 1 || isCorporateRole,
        [propertyIds.length, isCorporateRole]
    )

    // Memoize context value to prevent re-renders of consumers
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
