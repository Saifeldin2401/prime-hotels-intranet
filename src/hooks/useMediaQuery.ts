/**
 * useMediaQuery Hook
 * 
 * React hook for responsive design using CSS media queries.
 */

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook to track a media query
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Add listener
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

// Predefined breakpoints matching Tailwind
export const breakpoints = {
  xs: '(max-width: 639px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

/**
 * Hook to detect if viewport is mobile (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/**
 * Hook to detect if viewport is tablet (768px - 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

/**
 * Hook to detect if viewport is desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * Hook to detect touch capability
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)')
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Hook to detect if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

/**
 * Hook to detect screen orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const isLandscape = useMediaQuery('(orientation: landscape)')
  return isLandscape ? 'landscape' : 'portrait'
}

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const is2xl = useMediaQuery(breakpoints['2xl'])
  const isXl = useMediaQuery(breakpoints.xl)
  const isLg = useMediaQuery(breakpoints.lg)
  const isMd = useMediaQuery(breakpoints.md)
  const isSm = useMediaQuery(breakpoints.sm)

  if (is2xl) return '2xl'
  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  if (isSm) return 'sm'
  return 'xs'
}

/**
 * Hook for responsive value based on breakpoints
 */
export function useResponsiveValue<T>(values: {
  default: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}): T {
  const breakpoint = useBreakpoint()
  
  const getValue = useCallback((): T => {
    switch (breakpoint) {
      case '2xl':
        return values['2xl'] ?? values.xl ?? values.lg ?? values.md ?? values.sm ?? values.default
      case 'xl':
        return values.xl ?? values.lg ?? values.md ?? values.sm ?? values.default
      case 'lg':
        return values.lg ?? values.md ?? values.sm ?? values.default
      case 'md':
        return values.md ?? values.sm ?? values.default
      case 'sm':
        return values.sm ?? values.default
      default:
        return values.default
    }
  }, [breakpoint, values])

  return getValue()
}
