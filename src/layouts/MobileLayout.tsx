import { WizardTrigger } from '@/components/common/WizardTrigger'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { SidebarNavigation } from '@/components/layout/SidebarNavigation'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useProperty } from '@/contexts/PropertyContext'
import { isConsolidatedPropertyId } from '@/lib/propertyScope'
import { Building, Globe } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'

interface MobileLayoutProps {
    children?: React.ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { currentProperty } = useProperty()

    return (
        <div className="min-h-dvh bg-gray-50 flex flex-col no-horizontal-scroll">
            {/* Dedicated Mobile Top Header - Distinct from Desktop */}
            <header className="sticky top-0 z-50 w-full h-16 bg-white/80 backdrop-blur-lg border-b border-gray-100 flex items-center justify-between px-4 sm:px-6">
                <Link to="/" className="flex items-center gap-2">
                    <img
                        src="/prime-logo-light.png"
                        alt="Prime Hotels"
                        className="h-8 w-auto brightness-0" /* Darken for light mobile theme */
                    />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-hotel-navy leading-none tracking-tight">PRIME</span>
                        <span className="text-[10px] text-hotel-gold font-bold uppercase tracking-widest leading-none">Connect</span>
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    {/* Compact Property Indicator */}
                    {currentProperty && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-[10px] font-medium text-gray-600">
                            {isConsolidatedPropertyId(currentProperty.id) ? <Globe className="w-3 h-3 text-indigo-500" /> : <Building className="w-3 h-3 text-hotel-gold" />}
                            <span className="max-w-[80px] truncate">{currentProperty.name}</span>
                        </div>
                    )}
                    <NotificationBell />
                </div>
            </header>

            {/* Main Content Area - with padding for bottom nav and top header */}
            <main className="flex-1 w-full max-w-none mx-auto px-safe pb-32 pb-safe animate-in fade-in duration-300">
                {children || <Outlet />}
            </main>

            {/* Render one mobile navigation surface at a time to avoid duplicate data subscriptions */}
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
            <WizardTrigger />
        </div>
    )
}
