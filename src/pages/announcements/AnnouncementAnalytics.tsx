import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
    ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, ThumbsUp,
    Search, Users, Clock, Download, PieChart, User
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'

interface UserReadStatus {
    id: string
    full_name: string
    avatar_url?: string
    email?: string
    read_at?: string
    acknowledged_at?: string
}

export default function AnnouncementAnalytics() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation('announcements')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('overview')

    // Fetch announcement details
    const { data: announcement, isLoading: loadingAnnouncement } = useQuery({
        queryKey: ['announcement', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('*, created_by_profile:profiles!announcements_created_by_fkey(full_name)')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        }
    })

    // Fetch target audience user list
    const { data: targetUsers = [], isLoading: loadingTargetUsers } = useQuery({
        queryKey: ['announcement-target-users', id, announcement?.target_audience],
        enabled: !!id && !!announcement,
        queryFn: async () => {
            const audience = announcement?.target_audience
            let userIds: string[] = []

            if (!audience || audience.type === 'all') {
                // All active users
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('is_active', true)
                if (data) userIds = data.map(u => u.id)
            } else {
                const values = audience.values || []
                switch (audience.type) {
                    case 'role':
                        for (const role of values) {
                            const { data } = await supabase
                                .from('user_roles')
                                .select('user_id')
                                .eq('role', role)
                            if (data) userIds.push(...data.map(u => u.user_id))
                        }
                        break
                    case 'department':
                        for (const deptId of values) {
                            const { data } = await supabase
                                .from('user_departments')
                                .select('user_id')
                                .eq('department_id', deptId)
                            if (data) userIds.push(...data.map(u => u.user_id))
                        }
                        break
                    case 'property':
                        for (const propId of values) {
                            const { data } = await supabase
                                .from('user_properties')
                                .select('user_id')
                                .eq('property_id', propId)
                            if (data) userIds.push(...data.map(u => u.user_id))
                        }
                        break
                    case 'individual':
                        userIds = values
                        break
                }
            }

            // Remove duplicates and exclude creator
            const uniqueUserIds = [...new Set(userIds)].filter(uid => uid !== announcement?.created_by)

            if (uniqueUserIds.length === 0) return []

            // Fetch user profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email')
                .in('id', uniqueUserIds)

            return profiles || []
        }
    })

    // Fetch reads
    const { data: reads = [] } = useQuery({
        queryKey: ['announcement-reads-all', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_reads')
                .select('user_id, read_at')
                .eq('announcement_id', id)

            if (error) throw error
            return data || []
        }
    })

    // Fetch acknowledgments
    const { data: acknowledgments = [] } = useQuery({
        queryKey: ['announcement-acknowledgments-all', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_acknowledgments')
                .select('user_id, acknowledged_at')
                .eq('announcement_id', id)

            if (error) throw error
            return data || []
        }
    })

    const isRTL = i18n.dir() === 'rtl'

    if (loadingAnnouncement || loadingTargetUsers) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
        )
    }

    if (!announcement) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                Announcement not found
            </div>
        )
    }

    // Build combined user status list
    const readMap = new Map(reads.map(r => [r.user_id, r.read_at]))
    const ackMap = new Map(acknowledgments.map(a => [a.user_id, a.acknowledged_at]))

    const usersWithStatus: UserReadStatus[] = targetUsers.map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        email: user.email,
        read_at: readMap.get(user.id),
        acknowledged_at: ackMap.get(user.id)
    }))

    // Filter by search
    const filteredUsers = usersWithStatus.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Split into categories
    const acknowledgedUsers = filteredUsers.filter(u => u.acknowledged_at)
    const readOnlyUsers = filteredUsers.filter(u => u.read_at && !u.acknowledged_at)
    const unreadUsers = filteredUsers.filter(u => !u.read_at)

    // Stats
    const totalUsers = targetUsers.length
    const totalRead = reads.length
    const totalAcknowledged = acknowledgments.length
    const totalUnread = totalUsers - totalRead
    const readPercent = totalUsers > 0 ? Math.round((totalRead / totalUsers) * 100) : 0
    const ackPercent = totalUsers > 0 ? Math.round((totalAcknowledged / totalUsers) * 100) : 0

    const UserList = ({ users, showAckTime = false }: { users: UserReadStatus[], showAckTime?: boolean }) => (
        <div className="space-y-2">
            {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users in this category</p>
            ) : (
                users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                    <User className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {showAckTime && user.acknowledged_at && (
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                    <ThumbsUp className="w-4 h-4" />
                                    {formatDistanceToNow(new Date(user.acknowledged_at), { addSuffix: true })}
                                </div>
                            )}
                            {!showAckTime && user.read_at && (
                                <div className="flex items-center gap-1 text-blue-600 text-sm">
                                    <Eye className="w-4 h-4" />
                                    {formatDistanceToNow(new Date(user.read_at), { addSuffix: true })}
                                </div>
                            )}
                            {!user.read_at && (
                                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                    <EyeOff className="w-4 h-4" />
                                    Not viewed
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    )

    return (
        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <PageHeader
                title={`Analytics: ${announcement.title}`}
                description="Track who has read and acknowledged this announcement"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate(`/announcements/${id}`)}>
                            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                            Back to Announcement
                        </Button>
                    </div>
                }
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalUsers}</p>
                                <p className="text-sm text-muted-foreground">Target Audience</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <Eye className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalRead}</p>
                                <p className="text-sm text-muted-foreground">Read ({readPercent}%)</p>
                            </div>
                        </div>
                        <Progress value={readPercent} className="mt-3 h-2" />
                    </CardContent>
                </Card>

                {announcement.requires_acknowledgment && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                    <ThumbsUp className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalAcknowledged}</p>
                                    <p className="text-sm text-muted-foreground">Acknowledged ({ackPercent}%)</p>
                                </div>
                            </div>
                            <Progress value={ackPercent} className="mt-3 h-2" />
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <EyeOff className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalUnread}</p>
                                <p className="text-sm text-muted-foreground">Not Read</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Lists */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            Detailed Report
                        </CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
                            <TabsTrigger value="acknowledged" className="flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4" />
                                Acknowledged ({acknowledgedUsers.length})
                            </TabsTrigger>
                            <TabsTrigger value="read" className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Read Only ({readOnlyUsers.length})
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="flex items-center gap-2">
                                <EyeOff className="w-4 h-4" />
                                Not Read ({unreadUsers.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="acknowledged">
                            <div className="border rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
                                <h4 className="font-medium text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Users who acknowledged this announcement
                                </h4>
                                <UserList users={acknowledgedUsers} showAckTime />
                            </div>
                        </TabsContent>

                        <TabsContent value="read">
                            <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
                                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Users who read but haven't acknowledged
                                </h4>
                                <UserList users={readOnlyUsers} />
                            </div>
                        </TabsContent>

                        <TabsContent value="unread">
                            <div className="border rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
                                <h4 className="font-medium text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                                    <EyeOff className="w-5 h-5" />
                                    Users who haven't read this announcement
                                </h4>
                                <UserList users={unreadUsers} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
