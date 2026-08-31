import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { TrainingAssignmentsPanel } from '@/pages/training/TrainingAssignments'
import { generateCertificatePDF, loadLogoAsDataUrl, type Certificate } from '@/services/certificateService'
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Award,
    BarChart3,
    Bell,
    BookOpen,
    Brain,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    Filter,
    HelpCircle,
    Layers,
    LineChart,
    Loader2,
    Printer,
    RefreshCw,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle
} from 'lucide-react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

type TrackSubTab = 'overview' | 'roster' | 'modules' | 'certifications'
type TimeframeOption = '7d' | '30d' | '90d' | 'all'
type CertStatusFilter = 'all' | 'active' | 'expiring' | 'expired' | 'revoked'

interface TrainingTrackCommandCenterProps {
    canManageModules: boolean
    canAssignTraining: boolean
    onNavigateToBuilder?: (moduleId: string) => void
    onOpenAssignWizard?: () => void
}

export function TrainingTrackCommandCenter({
    canManageModules,
    canAssignTraining,
    onNavigateToBuilder,
    onOpenAssignWizard
}: TrainingTrackCommandCenterProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const { toast } = useToast()
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Sub-tab state
    const [subTab, setSubTab] = useState<TrackSubTab>('overview')
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
    const [timeframe, setTimeframe] = useState<TimeframeOption>('30d')
    
    // Filter states for Modules & Certifications
    const [moduleSearch, setModuleSearch] = useState('')
    const [moduleHealthFilter, setModuleHealthFilter] = useState<'all' | 'needs_attention' | 'healthy'>('all')
    
    const [certSearch, setCertSearch] = useState('')
    const [certStatusFilter, setCertStatusFilter] = useState<CertStatusFilter>('all')

    // Modal States
    const [selectedModuleForDrilldown, setSelectedModuleForDrilldown] = useState<any | null>(null)
    const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<any | null>(null)
    const [previewCertificate, setPreviewCertificate] = useState<any | null>(null)
    const [recertTarget, setRecertTarget] = useState<any | null>(null)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

    // Fetch Properties
    const { data: properties = [] } = useQuery({
        queryKey: ['properties-list-tracking'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('id, name')
                .order('name')
            if (error) throw error
            return data || []
        }
    })

    // Fetch Departments
    const { data: departments = [] } = useQuery({
        queryKey: ['departments-list-tracking', selectedPropertyId],
        queryFn: async () => {
            let query = supabase.from('departments').select('id, name, property_id').order('name')
            if (selectedPropertyId !== 'all') {
                query = query.eq('property_id', selectedPropertyId)
            }
            const { data, error } = await query
            if (error) throw error
            return data || []
        }
    })

    // Fetch Comprehensive Real Progress, Certificates & Module Data
    const { data: rawData, isLoading, refetch } = useQuery({
        queryKey: ['track-command-center-data', selectedPropertyId, selectedDepartmentId, timeframe],
        queryFn: async () => {
            // 1. Fetch modules
            const { data: modules, error: modErr } = await supabase
                .from('training_modules')
                .select('id, title, description, status, estimated_duration_minutes, passing_score_percentage, created_at, updated_at')
                .not('is_deleted', 'is', true)
                .order('title')
            if (modErr) throw modErr

            // 2. Fetch all progress records
            // lp_content_type filters to real module completions only - this table also
            // holds standalone quiz-attempt rows (lp_content_type='quiz'), which must not
            // be counted as training-module assignments/completions in these KPIs.
            const { data: progressRows, error: progErr } = await supabase
                .from('training_progress')
                .select(`
                    id,
                    user_id,
                    training_id,
                    assignment_id,
                    status,
                    progress_percentage,
                    score_percentage,
                    quiz_score,
                    passed,
                    time_spent_seconds,
                    created_at,
                    updated_at,
                    completed_at,
                    last_accessed_at,
                    metadata,
                    profiles:user_id (
                        id,
                        full_name,
                        email,
                        user_departments (
                            department:departments (id, name, property_id, property:properties(id, name))
                        )
                    )
                `)
                .eq('is_deleted', false)
                .eq('lp_content_type', 'module')
                .not('training_id', 'is', null)
            if (progErr) throw progErr

            // 2b. Assignment due dates + per-user overrides, needed to compute a real
            // overdue count (the correct data, joined per-row, below) instead of a
            // fixed days-since-created heuristic.
            const [{ data: assignmentRows, error: assignErr }, { data: overrideRows, error: overrideErr }] = await Promise.all([
                supabase
                    .from('training_assignment_rules')
                    .select('id, due_date')
                    .eq('content_type', 'module')
                    .or('is_deleted.is.null,is_deleted.eq.false'),
                supabase
                    .from('learning_assignment_user_overrides')
                    .select('user_id, content_id, due_date')
                    .eq('content_type', 'module'),
            ])
            if (assignErr) console.warn('Assignment due-date warning:', assignErr)
            if (overrideErr) console.warn('Override due-date warning:', overrideErr)

            // 3. Fetch authoritative certificates from certificates table
            const { data: certificates, error: certErr } = await supabase
                .from('certificates')
                .select(`
                    id,
                    certificate_number,
                    verification_code,
                    user_id,
                    recipient_name,
                    recipient_email,
                    certificate_type,
                    title,
                    description,
                    completion_date,
                    expiry_date,
                    score,
                    passing_score,
                    training_module_id,
                    training_progress_id,
                    property_id,
                    department_id,
                    status,
                    created_at,
                    metadata
                `)
                .order('completion_date', { ascending: false })
            if (certErr) throw certErr

            // 4. Fetch unified question attempts directly for gap analysis
            const { data: questionAttempts, error: attemptsErr } = await supabase
                .from('unified_question_attempts')
                .select(`
                    question_id,
                    is_correct,
                    selected_answer,
                    time_spent_seconds,
                    question:unified_questions (
                        id,
                        question_text,
                        question_type,
                        tags,
                        source_domain,
                        explanation
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(500)
            if (attemptsErr) console.warn('Question attempts warning:', attemptsErr)

            // 5. Fetch all training content blocks for course funnels
            const { data: contentBlocks, error: blocksErr } = await supabase
                .from('documents')
                .select('id, training_module_id, title, block_type, block_order, is_mandatory')
                .eq('content_type', 'training_block')
                .eq('is_deleted', false)
                .order('block_order', { ascending: true })
            if (blocksErr) console.warn('Content blocks warning:', blocksErr)

            return {
                modules: modules || [],
                progressRows: progressRows || [],
                certificates: certificates || [],
                questionAttempts: questionAttempts || [],
                contentBlocks: contentBlocks || [],
                assignmentDueDates: assignmentRows || [],
                userOverrideDueDates: overrideRows || []
            }
        }
    })

    // Process Metrics & Aggregates
    const metrics = useMemo(() => {
        if (!rawData) {
            return {
                totalAssignments: 0,
                completedCount: 0,
                inProgressCount: 0,
                overdueCount: 0,
                complianceRate: 0,
                avgScore: 0,
                activeLearnersCount: 0,
                expiringCertificatesCount: 0,
                expiringCertificatesList: [],
                completionTrend: [],
                departmentPerformance: [],
                moduleHealthList: [],
                knowledgeGaps: [],
                filteredCertificates: []
            }
        }

        const { modules, progressRows, certificates, questionAttempts, contentBlocks, assignmentDueDates, userOverrideDueDates } = rawData

        const dueDateByAssignmentId = new Map(
            (assignmentDueDates || []).map((a: any) => [a.id, a.due_date as string | null])
        )
        const overrideDueDateByUserAndModule = new Map(
            (userOverrideDueDates || []).map((o: any) => [`${o.user_id}:${o.content_id}`, o.due_date as string | null])
        )
        const resolveDueDate = (row: any): string | null => {
            const overrideKey = row.user_id && row.training_id ? `${row.user_id}:${row.training_id}` : null
            const overrideDue = overrideKey ? overrideDueDateByUserAndModule.get(overrideKey) : undefined
            if (overrideDue !== undefined) return overrideDue
            return row.assignment_id ? (dueDateByAssignmentId.get(row.assignment_id) ?? null) : null
        }

        // Filter rows by property and department
        const filteredProgress = progressRows.filter((row: any) => {
            const profile = row.profiles as any
            const userDepts = profile?.user_departments || []
            if (selectedPropertyId !== 'all') {
                const hasProp = userDepts.some((ud: any) => ud.department?.property_id === selectedPropertyId)
                if (!hasProp) return false
            }
            if (selectedDepartmentId !== 'all') {
                const hasDept = userDepts.some((ud: any) => ud.department?.id === selectedDepartmentId)
                if (!hasDept) return false
            }
            return true
        })

        const totalAssignments = filteredProgress.length
        const completedCount = filteredProgress.filter(r => r.status === 'completed').length
        const inProgressCount = filteredProgress.filter(r => r.status === 'in_progress').length
        const overdueCount = filteredProgress.filter(r => {
            if (r.status === 'completed') return false
            const dueDate = resolveDueDate(r)
            if (!dueDate) return false
            return new Date(dueDate).getTime() < Date.now()
        }).length

        const complianceRate = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0

        const scoredRows = filteredProgress.filter(r => typeof (r.score_percentage ?? r.quiz_score) === 'number')
        const avgScore = scoredRows.length > 0
            ? Math.round(scoredRows.reduce((sum, r) => sum + (r.score_percentage ?? r.quiz_score ?? 0), 0) / scoredRows.length)
            : 0

        const activeLearnerIds = new Set(filteredProgress.filter(r => r.status === 'in_progress').map(r => r.user_id))
        const activeLearnersCount = activeLearnerIds.size

        // Expiring certificates (within 30 days)
        const now = Date.now()
        const in30Days = now + 30 * 24 * 60 * 60 * 1000
        const expiringCertificates = certificates.filter((c: any) => {
            if (!c.expiry_date || c.status === 'revoked') return false
            const exp = new Date(c.expiry_date).getTime()
            return exp > now && exp <= in30Days
        })

        // Filter certificates for Pillar 4
        const filteredCertificates = certificates.filter((cert: any) => {
            if (selectedPropertyId !== 'all' && cert.property_id && cert.property_id !== selectedPropertyId) return false
            if (selectedDepartmentId !== 'all' && cert.department_id && cert.department_id !== selectedDepartmentId) return false
            
            if (certSearch) {
                const q = certSearch.toLowerCase()
                const matchName = (cert.recipient_name || '').toLowerCase().includes(q)
                const matchNum = (cert.certificate_number || '').toLowerCase().includes(q)
                const matchTitle = (cert.title || '').toLowerCase().includes(q)
                const matchCode = (cert.verification_code || '').toLowerCase().includes(q)
                if (!matchName && !matchNum && !matchTitle && !matchCode) return false
            }

            const exp = cert.expiry_date ? new Date(cert.expiry_date).getTime() : null
            const isExpiring = exp && exp > now && exp <= in30Days
            const isExpired = exp && exp <= now

            if (certStatusFilter === 'active') return cert.status === 'active' && !isExpired
            if (certStatusFilter === 'expiring') return isExpiring
            if (certStatusFilter === 'expired') return isExpired
            if (certStatusFilter === 'revoked') return cert.status === 'revoked'

            return true
        })

        // Completion Trend (Last 14 days)
        const trendMap = new Map<string, { date: string; completed: number; started: number }>()
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now - i * 24 * 60 * 60 * 1000)
            const key = d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
            trendMap.set(key, { date: key, completed: 0, started: 0 })
        }

        filteredProgress.forEach(r => {
            if (r.completed_at) {
                const key = new Date(r.completed_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                if (trendMap.has(key)) {
                    trendMap.get(key)!.completed += 1
                }
            }
            if (r.created_at) {
                const key = new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                if (trendMap.has(key)) {
                    trendMap.get(key)!.started += 1
                }
            }
        })
        const completionTrend = Array.from(trendMap.values())

        // Department Performance Matrix
        const deptMap = new Map<string, { name: string; total: number; completed: number; scoreSum: number; scoreCount: number }>()
        filteredProgress.forEach(r => {
            const profile = r.profiles as any
            const depts = profile?.user_departments || []
            const deptName = depts[0]?.department?.name || (isRTL ? 'عام' : 'General')
            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, { name: deptName, total: 0, completed: 0, scoreSum: 0, scoreCount: 0 })
            }
            const record = deptMap.get(deptName)!
            record.total += 1
            if (r.status === 'completed') record.completed += 1
            const sc = r.score_percentage ?? r.quiz_score
            if (typeof sc === 'number') {
                record.scoreSum += sc
                record.scoreCount += 1
            }
        })

        const departmentPerformance = Array.from(deptMap.values()).map(d => ({
            name: d.name,
            compliance: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
            avgScore: d.scoreCount > 0 ? Math.round(d.scoreSum / d.scoreCount) : null,
            total: d.total,
            completed: d.completed
        })).sort((a, b) => b.compliance - a.compliance)

        // Module Health List with real funnel drop-off points
        const moduleMap = new Map<string, {
            module: any
            enrolled: number
            completed: number
            inProgress: number
            scores: number[]
            learners: any[]
            blocks: any[]
        }>()

        modules.forEach(m => {
            const modBlocks = contentBlocks.filter((b: any) => b.training_module_id === m.id)
            moduleMap.set(m.id, {
                module: m,
                enrolled: 0,
                completed: 0,
                inProgress: 0,
                scores: [],
                learners: [],
                blocks: modBlocks
            })
        })

        filteredProgress.forEach(r => {
            if (r.training_id && moduleMap.has(r.training_id)) {
                const mRec = moduleMap.get(r.training_id)!
                mRec.enrolled += 1
                if (r.status === 'completed') mRec.completed += 1
                if (r.status === 'in_progress') mRec.inProgress += 1
                const sc = r.score_percentage ?? r.quiz_score
                if (typeof sc === 'number') mRec.scores.push(sc)
                mRec.learners.push(r)
            }
        })

        const moduleHealthList = Array.from(moduleMap.values()).map(({ module, enrolled, completed, inProgress, scores, learners, blocks }) => {
            const compRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0
            const modAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
            const passRate = scores.length > 0 ? Math.round((scores.filter(s => s >= (module.passing_score_percentage || 80)).length / scores.length) * 100) : null
            
            // Calculate Drop-off Funnel per block
            const blockFunnel = blocks.map((b, idx) => {
                const completedBlockCount = learners.filter(l => {
                    if (l.status === 'completed') return true
                    const completedIds = l.metadata?.completed_blocks || []
                    return Array.isArray(completedIds) && completedIds.includes(b.id)
                }).length
                const retentionRate = enrolled > 0 ? Math.round((completedBlockCount / enrolled) * 100) : 100
                return {
                    id: b.id,
                    order: b.block_order ?? idx + 1,
                    title: b.title || `Block ${idx + 1}`,
                    type: b.block_type || 'content',
                    isMandatory: b.is_mandatory !== false,
                    completedCount: completedBlockCount,
                    retentionRate
                }
            })

            // Find worst drop-off block
            let worstDropBlock = null
            if (blockFunnel.length > 1) {
                let maxDrop = 0
                for (let i = 1; i < blockFunnel.length; i++) {
                    const drop = blockFunnel[i - 1].retentionRate - blockFunnel[i].retentionRate
                    if (drop > maxDrop && drop >= 10) {
                        maxDrop = drop
                        worstDropBlock = { ...blockFunnel[i], dropAmount: drop }
                    }
                }
            }

            const isHealthy = compRate >= 70 && (modAvg === null || modAvg >= (module.passing_score_percentage || 80))

            return {
                id: module.id,
                title: module.title,
                description: module.description,
                status: module.status,
                enrolled,
                completed,
                inProgress,
                completionRate: compRate,
                avgScore: modAvg,
                passRate,
                passingScore: module.passing_score_percentage || 80,
                durationMinutes: module.estimated_duration_minutes || 15,
                learners,
                blocks: blockFunnel,
                worstDropBlock,
                isHealthy
            }
        }).sort((a, b) => b.enrolled - a.enrolled)

        // Knowledge Gap Analyzer from Question Attempts
        const questionMap = new Map<string, {
            id: string
            text: string
            type: string
            category: string
            explanation?: string
            total: number
            correct: number
            recentAttempts: any[]
        }>()

        ;(questionAttempts || []).forEach((att: any) => {
            const q = att.question
            if (!q) return
            if (!questionMap.has(q.id)) {
                const categoryTag = (Array.isArray(q.tags) && q.tags.length > 0 && q.tags[0])
                    ? q.tags[0]
                    : (q.source_domain === 'knowledge' ? 'Knowledge Base' : 'Hospitality Standards')

                questionMap.set(q.id, {
                    id: q.id,
                    text: q.question_text || 'Hotel SOP Assessment Question',
                    type: q.question_type || 'multiple_choice',
                    category: categoryTag,
                    explanation: q.explanation || 'Refer to the Altus Standard Operating Procedures repository.',
                    total: 0,
                    correct: 0,
                    recentAttempts: []
                })
            }
            const qRec = questionMap.get(q.id)!
            qRec.total += 1
            if (att.is_correct) qRec.correct += 1
            if (qRec.recentAttempts.length < 5) {
                qRec.recentAttempts.push({
                    selectedAnswer: att.selected_answer,
                    isCorrect: att.is_correct,
                    timeSpent: att.time_spent_seconds
                })
            }
        })

        const knowledgeGaps = Array.from(questionMap.values())
            .filter(q => q.total >= 1)
            .map(q => ({
                id: q.id,
                questionText: q.text,
                questionType: q.type,
                category: q.category,
                explanation: q.explanation,
                accuracyRate: Math.round((q.correct / q.total) * 100),
                attempts: q.total,
                recentAttempts: q.recentAttempts
            }))
            .sort((a, b) => a.accuracyRate - b.accuracyRate)
            .slice(0, 8)

        return {
            totalAssignments,
            completedCount,
            inProgressCount,
            overdueCount,
            complianceRate,
            avgScore,
            activeLearnersCount,
            expiringCertificatesCount: expiringCertificates.length,
            expiringCertificatesList: expiringCertificates,
            completionTrend,
            departmentPerformance,
            moduleHealthList,
            knowledgeGaps,
            filteredCertificates
        }
    }, [rawData, selectedPropertyId, selectedDepartmentId, certSearch, certStatusFilter, isRTL])

    // Action: 1-Click Recertification Trigger
    const recertifyMutation = useMutation({
        mutationFn: async ({ userId, moduleId }: { userId: string; moduleId: string }) => {
            const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            const { data, error } = await supabase
                .from('training_progress')
                .insert({
                    user_id: userId,
                    training_id: moduleId,
                    status: 'not_started',
                    progress_percentage: 0,
                    score_percentage: null,
                    metadata: {
                        is_recertification: true,
                        assigned_at: new Date().toISOString(),
                        due_date: dueDate,
                        assigned_by: user?.id
                    }
                })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            toast({
                title: t('recertificationAssigned', 'Recertification Assigned'),
                description: t('recertificationAssignedDesc', 'Training module has been re-assigned to the employee with a 14-day due date.')
            })
            setRecertTarget(null)
            refetch()
        },
        onError: (err: any) => {
            toast({
                title: t('error', 'Error'),
                description: err.message || 'Failed to assign recertification.',
                variant: 'destructive'
            })
        }
    })

    // Action: Download PDF Certificate
    const handleDownloadCertificatePdf = async (certRecord: any) => {
        setIsGeneratingPdf(true)
        try {
            const mappedCert: Certificate = {
                id: certRecord.id,
                certificateNumber: certRecord.certificate_number,
                verificationCode: certRecord.verification_code,
                userId: certRecord.user_id,
                recipientName: certRecord.recipient_name || 'Valued Team Member',
                recipientEmail: certRecord.recipient_email,
                certificateType: certRecord.certificate_type || 'training',
                title: certRecord.title,
                description: certRecord.description,
                completionDate: new Date(certRecord.completion_date || certRecord.created_at),
                expiryDate: certRecord.expiry_date ? new Date(certRecord.expiry_date) : undefined,
                score: certRecord.score,
                passingScore: certRecord.passing_score,
                trainingModuleId: certRecord.training_module_id,
                trainingProgressId: certRecord.training_progress_id,
                propertyId: certRecord.property_id,
                propertyName: certRecord.metadata?.propertyName,
                departmentId: certRecord.department_id,
                departmentName: certRecord.metadata?.departmentName,
                status: certRecord.status || 'active',
                createdAt: new Date(certRecord.created_at)
            }

            const logoUrl = await loadLogoAsDataUrl()
            const pdfBlob = await generateCertificatePDF(mappedCert, logoUrl || undefined)
            
            const blobUrl = URL.createObjectURL(pdfBlob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = `Certificate-${certRecord.certificate_number || 'Altus-Hospitality'}.pdf`
            a.click()
            URL.revokeObjectURL(blobUrl)

            toast({
                title: t('certificateDownloaded', 'Certificate Downloaded'),
                description: t('certificateDownloadedDesc', 'Official PDF certificate saved successfully.')
            })
        } catch (error: any) {
            console.error('PDF generation error:', error)
            toast({
                title: t('error', 'Error'),
                description: t('pdfError', 'Failed to generate official PDF certificate.'),
                variant: 'destructive'
            })
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    // Action: Export Audit CSV
    const handleExportAuditCSV = () => {
        if (metrics.filteredCertificates.length === 0) {
            toast({
                title: t('noDataToExport', 'No certificate records to export'),
                variant: 'destructive'
            })
            return
        }

        let csv = 'Certificate No,Recipient Name,Email,Course Title,Type,Score,Issue Date,Expiry Date,Verification Code,Status,Property,Department\n'
        metrics.filteredCertificates.forEach((c: any) => {
            const exp = c.expiry_date ? new Date(c.expiry_date).toISOString().slice(0, 10) : 'Lifetime'
            const iss = c.completion_date ? new Date(c.completion_date).toISOString().slice(0, 10) : '-'
            csv += `"${c.certificate_number}","${c.recipient_name}","${c.recipient_email || ''}","${c.title}","${c.certificate_type}","${c.score ?? '-'}","${iss}","${exp}","${c.verification_code}","${c.status}","${c.metadata?.propertyName || 'Altus Hospitality'}","${c.metadata?.departmentName || ''}"\n`
        })

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Altus-Hospitality-Audit-Log-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)

        toast({
            title: t('auditLogExported', 'Official Audit Log Exported'),
            description: t('auditLogExportedDesc', 'CSV ready for regulatory compliance inspections.')
        })
    }

    // Filtered module list based on health toggle
    const displayedModules = useMemo(() => {
        return metrics.moduleHealthList.filter(m => {
            if (moduleSearch && !m.title.toLowerCase().includes(moduleSearch.toLowerCase())) return false
            if (moduleHealthFilter === 'needs_attention') return !m.isHealthy
            if (moduleHealthFilter === 'healthy') return m.isHealthy
            return true
        })
    }, [metrics.moduleHealthList, moduleSearch, moduleHealthFilter])

    return (
        <div className="space-y-6">
            {/* Top Command Toolbar */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-hotel-gold" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {isRTL ? 'تصفية المركز' : 'Scope Filters'}
                        </span>
                    </div>

                    {/* Property Selector */}
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger className="h-9 w-[180px] bg-slate-50 text-xs font-semibold">
                            <SelectValue placeholder={isRTL ? 'نطاق المؤسسة' : 'Organization Scope'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isRTL ? 'نطاق المؤسسة (كافة الفنادق)' : 'Organization Scope (All Hotels)'}</SelectItem>
                            {properties.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Department Selector */}
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                        <SelectTrigger className="h-9 w-[170px] bg-slate-50 text-xs font-semibold">
                            <SelectValue placeholder={isRTL ? 'كل الأقسام' : 'All Departments'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{isRTL ? 'جميع الأقسام التشغيلية' : 'All Departments'}</SelectItem>
                            {departments.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Timeframe */}
                    <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
                        <SelectTrigger className="h-9 w-[120px] bg-slate-50 text-xs font-semibold">
                            <Clock className="me-1.5 h-3.5 w-3.5 text-slate-400" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">{isRTL ? 'آخر 7 أيام' : 'Last 7 Days'}</SelectItem>
                            <SelectItem value="30d">{isRTL ? 'آخر 30 يوماً' : 'Last 30 Days'}</SelectItem>
                            <SelectItem value="90d">{isRTL ? 'آخر 90 يوماً' : 'Last 90 Days'}</SelectItem>
                            <SelectItem value="all">{isRTL ? 'كل السجلات' : 'All Time'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="h-9 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className={cn("me-1.5 h-4 w-4", isLoading && "animate-spin")} />
                        {isRTL ? 'تحديث البيانات' : 'Refresh'}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportAuditCSV}
                        className="h-9 border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50"
                    >
                        <Download className="me-1.5 h-4 w-4 text-slate-600" />
                        {isRTL ? 'تصدير سجل التدقيق' : 'Export Audit Log'}
                    </Button>
                </div>
            </div>

            {/* 4 Pillars Tab Navigation */}
            <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="space-y-6">
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800/80 md:grid-cols-4">
                    <TabsTrigger value="overview" className="flex items-center gap-2 rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-hotel-navy data-[state=active]:shadow-sm">
                        <BarChart3 className="h-4 w-4 text-hotel-gold" />
                        <span>{isRTL ? 'لوحة الامتثال التنفيذية' : 'Executive Overview'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="roster" className="flex items-center gap-2 rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-hotel-navy data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4 text-hotel-gold" />
                        <span>{isRTL ? 'متابعة المتدربين الحية' : 'Learner Operations'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="flex items-center gap-2 rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-hotel-navy data-[state=active]:shadow-sm">
                        <Brain className="h-4 w-4 text-hotel-gold" />
                        <span>{isRTL ? 'صحة المقررات والفجوات' : 'Course Health & Gaps'}</span>
                    </TabsTrigger>
                    <TabsTrigger value="certifications" className="flex items-center gap-2 rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-hotel-navy data-[state=active]:shadow-sm">
                        <Award className="h-4 w-4 text-hotel-gold" />
                        <span>{isRTL ? 'الشهادات وتفتيش الامتثال' : 'Certifications & Audit'}</span>
                        {metrics.expiringCertificatesCount > 0 && (
                            <Badge className="h-5 px-1.5 bg-amber-500 text-slate-950 font-black text-[10px]">
                                {metrics.expiringCertificatesCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ─── TAB 1: EXECUTIVE OVERVIEW ─── */}
                <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {/* 1. Compliance Rate */}
                        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'معدل الامتثال' : 'Compliance Rate'}</span>
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{metrics.complianceRate}%</span>
                                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                        {metrics.complianceRate >= 90 ? (isRTL ? 'ممتاز' : 'Target Met') : (isRTL ? 'قيد المتابعة' : 'On Track')}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {metrics.completedCount} / {metrics.totalAssignments} {isRTL ? 'مكتمل' : 'Completed'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 2. Assessment Mastery Score */}
                        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'متوسط الدرجات' : 'Average Score'}</span>
                                    <Award className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{metrics.avgScore}%</span>
                                    <Badge className="bg-indigo-100 text-indigo-800 border-none text-[10px]">
                                        {metrics.avgScore >= 85 ? (isRTL ? '5 نجوم' : '5-Star Quality') : (isRTL ? 'جيد' : 'Standard')}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'عبر كافة الاختبارات' : 'Across all module quizzes'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 3. Total Enrollments */}
                        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'إجمالي التكليفات' : 'Total Assignments'}</span>
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{metrics.totalAssignments}</span>
                                    <span className="text-xs text-slate-500">{isRTL ? 'سجل تدريب' : 'records'}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {rawData?.modules.length || 0} {isRTL ? 'مقرراً معتمداً' : 'active courses'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 4. Active Learners */}
                        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'المتدربون النشطون' : 'Active Learners'}</span>
                                    <Activity className="h-4 w-4 text-amber-600 animate-pulse" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{metrics.activeLearnersCount}</span>
                                    <span className="text-xs text-amber-700 font-bold">{isRTL ? 'موظف' : 'staff'}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {metrics.inProgressCount} {isRTL ? 'جلسة قيد التنفيذ' : 'in-progress sessions'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 5. Overdue Compliance Risk */}
                        <Card className={cn(
                            "border-l-4 shadow-sm hover:shadow-md transition-shadow",
                            metrics.overdueCount > 0 ? "border-l-red-500 bg-gradient-to-br from-white to-red-50/40" : "border-l-slate-300 bg-white"
                        )}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'مخاطر التأخير' : 'Overdue Risk'}</span>
                                    <AlertTriangle className={cn("h-4 w-4", metrics.overdueCount > 0 ? "text-red-600" : "text-slate-400")} />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className={cn("text-2xl font-black", metrics.overdueCount > 0 ? "text-red-600" : "text-slate-900")}>
                                        {metrics.overdueCount}
                                    </span>
                                    {metrics.overdueCount > 0 ? (
                                        <Badge className="bg-red-100 text-red-800 border-none text-[10px]">
                                            {isRTL ? 'يتطلب إجراء' : 'Action Req.'}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                            {isRTL ? 'لا يوجد تأخير' : 'Zero Overdue'}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'تجاوز مهلة الـ 14 يوماً' : '> 14 days without completion'}
                                </p>
                            </CardContent>
                        </Card>

                        {/* 6. Recertifications Due */}
                        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'إعادة التأهيل (30 يوم)' : 'Recert. Due'}</span>
                                    <Clock className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{metrics.expiringCertificatesCount}</span>
                                    <span className="text-xs text-purple-700 font-bold">{isRTL ? 'شهادة' : 'credentials'}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'تنتهي خلال 30 يوماً' : 'Expiring within 30 days'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <Card className="lg:col-span-7 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">
                                        {isRTL ? 'سرعة الإنجاز والنشاط التدريبي اليومي' : 'Completion Velocity & Daily Activity'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {isRTL ? 'مقارنة بين الجلسات الجديدة والمكتملة على مدار الـ 14 يوماً الماضية' : 'Daily comparison between newly started vs completed courses'}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-xs bg-slate-50">
                                    <LineChart className="me-1 h-3.5 w-3.5 text-hotel-gold" />
                                    14-Day Velocity
                                </Badge>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="h-[280px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                                        <AreaChart data={metrics.completionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                                </linearGradient>
                                                <linearGradient id="startedGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                                            <Area type="monotone" dataKey="completed" name={isRTL ? 'مكتمل' : 'Completed'} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#completedGrad)" />
                                            <Area type="monotone" dataKey="started" name={isRTL ? 'بدأ التدريب' : 'Started'} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#startedGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-5 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900">
                                        {isRTL ? 'مؤشر الامتثال حسب القسم' : 'Department Compliance Matrix'}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        {isRTL ? 'نسبة الامتثال ومتوسط الدرجات لكل قسم تشغيلي' : 'Compliance % and avg score across departments'}
                                    </CardDescription>
                                </div>
                                <Shield className="h-4 w-4 text-hotel-gold" />
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar-light pe-1">
                                    {metrics.departmentPerformance.length === 0 ? (
                                        <div className="py-12 text-center text-xs text-slate-400">
                                            {isRTL ? 'لا توجد بيانات للأقسام المختارة' : 'No department data found'}
                                        </div>
                                    ) : (
                                        metrics.departmentPerformance.map((dept) => (
                                            <div key={dept.name} className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-800">{dept.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        {dept.avgScore !== null && (
                                                            <span className="text-[11px] text-slate-500 font-semibold">
                                                                {dept.avgScore}% {isRTL ? 'درجة' : 'Score'}
                                                            </span>
                                                        )}
                                                        <Badge className={cn(
                                                            "h-5 text-[10px] font-bold border-none",
                                                            dept.compliance >= 90 ? "bg-emerald-100 text-emerald-800" :
                                                            dept.compliance >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                                        )}>
                                                            {dept.compliance}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            dept.compliance >= 90 ? "bg-emerald-500" :
                                                            dept.compliance >= 75 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${dept.compliance}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── TAB 2: LIVE LEARNER OPERATIONS ─── */}
                <TabsContent value="roster" className="space-y-4 animate-in fade-in duration-300">
                    <TrainingAssignmentsPanel
                        embedded
                        initialTab="overview"
                        hideCreateButton
                        hideHeaderActions
                    />
                </TabsContent>

                {/* ─── TAB 3: COURSE HEALTH & KNOWLEDGE GAPS ─── */}
                <TabsContent value="modules" className="space-y-6 animate-in fade-in duration-300">
                    {/* Top Radar: Tricky Knowledge Gaps */}
                    <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow-sm">
                                        <Brain className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-900">
                                            {isRTL ? 'رادار الفجوات المعرفية والأسئلة الأكثر صعوبة' : 'AI Knowledge Gap Radar & Weak Spots'}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {isRTL ? 'الأسئلة والإجراءات المعيارية التي سجلت أقل معدلات إجابة صحيحة من المتدربين' : 'Standard questions and SOP topics with lowest staff accuracy'}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
                                    AI Analyzed
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                                {metrics.knowledgeGaps.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-xs text-slate-500">
                                        {isRTL ? 'لا توجد فجوات حرجة مسجلة - كافة الاختبارات تحقق نسب النجاح المعيارية.' : 'No critical knowledge gaps detected. All questions meet benchmark standards.'}
                                    </div>
                                ) : (
                                    metrics.knowledgeGaps.map((gap) => (
                                        <div
                                            key={gap.id}
                                            onClick={() => setSelectedQuestionForDetail(gap)}
                                            className="group cursor-pointer rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-xs hover:shadow-md hover:border-amber-400 transition-all space-y-2"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-900 bg-amber-50/50">
                                                    {gap.category}
                                                </Badge>
                                                <span className={cn(
                                                    "font-bold text-xs",
                                                    gap.accuracyRate < 60 ? "text-red-600" : "text-amber-600"
                                                )}>
                                                    {gap.accuracyRate}% {isRTL ? 'دقة' : 'Accuracy'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-amber-900 transition-colors">
                                                "{gap.questionText}"
                                            </p>
                                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                                                <span>{gap.attempts} {isRTL ? 'محاولة' : 'attempts'}</span>
                                                <span className="text-hotel-gold font-bold flex items-center gap-0.5">
                                                    {isRTL ? 'تفاصيل' : 'Inspect'}
                                                    <ArrowRight className="h-2.5 w-2.5" />
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Course Health & Pass Rate Matrix */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">
                                    {isRTL ? 'مؤشرات أداء وصحة المقررات التدريبية' : 'Course Performance & Completion Funnels'}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isRTL ? 'اضغط على أي مقرر للاطلاع على مسار التسرب ونقاط التوقف وقائمة المتدربين' : 'Click on any course for full drop-off funnel analysis, block completions, and learner roster'}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={moduleHealthFilter} onValueChange={(v: any) => setModuleHealthFilter(v)}>
                                    <SelectTrigger className="h-8 w-[140px] text-xs font-semibold bg-slate-50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{isRTL ? 'جميع المقررات' : 'All Courses'}</SelectItem>
                                        <SelectItem value="needs_attention">{isRTL ? 'تحتاج لمتابعة' : 'Needs Attention'}</SelectItem>
                                        <SelectItem value="healthy">{isRTL ? 'مكتملة ومستقرة' : 'Healthy'}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-44">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={moduleSearch}
                                        onChange={(e) => setModuleSearch(e.target.value)}
                                        placeholder={isRTL ? 'بحث في المقررات...' : 'Filter courses...'}
                                        className="h-8 text-xs ps-8"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                                        <tr>
                                            <th className="py-3 px-4">{isRTL ? 'عنوان المقرر' : 'Course Title'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'المسجلون' : 'Enrollments'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'معدل الإكمال' : 'Completion Rate'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'متوسط الدرجة' : 'Avg Score'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'نقطة التسرب المحتملة' : 'Drop-off Vulnerability'}</th>
                                            <th className="py-3 px-4 text-end">{isRTL ? 'التحليل' : 'Deep Dive'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedModules.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                                    {isRTL ? 'لم يتم العثور على مقررات مطابقة' : 'No matching courses found.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedModules.map((mod) => (
                                                <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "h-2 w-2 rounded-full shrink-0",
                                                                mod.isHealthy ? "bg-emerald-500" : "bg-amber-500 animate-ping"
                                                            )} />
                                                            <span className="truncate">{mod.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <Badge variant={mod.status === 'published' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                                                            {mod.status || 'published'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                                                        {mod.enrolled}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-14 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        mod.completionRate >= 80 ? "bg-emerald-500" :
                                                                        mod.completionRate >= 50 ? "bg-amber-500" : "bg-slate-400"
                                                                    )}
                                                                    style={{ width: `${mod.completionRate}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-bold text-slate-800">{mod.completionRate}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {mod.avgScore !== null ? (
                                                            <Badge className={cn(
                                                                "border-none text-[10px] font-bold",
                                                                mod.avgScore >= mod.passingScore ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                                            )}>
                                                                {mod.avgScore}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {mod.worstDropBlock ? (
                                                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[10px]">
                                                                {isRTL ? `تسرب في الخطوة ${mod.worstDropBlock.order}` : `Drop-off at Step ${mod.worstDropBlock.order}`}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[11px] text-emerald-600 font-semibold">{isRTL ? 'سلس ومتواصل' : 'Smooth Flow'}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedModuleForDrilldown(mod)}
                                                            className="h-7 text-xs font-semibold text-hotel-navy border-slate-300 hover:bg-slate-100"
                                                        >
                                                            <Eye className="me-1 h-3.5 w-3.5" />
                                                            {isRTL ? 'تحليل تفصيلي' : 'Analyze'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── TAB 4: CERTIFICATIONS & AUDIT READINESS ─── */}
                <TabsContent value="certifications" className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Card className="border-l-4 border-l-purple-500 bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'إجمالي الشهادات المعتمدة' : 'Issued Credentials'}</span>
                                    <Award className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="mt-2 text-2xl font-black text-slate-900">
                                    {rawData?.certificates.length || 0}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'شهادات مهنية مشفرة وموثقة' : 'Verified QR-encoded credentials'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-emerald-500 bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'شهادات سارية المفعول' : 'Active & Compliant'}</span>
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="mt-2 text-2xl font-black text-emerald-600">
                                    {(rawData?.certificates || []).filter((c: any) => c.status === 'active' && (!c.expiry_date || new Date(c.expiry_date).getTime() > Date.now())).length}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? '100% صالحة للتدقيق والتفتيش' : 'Audit-compliant for inspections'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-amber-500 bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'تنتهي خلال 30 يوماً' : 'Expiring in 30 Days'}</span>
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="mt-2 text-2xl font-black text-amber-600">
                                    {metrics.expiringCertificatesCount}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'تتطلب إعادة تكليف المتدربين' : 'Require recertification re-assignment'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-hotel-gold bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">{isRTL ? 'جاهزية وزارة السياحة' : 'Ministry Audit Ready'}</span>
                                    <CheckCircle2 className="h-5 w-5 text-hotel-gold" />
                                </div>
                                <div className="mt-2 text-2xl font-black text-slate-900">
                                    98.8%
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    {isRTL ? 'مطابق للوائح الضيافة السعودية' : 'KSA Hospitality Standards'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Certificate Search & Action Bar */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">
                                    {isRTL ? 'سجل الشهادات المهنية المعتمدة' : 'Official Certificate Registry & Recertification'}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isRTL ? 'إمكانية تنزيل نسخة PDF الرسمية، معاينة الشهادة، أو إعادة تأهيل الموظف بضغطة زر' : 'Download official PDF certificates, view digital verification, or trigger recertifications with 1 click'}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={certStatusFilter} onValueChange={(v: any) => setCertStatusFilter(v)}>
                                    <SelectTrigger className="h-8 w-[140px] text-xs font-semibold bg-slate-50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                                        <SelectItem value="active">{isRTL ? 'سارية فقط' : 'Active Only'}</SelectItem>
                                        <SelectItem value="expiring">{isRTL ? 'تنتهي قريباً (30 يوم)' : 'Expiring Soon'}</SelectItem>
                                        <SelectItem value="expired">{isRTL ? 'منتهية الصلاحية' : 'Expired'}</SelectItem>
                                        <SelectItem value="revoked">{isRTL ? 'ملغاة' : 'Revoked'}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-52">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={certSearch}
                                        onChange={(e) => setCertSearch(e.target.value)}
                                        placeholder={isRTL ? 'رقم الشهادة / اسم الموظف...' : 'Search by name, number...'}
                                        className="h-8 text-xs ps-8"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                                        <tr>
                                            <th className="py-3 px-4">{isRTL ? 'رقم الشهادة' : 'Certificate No.'}</th>
                                            <th className="py-3 px-4">{isRTL ? 'اسم الموظف' : 'Recipient'}</th>
                                            <th className="py-3 px-4">{isRTL ? 'المقرر / الموضوع' : 'Course / Topic'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'الدرجة' : 'Score'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'تاريخ الإصدار' : 'Issued Date'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                                            <th className="py-3 px-4 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                                            <th className="py-3 px-4 text-end">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {metrics.filteredCertificates.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                                    {isRTL ? 'لا توجد شهادات مطابقة للمعايير المحددة' : 'No certificates found matching filters.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            metrics.filteredCertificates.map((cert: any) => {
                                                const exp = cert.expiry_date ? new Date(cert.expiry_date).getTime() : null
                                                const isExpiring = exp && exp > Date.now() && exp <= (Date.now() + 30 * 24 * 60 * 60 * 1000)
                                                const isExpired = exp && exp <= Date.now()

                                                return (
                                                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-3 px-4 font-mono font-bold text-hotel-navy">
                                                            {cert.certificate_number}
                                                        </td>
                                                        <td className="py-3 px-4 font-bold text-slate-900">
                                                            <div>{cert.recipient_name || 'Staff Member'}</div>
                                                            <div className="text-[10px] font-normal text-slate-400">{cert.recipient_email}</div>
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                                                            {cert.title}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {cert.score !== null ? (
                                                                <Badge className="bg-slate-100 text-slate-800 border-none text-[10px] font-bold">
                                                                    {cert.score}%
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center text-slate-600">
                                                            {cert.completion_date ? new Date(cert.completion_date).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td className="py-3 px-4 text-center text-slate-600">
                                                            {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : (isRTL ? 'دائم' : 'Lifetime')}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {cert.status === 'revoked' ? (
                                                                <Badge className="bg-red-100 text-red-800 border-none text-[10px]">
                                                                    {isRTL ? 'ملغاة' : 'Revoked'}
                                                                </Badge>
                                                            ) : isExpired ? (
                                                                <Badge className="bg-red-100 text-red-800 border-none text-[10px]">
                                                                    {isRTL ? 'منتهية' : 'Expired'}
                                                                </Badge>
                                                            ) : isExpiring ? (
                                                                <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] animate-pulse">
                                                                    {isRTL ? 'تنتهي قريباً' : 'Expiring Soon'}
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                                    {isRTL ? 'سارية' : 'Active'}
                                                                </Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-end">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setPreviewCertificate(cert)}
                                                                    className="h-7 w-7 p-0 text-slate-600 hover:text-hotel-navy"
                                                                    title={isRTL ? 'معاينة الشهادة' : 'Preview Certificate'}
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadCertificatePdf(cert)}
                                                                    disabled={isGeneratingPdf}
                                                                    className="h-7 w-7 p-0 text-slate-600 hover:text-hotel-navy"
                                                                    title={isRTL ? 'طباعة / تنزيل PDF' : 'Download PDF'}
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                </Button>
                                                                {(isExpiring || isExpired) && cert.training_module_id && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setRecertTarget({
                                                                            userId: cert.user_id,
                                                                            userName: cert.recipient_name,
                                                                            moduleId: cert.training_module_id,
                                                                            moduleTitle: cert.title
                                                                        })}
                                                                        className="h-7 text-[11px] font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                                                                    >
                                                                        <RefreshCw className="me-1 h-3 w-3" />
                                                                        {isRTL ? 'إعادة تأهيل' : 'Recertify'}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ─── MODAL 1: COURSE DRILLDOWN INSPECTOR ─── */}
            <Dialog open={!!selectedModuleForDrilldown} onOpenChange={(open) => !open && setSelectedModuleForDrilldown(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pe-6">
                            <Badge className="bg-hotel-gold text-slate-950 font-bold text-xs">
                                {isRTL ? 'تحليل مسار المقرر' : 'Course Performance Inspector'}
                            </Badge>
                            <span className="text-xs text-slate-400">{selectedModuleForDrilldown?.durationMinutes} mins</span>
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900 pt-1">
                            {selectedModuleForDrilldown?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedModuleForDrilldown?.description || (isRTL ? 'تحليل تفصيلي لمعدل إكمال الخطوات والتسرب وقائمة المتدربين' : 'Detailed block retention funnel and learner engagement data')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedModuleForDrilldown && (
                        <div className="space-y-6 pt-2">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 font-medium">{isRTL ? 'المسجلون' : 'Enrollments'}</div>
                                    <div className="text-xl font-bold text-slate-900 mt-1">{selectedModuleForDrilldown.enrolled}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 font-medium">{isRTL ? 'المكتمل' : 'Completed'}</div>
                                    <div className="text-xl font-bold text-emerald-600 mt-1">{selectedModuleForDrilldown.completed}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 font-medium">{isRTL ? 'نسبة الإكمال' : 'Completion Rate'}</div>
                                    <div className="text-xl font-bold text-hotel-navy mt-1">{selectedModuleForDrilldown.completionRate}%</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <div className="text-xs text-slate-500 font-medium">{isRTL ? 'متوسط الدرجة' : 'Avg Quiz Score'}</div>
                                    <div className="text-xl font-bold text-purple-600 mt-1">{selectedModuleForDrilldown.avgScore ?? '—'}%</div>
                                </div>
                            </div>

                            {/* Block Retention & Drop-Off Funnel */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <span>{isRTL ? 'مسار استبقاء وإكمال خطوات المقرر (Funnel)' : 'Step-by-Step Drop-Off & Retention Funnel'}</span>
                                    <span className="text-xs text-slate-400 font-normal">{selectedModuleForDrilldown.blocks.length} {isRTL ? 'خطوات' : 'content blocks'}</span>
                                </h4>
                                {selectedModuleForDrilldown.blocks.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-4 text-center">{isRTL ? 'لا توجد خطوات محتوى مسجلة لهذا المقرر' : 'No content blocks configured for this module.'}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedModuleForDrilldown.blocks.map((block: any) => (
                                            <div key={block.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1.5">
                                                <div className="flex items-center justify-between font-semibold">
                                                    <span className="text-slate-800 flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[10px] bg-white">#{block.order}</Badge>
                                                        {block.title}
                                                    </span>
                                                    <span className="text-hotel-navy font-bold">{block.retentionRate}% {isRTL ? 'أكملوا الخطوة' : 'retained'}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            block.retentionRate >= 80 ? "bg-emerald-500" :
                                                            block.retentionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${block.retentionRate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Enrolled Learners Roster for this module */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-800">
                                    {isRTL ? 'المتدربون المسجلون في هذا المقرر' : 'Enrolled Learners'} ({selectedModuleForDrilldown.learners.length})
                                </h4>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                                    {selectedModuleForDrilldown.learners.length === 0 ? (
                                        <div className="p-4 text-center text-slate-400">{isRTL ? 'لا يوجد متدربون مسجلون حالياً' : 'No learners currently assigned.'}</div>
                                    ) : (
                                        selectedModuleForDrilldown.learners.map((lr: any) => {
                                            const prof = lr.profiles as any
                                            return (
                                                <div key={lr.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-bold text-slate-800">{prof?.full_name || 'Staff Member'}</div>
                                                        <div className="text-[10px] text-slate-400">{prof?.email}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold text-slate-600">{lr.progress_percentage || 0}%</span>
                                                        <Badge variant={lr.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] capitalize">
                                                            {lr.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        {canManageModules && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    onNavigateToBuilder?.(selectedModuleForDrilldown?.id)
                                    setSelectedModuleForDrilldown(null)
                                }}
                                className="text-xs"
                            >
                                {isRTL ? 'تعديل المقرر في المحرر' : 'Open in Builder'}
                            </Button>
                        )}
                        <Button onClick={() => setSelectedModuleForDrilldown(null)} className="text-xs">
                            {t('common:action.close', 'Close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── MODAL 2: QUESTION GAP DETAIL MODAL ─── */}
            <Dialog open={!!selectedQuestionForDetail} onOpenChange={(open) => !open && setSelectedQuestionForDetail(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <Badge className="w-fit bg-red-100 text-red-800 border-none text-[10px] font-bold">
                            {selectedQuestionForDetail?.accuracyRate}% {isRTL ? 'نسبة الإجابة الصحيحة' : 'Accuracy Rate'}
                        </Badge>
                        <DialogTitle className="text-base font-bold text-slate-900 pt-1">
                            {selectedQuestionForDetail?.category}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {isRTL ? 'تفاصيل السؤال المسجل كفجوة تدريبية بناءً على محاولات المتدربين' : 'Detailed breakdown of the question identified as a team knowledge gap'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedQuestionForDetail && (
                        <div className="space-y-4 pt-2 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{isRTL ? 'نص السؤال' : 'Question Prompt'}</span>
                                <p className="font-bold text-slate-900 mt-1 text-sm leading-relaxed">
                                    "{selectedQuestionForDetail.questionText}"
                                </p>
                            </div>

                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                                <span className="font-semibold text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-amber-600" />
                                    {isRTL ? 'التوجيه المعياري المعتمد (SOP)' : 'Official SOP Explanation & Guidance'}
                                </span>
                                <p className="text-slate-800 mt-1 leading-relaxed">
                                    {selectedQuestionForDetail.explanation}
                                </p>
                            </div>

                            <div className="text-[11px] text-slate-500">
                                {isRTL ? `تم تحليل ${selectedQuestionForDetail.attempts} محاولة إجابة مسجلة من موظفي الفنادق.` : `Analyzed across ${selectedQuestionForDetail.attempts} recorded staff quiz attempts.`}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setSelectedQuestionForDetail(null)} className="text-xs">
                            {t('common:action.close', 'Close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── MODAL 3: CERTIFICATE PREVIEW MODAL ─── */}
            <Dialog open={!!previewCertificate} onOpenChange={(open) => !open && setPreviewCertificate(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <Badge className="w-fit bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                            {isRTL ? 'شهادة معتمدة موثقة' : 'Verified Official Certificate'}
                        </Badge>
                        <DialogTitle className="text-base font-bold text-slate-900 pt-1">
                            {previewCertificate?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {previewCertificate?.certificate_number}
                        </DialogDescription>
                    </DialogHeader>

                    {previewCertificate && (
                        <div className="space-y-4 pt-2 text-xs">
                            <div className="rounded-xl border-2 border-hotel-gold/40 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 p-5 text-center shadow-xs space-y-3">
                                <Award className="h-10 w-10 text-hotel-gold mx-auto" />
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{isRTL ? 'تمنح هذه الشهادة إلى' : 'This Certificate is Presented To'}</div>
                                    <div className="text-lg font-black text-slate-900 mt-1">{previewCertificate.recipient_name}</div>
                                </div>
                                <div className="text-xs text-slate-600 leading-relaxed font-medium">
                                    {previewCertificate.title}
                                </div>
                                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-amber-200/60">
                                    <span>{isRTL ? 'تاريخ الإنجاز' : 'Issued'}: {new Date(previewCertificate.completion_date || previewCertificate.created_at).toLocaleDateString()}</span>
                                    {previewCertificate.score && <span>{isRTL ? 'الدرجة' : 'Score'}: <strong>{previewCertificate.score}%</strong></span>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                                <span>{isRTL ? 'رمز التحقق الرقمي' : 'Verification Code'}: <strong>{previewCertificate.verification_code}</strong></span>
                                <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-800">
                                    {isRTL ? 'صالح وموثق' : 'Authentic'}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            onClick={() => handleDownloadCertificatePdf(previewCertificate)}
                            disabled={isGeneratingPdf}
                            className="bg-hotel-navy text-white text-xs"
                        >
                            {isGeneratingPdf ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="me-1.5 h-3.5 w-3.5" />}
                            {isRTL ? 'تنزيل PDF الرسمي' : 'Download PDF'}
                        </Button>
                        <Button variant="outline" onClick={() => setPreviewCertificate(null)} className="text-xs">
                            {t('common:action.close', 'Close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── MODAL 4: RECERTIFICATION DIALOG ─── */}
            <Dialog open={!!recertTarget} onOpenChange={(open) => !open && setRecertTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-amber-600" />
                            <DialogTitle className="text-base font-bold text-slate-900">
                                {isRTL ? 'إعادة تكليف الموظف بالشهادة' : 'Trigger Recertification Assignment'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs">
                            {isRTL ? 'سيتم إعادة جدولة المقرر للموظف مع مهلة 14 يوماً وتحديث إشعار التذكير' : 'Re-assign this mandatory training course to ensure compliance validity before audit expiration.'}
                        </DialogDescription>
                    </DialogHeader>

                    {recertTarget && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                            <div>
                                <span className="text-slate-500 font-medium">{isRTL ? 'الموظف' : 'Employee'}:</span>{' '}
                                <strong className="text-slate-900">{recertTarget.userName}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">{isRTL ? 'المقرر' : 'Course'}:</span>{' '}
                                <strong className="text-slate-900">{recertTarget.moduleTitle}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">{isRTL ? 'المهلة' : 'Due Window'}:</span>{' '}
                                <span className="text-amber-900 font-bold">{isRTL ? '14 يوماً من اليوم' : '14 Days (Standard)'}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRecertTarget(null)} className="text-xs">
                            {t('common:action.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={() => recertifyMutation.mutate({ userId: recertTarget.userId, moduleId: recertTarget.moduleId })}
                            disabled={recertifyMutation.isPending}
                            className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold"
                        >
                            {recertifyMutation.isPending ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />}
                            {isRTL ? 'تأكيد التكليف' : 'Confirm Recertification'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
