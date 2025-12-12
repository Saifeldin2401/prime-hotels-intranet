
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { FeedItem } from '@/components/social/SocialFeed'

export function useStaffFeed() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['staff-feed', user?.id],
        queryFn: async () => {
            if (!user?.id) return []

            const feedItems: FeedItem[] = []

            // 1. Fetch recent announcements (without profile join to avoid PostgREST 400s)
            const { data: announcements } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)

            announcements?.forEach((a: any) => {
                feedItems.push({
                    id: `ann-${a.id}`,
                    type: 'announcement',
                    author: {
                        id: a.created_by_id || a.created_by || 'system',
                        name: 'Admin',
                        email: '',
                        avatar: null,
                        role: 'admin',
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

            // 2. Fetch recent SOPs created in last 30 days
            const { data: sopDocuments, error: sopError } = await supabase
                .from('sop_documents')
                .select('*')
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .limit(5)

            if (sopError) {
                console.error('Error fetching SOP documents for feed:', sopError)
            } else {
                console.log('Fetched SOP documents:', sopDocuments)
            }

            sopDocuments?.forEach((d: any) => {
                feedItems.push({
                    id: `sop-${d.id}`,
                    type: 'sop_update',
                    author: {
                        id: d.created_by || 'system',
                        name: 'System',
                        email: '',
                        avatar: null,
                        role: 'admin',
                        department: 'Operations',
                        property: 'System',
                        permissions: []
                    },
                    title: `New SOP Published: ${d.title || 'Untitled Document'}`,
                    content: d.description || 'A new standard operating procedure has been published.',
                    timestamp: new Date(d.published_at || d.created_at),
                    tags: ['SOP', d.compliance_level || 'Standard'],
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'Read SOP',
                        onClick: () => window.location.href = `/sop/${d.id}`
                    }
                })
            })

            // Keep fetching generic documents if needed, or remove if sop_documents replaces it. 
            // For now, I'll keep the variable name generic 'documents' but fetch from 'documents' table as well just in case, but usually we want one source.
            // If the user says "IT DIDNT SHOW", they likely mean the SOP they just made.

            // 2b. Fetch generic documents (optional, keeping for backward compatibility if table exists)
            const { data: documents } = await supabase
                .from('documents')
                .select('*')
                .eq('status', 'PUBLISHED')
                .order('created_at', { ascending: false })
                .limit(2)

            documents?.forEach((d: any) => {
                feedItems.push({
                    id: `doc-${d.id}`,
                    type: 'sop_update',
                    author: {
                        id: d.created_by || 'system',
                        name: 'System',
                        email: '',
                        avatar: null,
                        role: 'admin',
                        department: 'Operations',
                        property: 'System',
                        permissions: []
                    },
                    title: `New Document: ${d.title}`,
                    content: d.description || 'A new document has been published.',
                    timestamp: new Date(d.published_at || d.created_at),
                    tags: [d.category],
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'View Document',
                        onClick: () => window.location.href = `/documents/${d.id}`
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
                feedItems.push({
                    id: `task-${t.id}`,
                    type: 'task',
                    author: {
                        id: t.created_by_id || t.assigned_by || 'system',
                        name: 'Manager',
                        email: '',
                        avatar: null,
                        role: 'manager',
                        department: 'Management',
                        property: 'System',
                        permissions: []
                    },
                    title: `Task Due: ${t.title}`,
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
                .select('*')
                .eq('assigned_to_user_id', user.id)
                .is('completed_at', null)
                .order('created_at', { ascending: false })
                .limit(3)

            trainings?.forEach((t: any) => {
                feedItems.push({
                    id: `train-${t.id}`,
                    type: 'training',
                    author: {
                        id: t.assigned_by_user_id || t.assigned_by || 'system',
                        name: 'Training Dept',
                        email: '',
                        avatar: null,
                        role: 'hr',
                        department: 'HR',
                        property: 'System',
                        permissions: []
                    },
                    title: `Training Assigned: ${t.training_module_id}`,
                    content: 'Please complete this training module.',
                    timestamp: new Date(t.created_at),
                    reactions: {},
                    comments: [],
                    actionButton: {
                        text: 'Start Training',
                        onClick: () => window.location.href = `/training/${t.training_module_id}`
                    }
                })
            })

            // Sort by timestamp desc
            return feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        },
        enabled: !!user?.id
    })
}
