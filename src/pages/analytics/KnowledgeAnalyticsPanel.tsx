import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
    getSearchTerms,
    getTopDocuments,
    getZeroResultSearches,
} from '@/services/learningAnalyticsService'
import { formatDate, formatNumber, WINDOW_OPTIONS } from './analyticsFormat'

export default function KnowledgeAnalyticsPanel() {
    const [days, setDays] = useState('30')
    const window = Number(days)

    const docs = useQuery({
        queryKey: ['knowledge-top-documents', window],
        queryFn: () => getTopDocuments(window, 25),
    })
    const terms = useQuery({
        queryKey: ['knowledge-search-terms', window],
        queryFn: () => getSearchTerms(window, 50),
    })
    const zero = useQuery({
        queryKey: ['knowledge-zero-result', Math.max(window, 90)],
        queryFn: () => getZeroResultSearches(Math.max(window, 90), 50),
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Select value={days} onValueChange={setDays}>
                    <SelectTrigger className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {WINDOW_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Most viewed articles</CardTitle>
                    <CardDescription>
                        Windowed view counts from the document view log, with the lifetime
                        counter for context.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {docs.isLoading ? (
                        <Skeleton className="m-6 h-40" />
                    ) : docs.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load.</p>
                    ) : !docs.data || docs.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No article views in this window" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Article</TableHead>
                                    <TableHead className="text-right">Views (window)</TableHead>
                                    <TableHead className="text-right">Distinct viewers</TableHead>
                                    <TableHead className="text-right">Lifetime views</TableHead>
                                    <TableHead className="text-right">Last viewed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {docs.data.map(row => (
                                    <TableRow key={row.document_id}>
                                        <TableCell className="font-medium">{row.title}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.recent_views)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.distinct_recent_viewers)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatNumber(row.lifetime_views)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {formatDate(row.last_viewed_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Most searched terms</CardTitle>
                    <CardDescription>
                        From the search log. Average result count flags terms that return
                        weak matches.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {terms.isLoading ? (
                        <Skeleton className="m-6 h-40" />
                    ) : terms.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load.</p>
                    ) : !terms.data || terms.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No searches in this window" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Term</TableHead>
                                    <TableHead className="text-right">Searches</TableHead>
                                    <TableHead className="text-right">Distinct users</TableHead>
                                    <TableHead className="text-right">Avg results</TableHead>
                                    <TableHead className="text-right">Zero-result</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terms.data.map(row => (
                                    <TableRow key={row.term}>
                                        <TableCell className="font-medium">{row.term}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.searches)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.distinct_users)}</TableCell>
                                        <TableCell className="text-right">
                                            {row.avg_result_count === null ? '--' : row.avg_result_count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.zero_result_searches > 0 ? (
                                                <Badge variant="destructive">{formatNumber(row.zero_result_searches)}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">0</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Requested but missing (zero-result searches)</CardTitle>
                    <CardDescription>
                        Searches that returned nothing over the last {Math.max(window, 90)} days
                        &mdash; the knowledge-base content gap.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {zero.isLoading ? (
                        <Skeleton className="m-6 h-40" />
                    ) : zero.error ? (
                        <p className="p-6 text-sm text-destructive">Failed to load.</p>
                    ) : !zero.data || zero.data.length === 0 ? (
                        <EmptyState size="sm" className="m-6" title="No zero-result searches — nice" />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Term</TableHead>
                                    <TableHead className="text-right">Searches</TableHead>
                                    <TableHead className="text-right">Distinct users</TableHead>
                                    <TableHead className="text-right">Last searched</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {zero.data.map(row => (
                                    <TableRow key={row.term}>
                                        <TableCell className="font-medium">{row.term}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.searches)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(row.distinct_users)}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {formatDate(row.last_searched_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
