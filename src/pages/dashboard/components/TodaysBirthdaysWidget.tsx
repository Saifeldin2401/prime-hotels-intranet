import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Cake, Loader2, Gift } from 'lucide-react'
import { useTodaysBirthdays } from '@/hooks/useEmployeeDirectory'

function getInitials(name?: string | null) {
  return name
    ? name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '??'
}

export function TodaysBirthdaysWidget() {
  const navigate = useNavigate()
  const { data: birthdays = [], isLoading } = useTodaysBirthdays()

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-white to-rose-50/60">
      <div className="h-1.5 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link to="/directory" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Cake className="w-5 h-5 text-rose-500" />
            Today's Birthdays
          </Link>
        </CardTitle>
        <CardDescription>
          Celebrate team members with birthdays today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : birthdays.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No birthdays today.
          </div>
        ) : (
          birthdays.slice(0, 6).map((person) => (
            <div key={person.id} className="flex items-center gap-3 rounded-lg border border-rose-100 bg-white/70 p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={person.avatar_url || ''} />
                <AvatarFallback className="text-xs">{getInitials(person.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{person.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {person.job_title || 'Team Member'}
                  {person.property_name ? ` | ${person.property_name}` : ''}
                </div>
              </div>
              {person.age ? (
                <Badge variant="outline" className="border-rose-200 text-rose-700">
                  {person.age}
                </Badge>
              ) : null}
            </div>
          ))
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/directory')}
        >
          <Gift className="w-4 h-4 me-2" />
          Open Directory
        </Button>
      </CardContent>
    </Card>
  )
}

export default TodaysBirthdaysWidget

