import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UserDataDebug() {
  const { user, profile, roles, properties, departments, primaryRole, loading } = useAuth()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <Card className="mt-4 border-yellow-500">
      <CardHeader>
        <CardTitle className="text-sm">Debug Info (Dev Only)</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>User:</strong> {user ? user.email : 'None'}
        </div>
        <div>
          <strong>Profile:</strong> {profile ? profile.email : 'None'}
        </div>
        <div>
          <strong>Roles:</strong> {roles.length} ({roles.map(r => r.role).join(', ') || 'None'})
        </div>
        <div>
          <strong>Primary Role:</strong> {primaryRole || 'None'}
        </div>
        <div>
          <strong>Properties:</strong> {properties.length} ({properties.map(p => p.name).join(', ') || 'None'})
        </div>
        <div>
          <strong>Departments:</strong> {departments.length} ({departments.map(d => d.name).join(', ') || 'None'})
        </div>
      </CardContent>
    </Card>
  )
}



