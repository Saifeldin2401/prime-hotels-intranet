import { useAuth } from '@/hooks/useAuth'
import {
    CONSOLIDATED_PROPERTY_ID,
    isRealPropertyId,
    roleSupportsConsolidatedView,
} from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/lib/types'
import React, { createContext, useContext, useEffect, useState } from 'react'

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

export function PropertyProvider({ children }: { children: React.ReactNode }) {
    const { user, primaryRole } = useAuth()
    const [currentProperty, setCurrentProperty] = useState<Property | null>(null)
    const [availableProperties, setAvailableProperties] = useState<Property[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // System roles that have access to all properties at group level.
    const isCorporateRole = roleSupportsConsolidatedView(primaryRole)

    const fetchProperties = async () => {
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

                if (error) throw error

                // Add Group-level option for corporate users (also acts as Head Office)
                const allOption: Property = {
                    id: CONSOLIDATED_PROPERTY_ID,
                    name: 'PRIME GROUP (HEAD OFFICE)',
                    address: 'Corporate Headquarters & Global Operations',
                    phone: '',
                    is_active: true,
                    created_at: new Date().toISOString()
                }

                // Filter out the redundant 'PRIME Head Office' from the list if it exists
                const filteredData = (data || []).filter(p => p.name !== 'PRIME Head Office')
                props = [allOption, ...filteredData]
            } else {
                // Property users fetch ONLY assigned properties via user_properties
                const { data, error } = await supabase
                    .from('user_properties')
                    .select('property:properties(*)')
                    .eq('user_id', user.id)

                if (error) throw error

                const mappedProperties = (data ?? [])
                    .map((item) => item.property as Property | null | undefined)
                    .filter((p): p is Property => !!p)

                const uniqueProperties = Array.from(
                    new Map(mappedProperties.map((property) => [property.id, property])).values()
                ).sort((a, b) => a.name.localeCompare(b.name))

                // If user is assigned to 2+ properties, add a cluster aggregation option
                if (uniqueProperties.length > 1) {
                    const clusterNames = uniqueProperties.map((property) => property.name).join(' & ')
                    const clusterOption: Property = {
                        id: CONSOLIDATED_PROPERTY_ID,
                        name: `My Cluster (${uniqueProperties.length})`,
                        address: clusterNames,
                        phone: '',
                        is_active: true,
                        created_at: new Date().toISOString()
                    }
                    props = [clusterOption, ...uniqueProperties]
                } else {
                    props = uniqueProperties
                }
            }

            setAvailableProperties(props)

            // Determine current property
            if (props.length > 0) {
                // 1. Try to restore from local storage
                const savedId = localStorage.getItem('prime_current_property_id')
                const savedProp = props.find(p => p.id === savedId)

                if (savedProp) {
                    setCurrentProperty(savedProp)
                } else {
                    // 2. Default to the first available
                    setCurrentProperty(props[0])
                    localStorage.setItem('prime_current_property_id', props[0].id)
                }
            } else {
                setCurrentProperty(null)
            }

        } catch (error) {
            console.error('Error fetching properties:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchProperties()
    }, [user, primaryRole])

    const switchProperty = (propertyId: string) => {
        const prop = availableProperties.find(p => p.id === propertyId)
        if (prop) {
            setCurrentProperty(prop)
            localStorage.setItem('prime_current_property_id', propertyId)
        }
    }

    // Real property IDs (excludes the consolidated pseudo-property).
    const propertyIds = availableProperties
        .filter((property) => isRealPropertyId(property.id))
        .map(p => p.id)

    const value = {
        currentProperty,
        availableProperties,
        isLoading,
        isMultiPropertyUser: propertyIds.length > 1 || isCorporateRole,
        propertyIds,
        switchProperty,
        refreshProperties: fetchProperties
    }

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
