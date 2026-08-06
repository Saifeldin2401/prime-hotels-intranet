import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface VersionRow {
    id: string
    versionNumber: number
    publishedByName: string | null
    createdAt: string
}

export function VersionHistoryCard({ moduleId, isRTL }: { moduleId: string | null; isRTL: boolean }) {
    const { t } = useTranslation('training')

    const { data: versions } = useQuery({
        queryKey: ['training-module-versions', moduleId],
        queryFn: async (): Promise<VersionRow[]> => {
            const { data, error } = await supabase
                .from('training_module_versions')
                .select('id, version_number, created_at, published_by:profiles!training_module_versions_published_by_fkey(full_name)')
                .eq('training_module_id', moduleId!)
                .order('version_number', { ascending: false })
                .limit(10)

            if (error) throw error

            return (data || []).map((row) => {
                const publishedBy = (row as any).published_by
                const publishedByName = Array.isArray(publishedBy) 
                    ? publishedBy[0]?.full_name 
                    : publishedBy?.full_name
                
                return {
                    id: row.id,
                    versionNumber: row.version_number,
                    publishedByName,
                    createdAt: row.created_at
                }
            })
        },
        enabled: !!moduleId
    })

    if (!moduleId || !versions || versions.length === 0) return null

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle className={cn("text-sm font-semibold flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
                    <History className="w-4 h-4 text-slate-500" />
                    {t('builder.versionHistory', 'Version History')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {versions.map((version) => (
                    <div key={version.id} className={cn("flex items-center justify-between text-xs", isRTL ? "flex-row-reverse" : "")}>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">v{version.versionNumber}</Badge>
                            <span className="text-slate-500">{version.publishedByName || t('unknownUser', 'Unknown')}</span>
                        </div>
                        <span className="text-slate-400">{format(new Date(version.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
