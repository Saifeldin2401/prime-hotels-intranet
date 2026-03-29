import { supabase } from '@/lib/supabase'
import type {
    CreateAssignmentDTO,
    CreateQuizDTO,
    LearningAssignment,
    LearningAssignmentExemption,
    LearningAssignmentStatus,
    LearningAssignmentUserOverride,
    LearningContentType,
    LearningProgress,
    LearningQuiz,
    LearningQuizQuestion,
    LearningTargetType,
    ModuleAssigneeRosterEntry,
    ModuleAssigneeSource,
    ModuleAssignmentRoster
} from '@/types/learning'
import type { QuestionStatus } from '@/types/questions'

type AssignmentPriority = 'normal' | 'high' | 'compliance'

type AssignmentRow = LearningAssignment & {
    target_id: string | null
    due_date?: string | null
    valid_from?: string | null
    expires_at?: string | null
    priority?: AssignmentPriority | null
    assigned_by?: string | null
    instructions?: string | null
    requires_acknowledgement?: boolean | null
    notify_on_due?: boolean | null
    reminder_days_before?: number[] | null
    is_deleted?: boolean | null
}

type ProfileRow = {
    id: string
    full_name?: string | null
    email?: string | null
    avatar_url?: string | null
    is_active?: boolean | null
}

type UserRoleRow = {
    user_id: string
    role: string
}

type UserDepartmentRow = {
    user_id: string
    department_id: string
}

type UserPropertyRow = {
    user_id: string
    property_id: string
}

type DepartmentRow = {
    id: string
    name: string
    property_id?: string | null
}

type PropertyRow = {
    id: string
    name: string
}

type ModuleAssignmentContext = {
    assignments: AssignmentRow[]
    profiles: ProfileRow[]
    userRoles: UserRoleRow[]
    userDepartments: UserDepartmentRow[]
    userProperties: UserPropertyRow[]
    departments: DepartmentRow[]
    properties: PropertyRow[]
    progressRows: LearningProgress[]
    exemptions: LearningAssignmentExemption[]
    overrides: LearningAssignmentUserOverride[]
}

const PRIORITY_SCORE: Record<string, number> = {
    compliance: 0,
    high: 1,
    normal: 2,
}

function buildContentKey(contentType: LearningContentType, contentId: string) {
    return `${contentType}:${contentId}`
}

function getAssignmentPriorityScore(priority?: string | null) {
    return PRIORITY_SCORE[priority || 'normal'] ?? 99
}

function pickPreferredAssignment(assignments: AssignmentRow[]) {
    return assignments.reduce<AssignmentRow | null>((best, next) => {
        if (!best) return next

        const bestPriority = getAssignmentPriorityScore(best.priority)
        const nextPriority = getAssignmentPriorityScore(next.priority)
        if (nextPriority < bestPriority) return next

        if (nextPriority === bestPriority) {
            const bestDue = best.due_date ? new Date(best.due_date).getTime() : Number.POSITIVE_INFINITY
            const nextDue = next.due_date ? new Date(next.due_date).getTime() : Number.POSITIVE_INFINITY
            if (nextDue < bestDue) return next

            const bestCreated = new Date(best.created_at).getTime()
            const nextCreated = new Date(next.created_at).getTime()
            if (nextCreated > bestCreated) return next
        }

        return best
    }, null)
}

function sortRosterEntries(entries: ModuleAssigneeRosterEntry[]) {
    return [...entries].sort((a, b) => {
        const priorityDiff = getAssignmentPriorityScore(a.effective_priority) - getAssignmentPriorityScore(b.effective_priority)
        if (priorityDiff !== 0) return priorityDiff

        const aDue = a.effective_due_date ? new Date(a.effective_due_date).getTime() : Number.POSITIVE_INFINITY
        const bDue = b.effective_due_date ? new Date(b.effective_due_date).getTime() : Number.POSITIVE_INFINITY
        if (aDue !== bDue) return aDue - bDue

        return (a.full_name || '').localeCompare(b.full_name || '')
    })
}

async function getCurrentAuthUserId() {
    const { data: authData } = await supabase.auth.getUser()
    return authData.user?.id ?? null
}

function getResolvedStatus(progress?: LearningProgress | null): LearningAssignmentStatus | 'not_started' {
    if (!progress) return 'not_started'
    return progress.status
}

function resolveMatchingUserIds(
    assignment: AssignmentRow,
    context: ModuleAssignmentContext
) {
    const activeUsers = context.profiles.filter((profile) => profile.is_active !== false)
    const activeUserIds = new Set(activeUsers.map((profile) => profile.id))

    if (assignment.target_type === 'everyone') {
        return activeUsers.map((profile) => profile.id)
    }

    if (assignment.target_type === 'user') {
        return assignment.target_id && activeUserIds.has(assignment.target_id)
            ? [assignment.target_id]
            : []
    }

    if (assignment.target_type === 'department') {
        return context.userDepartments
            .filter((row) => row.department_id === assignment.target_id && activeUserIds.has(row.user_id))
            .map((row) => row.user_id)
    }

    if (assignment.target_type === 'property') {
        return context.userProperties
            .filter((row) => row.property_id === assignment.target_id && activeUserIds.has(row.user_id))
            .map((row) => row.user_id)
    }

    if (assignment.target_type === 'role') {
        return context.userRoles
            .filter((row) => row.role === assignment.target_id && activeUserIds.has(row.user_id))
            .map((row) => row.user_id)
    }

    return []
}

