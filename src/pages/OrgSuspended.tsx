import { useAccountContext } from '@/hooks/useAccountContext'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { AlertOctagon } from 'lucide-react'

export default function OrgSuspended() {
  const account = useAccountContext()
  const { signOut } = useAuth()
  const org = account.tenantMemberships[0]

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <AlertOctagon className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">Access temporarily unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {org?.organization_name ? <><strong>{org.organization_name}</strong> is </> : 'Your organization is '}
          currently {org?.lifecycle_status === 'archived' ? 'archived' : 'suspended'}. Training, knowledge, and
          assessment content are paused until it is reactivated.
        </p>
        <p className="text-xs text-muted-foreground">
          Please contact your organization administrator. If you believe this is an error, contact platform support.
        </p>
        <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
      </div>
    </div>
  )
}
