import { useAnalyticsStats } from '@/hooks/useAnalyticsStats'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, Activity, MousePointer2, Search } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useTranslation } from 'react-i18next'

export default function AdminAnalyticsDashboard() {
    const { data, isLoading, error } = useAnalyticsStats()
    const { t } = useTranslation(['analytics', 'common'])

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (error || !data) {
        return <div className="p-8 text-red-500">{t('analytics:failed_to_load')}: {(error as any)?.message}</div>
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('analytics:title')}</h1>

            {/* Executive Pulse */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics:active_now')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 animate-pulse">
                            {data.summary.active_now}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('analytics:active_now_desc')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics:daily_active_users')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.active_today}</div>
                        <p className="text-xs text-muted-foreground">{t('analytics:active_today_desc')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('analytics:total_sessions')}</CardTitle>
                        <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.sessions_today}</div>
                        <p className="text-xs text-muted-foreground">{t('analytics:sessions_today_desc')}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">{t('analytics:traffic_and_trends')}</TabsTrigger>
                    <TabsTrigger value="search">{t('analytics:search_intelligence')}</TabsTrigger>
                    <TabsTrigger value="events">{t('analytics:top_events')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('analytics:dau_30_days')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data.dau}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                        />
                                        <Line type="monotone" dataKey="active_users" stroke="#2563eb" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="search" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('analytics:total_searches')}</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{data.searchMetrics.total_searches}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('analytics:zero_results_rate')}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {data.searchMetrics.total_searches > 0
                                        ? Math.round((data.searchMetrics.zero_results_count / data.searchMetrics.total_searches) * 100)
                                        : 0}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('analytics:avg_results_per_query')}</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{Number(data.searchMetrics.avg_results_count).toFixed(1)}</div></CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('analytics:top_search_queries')}</CardTitle>
                            <CardDescription>{t('analytics:top_queries_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.searchMetrics.top_queries.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">{t('analytics:no_search_data')}</p>
                                ) : (
                                    data.searchMetrics.top_queries.map((q, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                                            <div className="flex items-center gap-2">
                                                <Search className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{q.query}</span>
                                            </div>
                                            <div className="font-bold">{q.count}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('analytics:top_system_interactions')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart layout="vertical" data={data.topEvents} margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="event_name" type="category" width={150} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
