import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

interface Session {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  ip?: string
  user_agent?: string
}

export function SessionList() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      // Note: Supabase doesn't expose session list directly
      // This would need to be implemented via a custom endpoint or stored sessions table
      // For now, we'll show the current session
      if (data.user) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          setSessions([
            {
              id: sessionData.session.access_token.substring(0, 20),
              user_id: sessionData.session.user.id,
              created_at: new Date(sessionData.session.expires_at! * 1000 - 3600000).toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOutAll = async () => {
    // Sign out from all devices
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <div>Loading sessions...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>Manage your active sessions across devices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground">No active sessions found</p>
        ) : (
          <>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">
                    Last active: {formatDateTime(session.updated_at)}
                  </p>
                  {session.ip && (
                    <p className="text-sm text-muted-foreground">IP: {session.ip}</p>
                  )}
                </div>
              </div>
            ))}
            <Button variant="destructive" onClick={handleSignOutAll} className="w-full">
              Sign Out from All Devices
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

