import { useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useTranslation } from 'react-i18next'
import type { FeedItem } from '@/components/social/SocialFeed'
import type { User } from '@/lib/rbac'

function buildCurrentUser(params: {
  userId: string
  email: string
  name: string
  role: string
  avatar?: string | null
  department?: string
  property?: string
}): User {
  return {
    id: params.userId,
    name: params.name,
    email: params.email,
    role: params.role as User['role'],
    avatar: params.avatar || undefined,
    department: params.department,
    property: params.property,
    permissions: []
  }
}

export function useUnifiedSocialFeed() {
  const { user, profile, primaryRole, roles, departments, properties } = useAuth()
  const { currentProperty } = useProperty()
  const { t, i18n } = useTranslation('common')

  const currentUser = useMemo(() => {
    if (!user?.id) return null

    return buildCurrentUser({
      userId: user.id,
      email: user.email || '',
      name: profile?.full_name || user.email || 'Unknown',
      role: (primaryRole as string) || 'staff',
      avatar: (profile as any)?.avatar_url,
      department: (departments as any)?.[0]?.name,
      property: currentProperty?.name
    })
  }, [currentProperty?.name, departments, primaryRole, profile, user?.email, user?.id])

  const roleKey = (roles ?? []).map(role => role.role).sort().join('|')
  const departmentKey = (departments ?? []).map(dept => dept.id).sort().join('|')
  const propertyKey = (properties ?? []).map(prop => prop.id).sort().join('|')
  const language = i18n.language || 'en'

  const { data: fetchedItems = [], isLoading } = useQuery({
    queryKey: ['unified-social-feed', user?.id, roleKey, departmentKey, propertyKey, language],
    queryFn: async () => {
      if (!user?.id) return []

      const feedItems: FeedItem[] = []
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const formatDate = (value: Date, options?: Intl.DateTimeFormatOptions) => {
        try {
          return new Intl.DateTimeFormat(language, options).format(value)
        } catch {
          return value.toLocaleDateString()
        }
      }
      const formatTime = (value: Date) => {
        try {
          return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(value)
        } catch {
          return value.toLocaleTimeString()
        }
      }

      const roleList = roles?.map(role => role.role) ?? []
      const managerRoles = new Set([
        'corporate_admin',
        'regional_admin',
        'regional_hr',
        'property_manager',
        'property_hr',
        'department_head',
        'manager'
      ])
      const isManagerRole = roleList.some(role => managerRoles.has(role))
      const isGlobalOverride = roleList.includes('corporate_admin')
      const departmentIds = (departments ?? []).map(dept => dept.id).filter(Boolean)
      const propertyIds = (properties ?? []).map(prop => prop.id).filter(Boolean)
      const scopeType = departmentIds.length > 0 ? 'department' : propertyIds.length > 0 ? 'property' : 'none'
      const shouldResolveTeamScope = !isGlobalOverride && scopeType !== 'none'

      const resolveTeamUserIds = async (type: 'department' | 'property') => {
        const idSet = new Set<string>()

        if (type === 'department') {
          const { data } = await supabase
            .from('user_departments')
            .select('user_id')
            .in('department_id', departmentIds)
            .limit(500)

          data?.forEach((row: any) => {
            if (row?.user_id) {
              idSet.add(row.user_id)
            }
          })
        }

        if (type === 'property') {
          const { data } = await supabase
            .from('user_properties')
            .select('user_id')
            .in('property_id', propertyIds)
            .limit(500)

          data?.forEach((row: any) => {
            if (row?.user_id) {
              idSet.add(row.user_id)
            }
          })
        }

        return Array.from(idSet)
      }

      const teamUserIds = shouldResolveTeamScope
        ? await resolveTeamUserIds(scopeType === 'department' ? 'department' : 'property')
        : []
      const scopedTeamUserIds = teamUserIds.slice(0, 200)
      const hasTeamScope = scopedTeamUserIds.length > 0
      const shouldScopeToTeam = !isGlobalOverride && hasTeamScope
      const allowGlobalFallback = isGlobalOverride

      // 1. Announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40)

      if (announcements) {
        const filteredAnnouncements = announcements.filter((announcement: any) => {
          if (announcement.created_by === user.id) return true

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
              return values.includes(user.id)
            default:
              return true
          }
        })

        filteredAnnouncements.slice(0, 10).forEach((a: any) => {
          feedItems.push({
            id: `ann-${a.id}`,
            type: 'announcement',
            author: {
              id: a.created_by_id || a.created_by || 'system',
              name: a.created_by_profile?.full_name || t('social_feed.labels.admin', 'Admin'),
              email: '',
              avatar: null,
              role: 'corporate_admin',
              department: t('social_feed.labels.management', 'Management'),
              property: t('social_feed.labels.system', 'System'),
              permissions: []
            },
            title: a.title,
            content: a.content,
            timestamp: new Date(a.created_at),
            priority: a.priority,
            tags: a.pinned ? ['pinned'] : undefined,
            reactions: {},
            comments: []
          })
        })
      }

      // 2. Knowledge Base
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'PUBLISHED')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10)

      recentDocs?.forEach((d: any) => {
        const isNew = new Date(d.created_at) > thirtyDaysAgo
        feedItems.push({
          id: `doc-${d.id}`,
          type: 'sop_update',
          author: {
            id: d.created_by || 'system',
            name: t('social_feed.labels.knowledge_base', 'Knowledge Base'),
            email: '',
            avatar: null,
            role: 'corporate_admin',
            department: t('social_feed.labels.operations', 'Operations'),
            property: t('social_feed.labels.system', 'System'),
            permissions: []
          },
          title: isNew
            ? t('social_feed.titles.new_article', { title: d.title })
            : t('social_feed.titles.updated_article', { title: d.title }),
          content: d.description || t('social_feed.messages.kb_update_fallback', 'A Knowledge Base article has been updated.'),
          timestamp: new Date(d.updated_at),
          tags: [t('social_feed.tags.knowledge_base', 'Knowledge Base')],
          reactions: {},
          comments: [],
          actionButton: {
            text: t('social_feed.actions.read_article', 'Read Article'),
            onClick: () => {
              window.location.href = `/knowledge/${d.id}`
            }
          }
        })
      })

      // 3. My pending tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to_id', user.id)
        .eq('is_deleted', false)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true })
        .limit(5)

      tasks?.forEach((task: any) => {
        const dueDate = task.due_date ? new Date(task.due_date) : null
        const isOverdue = dueDate ? dueDate < now : false
        const title = dueDate
          ? (isOverdue
            ? t('social_feed.titles.task_overdue', { title: task.title })
            : t('social_feed.titles.task_due', { title: task.title }))
          : t('social_feed.titles.task', { title: task.title })
        feedItems.push({
          id: `task-${task.id}`,
          type: 'task',
          author: {
            id: task.created_by_id || task.assigned_by || 'system',
            name: t('social_feed.labels.manager', 'Manager'),
            email: '',
            avatar: null,
            role: 'property_manager',
            department: t('social_feed.labels.management', 'Management'),
            property: t('social_feed.labels.system', 'System'),
            permissions: []
          },
          title,
          content: task.description || t('social_feed.messages.task_fallback', 'You have a pending task.'),
          timestamp: new Date(task.created_at),
          priority: task.priority,
          reactions: {},
          comments: [],
          actionButton: {
            text: t('social_feed.actions.view_task', 'View Task'),
            onClick: () => {
              window.location.href = `/tasks/${task.id}`
            }
          }
        })
      })

      // 4. My training assignments
      const { data: trainings } = await supabase
        .from('learning_assignments')
        .select('*')
        .eq('target_type', 'user')
        .eq('target_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      trainings?.forEach((assignment: any) => {
        const trainingTitle = assignment.training?.title || t('social_feed.defaults.new_training', 'New Training')
        const trainingContent = assignment.deadline
          ? t('social_feed.messages.training_due', { date: formatDate(new Date(assignment.deadline), { dateStyle: 'medium' }) })
          : t('social_feed.messages.training_no_deadline', 'Please complete this training module.')
        feedItems.push({
          id: `train-${assignment.id}`,
          type: 'training',
          author: {
            id: assignment.assigned_by || 'system',
            name: t('social_feed.labels.training_dept', 'Training Dept'),
            email: '',
            avatar: null,
            role: 'property_hr',
            department: t('social_feed.labels.hr', 'HR'),
            property: t('social_feed.labels.system', 'System'),
            permissions: []
          },
          title: t('social_feed.titles.training_assigned', { title: trainingTitle }),
          content: trainingContent,
          timestamp: new Date(assignment.created_at),
          reactions: {},
          comments: [],
          actionButton: {
            text: t('social_feed.actions.start_training', 'Start Training'),
            onClick: () => {
              window.location.href = `/training/${assignment.training_module_id}`
            }
          }
        })
      })

      // 5. Team achievements (completed training in last 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      let achievements: any[] = []
      if (shouldScopeToTeam || allowGlobalFallback) {
        const buildAchievementsQuery = () => {
          let base = supabase
            .from('training_progress')
            .select(`
              *,
              user:profiles!training_progress_user_id_fkey(id, full_name, avatar_url),
              training:training_modules!training_progress_training_id_fkey(id, title)
            `)
            .eq('status', 'completed')
            .gte('completed_at', sevenDaysAgo.toISOString())
            .neq('user_id', user.id)
            .limit(10)

          if (shouldScopeToTeam) {
            base = base.in('user_id', scopedTeamUserIds)
          }

          return base
        }

        let { data, error } = await buildAchievementsQuery()
          .order('completed_at', { ascending: false })

        if (error) {
          const fallback = await buildAchievementsQuery().order('updated_at', { ascending: false })
          if (!fallback.error) {
            data = fallback.data
          }
        }

        achievements = data || []
      }

      achievements.forEach((a: any) => {
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
            title: t('social_feed.titles.training_completed', { name: a.user.full_name, title: a.training.title }),
            content: t('social_feed.messages.training_congrats', 'Congratulations on completing the training!'),
            timestamp: new Date(a.completed_at),
            reactions: {},
            comments: []
          })
        }
      })

      // 6. Birthdays (today and next 3 days)
      let birthdayProfiles: any[] = []
      if (shouldScopeToTeam || allowGlobalFallback) {
        let profilesQuery = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, date_of_birth')
          .not('date_of_birth', 'is', null)

        if (shouldScopeToTeam) {
          profilesQuery = profilesQuery.in('id', scopedTeamUserIds)
        }

        const { data } = await profilesQuery
        birthdayProfiles = data || []
      }

      birthdayProfiles.forEach((p: any) => {
        if (!p.date_of_birth) return

        const bday = new Date(p.date_of_birth)
        const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil >= 0 && daysUntil <= 3 && p.id !== user.id) {
          feedItems.push({
            id: `bday-${p.id}`,
            type: 'birthday',
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
              ? t('social_feed.titles.birthday_today', { name: p.full_name })
              : t('social_feed.titles.birthday_upcoming', { name: p.full_name, count: daysUntil }),
            content: daysUntil === 0 ? t('social_feed.messages.birthday_message', 'Send your birthday wishes!') : '',
            timestamp: thisYearBday,
            reactions: {},
            comments: []
          })
        }
      })

      // 7. New team members (hired in last 14 days)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      let newJoiners: any[] = []
      if (shouldScopeToTeam || allowGlobalFallback) {
        let newJoinersQuery = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, hire_date, job_title')
          .gte('hire_date', twoWeeksAgo.toISOString())
          .neq('id', user.id)
          .order('hire_date', { ascending: false })
          .limit(5)

        if (shouldScopeToTeam) {
          newJoinersQuery = newJoinersQuery.in('id', scopedTeamUserIds)
        }

        const { data } = await newJoinersQuery
        newJoiners = data || []
      }

      newJoiners.forEach((j: any) => {
        if (!j.hire_date) return
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
          title: t('social_feed.titles.new_joiner', { name: j.full_name }),
          content: j.job_title
            ? t('social_feed.messages.new_joiner_role', { role: j.job_title })
            : t('social_feed.messages.new_joiner_message', 'Say hello to our new team member!'),
          timestamp: new Date(j.hire_date),
          reactions: {},
          comments: []
        })
      })

      // 8. Recent payslips
      const { data: payslips } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', user.id)
        .order('period_end', { ascending: false })
        .limit(1)

      payslips?.forEach((p: any) => {
        if (!p.period_end) return
        const periodDate = new Date(p.period_end)
        const isRecent = periodDate > thirtyDaysAgo
        if (isRecent) {
          feedItems.push({
            id: `pay-${p.id}`,
            type: 'announcement',
            author: {
              id: 'system',
              name: t('social_feed.labels.payroll_dept', 'Payroll Dept'),
              email: '',
              avatar: null,
              role: 'property_hr',
              department: t('social_feed.labels.finance', 'Finance'),
              property: t('social_feed.labels.system', 'System'),
              permissions: []
            },
            title: t('social_feed.titles.payslip_available', 'New Payslip Available'),
            content: t('social_feed.messages.payslip_message', { date: formatDate(periodDate, { dateStyle: 'medium' }) }),
            timestamp: new Date(p.created_at || p.period_end),
            reactions: {},
            comments: [],
            actionButton: {
              text: t('social_feed.actions.view_payslip', 'View Payslip'),
              onClick: () => {
                window.location.href = `/hr/payslips`
              }
            }
          })
        }
      })

      // 9. Recent performance reviews
      const { data: recentReviews } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('employee_id', user.id)
        .order('review_date', { ascending: false })
        .limit(1)

      recentReviews?.forEach((r: any) => {
        if (!r.review_date) return
        const reviewDate = new Date(r.review_date)
        const isRecent = reviewDate > thirtyDaysAgo
        if (isRecent) {
          feedItems.push({
            id: `rev-${r.id}`,
            type: 'recognition',
            author: {
              id: r.reviewer_id || 'system',
              name: t('social_feed.labels.performance_review', 'Performance Review'),
              email: '',
              avatar: null,
              role: 'property_manager',
              department: t('social_feed.labels.management', 'Management'),
              property: t('social_feed.labels.system', 'System'),
              permissions: []
            },
            title: t('social_feed.titles.performance_review', 'New Performance Review'),
            content: t('social_feed.messages.performance_review_message', { date: formatDate(reviewDate, { dateStyle: 'medium' }) }),
            timestamp: new Date(r.created_at || r.review_date),
            reactions: {},
            comments: [],
            actionButton: {
              text: t('social_feed.actions.view_review', 'View Review'),
              onClick: () => {
                window.location.href = `/hr/performance`
              }
            }
          })
        }
      })

      // 10. Recent attendance (last 24 hours)
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .gte('check_in', twentyFourHoursAgo.toISOString())
        .order('check_in', { ascending: false })
        .limit(2)

      attendance?.forEach((a: any) => {
        if (a.check_in) {
          feedItems.push({
            id: `att-in-${a.id}`,
            type: 'announcement',
            author: {
              id: user.id,
              name: t('social_feed.labels.you', 'You'),
              email: '',
              avatar: null,
              role: 'staff',
              department: '',
              property: '',
              permissions: []
            },
            title: t('social_feed.titles.shift_started', 'Shift Started'),
            content: t('social_feed.messages.shift_started_message', { time: formatTime(new Date(a.check_in)) }),
            timestamp: new Date(a.check_in),
            reactions: {},
            comments: []
          })
        }

        if (a.check_out) {
          feedItems.push({
            id: `att-out-${a.id}`,
            type: 'announcement',
            author: {
              id: user.id,
              name: t('social_feed.labels.you', 'You'),
              email: '',
              avatar: null,
              role: 'staff',
              department: '',
              property: '',
              permissions: []
            },
            title: t('social_feed.titles.shift_ended', 'Shift Ended'),
            content: t('social_feed.messages.shift_ended_message', { time: formatTime(new Date(a.check_out)) }),
            timestamp: new Date(a.check_out),
            reactions: {},
            comments: []
          })
        }
      })

      // 11. Recent earned certificates
      const certificateUserIds = shouldScopeToTeam
        ? Array.from(new Set([...scopedTeamUserIds, user.id]))
        : [user.id]
      let certificatesQuery = supabase
        .from('certificates')
        .select('*, user:profiles!certificates_user_id_fkey(id, full_name, avatar_url)')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      if (!allowGlobalFallback) {
        certificatesQuery = certificatesQuery.in('user_id', certificateUserIds)
      }

      const { data: myCerts } = await certificatesQuery

      myCerts?.forEach((c: any) => {
        const certificateOwner = c.user || {}
        feedItems.push({
          id: `cert-${c.id}`,
          type: 'recognition',
          author: {
            id: certificateOwner.id || 'system',
            name: certificateOwner.full_name || t('social_feed.labels.certification', 'Certification'),
            email: '',
            avatar: certificateOwner.avatar_url || null,
            role: 'staff',
            department: '',
            property: '',
            permissions: []
          },
          title: t('social_feed.titles.certificate', { title: c.title }),
          content: t('social_feed.messages.certificate_message', "Congratulations! You've earned a new certificate."),
          timestamp: new Date(c.created_at),
          reactions: {},
          comments: [],
          actionButton: {
            text: t('social_feed.actions.view_certificate', 'View Certificate'),
            onClick: () => {
              window.location.href = `/profile`
            }
          }
        })
      })

      // 12. Recently completed goals
      const goalUserIds = shouldScopeToTeam
        ? Array.from(new Set([...scopedTeamUserIds, user.id]))
        : [user.id]
      let goalsQuery = supabase
        .from('goals')
        .select('*, employee:profiles!goals_employee_id_fkey(id, full_name, avatar_url)')
        .eq('status', 'completed')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(5)

      if (!allowGlobalFallback) {
        goalsQuery = goalsQuery.in('employee_id', goalUserIds)
      }

      const { data: recentGoals } = await goalsQuery

      recentGoals?.forEach((g: any) => {
        const goalOwner = g.employee || {}
        feedItems.push({
          id: `goal-comp-${g.id}`,
          type: 'recognition',
          author: {
            id: goalOwner.id || user.id,
            name: goalOwner.full_name || t('social_feed.labels.you', 'You'),
            email: '',
            avatar: goalOwner.avatar_url || null,
            role: 'staff',
            department: '',
            property: '',
            permissions: []
          },
          title: t('social_feed.titles.goal_completed', { title: g.title }),
          content: t('social_feed.messages.goal_message', "You've successfully completed a career milestone!"),
          timestamp: new Date(g.updated_at),
          reactions: {},
          comments: []
        })
      })

      // Sort by timestamp desc
      return feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5
  })

  const feedItemIds = useMemo(() => fetchedItems.map(i => i.id), [fetchedItems])
  const fetchedKey = useMemo(
    () => fetchedItems.map(i => `${i.id}:${i.timestamp?.getTime?.() ?? 0}`).join('|'),
    [fetchedItems]
  )

  const { data: interactionsData } = useQuery({
    queryKey: ['unified-social-feed-interactions', user?.id, feedItemIds.join('|')],
    queryFn: async () => {
      if (!user?.id || feedItemIds.length === 0) {
        return { reactions: [], comments: [] }
      }

      const [reactionsRes, commentsRes] = await Promise.all([
        supabase
          .from('feed_reactions')
          .select('feed_item_id, user_id, reaction_type')
          .in('feed_item_id', feedItemIds),
        supabase
          .from('feed_comments')
          .select('id, feed_item_id, content, created_at, author:profiles(id, full_name, avatar_url)')
          .in('feed_item_id', feedItemIds)
          .order('created_at', { ascending: true })
      ])

      return {
        reactions: reactionsRes.data || [],
        comments: commentsRes.data || []
      }
    },
    enabled: !!user?.id && feedItemIds.length > 0,
    staleTime: 1000 * 30
  })

  const [feedItems, setFeedItems] = useState<FeedItem[]>([])

  useEffect(() => {
    setFeedItems(fetchedItems)
  }, [fetchedKey])

  useEffect(() => {
    if (!interactionsData) return

    const reactionCountsByItem: Record<string, Record<string, number>> = {}
    const userReactedByItem: Record<string, Record<string, boolean>> = {}

    for (const r of interactionsData.reactions as any[]) {
      reactionCountsByItem[r.feed_item_id] ||= {}
      reactionCountsByItem[r.feed_item_id][r.reaction_type] =
        (reactionCountsByItem[r.feed_item_id][r.reaction_type] || 0) + 1

      if (r.user_id === user?.id) {
        userReactedByItem[r.feed_item_id] ||= {}
        userReactedByItem[r.feed_item_id][r.reaction_type] = true
      }
    }

    const commentsByItem: Record<string, any[]> = {}
    for (const c of interactionsData.comments as any[]) {
      commentsByItem[c.feed_item_id] ||= []
      commentsByItem[c.feed_item_id].push(c)
    }

    setFeedItems(prev => prev.map(item => {
      const reactions = reactionCountsByItem[item.id] || {}
      const rawComments = commentsByItem[item.id] || []

      return {
        ...item,
        reactions,
        comments: rawComments.map((c: any) => ({
          id: c.id,
          author: {
            id: c.author?.id || 'system',
            name: c.author?.full_name || 'Unknown',
            email: '',
            avatar: c.author?.avatar_url || null,
            role: 'staff',
            department: '',
            property: '',
            permissions: []
          },
          content: c.content,
          timestamp: new Date(c.created_at),
          reactions: {}
        })),
        metadata: {
          ...(item as any).metadata,
          _userReacted: userReactedByItem[item.id] || {}
        }
      } as any
    }))
  }, [interactionsData, user?.id])

  const onReact = useCallback((itemId: string, reaction: string) => {
    if (!user?.id) return

    setFeedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item

      const meta = ((item as any).metadata || {})
      const userReacted = (meta._userReacted || {}) as Record<string, boolean>
      const alreadyReacted = !!userReacted[reaction]
      const currentCount = item.reactions[reaction] || 0

      return {
        ...item,
        reactions: {
          ...item.reactions,
          [reaction]: Math.max(0, currentCount + (alreadyReacted ? -1 : 1))
        },
        metadata: {
          ...meta,
          _userReacted: {
            ...userReacted,
            [reaction]: !alreadyReacted
          }
        }
      } as any
    }))

    ;(async () => {
      const { data: existing } = await supabase
        .from('feed_reactions')
        .select('id')
        .eq('feed_item_id', itemId)
        .eq('user_id', user.id)
        .eq('reaction_type', reaction)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from('feed_reactions')
          .delete()
          .eq('id', existing.id)
      } else {
        await supabase
          .from('feed_reactions')
          .insert({ feed_item_id: itemId, user_id: user.id, reaction_type: reaction })
      }
    })()
  }, [user?.id])

  const onComment = useCallback((itemId: string, content: string) => {
    if (!currentUser) return

    const tempId = `temp-${Date.now().toString()}`
    const optimisticComment = {
      id: tempId,
      author: currentUser,
      content,
      timestamp: new Date(),
      reactions: {}
    }

    setFeedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return {
        ...item,
        comments: [...item.comments, optimisticComment]
      }
    }))

    ;(async () => {
      const { data, error } = await supabase
        .from('feed_comments')
        .insert({ feed_item_id: itemId, author_id: currentUser.id, content })
        .select('id, created_at')
        .single()

      if (error || !data?.id) {
        setFeedItems(prev => prev.map(item => {
          if (item.id !== itemId) return item
          return {
            ...item,
            comments: item.comments.filter(c => c.id !== tempId)
          }
        }))
        return
      }

      setFeedItems(prev => prev.map(item => {
        if (item.id !== itemId) return item
        return {
          ...item,
          comments: item.comments.map(c => c.id === tempId
            ? { ...c, id: data.id, timestamp: new Date(data.created_at) }
            : c
          )
        }
      }))
    })()
  }, [currentUser])

  const onShare = useCallback((_itemId: string) => {
    // Share behavior is currently handled by UI toast; we keep this for parity.
  }, [])

  return {
    currentUser,
    feedItems,
    isLoading,
    onReact,
    onComment,
    onShare
  }
}
