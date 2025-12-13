import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Clock, User, Building, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface SOP {
    id: string
    title: string
    description: string
    content: string
    status: string
    version: string
    department_id: string
    departments?: { name: string }
    created_at: string
    updated_at: string
    created_by?: string
    author?: { full_name: string }
}

export default function SOPViewer() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { primaryRole } = useAuth()
    const [sop, setSop] = useState<SOP | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSOP() {
            if (!id) return
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('sop_documents')
                    .select(`
            id,
            title,
            description,
            content,
            status,
            version,
            department_id,
            created_at,
            updated_at,
            departments (name),
            author:profiles!sop_documents_created_by_fkey (full_name)
          `)
                    .eq('id', id)
                    .single()

                if (error) throw error

                // transform array relations to single objects if needed
                const formattedData = {
                    ...data,
                    departments: Array.isArray(data.departments) ? data.departments[0] : data.departments,
                    author: Array.isArray(data.author) ? data.author[0] : data.author
                }
                setSop(formattedData as unknown as SOP)
            } catch (err) {
                console.error('Error fetching SOP:', err)
                setError((err as any)?.message || 'Failed to load SOP or you do not have permission.')
            } finally {
                setLoading(false)
            }
        }
        fetchSOP()
    }, [id])

    if (loading) {
        return (
            <div className="container mx-auto py-8 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (error || !sop) {
        return (
            <div className="container mx-auto py-8 text-center">
                <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-full mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Unavailable</h2>
                <p className="text-gray-600 mb-6">{error || 'SOP not found'}</p>
                <Button onClick={() => navigate('/sop')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to SOP Library
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <Button variant="ghost" onClick={() => navigate('/sop')} className="mb-4 text-gray-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Library
            </Button>

            <div className="grid gap-6">
                {/* Header Card */}
                <Card className="border-t-4 border-t-hotel-gold shadow-sm">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        {sop.departments?.name || 'General'}
                                    </Badge>
                                    <Badge variant="secondary">v{sop.version}</Badge>
                                    {sop.status !== 'published' && (
                                        <Badge variant="destructive">{sop.status}</Badge>
                                    )}
                                </div>
                                <CardTitle className="text-2xl font-bold text-gray-900">{sop.title}</CardTitle>
                                <CardDescription className="text-base text-gray-600 mt-2">
                                    {sop.description}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2 border-t mt-2">
                            <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{sop.author?.full_name || 'Unknown Author'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Updated {sop.updated_at ? formatDistanceToNow(new Date(sop.updated_at)) : 'N/A'} ago</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                <span>{sop.departments?.name || 'All Departments'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Content Card */}
                <Card className="min-h-[500px]">
                    <CardHeader>
                        <CardTitle className="text-lg">Procedure Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="prose max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: sop.content || '<p class="text-gray-500 italic">No content available.</p>' }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
