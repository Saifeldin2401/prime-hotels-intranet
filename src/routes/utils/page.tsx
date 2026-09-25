import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import type { Capability } from '@/hooks/useCapabilities'

interface PageOptions {
    /** Tenant capability (any of) the signed-in member needs for this page. */
    capability?: Capability | Capability[]
}

/**
 * The one way a workspace route renders a page: authentication, optional
 * capability check against the database capability matrix, then the app shell.
 */
export function page(content: ReactNode, { capability }: PageOptions = {}) {
    return (
        <ProtectedRoute requiredCapability={capability}>
            <AppLayout>{content}</AppLayout>
        </ProtectedRoute>
    )
}
