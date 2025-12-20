import { useState, useEffect } from 'react'
import { Plus, X, Award, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { skillsService, type Skill, type ModuleSkill } from '@/services/skillsService'

interface ModuleSkillsEditorProps {
    moduleId: string
    readonly?: boolean
}

export function ModuleSkillsEditor({ moduleId, readonly = false }: ModuleSkillsEditorProps) {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'
    const { toast } = useToast()
    const [moduleSkills, setModuleSkills] = useState<ModuleSkill[]>([])
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    // New Link State
    const [selectedSkillId, setSelectedSkillId] = useState('')
    const [points, setPoints] = useState(10)

    useEffect(() => {
        loadData()
    }, [moduleId])

    const loadData = async () => {
        if (!moduleId) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const [mSkills, allSkills] = await Promise.all([
                skillsService.getModuleSkills(moduleId),
                skillsService.getSkills()
            ])
            setModuleSkills(mSkills)
            setAvailableSkills(allSkills)
        } catch (error) {
            console.error('Failed to load skills:', error)
            toast({
                title: t('common:error'),
                description: t('skillsManagement.failedLoad'),
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleAddSkill = async () => {
        if (!selectedSkillId) return

        try {
            await skillsService.linkModuleSkill(moduleId, selectedSkillId, points)
            toast({
                title: t('skillsManagement.skillLinked'),
                description: t('skillsManagement.skillLinkedDescription'),
            })
            setIsAdding(false)
            setSelectedSkillId('')
            setPoints(10)
            loadData()
        } catch (error) {
            console.error('Failed to link skill:', error)
            toast({
                title: t('common:error'),
                description: t('skillsManagement.failedLink'),
                variant: 'destructive',
            })
        }
    }

    const handleRemoveSkill = async (skillId: string) => {
        try {
            await skillsService.unlinkModuleSkill(moduleId, skillId)
            toast({
                title: t('skillsManagement.skillRemoved'),
                description: t('skillsManagement.skillRemovedDescription'),
            })
            loadData()
        } catch (error) {
            console.error('Failed to unlink skill:', error)
            toast({
                title: t('common:error'),
                description: t('skillsManagement.failedUnlink'),
                variant: 'destructive',
            })
        }
    }

    // Filter out already linked skills
    const unlinkedSkills = availableSkills.filter(
        s => !moduleSkills.some(ms => ms.skill_id === s.id)
    )

    if (loading) return <div className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('skillsManagement.loading')}</div>

    return (
        <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <h3 className={`text-sm font-medium flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Award className="h-4 w-4 text-hotel-gold" />
                    {t('skillsManagement.title')}
                </h3>
                {!readonly && moduleId && (
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Plus className={cn("h-3 w-3", isRTL ? "ml-1" : "mr-1")} />
                                {t('skillsManagement.addSkill')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className={isRTL ? 'text-right' : 'text-left'}>
                            <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
                                <DialogTitle>{t('skillsManagement.linkSkill')}</DialogTitle>
                                <DialogDescription>
                                    {t('skillsManagement.linkDescription')}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>{t('skillsManagement.selectSkill')}</Label>
                                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                        <SelectTrigger className={isRTL ? 'flex-row-reverse' : ''}>
                                            <SelectValue placeholder={t('skillsManagement.selectSkillPlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent className={isRTL ? 'text-right' : 'text-left'}>
                                            {unlinkedSkills.length === 0 ? (
                                                <div className="p-2 text-sm text-gray-500 text-center">
                                                    {t('skillsManagement.noAvailableSkills')}
                                                </div>
                                            ) : (
                                                unlinkedSkills.map(skill => (
                                                    <SelectItem key={skill.id} value={skill.id}>
                                                        {skill.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('skillsManagement.pointsAwarded')}</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={points}
                                        onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                                        className={isRTL ? 'text-right' : 'text-left'}
                                    />
                                    <p className="text-xs text-gray-500">
                                        {t('skillsManagement.pointsHint')}
                                    </p>
                                </div>

                                <Button onClick={handleAddSkill} disabled={!selectedSkillId} className="w-full">
                                    {t('skillsManagement.linkSkill')}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="space-y-2">
                {moduleSkills.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-dashed rounded p-3 text-center">
                        {t('skillsManagement.noSkillsLinked')}
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {moduleSkills.map(ms => (
                            <div
                                key={ms.id}
                                className={`flex items-center justify-between p-2 rounded bg-gray-50 border group ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className="font-medium text-sm">{ms.skill?.name || t('skillsManagement.unknownSkill')}</div>
                                    <div className={`text-xs text-gray-500 flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {ms.points_awarded} {t('inlineQuiz.pts')}
                                        </Badge>
                                        {ms.skill?.category && (
                                            <span className="text-gray-400">| {ms.skill.category}</span>
                                        )}
                                    </div>
                                </div>
                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveSkill(ms.skill_id)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
