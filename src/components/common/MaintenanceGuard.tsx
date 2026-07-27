import { useAuth } from '@/hooks/useAuth'
import { useMaintenanceMode, useAppBranding } from '@/hooks/useSystemSettings'
import { ShieldAlert, Wrench, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const { isMaintenance, isLoading } = useMaintenanceMode()
    const { profile } = useAuth()
    const { appName, companyName } = useAppBranding()

    const role = String(profile?.role || '')
    const isAdmin = role === 'corporate_admin' || role === 'regional_admin' || role === 'property_manager'

    // If maintenance mode is ON and user is NOT an admin, block access
    if (!isLoading && isMaintenance && !isAdmin) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                        <Wrench className="w-8 h-8 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">{appName} Under Maintenance</h1>
                        <p className="text-sm text-slate-400">
                            {companyName} platform administrators have enabled system maintenance mode.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-300 flex items-center gap-3 text-start">
                        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <span>Scheduled upgrades and system optimization are currently in progress. Access will resume shortly.</span>
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-hotel-gold hover:bg-amber-600 text-slate-950 font-semibold gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Check Again
                    </Button>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
