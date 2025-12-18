import { AlertCircle, Clock, LogOut, RefreshCw } from 'lucide-react'
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

interface SessionTimeoutWarningProps {
    enabled?: boolean
}

export function SessionTimeoutWarning({ enabled = true }: SessionTimeoutWarningProps) {
    const {
        showWarning,
        remainingMinutes,
        remainingSeconds,
        extendSession,
        signOutNow
    } = useInactivityTimeout({ enabled })

    const formatTime = () => {
        if (remainingSeconds < 60) {
            return `${remainingSeconds} seconds`
        }
        return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
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
                            Session Timeout Warning
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Your session will expire due to inactivity.
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">
                                Time remaining: <span className="text-primary">{formatTime()}</span>
                            </span>
                        </div>
                        <p className="text-sm">
                            Click "Stay Signed In" to continue your session, or you will be automatically signed out.
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
                        Sign Out Now
                    </Button>
                    <Button
                        onClick={extendSession}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Stay Signed In
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default SessionTimeoutWarning