function describeAssignmentTarget(
    assignment: AssignmentRow,
    profilesById: Map<string, ProfileRow>,
    departmentsById: Map<string, DepartmentRow>,
    propertiesById: Map<string, PropertyRow>
) {
    switch (assignment.target_type) {
        case 'user': {
            const user = profilesById.get(assignment.target_id ?? '')
            return {
                label: user?.full_name || user?.email || assignment.target_id || 'User',
                meta: user?.email || undefined,
            }
        }
        case 'department': {
            const department = departmentsById.get(assignment.target_id ?? '')
            const property = propertiesById.get(department?.property_id || '')
            return {
                label: department?.name || 'Department',
                meta: property?.name,
            }
        }
        case 'property': {
            const property = propertiesById.get(assignment.target_id ?? '')
            return {
                label: property?.name || 'Property',
                meta: undefined,
            }
        }
        case 'role':
            return {
                label: assignment.target_id || 'Role',
                meta: 'Role assignment',
            }
        case 'everyone':
        default:
            return {
                label: 'Everyone',
                meta: 'All active users',
            }
    }
}

async function fetchModuleAssignmentContext(moduleId: string): Promise<ModuleAssignmentContext> {
    const [
        assignmentsResult,
        profilesResult,
        userRolesResult,
        userDepartmentsResult,
        userPropertiesResult,
        departmentsResult,
        propertiesResult,
        progressResult,
        exemptionsResult,
        overridesResult,
    ] = await Promise.all([
        supabase
            .from('learning_assignments')
            .select('*')
            .eq('content_type', 'module')
            .eq('content_id', moduleId)
            .or('is_deleted.is.null,is_deleted.eq.false'),
        supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, is_active'),
        supabase
            .from('user_roles')
            .select('user_id, role'),
        supabase
            .from('user_departments')
            .select('user_id, department_id'),
        supabase
            .from('user_properties')
            .select('user_id, property_id'),
        supabase
            .from('departments')
            .select('id, name, property_id'),
        supabase
            .from('properties')
            .select('id, name'),
        supabase
            .from('learning_progress')
            .select('*')
            .eq('content_type', 'module')
            .eq('content_id', moduleId),
        supabase
            .from('learning_assignment_exemptions')
            .select('*')
            .eq('content_type', 'module')
            .eq('content_id', moduleId),
        supabase
            .from('learning_assignment_user_overrides')
            .select('*')
            .eq('content_type', 'module')
            .eq('content_id', moduleId),
    ])

    if (assignmentsResult.error) throw assignmentsResult.error
    if (profilesResult.error) throw profilesResult.error
    if (userRolesResult.error) throw userRolesResult.error
    if (userDepartmentsResult.error) throw userDepartmentsResult.error
    if (userPropertiesResult.error) throw userPropertiesResult.error
    if (departmentsResult.error) throw departmentsResult.error
    if (propertiesResult.error) throw propertiesResult.error
    if (progressResult.error) throw progressResult.error
    if (exemptionsResult.error) throw exemptionsResult.error
    if (overridesResult.error) throw overridesResult.error

    return {
        assignments: (assignmentsResult.data || []) as AssignmentRow[],
        profiles: (profilesResult.data || []) as ProfileRow[],
        userRoles: (userRolesResult.data || []) as UserRoleRow[],
        userDepartments: (userDepartmentsResult.data || []) as UserDepartmentRow[],
        userProperties: (userPropertiesResult.data || []) as UserPropertyRow[],
        departments: (departmentsResult.data || []) as DepartmentRow[],
        properties: (propertiesResult.data || []) as PropertyRow[],
        progressRows: (progressResult.data || []) as LearningProgress[],
        exemptions: (exemptionsResult.data || []) as LearningAssignmentExemption[],
        overrides: (overridesResult.data || []) as LearningAssignmentUserOverride[],
    }
}

