/**
 * SkillsMatrix
 *
 * Admin view answering "who has / lacks skill X" -- skills are awarded correctly on module
 * completion (skillsService.awardModuleSkills -> user_skills) but nothing previously reported
 * on them. Skill-centric layout: lowest-coverage skills first, expand to see who's missing it.
 */

import { PageHeader } from '@/components/layout/PageHeader'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Award, CheckCircle2, ShieldCheck, Users, XCircle } from 'lucide-react'
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
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const [departmentFilter, setDepartmentFilter] = useState<string>('all')
    const [myTeamOnly, setMyTeamOnly] = useState(false)
    const { currentProperty } = useProperty()
    const { departments } = useDepartments()

    const propertyId = isRealPropertyId(currentProperty?.id) ? currentProperty!.id : null
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
        queryKey: ['skills-matrix', departmentId, propertyId, myTeamOnly],
        queryFn: async (): Promise<SkillRow[]> => {
            const { data, error } = await supabase.rpc('get_skills_matrix', {
                p_department_id: departmentId,
                p_property_id: propertyId,
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
        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <PageHeader
                title={t('skills.matrixTitle', 'Skills Matrix')}
                description={t('skills.matrixDescription', 'Coverage and gaps across your team, based on skills earned through training completion.')}
                actions={
                    <div className="flex items-center gap-3">
                        {isManager && (
                            <Button
                                variant={myTeamOnly ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    setMyTeamOnly(prev => !prev)
                                    setDepartmentFilter('all')
                                }}
                                className={myTeamOnly ? 'bg-hotel-navy hover:bg-hotel-navy-dark' : ''}
                            >
                                <Users className="w-4 h-4 me-1.5" />
                                {t('analytics.myTeam', 'My Team')}
                            </Button>
                        )}
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={myTeamOnly}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('analytics.allDepartments', 'All Departments')}</SelectItem>
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('staff', 'Staff')}</p>
                                    <p className="text-3xl font-bold mt-1">{summary.totalUsers}</p>
                                </div>
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('skills.tracked', 'Skills Tracked')}</p>
                                    <p className="text-3xl font-bold mt-1">{summary.totalSkills}</p>
                                </div>
                                <Award className="w-6 h-6 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('skills.avgCoverage', 'Avg Coverage')}</p>
                                    <p className="text-3xl font-bold mt-1">{summary.avgCoverage}%</p>
                                </div>
                                <ShieldCheck className="w-6 h-6 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={summary.criticalGaps > 0 ? 'border-rose-200' : ''}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('skills.criticalGaps', 'Critical Gaps (<50%)')}</p>
                                    <p className="text-3xl font-bold mt-1">{summary.criticalGaps}</p>
                                </div>
                                <XCircle className="w-6 h-6 text-rose-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
                                        skill.coverageRate < 50 ? "border-rose-200 bg-rose-50/40" : "border-slate-200"
                                    )}
                                >
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex flex-1 items-center justify-between gap-4 pe-2">
                                            <div className="flex items-center gap-2 text-left">
                                                <span className="font-medium text-slate-900">{skill.skillName}</span>
                                                <Badge variant="outline" className="text-[10px]">{skill.skillCategory}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {skill.coveredUsers.length}/{skill.totalUsers}
                                                </span>
                                                <Progress value={skill.coverageRate} className="h-2 w-24" />
                                                <span className="text-sm font-semibold w-10 text-right">{skill.coverageRate}%</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="grid md:grid-cols-2 gap-4 pt-2 pb-3">
                                            <div>
                                                <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
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
                                                <p className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1.5">
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
