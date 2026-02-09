import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { SidebarNavigation } from '@/components/layout/SidebarNavigation'
import { WizardTrigger } from '@/components/common/WizardTrigger'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
    children?: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col no-horizontal-scroll pt-safe">
            {/* Main Content Area - with padding for bottom nav */}
            <main className="flex-1 w-full max-w-none mx-auto px-safe pt-4 pb-24 pb-safe animate-in fade-in duration-300">
                {children || <Outlet />}
            </main>

            {/* Floating Bottom Navigation */}
            {/* Floating Bottom Navigation */}
            <MobileNavigation
                onMenuClick={() => setSidebarOpen(true)}
                className={sidebarOpen ? "hidden" : ""}
            />

            {/* Sidebar (Drawer) */}
            <SidebarNavigation
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isMobile={true}
            />
            <WizardTrigger />
        </div>
    )
}
