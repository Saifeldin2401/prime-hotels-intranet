/**
 * KnowledgeWidget
 * 
 * Dashboard widget for required reading and knowledge updates.
 * Updated to query 'documents' table.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
    BookOpen,
    Clock,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    Bell,
    Loader2,
    FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface RequiredReadingItem {
    id: string
    title: string
    created_at: string
    is_read: boolean
}

export function KnowledgeWidget() {
    const { user } = useAuth()

    // Fetch required reading for user
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-required-reading', user?.id],
        queryFn: async () => {
            // Get required reading assignments for this user
            // Assuming knowledge_required_reading points to 'documents' now or we can join 'documents' on document_id
            const { data: assignments, error: assignError } = await supabase
                .from('knowledge_required_reading')
                .select(`
                    id,
                    document_id,
                    acknowledged_at,
                    document:documents!document_id(id, title, created_at)
                `)
                .eq('user_id', user?.id)
                .is('acknowledged_at', null)
                .limit(5)
            // Note: If !document_id mapping fails, it might mean the FK is named differently or missing.
            // If so, we might need a manual fetch.

            if (assignError) {
                console.warn('Error fetching required reading:', assignError)
                // Fallback to empty if table issue
            }

            // Get recently updated articles in user's department
            // Simplified: Just get recent PUBLISHED docs
            const { data: recentArticles, error: recentError } = await supabase
                .from('documents') // Updated table
                .select('id, title, updated_at')
                .eq('status', 'PUBLISHED')
                .order('updated_at', { ascending: false })
                .limit(5)

            if (recentError) throw recentError

            // Calculate stats
            const { count: totalAssigned } = await supabase
                .from('knowledge_required_reading')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user?.id)

            const { count: completedCount } = await supabase
                .from('knowledge_required_reading')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user?.id)
                .not('acknowledged_at', 'is', null)

            return {
                requiredReading: assignments?.map(a => ({
                    id: (a.document as any)?.id,
                    title: (a.document as any)?.title,
                    created_at: (a.document as any)?.created_at,
                    is_read: false
                })) || [],
                recentUpdates: recentArticles || [],
                stats: {
                    total: totalAssigned || 0,
                    completed: completedCount || 0
                }
            }
        },
        enabled: !!user?.id
    })

    const progress = data?.stats?.total
        ? Math.round((data.stats.completed / data.stats.total) * 100)
        : 0

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-hotel-gold" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-hotel-gold" />
                        Knowledge Base
                    </CardTitle>
                    <Link to="/knowledge">
                        <Button variant="ghost" size="sm" className="h-8 group">
                            View All
                            <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress */}
                {data?.stats && data.stats.total > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-700">Required Reading Progress</span>
                            <span className="text-sm text-blue-600">{data.stats.completed}/{data.stats.total}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Required Reading */}
                {data?.requiredReading && data.requiredReading.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-500" />
                            Required Reading
                        </h4>
                        <div className="space-y-2">
                            {data.requiredReading.slice(0, 3).map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/knowledge/${item.id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="p-2 rounded-lg bg-orange-100">
                                        <FileText className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(new Date(item.created_at || new Date()), { addSuffix: true })}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Updates */}
                {data?.recentUpdates && data.recentUpdates.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Recently Updated
                        </h4>
                        <div className="space-y-2">
                            {data.recentUpdates.slice(0, 3).map((article: any) => (
                                <Link
                                    key={article.id}
                                    to={`/knowledge/${article.id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                                        <FileText className="h-4 w-4 text-gray-600 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {article.title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Updated {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {(!data?.requiredReading?.length && !data?.recentUpdates?.length) && (
                    <div className="text-center py-6">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                        <p className="text-sm text-gray-600">You're all caught up!</p>
                        <Link to="/knowledge">
                            <Button variant="link" size="sm">
                                Explore Knowledge Base
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
