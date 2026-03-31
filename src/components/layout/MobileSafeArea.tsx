/**
 * MobileSafeArea Component
 * 
 * Wrapper component to ensure content is not blocked by the mobile bottom navigation.
 * Use this for pages that have content extending to the bottom of the screen.
 */

import { cn } from '@/lib/utils'

interface MobileSafeAreaProps {
  children: React.ReactNode
  className?: string
  /**
   * Variant determines the amount of padding
   * - standard: For most pages (140px + safe area)
   * - xl: For pages with forms or buttons at bottom (160px + safe area)
   */
  variant?: 'standard' | 'xl'
  /**
   * If true, adds extra margin to the last child element
   */
  protectLastChild?: boolean
}

/**
 * MobileSafeArea - Ensures content isn't blocked by bottom nav
 * 
 * Usage:
 * ```tsx
 * <MobileSafeArea variant="xl">
 *   <YourPageContent />
 * </MobileSafeArea>
 * ```
 */
export function MobileSafeArea({ 
  children, 
  className,
  variant = 'standard',
  protectLastChild = true
}: MobileSafeAreaProps) {
  const paddingClass = variant === 'xl' ? 'pb-nav-xl' : 'pb-nav'
  
  return (
    <div 
      className={cn(
        'min-h-full',
        paddingClass,
        protectLastChild && '[&>*:last-child]:mb-8',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * MobileSpacer - Adds fixed spacing at bottom of content
 * 
 * Use this at the end of any page content that might get blocked:
 * ```tsx
 * <div>
 *   <YourContent />
 *   <MobileSpacer />
 * </div>
 * ```
 */
export function MobileSpacer({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'h-[140px] shrink-0 pointer-events-none',
        className
      )} 
      aria-hidden="true"
    />
  )
}

/**
 * MobileBottomBuffer - Inline style object for programmatic use
 */
export const mobileBottomBuffer = {
  style: {
    paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px) + 2.5rem)',
    minHeight: '100%',
  }
} as const
