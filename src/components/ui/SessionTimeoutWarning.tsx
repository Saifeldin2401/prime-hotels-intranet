import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SessionTimeoutWarningProps {
    enabled?: boolean
}

export function SessionTimeoutWarning({ enabled = true }: SessionTimeoutWarningProps) {
    const { t, i18n } = useTranslation('common')
    const [isExtending, setIsExtending] = useState(false)
    const isRTL = i18n.dir() === 'rtl'

    const {
        showWarning,
        remainingMinutes,
        remainingSeconds,
        extendSession,
        signOutNow
    } = useInactivityTimeout({ enabled })

    const handleExtend = async () => {
        setIsExtending(true)
        try {
            await extendSession()
        } finally {
            setIsExtending(false)
        }
    }

    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    const isUrgent = remainingSeconds <= 30

    return (
        <AlertDialog open={showWarning}>
            <AlertDialogContent className="max-w-md border-amber-500/30 dark:border-amber-500/20 shadow-2xl p-6">
                <AlertDialogHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isUrgent ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 animate-pulse' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'}`}>
                            <AlertTriangle className="h-6 w-6 shrink-0" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {t('session_timeout.title', { defaultValue: 'Session Timeout Warning' })}
                            </AlertDialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('session_timeout.description', { defaultValue: 'Your session is about to expire due to inactivity.' })}
                            </p>
                        </div>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 pt-1">
                            {/* Live Timer Card */}
                            <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${isUrgent ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50' : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'}`}>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <span>{t('session_timeout.time_remaining', { defaultValue: 'Time remaining:' })}</span>
                                </div>
                                <span className={`font-mono font-extrabold text-base tracking-wider px-2.5 py-0.5 rounded-md ${isUrgent ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                                    {formattedTime}
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {t('session_timeout.guidance', { defaultValue: 'Click "Stay Signed In" to keep working, or you will be automatically logged out for security.' })}
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        variant="outline"
                        onClick={signOutNow}
                        className="gap-2 text-xs font-semibold h-10 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                        <LogOut className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                        {t('session_timeout.sign_out', { defaultValue: 'Sign Out Now' })}
                    </Button>
                    <Button
                        onClick={handleExtend}
                        disabled={isExtending}
                        className="gap-2 text-xs font-bold h-10 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                    >
                        <RefreshCw className={`h-4 w-4 ${isExtending ? 'animate-spin' : ''}`} />
                        {t('session_timeout.stay_signed_in', { defaultValue: 'Stay Signed In' })}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default SessionTimeoutWarning

