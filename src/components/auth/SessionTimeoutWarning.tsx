import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SessionTimeoutWarningProps {
    open: boolean
    remainingTime: string
    onExtend: () => void
    onLogout: () => void
}

export function SessionTimeoutWarning({
    open,
    remainingTime,
    onExtend,
    onLogout
}: SessionTimeoutWarningProps) {
    const { t } = useTranslation('auth')

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    </div>
                    <DialogTitle className="text-xl">
                        {t('session_timeout.title', { defaultValue: 'Session Expiring Soon' })}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {t('session_timeout.message', {
                            defaultValue: 'Your session will expire due to inactivity. Would you like to stay logged in?'
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-center py-6">
                    <div className="flex items-center gap-3 px-6 py-4 bg-gray-100 rounded-lg">
                        <Clock className="h-6 w-6 text-gray-600" />
                        <div className="text-center">
                            <div className="text-3xl font-mono font-bold text-gray-800">
                                {remainingTime}
                            </div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                                {t('session_timeout.time_remaining', { defaultValue: 'Time Remaining' })}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={onLogout}
                        className="w-full sm:w-auto"
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('session_timeout.logout', { defaultValue: 'Log Out Now' })}
                    </Button>
                    <Button
                        onClick={onExtend}
                        className="w-full sm:w-auto"
                    >
                        {t('session_timeout.stay_logged_in', { defaultValue: 'Stay Logged In' })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