function buildModuleAssignmentRoster(
    moduleId: string,
    context: ModuleAssignmentContext
): ModuleAssignmentRoster {
    const profilesById = new Map(context.profiles.map((profile) => [profile.id, profile]))
    const departmentsById = new Map(context.departments.map((department) => [department.id, department]))
    const propertiesById = new Map(context.properties.map((property) => [property.id, property]))
    const progressByUser = new Map(context.progressRows.map((progress) => [progress.user_id, progress]))
    const exemptionsByUser = new Map(context.exemptions.map((exemption) => [exemption.user_id, exemption]))
    const overridesByUser = new Map(context.overrides.map((override) => [override.user_id, override]))

    const departmentIdsByUser = new Map<string, string[]>()
    context.userDepartments.forEach((row) => {
        const current = departmentIdsByUser.get(row.user_id) || []
        current.push(row.department_id)
        departmentIdsByUser.set(row.user_id, current)
    })

    const propertyIdsByUser = new Map<string, string[]>()
    context.userProperties.forEach((row) => {
        const current = propertyIdsByUser.get(row.user_id) || []
        current.push(row.property_id)
        propertyIdsByUser.set(row.user_id, current)
    })

    const assignmentsByUser = new Map<string, AssignmentRow[]>()
    const sourcesByUser = new Map<string, ModuleAssigneeSource[]>()

    context.assignments.forEach((assignment) => {
        const matchingUserIds = resolveMatchingUserIds(assignment, context)
        const sourceMeta = describeAssignmentTarget(assignment, profilesById, departmentsById, propertiesById)

        matchingUserIds.forEach((userId) => {
            const assignmentList = assignmentsByUser.get(userId) || []
            assignmentList.push(assignment)
            assignmentsByUser.set(userId, assignmentList)

            const sourceList = sourcesByUser.get(userId) || []
            sourceList.push({
                assignment_id: assignment.id,
                target_type: assignment.target_type as LearningTargetType,
                target_id: assignment.target_id,
                label: sourceMeta.label,
                meta: sourceMeta.meta,
                due_date: assignment.due_date ?? null,
                priority: assignment.priority ?? null,
                valid_from: assignment.valid_from ?? null,
                expires_at: assignment.expires_at ?? null,
                instructions: assignment.instructions ?? null,
                created_at: assignment.created_at,
            })
            sourcesByUser.set(userId, sourceList)
        })
    })

    const allUserIds = new Set<string>([
        ...assignmentsByUser.keys(),
        ...exemptionsByUser.keys(),
        ...overridesByUser.keys(),
    ])

    const active: ModuleAssigneeRosterEntry[] = []
    const exempted: ModuleAssigneeRosterEntry[] = []

    allUserIds.forEach((userId) => {
        const profile = profilesById.get(userId)
        const userAssignments = assignmentsByUser.get(userId) || []
        const preferredAssignment = pickPreferredAssignment(userAssignments)
        const progress = progressByUser.get(userId)
        const exemption = exemptionsByUser.get(userId) || null
        const override = overridesByUser.get(userId) || null

        const departmentName = (departmentIdsByUser.get(userId) || [])
            .map((departmentId) => departmentsById.get(departmentId)?.name)
            .find(Boolean) || null

        const propertyName = (propertyIdsByUser.get(userId) || [])
            .map((propertyId) => propertiesById.get(propertyId)?.name)
            .find(Boolean) || null

        const entry: ModuleAssigneeRosterEntry = {
            user_id: userId,
            full_name: profile?.full_name || profile?.email || 'Unknown user',
            email: profile?.email || null,
            avatar_url: profile?.avatar_url || null,
            department_name: departmentName,
            property_name: propertyName,
            status: getResolvedStatus(progress),
            progress_percentage: typeof progress?.progress_percentage === 'number' ? progress.progress_percentage : 0,
            score_percentage: typeof progress?.score_percentage === 'number' ? progress.score_percentage : null,
            passed: progress?.passed ?? null,
            last_accessed_at: progress?.last_accessed_at || progress?.updated_at || null,
            assignment_id: progress?.assignment_id || preferredAssignment?.id || null,
            effective_due_date: override ? (override.due_date ?? null) : (preferredAssignment?.due_date ?? null),
            effective_priority: (override?.priority ?? preferredAssignment?.priority ?? 'normal') as AssignmentPriority,
            effective_instructions: override?.instructions ?? preferredAssignment?.instructions ?? null,
            has_override: Boolean(override),
            override,
            sources: (sourcesByUser.get(userId) || []).sort((a, b) => {
                const priorityDiff = getAssignmentPriorityScore(a.priority) - getAssignmentPriorityScore(b.priority)
                if (priorityDiff !== 0) return priorityDiff
                const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
                const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
                return aDue - bDue
            }),
            exemption,
        }

        if (exemption) {
            exempted.push(entry)
        } else {
            active.push(entry)
        }
    })

    return {
        module_id: moduleId,
        active: sortRosterEntries(active),
        exempted: [...exempted].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }
}

function hashSeed(input: string): number {
    let hash = 2166136261
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function seededShuffleArray<T>(items: T[], seedInput: string): T[] {
    const result = [...items]
    let seed = hashSeed(seedInput)
    const nextRandom = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 4294967296
    }

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(nextRandom() * (i + 1))
        const temp = result[i]
        result[i] = result[j]
        result[j] = temp
    }

    return result
}

