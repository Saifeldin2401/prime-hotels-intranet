import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/lib/types'

interface PropertyContextType {
    currentProperty: Property | null
    availableProperties: Property[]
    isLoading: boolean
    isMultiPropertyUser: boolean
    switchProperty: (propertyId: string) => void
    refreshProperties: () => Promise<void>
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: React.ReactNode }) {
    const { user, primaryRole } = useAuth()
    const [currentProperty, setCurrentProperty] = useState<Property | null>(null)
    const [availableProperties, setAvailableProperties] = useState<Property[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // System roles that have access to ALL properties
    const isCorporateRole = ['regional_admin', 'regional_hr'].includes(primaryRole || '')

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

                // Add "All Properties" option
                const allOption: Property = {
                    id: 'all',
                    name: 'All Properties',
                    address: 'Corporate',
                    phone: '',
                    is_active: true,
                    created_at: new Date().toISOString()
                }

                props = [allOption, ...(data || [])]
            } else {
                // Property users fetch ONLY assigned properties via user_properties
                const { data, error } = await supabase
                    .from('user_properties')
                    .select('property:properties(*)')
                    .eq('user_id', user.id)

                if (error) throw error

                const mappedProperties = (data ?? [])
                    .map((item: any) => item.property as Property | null | undefined)
                    .filter((p): p is Property => !!p)

                props = mappedProperties
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

    const value = {
        currentProperty,
        availableProperties,
        isLoading,
        isMultiPropertyUser: availableProperties.length > 1 || isCorporateRole,
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
