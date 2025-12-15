
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { FeedItem } from '@/components/social/SocialFeed'

export function useStaffFeed() {
    const { user, roles, departments, properties } = useAuth()

    return useQuery({
        queryKey: ['staff-feed', user?.id, roles.length, departments.length, properties.length],
        queryFn: async () => {
            if (!user?.id) return []

            const feedItems: FeedItem[] = []
            const now = new Date()
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

            // 1. Fetch recent announcements
            const { data: announcements } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20) // Fetch more to allow for filtering

            if (announcements) {
                const filteredAnnouncements = announcements.filter((announcement: any) => {
                    // Always show if user is the creator
                    if (announcement.created_by === user?.id) return true

                    // Show if target audience is 'all' or missing
                    const audience = announcement.target_audience
                    if (!audience || audience.type === 'all') return true

                    const values = audience.values || []

                    switch (audience.type) {
                        case 'role':
                            return roles?.some(userRole => values.includes(userRole.role)) ?? false

                        case 'department':
                            return departments?.some(dept => values.includes(dept.id)) ?? false

                        case 'property':
                            return properties?.some(prop => values.includes(prop.id)) ?? false

                        case 'individual':
                            return values.includes(user?.id || '')

                        default:
                            return true
                    }
                })

                filteredAnnouncements.slice(0, 5).forEach((a: any) => {
                    feedItems.push({
                        id: `ann-${a.id}`,
                        type: 'announcement',
                        author: {
                            id: a.created_by_id || a.created_by || 'system',
                            name: 'Admin',
                            email: '',
                            avatar: null,
                            role: 'corporate_admin',
                            department: 'Management',
                            property: 'System',
                            permissions: []
                        },
                        title: a.title,
                        content: a.content,
                        timestamp: new Date(a.created_at),
                        priority: a.priority,
                        reactions: {},
                        comments: []
                    })
                })
            }

            // 2. Fetch recent Knowledge Base
            const { data: recentDocs } = await supabase
                .from('documents')
                .select('*')
                .eq('status', 'PUBLISHED')
                .gte('updated_at', thirtyDaysAgo.toISOString())
                .order('updated_at', { ascending: false })
                .limit(5)

            recentDocs?.forEach((d: any) => {
                const isNew = new Date(d.created_at) > thirtyDaysAgo
                feedItems.push({
                    id: `doc-${d.id}`,
                    type: 'sop_update',
                    author: {
                        id: d.created_by || 'system',
                        name: 'Knowledge Base',
                        email: '',
                        avatar: null,
                        role: 'corporate_admin',
                        department: 'Operations',
                        property: 'System',
                        permissions: []
                    },
                    title: isNew
                        ? `📚 New Article: ${d.title}`
                        : `📝 Updated: ${d.title}`,
                    content: d.description || 'A Knowledge Base article has been updated.',
                    timestamp: new Date(d.updated_at),
                    tags: ['Knowledge Base'],
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'Read Article',
                        onClick: () => window.location.href = `/knowledge/${d.id}`
                    }
                })
            })

            // 3. Fetch my pending tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to_id', user.id)
                .neq('status', 'completed')
                .order('due_date', { ascending: true })
                .limit(3)

            tasks?.forEach((t: any) => {
                const dueDate = new Date(t.due_date)
                const isOverdue = dueDate < now
                feedItems.push({
                    id: `task-${t.id}`,
                    type: 'task',
                    author: {
                        id: t.created_by_id || t.assigned_by || 'system',
                        name: 'Manager',
                        email: '',
                        avatar: null,
                        role: 'property_manager',
                        department: 'Management',
                        property: 'System',
                        permissions: []
                    },
                    title: isOverdue ? `⚠️ Overdue Task: ${t.title}` : `📋 Task Due: ${t.title}`,
                    content: t.description || 'You have a pending task.',
                    timestamp: new Date(t.created_at),
                    priority: t.priority,
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'View Task',
                        onClick: () => window.location.href = `/tasks/${t.id}`
                    }
                })
            })

            // 4. Fetch my training assignments
            const { data: trainings } = await supabase
                .from('training_assignments')
                .select(`
                    *,
                    training:training_modules(id, title)
                `)
                .eq('assigned_to_user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3)

            trainings?.forEach((t: any) => {
                feedItems.push({
                    id: `train-${t.id}`,
                    type: 'training',
                    author: {
                        id: t.assigned_by || 'system',
                        name: 'Training Dept',
                        email: '',
                        avatar: null,
                        role: 'property_hr',
                        department: 'HR',
                        property: 'System',
                        permissions: []
                    },
                    title: `🎓 Training Assigned: ${t.training?.title || 'New Training'}`,
                    content: t.deadline ? `Due by ${new Date(t.deadline).toLocaleDateString()}` : 'Please complete this training module.',
                    timestamp: new Date(t.created_at),
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'Start Training',
                        onClick: () => window.location.href = `/training/${t.training_module_id}`
                    }
                })
            })

            // 5. Fetch team achievements (completed training in last 7 days)
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const { data: achievements } = await supabase
                .from('training_progress')
                .select(`
                    *,
                    user:profiles!training_progress_user_id_fkey(id, full_name, avatar_url),
                    training:training_modules!training_progress_training_id_fkey(id, title)
                `)
                .eq('status', 'completed')
                .gte('completed_at', sevenDaysAgo.toISOString())
                .neq('user_id', user.id) // Don't show own achievements
                .order('completed_at', { ascending: false })
                .limit(5)

            achievements?.forEach((a: any) => {
                if (a.user && a.training) {
                    feedItems.push({
                        id: `ach-${a.id}`,
                        type: 'recognition',
                        author: {
                            id: a.user.id,
                            name: a.user.full_name,
                            email: '',
                            avatar: a.user.avatar_url,
                            role: 'staff',
                            department: '',
                            property: '',
                            permissions: []
                        },
                        title: `🏆 ${a.user.full_name} completed "${a.training.title}"`,
                        content: 'Congratulations on completing the training!',
                        timestamp: new Date(a.completed_at),
                        reactions: {},
                        comments: []
                    })
                }
            })

            // 6. Fetch team birthdays (today and next 3 days)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, date_of_birth')
                .not('date_of_birth', 'is', null)

            profiles?.forEach((p: any) => {
                if (p.date_of_birth) {
                    const bday = new Date(p.date_of_birth)
                    const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
                    const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                    if (daysUntil >= 0 && daysUntil <= 3 && p.id !== user.id) {
                        feedItems.push({
                            id: `bday-${p.id}`,
                            type: 'recognition',
                            author: {
                                id: p.id,
                                name: p.full_name,
                                email: '',
                                avatar: p.avatar_url,
                                role: 'staff',
                                department: '',
                                property: '',
                                permissions: []
                            },
                            title: daysUntil === 0
                                ? `🎂 Happy Birthday ${p.full_name}!`
                                : `🎂 ${p.full_name}'s birthday in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                            content: daysUntil === 0 ? 'Send your birthday wishes!' : '',
                            timestamp: thisYearBday,
                            reactions: {},
                            comments: []
                        })
                    }
                }
            })

            // 7. Fetch new team members (hired in last 14 days)
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
            const { data: newJoiners } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, hire_date, job_title')
                .gte('hire_date', twoWeeksAgo.toISOString())
                .neq('id', user.id)
                .order('hire_date', { ascending: false })
                .limit(3)

            newJoiners?.forEach((j: any) => {
                feedItems.push({
                    id: `newjoiner-${j.id}`,
                    type: 'recognition',
                    author: {
                        id: j.id,
                        name: j.full_name,
                        email: '',
                        avatar: j.avatar_url,
                        role: 'staff',
                        department: '',
                        property: '',
                        permissions: []
                    },
                    title: `👋 Welcome ${j.full_name} to the team!`,
                    content: j.job_title ? `Joined as ${j.job_title}` : 'Say hello to our new team member!',
                    timestamp: new Date(j.hire_date),
                    reactions: {},
                    comments: []
                })
            })

            // Sort by timestamp desc
            return feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    })
}

