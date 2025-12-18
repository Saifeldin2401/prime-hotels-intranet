import { useState, useEffect } from 'react'
import { Plus, X, Award, Save } from 'lucide-react'
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
import { skillsService, type Skill, type ModuleSkill } from '@/services/skillsService'

interface ModuleSkillsEditorProps {
    moduleId: string
    readonly?: boolean
}

export function ModuleSkillsEditor({ moduleId, readonly = false }: ModuleSkillsEditorProps) {
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
                title: 'Error',
                description: 'Failed to load skills data',
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
                title: 'Skill Linked',
                description: 'Skill successfully linked to this module',
            })
            setIsAdding(false)
            setSelectedSkillId('')
            setPoints(10)
            loadData()
        } catch (error) {
            console.error('Failed to link skill:', error)
            toast({
                title: 'Error',
                description: 'Failed to link skill',
                variant: 'destructive',
            })
        }
    }

    const handleRemoveSkill = async (skillId: string) => {
        try {
            await skillsService.unlinkModuleSkill(moduleId, skillId)
            toast({
                title: 'Skill Removed',
                description: 'Skill unlinked from this module',
            })
            loadData()
        } catch (error) {
            console.error('Failed to unlink skill:', error)
            toast({
                title: 'Error',
                description: 'Failed to unlink skill',
                variant: 'destructive',
            })
        }
    }

    // Filter out already linked skills
    const unlinkedSkills = availableSkills.filter(
        s => !moduleSkills.some(ms => ms.skill_id === s.id)
    )

    if (loading) return <div className="text-sm text-gray-500">Loading skills...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-hotel-gold" />
                    Skills & Competencies
                </h3>
                {!readonly && moduleId && (
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Plus className="h-3 w-3 mr-1" />
                                Add Skill
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Link Skill</DialogTitle>
                                <DialogDescription>
                                    Select a skill that users will acquire upon completing this module.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Select Skill</Label>
                                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a skill..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {unlinkedSkills.length === 0 ? (
                                                <div className="p-2 text-sm text-gray-500 text-center">
                                                    No available skills to add
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
                                    <Label>Points Awarded</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={points}
                                        onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Points contribute to the user's proficiency level in this skill.
                                    </p>
                                </div>

                                <Button onClick={handleAddSkill} disabled={!selectedSkillId} className="w-full">
                                    Link Skill
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="space-y-2">
                {moduleSkills.length === 0 ? (
                    <div className="text-sm text-gray-500 italic border border-dashed rounded p-3 text-center">
                        No skills linked to this module yet.
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {moduleSkills.map(ms => (
                            <div
                                key={ms.id}
                                className="flex items-center justify-between p-2 rounded bg-gray-50 border group"
                            >
                                <div>
                                    <div className="font-medium text-sm">{ms.skill?.name || 'Unknown Skill'}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {ms.points_awarded} pts
                                        </Badge>
                                        {ms.skill?.category && (
                                            <span className="text-gray-400">• {ms.skill.category}</span>
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
