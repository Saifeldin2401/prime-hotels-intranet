import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { SidebarNavigation } from '@/components/layout/SidebarNavigation'
import { useProperty } from '@/contexts/PropertyContext'
import { cn } from '@/lib/utils'
import { Suspense, lazy, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

const WizardTrigger = lazy(() =>
  import('@/components/common/WizardTrigger').then((module) => ({ default: module.WizardTrigger }))
)

interface MobileLayoutProps {
    children?: React.ReactNode
    /** Hide the default header */
    hideHeader?: boolean
    /** Custom header title */
    headerTitle?: string
    /** Custom header subtitle */
    headerSubtitle?: string
    /** Show back button in header */
    showBack?: boolean
    /** Custom class for main content */
    className?: string
}

/**
 * MobileLayout - Enhanced mobile layout with improved navigation
 * 
 * Features:
 * - Safe area support for notched devices
 * - Sticky header with back navigation
 * - Bottom navigation bar
 * - Pull-to-refresh support
 * - Optimized touch targets
 */
export function MobileLayout({ 
    children, 
    hideHeader = false,
    headerTitle,
    headerSubtitle,
    showBack,
    className,
}: MobileLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [deferredChromeReady, setDeferredChromeReady] = useState(false)
    const { currentProperty } = useProperty()
    const location = useLocation()

    // Get page title from current route
    const getPageTitle = () => {
        if (headerTitle) return headerTitle
        
        // Map routes to titles
        const path = location.pathname
        if (path === '/') return 'Dashboard'
        
        // Extract title from path
        const segments = path.split('/').filter(Boolean)
        if (segments.length === 0) return 'Home'
        
        const lastSegment = segments[segments.length - 1]
        
        // Check if last segment is a UUID (e.g., article ID, document ID)
        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidPattern.test(lastSegment)) {
            // Return a generic title based on the parent route
            const parentSegment = segments.length > 1 ? segments[segments.length - 2] : null
            if (parentSegment === 'knowledge') return 'Article'
            if (parentSegment === 'documents') return 'Document'
            if (parentSegment === 'training') return 'Training'
            if (parentSegment === 'quizzes') return 'Quiz'
            if (parentSegment === 'tasks') return 'Task'
            if (parentSegment === 'profile') return 'Profile'
            if (parentSegment === 'questions') return 'Question'
            return 'Details'
        }
        
        return lastSegment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDeferredChromeReady(true)
        }, 500)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [])

    return (
        <div className="min-h-dvh bg-background flex flex-col no-horizontal-scroll">
            {/* Sticky Header */}
            {!hideHeader && (
                <MobileHeader
                    title={getPageTitle()}
                    subtitle={headerSubtitle}
                    showBack={showBack || location.pathname !== '/'}
                    onMenuClick={() => setSidebarOpen(true)}
                    className="shrink-0"
                />
            )}

            {/* Main Content */}
            <main 
                className={cn(
                    'flex-1 w-full max-w-none mx-auto',
                    'px-4 sm:px-6 py-4',
                    'has-bottom-nav', /* Adds padding for enhanced bottom nav with FAB */
                    'animate-in fade-in duration-300',
                    className
                )}
            >
                {children || <Outlet />}
                {/* Spacer to ensure content never gets blocked by bottom nav */}
                <div className="h-20 shrink-0 pointer-events-none" aria-hidden="true" />
            </main>

            {/* Navigation */}
            {sidebarOpen ? (
                <SidebarNavigation
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isMobile={true}
                />
            ) : (
                <MobileNavigation
                    onMenuClick={() => setSidebarOpen(true)}
                />
            )}

            {/* Deferred components */}
            <Suspense fallback={null}>
                {deferredChromeReady && <WizardTrigger />}
            </Suspense>
        </div>
    )
}
