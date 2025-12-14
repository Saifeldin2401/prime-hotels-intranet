/**
 * RTL Support Hook
 * 
 * Provides RTL direction detection and utilities for Arabic support.
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export function useRTL() {
    const { i18n } = useTranslation()

    const isRTL = i18n.dir() === 'rtl' || i18n.language === 'ar'

    /**
     * Flip a direction-aware class name for RTL
     */
    const flipClass = useCallback((ltrClass: string, rtlClass: string) => {
        return isRTL ? rtlClass : ltrClass
    }, [isRTL])

    /**
     * Get the correct text alignment
     */
    const textAlign = useCallback((align: 'start' | 'end') => {
        if (align === 'start') {
            return isRTL ? 'text-right' : 'text-left'
        }
        return isRTL ? 'text-left' : 'text-right'
    }, [isRTL])

    /**
     * Get margin/padding direction classes
     */
    const spacing = useCallback((type: 'margin' | 'padding', side: 'start' | 'end', size: string) => {
        const prefix = type === 'margin' ? 'm' : 'p'
        if (side === 'start') {
            return isRTL ? `${prefix}r-${size}` : `${prefix}l-${size}`
        }
        return isRTL ? `${prefix}l-${size}` : `${prefix}r-${size}`
    }, [isRTL])

    /**
     * Flip arrow icons for RTL
     */
    const arrowClass = useCallback((direction: 'left' | 'right') => {
        if (isRTL) {
            return direction === 'left' ? 'rotate-180' : ''
        }
        return direction === 'right' ? '' : 'rotate-180'
    }, [isRTL])

    return {
        isRTL,
        dir: isRTL ? 'rtl' : 'ltr',
        flipClass,
        textAlign,
        spacing,
        arrowClass
    }
}

/**
 * Utility to conditionally apply RTL-aware classes
 */
export function rtlClass(isRTL: boolean, ltrClass: string, rtlClass: string): string {
    return isRTL ? rtlClass : ltrClass
}
