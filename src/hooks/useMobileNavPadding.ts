import { useEffect } from 'react'

/**
 * Hook to dynamically adjust padding for mobile bottom navigation
 * Use this when you have content that extends to the bottom of the screen
 */
export function useMobileNavPadding(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!ref.current) return
    
    // Add padding class to the element
    ref.current.classList.add('has-bottom-nav')
    
    return () => {
      ref.current?.classList.remove('has-bottom-nav')
    }
  }, [ref])
}

/**
 * CSS class strings for different bottom padding scenarios
 */
export const mobilePadding = {
  /**
   * Standard padding for pages with bottom nav
   */
  standard: 'pb-[calc(110px+env(safe-area-inset-bottom,0px)+1.5rem)]',
  
  /**
   * Extra large padding for pages with forms at bottom
   */
  xl: 'pb-[calc(120px+env(safe-area-inset-bottom,0px)+2rem)]',
  
  /**
   * Use for the last element in a scrollable list
   */
  lastElement: 'mb-[calc(20px+env(safe-area-inset-bottom,0px))]',
  
  /**
   * For fixed bottom buttons or actions
   */
  fixedBottom: 'bottom-[calc(100px+env(safe-area-inset-bottom,0px))]',
} as const

/**
 * Inline style object for programmatic use
 */
export function getMobilePaddingStyle(variant: 'standard' | 'xl' = 'standard'): React.CSSProperties {
  const values = {
    standard: 'calc(110px + env(safe-area-inset-bottom, 0px) + 1.5rem)',
    xl: 'calc(120px + env(safe-area-inset-bottom, 0px) + 2rem)',
  }
  
  return {
    paddingBottom: values[variant],
  }
}
