import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DocumentRecommendations() {
  const { user } = useAuth();

  const { data: recommendations } = useQuery({
    queryKey: ['document-recommendations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [{ data: deptRows }, { data: roleRows }, { data: propRows }] = await Promise.all([
        supabase.from('user_departments').select('department_id').eq('user_id', user.id),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('user_properties').select('property_id').eq('user_id', user.id),
      ])

      const departmentIds = [...new Set((deptRows || []).map((d) => d.department_id).filter(Boolean))]
      const roles = [...new Set((roleRows || []).map((r) => r.role).filter(Boolean))]
      const propertyIds = [...new Set((propRows || []).map((p) => p.property_id).filter(Boolean))]

      // Build query for recommended documents
      let query = supabase
        .from('documents')
        .select('id, title, visibility, property_id, department_id, role, featured, updated_at')
        .eq('status', 'PUBLISHED')
        .eq('is_deleted', false)
        .neq('created_by', user.id) // Exclude user's own documents
        .order('featured', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(8);

      const orParts: string[] = ['visibility.eq.all_properties']
      if (propertyIds.length > 0) {
        orParts.push(`and(visibility.eq.property,property_id.in.(${propertyIds.join(',')}))`)
      }
      if (departmentIds.length > 0) {
        orParts.push(`and(visibility.eq.department,department_id.in.(${departmentIds.join(',')}))`)
      }
      if (roles.length > 0) {
        // roles are enum values; safe to use directly
        orParts.push(`and(visibility.eq.role,role.in.(${roles.join(',')}))`)
      }

      query = query.or(orParts.join(','))

      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (!recommendations?.length) return null;

  const getRecommendationReason = (doc) => {
    switch (doc.visibility) {
      case 'all_properties':
        return 'All Properties'
      case 'property':
        return 'Your Property'
      case 'department':
        return 'Your Department'
      case 'role':
        return 'Your Role'
      default:
        return 'Recommended'
    }
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
              {doc.visibility === 'all_properties' ? (
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
