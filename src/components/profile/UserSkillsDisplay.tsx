import { useState, useEffect, useCallback } from 'react'
import { Award, CheckCircle2, ShieldCheck, ShieldAlert, BookOpen, UserCheck, Star, Zap, Settings as SettingsIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { skillsService, type UserSkill } from '@/services/skillsService'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'

export function UserSkillsDisplay({ userId }: { userId?: string }) {
    const { t: t_ext } = useTranslation('extracted');
    const { user } = useAuth()
    const { t } = useTranslation('profile')
    const [skills, setSkills] = useState<UserSkill[]>([])
    const [loading, setLoading] = useState(true)
    const targetUserId = userId || user?.id

    const loadSkills = useCallback(async () => {
        try {
            setLoading(true)
            if (targetUserId) {
                const data = await skillsService.getUserSkills(targetUserId)
                setSkills(data)
            }
        } catch (error) {
            console.error('Failed to load skills:', error)
        } finally {
            setLoading(false)
        }
    }, [targetUserId])

    useEffect(() => {
        if (targetUserId) {
            loadSkills()
        }
    }, [targetUserId, loadSkills])

    if (loading) {
        return <div className="text-center py-8 text-gray-500">{t_ext('loading_skills', 'Loading skills...')}</div>
    }

    if (skills.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-hotel-gold" />
                        {t_ext('skills_competencies', 'Skills & Competencies')}</CardTitle>
                    <CardDescription>
                        {t_ext('no_skills_recorded_yet_complete_training', 'No skills recorded yet. Complete training modules to earn skills.')}</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-hotel-gold" />
                    {t('skills_and_competencies')}
                </CardTitle>
                <CardDescription>
                    {userId ? t('team_member_skills_desc') : t('my_skills_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    {skills.map((userSkill) => (
                        <div key={userSkill.id} className="bg-slate-50 p-4 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-3">
                                    <div className="mt-1 p-2 bg-hotel-gold/10 rounded-full text-hotel-gold">
                                        {getSkillIcon(userSkill.skill?.category)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">{userSkill.skill?.name || 'Unknown Skill'}</h4>
                                        <p className="text-xs text-gray-500">{userSkill.skill?.category}</p>
                                    </div>
                                </div>
                                {userSkill.verified ? (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        {t_ext('verified', 'Verified')}</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-gray-500">
                                        {t_ext('unverified', 'Unverified')}</Badge>
                                )}
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">{t_ext('proficiency_level', 'Proficiency Level')}</span>
                                    <span className="font-medium">{userSkill.proficiency_level} / 5</span>
                                </div>
                                <Progress value={(userSkill.proficiency_level / 5) * 100} className="h-2" />
                                <p className="text-xs text-gray-500 mt-1">
                                    {getProficiencyLabel(userSkill.proficiency_level, t)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function getSkillIcon(category?: string) {

    switch (category?.toLowerCase()) {
        case 'onboarding': return <BookOpen className="w-4 h-4" />
        case 'compliance': return <UserCheck className="w-4 h-4" />
        case 'skills': return <Zap className="w-4 h-4" />
        case 'leadership': return <Star className="w-4 h-4" />
        default: return <SettingsIcon className="w-4 h-4" />
    }
}

function getProficiencyLabel(level: number, t: any): string {
    switch (level) {
        case 1: return t('proficiency_novice')
        case 2: return t('proficiency_beginner')
        case 3: return t('proficiency_competent')
        case 4: return t('proficiency_proficient')
        case 5: return t('proficiency_expert')
        default: return t('proficiency_unknown')
    }
}
