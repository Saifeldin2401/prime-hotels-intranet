import { useQuery } from '@tanstack/react-query';
import { FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';

export function RecentlyViewedDocuments({ limit = 5 }: { limit?: number }) {
  const { user } = useAuth();

  const { data: recentViews } = useQuery({
    queryKey: ['recent-document-views', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('document_access_logs')
        .select('document_id, documents!inner(title, status), created_at')
        .eq('user_id', user.id)
        .eq('action', 'view')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return data || [];
    },
    enabled: !!user?.id
  });

  if (!recentViews?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Viewed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentViews.map((view) => (
          <Link
            key={view.document_id}
            to={`/documents/${view.document_id}`}
            className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{view.documents?.[0]?.title || 'Untitled'}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(view.created_at)}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
