import { useQuery } from '@tanstack/react-query'
import { FileText, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

const STORAGE_KEY = 'docs_recently_viewed'
const MAX_ITEMS = 20

type RecentlyViewedItem = { id: string; viewedAt: string }

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function getStoredViews(userId: string): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    const parsed = raw ? (JSON.parse(raw) as RecentlyViewedItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function RecentlyViewedDocuments({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth()

  const { data: recentViews } = useQuery({
    queryKey: ['recent-document-views', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const items = getStoredViews(user.id)
        .filter((i) => isValidUUID(i.id))
        .slice(0, Math.min(limit, MAX_ITEMS))

      if (items.length === 0) return []

      const ids = items.map((i) => i.id)

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, status')
        .in('id', ids)
        .eq('is_deleted', false)

      if (error) {
        console.warn('Failed to fetch recently viewed documents:', error)
        return []
      }

      const docById = new Map((data || []).map((d: any) => [d.id, d]))
      return items
        .map((i) => ({ ...i, document: docById.get(i.id) }))
        .filter((v) => v.document)
    },
    enabled: !!user?.id
  })

  if (!recentViews?.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Viewed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentViews.map((view: any) => (
          <Link
            key={view.id}
            to={`/documents/${view.id}`}
            className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{view.document?.title || 'Untitled'}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(view.viewedAt)}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
