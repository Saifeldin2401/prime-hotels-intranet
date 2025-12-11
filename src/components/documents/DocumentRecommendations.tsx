import { useQuery } from '@tanstack/react-query';
import { FileText, Star, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DocumentRecommendations() {
  const { user } = useAuth();

  const { data: recommendations } = useQuery({
    queryKey: ['document-recommendations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get user's department and role
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('department_id, role')
        .eq('id', user.id)
        .single();

      if (!userData) return [];

      // Build query for recommended documents
      let query = supabase
        .from('documents')
        .select('*')
        .eq('status', 'PUBLISHED')
        .neq('created_by', user.id) // Exclude user's own documents
        .order('last_accessed_at', { ascending: true, nullsFirst: true })
        .limit(8);

      // Filter by department if applicable
      if (userData.department_id) {
        query = query.or(`department_id.eq.${userData.department_id},is_company_wide.eq.true`);
      } else {
        query = query.eq('is_company_wide', true);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (!recommendations?.length) return null;

  const getRecommendationReason = (doc: any) => {
    if (doc.is_company_wide) return 'Company-wide';
    if (doc.department_id) return 'Your Department';
    return 'Recommended';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((doc) => (
          <Link
            key={doc.id}
            to={`/documents/${doc.id}`}
            className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{doc.title}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {doc.is_company_wide ? (
                <Star className="h-3 w-3 text-yellow-500" />
              ) : (
                <Building2 className="h-3 w-3 text-blue-500" />
              )}
              <Badge variant="secondary" className="text-xs">
                {getRecommendationReason(doc)}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