export const learningService = {
    // ==========================================
    // QUIZZES
    // ==========================================

    async getQuizzes(status?: QuestionStatus) {
        let query = supabase
            .from('learning_quizzes')
            .select(`
                *,
                questions:learning_quiz_questions(count)
            `)
            .order('created_at', { ascending: false })
            .eq('is_deleted', false)

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) throw error

        return data.map(q => ({
            ...q,
            question_count: q.questions[0]?.count || 0
        })) as LearningQuiz[]
    },

    async getQuiz(id: string) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .select(`
                *,
                questions:learning_quiz_questions(
                    *,
                    question:knowledge_questions(
                        *,
                        options:knowledge_question_options(*)
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        if (data.questions) {
            data.questions = data.questions.filter((questionLink: LearningQuizQuestion) => {
                const questionText = questionLink.question?.question_text
                return typeof questionText === 'string' && questionText.trim().length > 0
            })
        }

        // Respect quiz setting: randomize question order in player when enabled.
        if (data.questions) {
            if (data.randomize_questions) {
                const { data: authData } = await supabase.auth.getUser()
                const userSeed = authData?.user?.id || 'anonymous'
                data.questions = seededShuffleArray(data.questions, `${id}:${userSeed}`)
            } else {
                data.questions.sort((a: LearningQuizQuestion, b: LearningQuizQuestion) => (a.display_order || 0) - (b.display_order || 0))
            }
        }

        return data as LearningQuiz
    },

    async createQuiz(quiz: CreateQuizDTO) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .insert(quiz)
            .select()
            .single()

        if (error) throw error
        return data as LearningQuiz
    },

    async updateQuiz(id: string, updates: Partial<CreateQuizDTO>) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // If publishing the quiz, also publish all linked questions to ensure visibility
        if (updates.status === 'published') {
            // Find all questions linked to this quiz
            const { data: links } = await supabase
                .from('learning_quiz_questions')
                .select('question_id')
                .eq('quiz_id', id)

            if (links && links.length > 0) {
                const questionIds = links.map(l => l.question_id)
                await supabase
                    .from('knowledge_questions')
                    .update({ status: 'published' })
                    .in('id', questionIds)
            }
        }

        return data as LearningQuiz
    },

    async deleteQuiz(id: string) {
        const { error } = await supabase
            .from('learning_quizzes')
            .update({ is_deleted: true })
            .eq('id', id)

        if (error) throw error
    },

    // ==========================================
    // QUIZ QUESTIONS
    // ==========================================

    async addQuestionToQuiz(quizId: string, questionId: string, order: number) {
        const { data, error } = await supabase
            .from('learning_quiz_questions')
            .insert({
                quiz_id: quizId,
                question_id: questionId,
                display_order: order
            })
            .select()
            .single()

        if (error) throw error
        return data as LearningQuizQuestion
    },

    async removeQuestionFromQuiz(quizId: string, questionId: string) {
        const { error } = await supabase
            .from('learning_quiz_questions')
            .delete()
            .eq('quiz_id', quizId)
            .eq('question_id', questionId)

        if (error) throw error
    },

    async reorderQuizQuestions(quizId: string, questionIds: string[]) {
        // Upsert all with new orders
        const updates = questionIds.map((qId, index) => ({
            quiz_id: quizId,
            question_id: qId,
            display_order: index
        }))

        const { error } = await supabase
            .from('learning_quiz_questions')
            .upsert(updates, { onConflict: 'quiz_id,question_id' })

        if (error) throw error
    },

    // ==========================================
    // ASSIGNMENTS
    // ==========================================

    async createAssignment(assignment: CreateAssignmentDTO) {
        const { error } = await supabase
            .from('learning_assignments')
            .insert(assignment)

        if (error) throw error
        return { success: true } as unknown as LearningAssignment
    },

    async updateAssignment(id: string, updates: Partial<CreateAssignmentDTO>) {
        const { data, error } = await supabase
            .from('learning_assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as LearningAssignment
    },

    async deleteAssignment(id: string) {
        const { error } = await supabase
            .from('learning_assignments')
            .update({ is_deleted: true })
            .eq('id', id)

        if (error) throw error
    },

    async getAssignments(targetId?: string, targetType?: string) {
        let query = supabase
            .from('learning_assignments')
            .select('*')
            .order('created_at', { ascending: false })
            .eq('is_deleted', false)

        if (targetId) query = query.eq('target_id', targetId)
        if (targetType) query = query.eq('target_type', targetType)

        const { data, error } = await query
        if (error) throw error
        return data as LearningAssignment[]
    },

    // ==========================================
    // MY LEARNING
    // ==========================================

    async getMyAssignments() {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const [rolesResult, departmentsResult, propertiesResult] = await Promise.all([
            supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id),
            supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id),
            supabase
                .from('user_properties')
                .select('property_id')
                .eq('user_id', user.id)
        ])

        if (rolesResult.error) throw rolesResult.error
        if (departmentsResult.error) throw departmentsResult.error
        if (propertiesResult.error) throw propertiesResult.error

        const roleIds = (rolesResult.data || [])
            .map((row: { role?: string | null }) => row.role)
            .filter((role): role is string => typeof role === 'string' && role.length > 0)

        const departmentIds = (departmentsResult.data || [])
            .map((row: { department_id?: string | null }) => row.department_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)

        const propertyIds = (propertiesResult.data || [])
            .map((row: { property_id?: string | null }) => row.property_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)

        const notDeletedFilter = 'or(is_deleted.is.null,is_deleted.eq.false)'
        const orSegments: string[] = []

        orSegments.push(`and(target_type.eq.everyone,${notDeletedFilter})`)
        orSegments.push(`and(target_type.eq.user,target_id.eq.${user.id},${notDeletedFilter})`)

        roleIds.forEach((role) => {
            orSegments.push(`and(target_type.eq.role,target_id.eq.${role},${notDeletedFilter})`)
        })

        departmentIds.forEach((departmentId) => {
            orSegments.push(`and(target_type.eq.department,target_id.eq.${departmentId},${notDeletedFilter})`)
        })

        propertyIds.forEach((propertyId) => {
            orSegments.push(`and(target_type.eq.property,target_id.eq.${propertyId},${notDeletedFilter})`)
        })

        const { data, error } = await supabase
            .from('learning_assignments')
            .select('*')
            .or(orSegments.join(','))
            .order('created_at', { ascending: false })

        if (error) throw error

        const assignments = (data || []) as AssignmentRow[]
        const contentIds = Array.from(new Set(assignments.map(a => a.content_id).filter(Boolean)))
        const assignmentKeys = new Set(assignments.map((assignment) => buildContentKey(
            assignment.content_type as LearningContentType,
            assignment.content_id
        )))

        const [progressResult, exemptionsResult, overridesResult] = contentIds.length > 0
            ? await Promise.all([
                supabase
                    .from('learning_progress')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('content_id', contentIds),
                supabase
                    .from('learning_assignment_exemptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('content_id', contentIds),
                supabase
                    .from('learning_assignment_user_overrides')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('content_id', contentIds),
            ])
            : [
                { data: [], error: null },
                { data: [], error: null },
                { data: [], error: null },
            ]

        if (progressResult.error) throw progressResult.error
        if (exemptionsResult.error) throw exemptionsResult.error
        if (overridesResult.error) throw overridesResult.error

        const progressByContent = new Map(
            (progressResult.data || []).map((progress: LearningProgress) => [
                buildContentKey(progress.content_type, progress.content_id),
                progress,
            ])
        )

        const exemptedContentKeys = new Set(
            (exemptionsResult.data || [])
                .map((row: LearningAssignmentExemption) => buildContentKey(row.content_type, row.content_id))
                .filter((key) => assignmentKeys.has(key))
        )

        const overridesByContent = new Map(
            (overridesResult.data || []).map((override: LearningAssignmentUserOverride) => [
                buildContentKey(override.content_type, override.content_id),
                override,
            ])
        )

        const filteredAssignments = assignments
            .filter((assignment) => {
                const key = buildContentKey(assignment.content_type as LearningContentType, assignment.content_id)
                const progress = progressByContent.get(key)
                if (exemptedContentKeys.has(key)) return false
                if (progress?.status === 'excused') return false
                return true
            })
            .map((assignment) => {
                const key = buildContentKey(assignment.content_type as LearningContentType, assignment.content_id)
                const override = overridesByContent.get(key)
                return {
                    ...assignment,
                    due_date: override ? (override.due_date ?? null) : (assignment.due_date ?? null),
                    priority: (override?.priority ?? assignment.priority ?? 'normal') as AssignmentPriority,
                    progress: progressByContent.get(key) || null,
                } as LearningAssignment
            })

        // Enrich with titles
        // Enrich with titles and details
        const quizIds = filteredAssignments
            .filter(a => a.content_type === 'quiz')
            .map(a => a.content_id)

        const moduleIds = filteredAssignments
            .filter(a => a.content_type === 'module')
            .map(a => a.content_id)

        const [quizResult, moduleResult] = await Promise.all([
            quizIds.length > 0
                ? supabase
                    .from('learning_quizzes')
                    .select('id, title, description, time_limit_minutes, status')
                    .in('id', quizIds)
                    .eq('status', 'published')
                : Promise.resolve({ data: [], error: null }),
            moduleIds.length > 0
                ? supabase
                    .from('training_modules')
                    .select('id, title, description, estimated_duration_minutes, status, is_active')
                    .in('id', moduleIds)
                    .eq('is_active', true)
                    .eq('is_deleted', false)
                : Promise.resolve({ data: [], error: null })
        ])

        if (quizResult?.error) console.error('Error fetching quizzes:', quizResult.error)
        if (moduleResult?.error) console.error('Error fetching modules:', moduleResult.error)

        const quizMap = new Map((quizResult?.data || []).map((q: {
            id: string
            title: string
            description?: string | null
            time_limit_minutes?: number | null
        }) => [q.id, q]))
        const moduleMap = new Map((moduleResult?.data || []).map((m: {
            id: string
            title: string
            description?: string | null
            estimated_duration_minutes?: number | null
        }) => [m.id, m]))

        filteredAssignments.forEach(a => {
            if (a.content_type === 'quiz') {
                const q = quizMap.get(a.content_id)
                if (q) {
                    a.content_title = q.title
                    a.content_metadata = {
                        description: q.description,
                        duration: q.time_limit_minutes,
                        // question_count not available in direct fetch
                    }
                }
            }
            if (a.content_type === 'module') {
                const m = moduleMap.get(a.content_id)
                if (m) {
                    a.content_title = m.title
                    a.content_metadata = {
                        description: m.description,
                        duration: m.estimated_duration_minutes
                    }
                }
            }
        })

        // Filter out assignments where content could not be resolved (e.g. deleted or RLS restricted draft)
        const validAssignments = filteredAssignments.filter(a => {
            if (a.content_type === 'quiz' || a.content_type === 'module') {
                return !!a.content_title
            }
            return true // Keep other types if any
        })

        // De-duplicate assignments per user/content (user completes content once)
        const deduped = new Map<string, LearningAssignment>()
        validAssignments.forEach((assignment) => {
            const key = `${assignment.content_type}:${assignment.content_id}`
            const existing = deduped.get(key)

            if (!existing) {
                deduped.set(key, assignment)
                return
            }

            const existingPriority = getAssignmentPriorityScore(existing.priority)
            const nextPriority = getAssignmentPriorityScore(assignment.priority)

            if (nextPriority < existingPriority) {
                deduped.set(key, assignment)
                return
            }

            if (nextPriority === existingPriority) {
                const existingDue = existing.due_date ? new Date(existing.due_date).getTime() : Number.POSITIVE_INFINITY
                const nextDue = assignment.due_date ? new Date(assignment.due_date).getTime() : Number.POSITIVE_INFINITY
                if (nextDue < existingDue) {
                    deduped.set(key, assignment)
                    return
                }

                const existingCreated = new Date(existing.created_at).getTime()
                const nextCreated = new Date(assignment.created_at).getTime()
                if (nextCreated > existingCreated) {
                    deduped.set(key, assignment)
                }
            }
        })

        return Array.from(deduped.values())
    },

    async getModuleAssignmentRoster(moduleId: string) {
        const context = await fetchModuleAssignmentContext(moduleId)
        return buildModuleAssignmentRoster(moduleId, context)
    },

    async exemptUserFromModule(moduleId: string, userId: string, reason?: string | null) {
        const actorId = await getCurrentAuthUserId()
        const timestamp = new Date().toISOString()

        const { error: exemptionError } = await supabase
            .from('learning_assignment_exemptions')
            .upsert({
                user_id: userId,
                content_type: 'module',
                content_id: moduleId,
                reason: reason?.trim() || null,
                created_by: actorId,
                updated_at: timestamp,
            }, {
                onConflict: 'user_id,content_type,content_id'
            })

        if (exemptionError) throw exemptionError

        const { data: progressRow, error: progressSelectError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)
            .maybeSingle()

        if (progressSelectError) throw progressSelectError

        if (progressRow) {
            const { error: progressUpdateError } = await supabase
                .from('learning_progress')
                .update({
                    status: 'excused',
                    updated_at: timestamp,
                    last_activity_at: timestamp,
                })
                .eq('id', progressRow.id)

            if (progressUpdateError) throw progressUpdateError
        }
    },

    async restoreUserModuleAccess(moduleId: string, userId: string) {
        const timestamp = new Date().toISOString()
        const { error: restoreError } = await supabase
            .from('learning_assignment_exemptions')
            .delete()
            .eq('user_id', userId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)

        if (restoreError) throw restoreError

        const { data: progressRow, error: progressSelectError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)
            .maybeSingle()

        if (progressSelectError) throw progressSelectError

        if (progressRow?.status === 'excused') {
            const restoredStatus: LearningAssignmentStatus =
                progressRow.completed_at || progressRow.progress_percentage >= 100
                    ? 'completed'
                    : progressRow.progress_percentage > 0
                        ? 'in_progress'
                        : 'assigned'

            const { error: progressUpdateError } = await supabase
                .from('learning_progress')
                .update({
                    status: restoredStatus,
                    updated_at: timestamp,
                    last_activity_at: timestamp,
                })
                .eq('id', progressRow.id)

            if (progressUpdateError) throw progressUpdateError
        }
    },

    async setModuleUserOverride({
        moduleId,
        userId,
        dueDate,
        priority,
        instructions,
    }: {
        moduleId: string
        userId: string
        dueDate?: string | null
        priority?: AssignmentPriority | null
        instructions?: string | null
    }) {
        if (!dueDate && !priority && !instructions?.trim()) {
            await this.clearModuleUserOverride(moduleId, userId)
            return
        }

        const actorId = await getCurrentAuthUserId()
        const { error } = await supabase
            .from('learning_assignment_user_overrides')
            .upsert({
                user_id: userId,
                content_type: 'module',
                content_id: moduleId,
                due_date: dueDate || null,
                priority: priority || null,
                instructions: instructions?.trim() || null,
                created_by: actorId,
                updated_by: actorId,
            }, {
                onConflict: 'user_id,content_type,content_id'
            })

        if (error) throw error
    },

    async clearModuleUserOverride(moduleId: string, userId: string) {
        const { error } = await supabase
            .from('learning_assignment_user_overrides')
            .delete()
            .eq('user_id', userId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)

        if (error) throw error
    },

    async resetModuleProgress(moduleId: string, userId: string) {
        const timestamp = new Date().toISOString()
        const { data: existingRow, error: selectError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)
            .maybeSingle()

        if (selectError) throw selectError

        const payload = {
            id: existingRow?.id,
            assignment_id: existingRow?.assignment_id ?? null,
            user_id: userId,
            content_type: 'module' as LearningContentType,
            content_id: moduleId,
            training_module_id: moduleId,
            status: 'assigned' as LearningAssignmentStatus,
            progress_percentage: 0,
            score_percentage: null,
            passed: null,
            completed_at: null,
            last_accessed_at: timestamp,
            last_activity_at: timestamp,
            last_block_index: null,
            last_block_id: null,
            time_spent_seconds: 0,
            metadata: {},
            updated_at: timestamp,
        }

        const { error } = await supabase
            .from('learning_progress')
            .upsert(payload, { onConflict: 'user_id,content_type,content_id' })

        if (error) throw error

        const { data: quizBlocks, error: quizBlocksError } = await supabase
            .from('training_content_blocks')
            .select('id, content_data')
            .eq('training_module_id', moduleId)
            .eq('type', 'quiz')

        if (quizBlocksError) throw quizBlocksError

        const quizContentIds = Array.from(new Set(
            (quizBlocks || [])
                .map((block: { id: string; content_data?: Record<string, unknown> | null }) => {
                    const linkedQuizId = block.content_data?.quiz_id
                    return typeof linkedQuizId === 'string' && linkedQuizId.length > 0
                        ? linkedQuizId
                        : block.id
                })
                .filter((contentId): contentId is string => typeof contentId === 'string' && contentId.length > 0)
        ))

        if (quizContentIds.length === 0) return

        const { data: existingQuizRows, error: quizRowsError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('content_type', 'quiz')
            .in('content_id', quizContentIds)

        if (quizRowsError) throw quizRowsError

        const existingQuizRowsByContent = new Map(
            (existingQuizRows || []).map((row: LearningProgress) => [row.content_id, row])
        )

        const quizResetPayload = quizContentIds.map((contentId) => {
            const existingQuizRow = existingQuizRowsByContent.get(contentId)

            return {
                id: existingQuizRow?.id,
                assignment_id: existingQuizRow?.assignment_id ?? null,
                user_id: userId,
                content_type: 'quiz' as LearningContentType,
                content_id: contentId,
                training_module_id: moduleId,
                status: 'assigned' as LearningAssignmentStatus,
                progress_percentage: 0,
                score_percentage: null,
                passed: null,
                completed_at: null,
                last_accessed_at: timestamp,
                last_activity_at: timestamp,
                last_block_index: null,
                last_block_id: null,
                time_spent_seconds: 0,
                metadata: {},
                updated_at: timestamp,
            }
        })

        const { error: quizResetError } = await supabase
            .from('learning_progress')
            .upsert(quizResetPayload, { onConflict: 'user_id,content_type,content_id' })

        if (quizResetError) throw quizResetError
    },

    async reassignModuleUser({
        moduleId,
        fromUserId,
        toUserId,
        reason,
    }: {
        moduleId: string
        fromUserId: string
        toUserId: string
        reason?: string | null
    }) {
        if (fromUserId === toUserId) {
            throw new Error('Cannot reassign a module to the same user.')
        }

        const actorId = await getCurrentAuthUserId()
        const context = await fetchModuleAssignmentContext(moduleId)

        const sourceAssignments = context.assignments.filter((assignment) =>
            resolveMatchingUserIds(assignment, context).includes(fromUserId)
        )
        const targetAssignments = context.assignments.filter((assignment) =>
            resolveMatchingUserIds(assignment, context).includes(toUserId)
        )

        const preferredSource = pickPreferredAssignment(sourceAssignments)
        if (!preferredSource) {
            throw new Error('The selected user is not currently assigned to this module.')
        }

        if (targetAssignments.length === 0) {
            const { error: insertError } = await supabase
                .from('learning_assignments')
                .insert({
                    target_type: 'user',
                    target_id: toUserId,
                    content_type: 'module',
                    content_id: moduleId,
                    due_date: preferredSource.due_date ?? null,
                    valid_from: preferredSource.valid_from ?? new Date().toISOString(),
                    expires_at: preferredSource.expires_at ?? null,
                    priority: preferredSource.priority ?? 'normal',
                    assigned_by: actorId ?? preferredSource.assigned_by ?? null,
                    instructions: preferredSource.instructions ?? null,
                    requires_acknowledgement: preferredSource.requires_acknowledgement ?? false,
                    notify_on_due: preferredSource.notify_on_due ?? true,
                    reminder_days_before: preferredSource.reminder_days_before ?? [],
                })

            if (insertError) throw insertError
        }

        await supabase
            .from('learning_assignment_exemptions')
            .delete()
            .eq('user_id', toUserId)
            .eq('content_type', 'module')
            .eq('content_id', moduleId)

        await this.exemptUserFromModule(moduleId, fromUserId, reason || 'Reassigned to another user')
    },

    // ==========================================
    // PROGRESS & SUBMISSION
    // ==========================================

    async getAssignmentProgress(assignmentId: string) {
        const { data, error } = await supabase
            .from('learning_progress')
            .select(`
                *,
                user:profiles!learning_progress_user_id_fkey(full_name, job_title)
            `)
            .eq('assignment_id', assignmentId)
            .order('updated_at', { ascending: false })

        if (error) throw error
        return data as LearningProgress[]
    },

    async submitQuizProgress(progress: Partial<LearningProgress>) {
        if (!progress.user_id || !progress.content_id || !progress.content_type) {
            throw new Error('Missing required progress keys (user_id, content_id, content_type)')
        }

        const { data: existingRow, error: existingError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', progress.user_id)
            .eq('content_type', progress.content_type)
            .eq('content_id', progress.content_id)
            .maybeSingle()

        if (existingError) throw existingError

        const existingScore = typeof existingRow?.score_percentage === 'number' ? existingRow.score_percentage : null
        const nextScore = typeof progress.score_percentage === 'number' ? progress.score_percentage : null
        const existingProgress = typeof existingRow?.progress_percentage === 'number' ? existingRow.progress_percentage : null
        const nextProgress = typeof progress.progress_percentage === 'number' ? progress.progress_percentage : null
        const shouldPreserveCompletion = existingRow?.status === 'completed' && progress.status !== 'completed'

        const keepExistingScore =
            existingScore !== null &&
            nextScore !== null &&
            Number.isFinite(existingScore) &&
            Number.isFinite(nextScore) &&
            existingScore > nextScore

        const mergedMetadata = (
            existingRow?.metadata &&
            typeof existingRow.metadata === 'object' &&
            !Array.isArray(existingRow.metadata)
        )
            ? { ...(existingRow.metadata as Record<string, unknown>) }
            : {}

        if (progress.metadata && typeof progress.metadata === 'object' && !Array.isArray(progress.metadata)) {
            Object.assign(mergedMetadata, progress.metadata as Record<string, unknown>)
        }

        const bestProgressPercentage =
            existingProgress !== null && nextProgress !== null
                ? Math.max(existingProgress, nextProgress)
                : (nextProgress ?? existingProgress)
        const resolvedStatus = shouldPreserveCompletion ? 'completed' : progress.status
        const resolvedProgressPercentage = resolvedStatus === 'completed'
            ? 100
            : Math.min(bestProgressPercentage ?? 0, 99)

        const bestScorePercentage = shouldPreserveCompletion
            ? (existingRow?.score_percentage ?? progress.score_percentage)
            : (keepExistingScore ? existingRow?.score_percentage : progress.score_percentage)
        const bestPassed = shouldPreserveCompletion
            ? (existingRow?.passed ?? progress.passed)
            : (keepExistingScore ? existingRow?.passed : progress.passed)
        const bestCompletedAt = shouldPreserveCompletion
            ? (existingRow?.completed_at ?? progress.completed_at)
            : (keepExistingScore ? (existingRow?.completed_at ?? progress.completed_at) : (progress.completed_at ?? existingRow?.completed_at))

        const progressData = {
            ...progress,
            status: resolvedStatus,
            progress_percentage: resolvedProgressPercentage,
            score_percentage: bestScorePercentage,
            passed: bestPassed,
            completed_at: bestCompletedAt,
            training_module_id: progress.content_type === 'module'
                ? progress.content_id
                : (progress.training_module_id ?? existingRow?.training_module_id ?? null),
            metadata: Object.keys(mergedMetadata).length ? mergedMetadata : progress.metadata,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('learning_progress')
            .upsert(progressData, { onConflict: 'user_id,content_type,content_id' })
            .select()
            .single()

        if (error) throw error
        return data as LearningProgress
    },
}
