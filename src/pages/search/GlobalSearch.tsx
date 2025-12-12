import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTasks } from '@/hooks/useTasks'
import { useDocuments } from '@/hooks/useDocuments'
import { useProfiles } from '@/hooks/useUsers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckSquare, User, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function GlobalSearch() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const navigate = useNavigate()

    const { data: tasks = [], isLoading: tasksLoading } = useTasks({ search: query })
    const { data: documents = [], isLoading: docsLoading } = useDocuments({ search: query })
    const { data: profiles = [], isLoading: profilesLoading } = useProfiles({ search: query })

    const isLoading = tasksLoading || docsLoading || profilesLoading

    const hasResults = tasks.length > 0 || documents.length > 0 || profiles.length > 0

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Search Prime Hotels</h2>
                <p className="text-muted-foreground">Type something in the search bar above to get started.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Search Results for "{query}"</h1>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : !hasResults ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No results found</h3>
                    <p className="text-muted-foreground">We couldn't find anything matching "{query}".</p>
                </div>
            ) : (
                <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Results</TabsTrigger>
                        <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                        <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                        <TabsTrigger value="people">People ({profiles.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-8">
                        {tasks.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5" /> Tasks
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {tasks.slice(0, 3).map(task => (
                                        <TaskCard key={task.id} task={task} navigate={navigate} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {documents.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5" /> Documents
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {documents.slice(0, 3).map(doc => (
                                        <DocumentCard key={doc.id} doc={doc} navigate={navigate} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {profiles.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5" /> People
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {profiles.slice(0, 3).map(profile => (
                                        <ProfileCard key={profile.id} profile={profile} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tasks" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {tasks.map(task => (
                                <TaskCard key={task.id} task={task} navigate={navigate} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map(doc => (
                                <DocumentCard key={doc.id} doc={doc} navigate={navigate} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {profiles.map(profile => (
                                <ProfileCard key={profile.id} profile={profile} />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

function TaskCard({ task, navigate }: { task: any, navigate: any }) {
    return (
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/tasks/${task.id}`)}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {task.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(task.created_at), 'MMM d')}
                    </span>
                </div>
                <CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
                <CardDescription className="line-clamp-2">{task.description}</CardDescription>
            </CardHeader>
        </Card>
    )
}

function DocumentCard({ doc, navigate }: { doc: any, navigate: any }) {
    return (
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`/documents/${doc.id}`)}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="outline">
                        {doc.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d')}
                    </span>
                </div>
                <CardTitle className="text-base line-clamp-1">{doc.title}</CardTitle>
                <CardDescription className="line-clamp-2">{doc.description}</CardDescription>
            </CardHeader>
        </Card>
    )
}

function ProfileCard({ profile }: { profile: any }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {profile.full_name?.[0] || <User className="w-5 h-5" />}
                </div>
                <div>
                    <CardTitle className="text-base">{profile.full_name}</CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                </div>
            </CardHeader>
        </Card>
    )
}
