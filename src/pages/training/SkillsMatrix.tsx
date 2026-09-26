/**
 * SkillsMatrix
 *
 * Admin view answering "who has / lacks skill X" -- skills are awarded correctly on module
 * completion (skillsService.awardModuleSkills -> user_skills) but nothing previously reported
 * on them. Skill-centric layout: lowest-coverage skills first, expand to see who's missing it.
 */

import { WorkspaceHeader } from '@/ui'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDepartments } from '@/hooks/useDepartments'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Users, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SkillRow {
    skillId: string
    skillName: string
    skillCategory: string
    coveredUsers: { userId: string; userName: string; departmentName: string | null; proficiencyLevel: number | null; verified: boolean }[]
    lackingUsers: { userId: string; userName: string; departmentName: string | null }[]
    totalUsers: number
    coverageRate: number
}

export default function SkillsMatrix() {
    const { t } = useTranslation('training')
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const [myTeamOnly, setMyTeamOnly] = useState(false)
    const { departments } = useDepartments()

    const departmentId = departmentFilter !== 'all' ? departmentFilter : null

    const { data: managedDepartments } = useQuery({
        queryKey: ['my-managed-departments'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_my_managed_department_ids')
            if (error) throw error
            return data || []
        }
    })
    const isManager = !!managedDepartments && managedDepartments.length > 0

    const { data: skillRows, isLoading } = useQuery({
        queryKey: ['skills-matrix', departmentId, myTeamOnly],
        queryFn: async (): Promise<SkillRow[]> => {
            const { data, error } = await supabase.rpc('get_skills_matrix', {
                p_department_id: departmentId,
                p_my_team_only: myTeamOnly
            })
            if (error) throw error

            const bySkill = new Map<string, SkillRow>()
            for (const row of data || []) {
                let entry = bySkill.get(row.skill_id)
                if (!entry) {
                    entry = {
                        skillId: row.skill_id,
                        skillName: row.skill_name,
                        skillCategory: row.skill_category || t('skills.uncategorized', 'General'),
                        coveredUsers: [],
                        lackingUsers: [],
                        totalUsers: 0,
                        coverageRate: 0
                    }
                    bySkill.set(row.skill_id, entry)
                }
                entry.totalUsers += 1
                if (row.has_skill) {
                    entry.coveredUsers.push({
                        userId: row.user_id,
                        userName: row.user_name || t('unknownUser', 'Unknown'),
                        departmentName: row.department_name,
                        proficiencyLevel: row.proficiency_level,
                        verified: !!row.verified
                    })
                } else {
                    entry.lackingUsers.push({
                        userId: row.user_id,
                        userName: row.user_name || t('unknownUser', 'Unknown'),
                        departmentName: row.department_name
                    })
                }
            }

            return Array.from(bySkill.values())
                .map(entry => ({
                    ...entry,
                    coverageRate: entry.totalUsers > 0 ? Math.round((entry.coveredUsers.length / entry.totalUsers) * 100) : 0
                }))
                .sort((a, b) => a.coverageRate - b.coverageRate)
        }
    })

    const summary = useMemo(() => {
        if (!skillRows || skillRows.length === 0) return null
        const totalUsers = skillRows[0]?.totalUsers || 0
        const avgCoverage = Math.round(skillRows.reduce((sum, s) => sum + s.coverageRate, 0) / skillRows.length)
        const criticalGaps = skillRows.filter(s => s.coverageRate < 50).length
        return { totalUsers, totalSkills: skillRows.length, avgCoverage, criticalGaps }
    }, [skillRows])

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <WorkspaceHeader
                eyebrow={t('skillsPage.eyebrow', 'Manage')}
                title={t('skills.matrixTitle', 'Skills matrix')}
                context={t('skills.matrixDescription', 'Coverage and gaps across your team, based on skills earned through training completion.')}
            />

            <div role="group" aria-label={t('trends.filters', 'Filters')} className="flex flex-wrap items-center gap-2">
                {isManager && (
                    <button
                        type="button"
                        aria-pressed={myTeamOnly}
                        onClick={() => { setMyTeamOnly((prev) => !prev); setDepartmentFilter('all') }}
                        className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent ${myTeamOnly ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'}`}
                    >
                        <Users aria-hidden="true" className="h-4 w-4" />{t('analytics.myTeam', 'My team')}
                    </button>
                )}
                <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={myTeamOnly}>
                    <SelectTrigger className="min-h-[40px] w-[200px]" aria-label={t('trends.department', 'Department')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('analytics.allDepartments', 'All departments')}</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {summary && (
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border lg:grid-cols-4">
                    {[
                        { label: t('staff', 'Staff'), value: summary.totalUsers },
                        { label: t('skills.tracked', 'Skills tracked'), value: summary.totalSkills },
                        { label: t('skills.avgCoverage', 'Average coverage'), value: `${summary.avgCoverage}%` },
                        { label: t('skills.criticalGaps', 'Critical gaps (<50%)'), value: summary.criticalGaps, danger: summary.criticalGaps > 0 },
                    ].map((f) => (
                        <div key={f.label} className="bg-ds-surface px-4 py-4">
                            <dt className="text-xs text-ds-muted">{f.label}</dt>
                            <dd className={`mt-1 font-mono text-2xl tabular-nums ${f.danger ? 'text-ds-danger' : 'text-ds-ink'}`}>{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t('skills.coverageTitle', 'Skill Coverage')}</CardTitle>
                    <CardDescription>{t('skills.coverageDesc', 'Lowest coverage first. Expand a skill to see who has it and who still needs it.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-center text-muted-foreground py-8">{t('loading', 'Loading...')}</p>
                    ) : !skillRows || skillRows.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            {t('skills.noData', 'No skills configured yet. Add skills to a module in the builder to start tracking coverage.')}
                        </p>
                    ) : (
                        <Accordion type="multiple" className="space-y-2">
                            {skillRows.map((skill) => (
                                <AccordionItem
                                    key={skill.skillId}
                                    value={skill.skillId}
                                    className={cn(
                                        "rounded-lg border px-4",
                                        skill.coverageRate < 50 ? "border-ds-danger/30 bg-ds-danger-soft" : "border-ds-border"
                                    )}
                                >
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex flex-1 items-center justify-between gap-4 pe-2">
                                            <div className="flex items-center gap-2 text-start">
                                                <span className="font-medium text-ds-ink">{skill.skillName}</span>
                                                <Badge variant="outline" className="text-[10px]">{skill.skillCategory}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {skill.coveredUsers.length}/{skill.totalUsers}
                                                </span>
                                                <Progress value={skill.coverageRate} className="h-2 w-24" />
                                                <span className="text-sm font-semibold w-10 text-end">{skill.coverageRate}%</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid md:grid-cols-2 gap-4 pt-2 pb-3">
                                            <div>
                                                <p className="text-xs font-semibold text-ds-success mb-2 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    {t('skills.hasSkill', 'Has this skill')} ({skill.coveredUsers.length})
                                                </p>
                                                <div className="space-y-1">
                                                    {skill.coveredUsers.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">{t('skills.noneYet', 'No one yet.')}</p>
                                                    ) : skill.coveredUsers.map((u) => (
                                                        <div key={u.userId} className="flex items-center justify-between text-sm">
                                                            <span>{u.userName}</span>
                                                            <span className="text-xs text-muted-foreground">{u.departmentName || '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-ds-danger mb-2 flex items-center gap-1.5">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    {t('skills.lacksSkill', 'Needs this skill')} ({skill.lackingUsers.length})
                                                </p>
                                                <div className="space-y-1">
                                                    {skill.lackingUsers.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">{t('skills.everyoneHasIt', 'Everyone has it.')}</p>
                                                    ) : skill.lackingUsers.map((u) => (
                                                        <div key={u.userId} className="flex items-center justify-between text-sm">
                                                            <span>{u.userName}</span>
                                                            <span className="text-xs text-muted-foreground">{u.departmentName || '-'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
