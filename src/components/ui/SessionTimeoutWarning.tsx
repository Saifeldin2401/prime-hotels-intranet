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
import { AlertCircle, Clock, LogOut, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SessionTimeoutWarningProps {
    enabled?: boolean
}

export function SessionTimeoutWarning({ enabled = true }: SessionTimeoutWarningProps) {
    const { t } = useTranslation('common')
    const {
        showWarning,
        remainingMinutes,
        remainingSeconds,
        extendSession,
        signOutNow
    } = useInactivityTimeout({ enabled })

    const formatTime = () => {
        if (remainingSeconds < 60) {
            return t('session_timeout.seconds', { count: remainingSeconds, defaultValue: '{{count}} seconds' })
        }
        return t('session_timeout.minutes', { count: remainingMinutes, defaultValue: '{{count}} minutes' })
    }

    return (
        <AlertDialog open={showWarning}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <AlertDialogTitle className="text-lg">
                            {t('session_timeout.title', { defaultValue: 'Session Timeout Warning' })}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            {t('session_timeout.description', { defaultValue: 'Your session will expire due to inactivity.' })}
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">
                                {t('session_timeout.time_remaining', { defaultValue: 'Time remaining:' })}{' '}
                                <span className="text-primary">{formatTime()}</span>
                            </span>
                        </div>
                        <p className="text-sm">
                            {t('session_timeout.guidance', { defaultValue: 'Click "Stay Signed In" to continue your session, or you will be automatically signed out.' })}
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={signOutNow}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        {t('session_timeout.sign_out', { defaultValue: 'Sign Out Now' })}
                    </Button>
                    <Button
                        onClick={extendSession}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {t('session_timeout.stay_signed_in', { defaultValue: 'Stay Signed In' })}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default SessionTimeoutWarning
