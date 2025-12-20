import { useState, useEffect, useCallback } from 'react'
import { Award, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { skillsService, type UserSkill } from '@/services/skillsService'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

export function UserSkillsDisplay() {
    const { user } = useAuth()
    const { t } = useTranslation('profile')
    const [skills, setSkills] = useState<UserSkill[]>([])
    const [loading, setLoading] = useState(true)

    const loadSkills = useCallback(async () => {
        try {
            setLoading(true)
            if (user) {
                const data = await skillsService.getUserSkills(user.id)
                setSkills(data)
            }
        } catch (error) {
            console.error('Failed to load skills:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            loadSkills()
        }
    }, [user, loadSkills])

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading skills...</div>
    }

    if (skills.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-hotel-gold" />
                        Skills & Competencies
                    </CardTitle>
                    <CardDescription>
                        No skills recorded yet. Complete training modules to earn skills.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-hotel-gold" />
                    Skills & Competencies
                </CardTitle>
                <CardDescription>
                    Your verified skills and proficiency levels based on training completion.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    {skills.map((userSkill) => (
                        <div key={userSkill.id} className="bg-slate-50 p-4 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-semibold text-lg">{userSkill.skill?.name || 'Unknown Skill'}</h4>
                                    <p className="text-xs text-gray-500">{userSkill.skill?.category}</p>
                                </div>
                                {userSkill.verified ? (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-gray-500">
                                        Unverified
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Proficiency Level</span>
                                    <span className="font-medium">{userSkill.proficiency_level} / 5</span>
                                </div>
                                <Progress value={(userSkill.proficiency_level / 5) * 100} className="h-2" />
                                <p className="text-xs text-gray-500 mt-1">
                                    {getProficiencyLabel(userSkill.proficiency_level)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function getProficiencyLabel(level: number): string {
    switch (level) {
        case 1: return 'Novice - Basic understanding'
        case 2: return 'Advanced Beginner - Can perform with guidance'
        case 3: return 'Competent - Capable of independent work'
        case 4: return 'Proficient - High level of competence'
        case 5: return 'Expert - Recognized authority'
        default: return 'Unknown'
    }
}
