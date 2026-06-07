import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/utils'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from "react-i18next"
import { 
  getActiveSessions, 
  revokeSession, 
  revokeAllOtherSessions,
  logSecurityEvent,
} from '@/lib/authSecurityService'
import { 
  Loader2, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  LogOut, 
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Session {
  id: string
  createdAt: Date
  lastActiveAt: Date
  ipAddress: string
  userAgent: string
  isCurrent: boolean
}

export function SessionList() {
  const { t } = useTranslation('auth');
  const { user, signOut } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const sessionData = await getActiveSessions(user.id)
      setSessions(sessionData)
    } catch (err) {
      console.error('Error loading sessions:', err)
      setError(t('sessions.load_error', { defaultValue: 'Failed to load sessions' }))
    } finally {
      setLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    loadSessions()
    
    // Refresh sessions every 2 minutes, only when tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadSessions()
      }
    }, 120000)
    
    return () => clearInterval(interval)
  }, [loadSessions])

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId)
      const success = await revokeSession(sessionId)
      
      if (success) {
        toast.success(t('sessions.revoked_success', { defaultValue: 'Session revoked successfully' }))
        await loadSessions()
        await logSecurityEvent('session.revoked', { sessionId })
      } else {
        toast.error(t('sessions.revoke_failed', { defaultValue: 'Failed to revoke session' }))
      }
    } catch (err) {
      console.error('Error revoking session:', err)
      toast.error(t('sessions.revoke_error', { defaultValue: 'An error occurred' }))
    } finally {
      setRevokingId(null)
    }
  }

  const handleSignOutAll = async () => {
    try {
      setLoading(true)
      
      const success = await revokeAllOtherSessions()
      if (success) {
        toast.success(t('sessions.signed_out_all', { defaultValue: 'Signed out from all other devices' }))
        await loadSessions()
        await logSecurityEvent('session.signed_out_all')
      } else {
        toast.error(t('sessions.sign_out_failed', { defaultValue: 'Failed to sign out from other devices' }))
      }
    } catch (err) {
      console.error('Error signing out all:', err)
      toast.error(t('sessions.sign_out_error', { defaultValue: 'An error occurred' }))
    } finally {
      setLoading(false)
    }
  }

  const handleSignOutAllDevices = async () => {
    try {
      await logSecurityEvent('session.sign_out_all_initiated')
      
      // Sign out globally
      await signOut()
      window.location.href = '/login'
    } catch (err) {
      console.error('Error signing out:', err)
      toast.error(t('sessions.sign_out_error', { defaultValue: 'An error occurred' }))
    }
  }

  // Detect device type from user agent
  const getDeviceInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return { icon: Smartphone, label: t('sessions.mobile_device', { defaultValue: 'Mobile Device' }) }
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return { icon: Tablet, label: t('sessions.tablet', { defaultValue: 'Tablet' }) }
    }
    return { icon: Monitor, label: t('sessions.desktop', { defaultValue: 'Desktop' }) }
  }

  // Get browser info
  const getBrowserInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
    if (ua.includes('firefox')) return 'Firefox'
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
    if (ua.includes('edg')) return 'Edge'
    return t('sessions.unknown_browser', { defaultValue: 'Unknown Browser' })
  }

  if (loading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('sessions.active_sessions', { defaultValue: 'Active Sessions' })}</CardTitle>
          <CardDescription>{t('sessions.manage_description', { defaultValue: 'Manage your active sessions across devices' })}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t('sessions.active_sessions', { defaultValue: 'Active Sessions' })}
        </CardTitle>
        <CardDescription>
          {t('sessions.manage_description', { defaultValue: 'Manage your active sessions across devices' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('sessions.no_active_sessions', { defaultValue: 'No active sessions found' })}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {sessions.map((session) => {
                const { icon: DeviceIcon, label: deviceLabel } = getDeviceInfo(session.userAgent)
                const browserName = getBrowserInfo(session.userAgent)
                
                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      session.isCurrent ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <DeviceIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {deviceLabel}
                          {session.isCurrent && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                              {t('sessions.current', { defaultValue: 'Current' })}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {browserName} • {session.ipAddress || t('sessions.unknown_ip', { defaultValue: 'Unknown IP' })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('sessions.started', { defaultValue: 'Started:' })} {formatDateTime(session.createdAt.toISOString())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('sessions.last_active', { defaultValue: 'Last active:' })} {formatDateTime(session.lastActiveAt.toISOString())}
                        </p>
                      </div>
                    </div>
                    
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => void handleSignOutAll()}
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('sessions.sign_out_others', { defaultValue: 'Sign Out from Other Devices' })}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => void handleSignOutAllDevices()}
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('sessions.sign_out_all', { defaultValue: 'Sign Out from All Devices' })}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionList;
