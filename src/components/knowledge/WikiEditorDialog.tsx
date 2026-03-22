import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ROLES } from '@/lib/constants'
import type { AppRole, SystemWikiArticle, SystemWikiSubtopic } from '@/lib/types'
import { upsertWikiArticle } from '@/services/systemWikiService'
import { Languages, Loader2, Plus, Save, Shield, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface WikiEditorDialogProps {
    article: Partial<SystemWikiArticle> | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: () => void
}

export function WikiEditorDialog({ article, open, onOpenChange, onSave }: WikiEditorDialogProps) {
    const { t: _t } = useTranslation(['knowledge', 'common'])
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<SystemWikiArticle>>({
        slug: '',
        title_en: '',
        title_ar: '',
        content_en: '',
        content_ar: '',
        subtopics: [],
        allowed_roles: [],
        order_index: 0,
        is_active: true
    })

    useEffect(() => {
        if (article) {
            setFormData({
                ...article,
                subtopics: article.subtopics || []
            })
        } else {
            setFormData({
                slug: '',
                title_en: '',
                title_ar: '',
                content_en: '',
                content_ar: '',
                subtopics: [],
                allowed_roles: [],
                order_index: 0,
                is_active: true
            })
        }
    }, [article, open])

    const handleAddSubtopic = () => {
        setFormData(prev => ({
            ...prev,
            subtopics: [
                ...(prev.subtopics || []),
                {
                    id: crypto.randomUUID(),
                    title_en: '',
                    content_en: '',
                    title_ar: '',
                    content_ar: ''
                }
            ]
        }))
    }

    const handleRemoveSubtopic = (id: string) => {
        setFormData(prev => ({
            ...prev,
            subtopics: (prev.subtopics || []).filter(st => st.id !== id)
        }))
    }

    const handleUpdateSubtopic = (id: string, field: keyof SystemWikiSubtopic, value: string) => {
        setFormData(prev => ({
            ...prev,
            subtopics: (prev.subtopics || []).map(st =>
                st.id === id ? { ...st, [field]: value } : st
            )
        }))
    }

    const handleRoleToggle = (role: AppRole) => {
        setFormData(prev => {
            const current = prev.allowed_roles || []
            if (current.includes(role)) {
                return { ...prev, allowed_roles: current.filter(r => r !== role) }
            } else {
                return { ...prev, allowed_roles: [...current, role] }
            }
        })
    }

    const handleSave = async () => {
        if (!formData.slug || !formData.title_en) {
            toast.error('Slug and English Title are required')
            return
        }

        setIsSaving(true)
        try {
            const { error } = await upsertWikiArticle(formData as any)
            if (error) throw error
            toast.success('Wiki article updated successfully')
            onSave()
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving wiki article:', error)
            toast.error(error.message || 'Failed to save article')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-rose-600" />
                        {article?.slug ? 'Edit Wiki Section' : 'Create Wiki Section'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="slug">Identifier (Slug)</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="e.g., getting_started"
                                disabled={!!article?.slug}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="order">Display Order</Label>
                            <Input
                                id="order"
                                type="number"
                                value={formData.order_index}
                                onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="en" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="en" className="flex items-center gap-2">
                                <Languages className="w-4 h-4" /> English
                            </TabsTrigger>
                            <TabsTrigger value="ar" className="flex items-center gap-2">
                                <Languages className="w-4 h-4" /> Arabic
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="en" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Title (English)</Label>
                                <Input
                                    value={formData.title_en}
                                    onChange={e => setFormData({ ...formData, title_en: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content (English HTML)</Label>
                                <Textarea
                                    rows={10}
                                    value={formData.content_en}
                                    onChange={e => setFormData({ ...formData, content_en: e.target.value })}
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="uppercase text-slate-500 font-bold tracking-wider text-xs">Subtopics (English)</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddSubtopic} className="h-8">
                                        <Plus className="w-4 h-4 mr-2" /> Add Subtopic
                                    </Button>
                                </div>
                                <div className="space-y-6">
                                    {(formData.subtopics || []).map((subtopic, index) => (
                                        <Card key={subtopic.id} className="p-4 bg-slate-50 border-slate-200 relative">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                                                onClick={() => handleRemoveSubtopic(subtopic.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <div className="space-y-4 pr-8">
                                                <div className="space-y-2">
                                                    <Label>Subtopic {index + 1} Title</Label>
                                                    <Input
                                                        value={subtopic.title_en}
                                                        onChange={e => handleUpdateSubtopic(subtopic.id, 'title_en', e.target.value)}
                                                        placeholder="e.g., How to add a task"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Subtopic {index + 1} Content (HTML)</Label>
                                                    <Textarea
                                                        rows={4}
                                                        value={subtopic.content_en}
                                                        onChange={e => handleUpdateSubtopic(subtopic.id, 'content_en', e.target.value)}
                                                        className="font-mono text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {(!formData.subtopics || formData.subtopics.length === 0) && (
                                        <p className="text-sm text-slate-500 italic text-center py-4">No subtopics added yet.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="ar" className="space-y-4 pt-4" dir="rtl">
                            <div className="space-y-2">
                                <Label>Title (Arabic)</Label>
                                <Input
                                    className="text-right"
                                    value={formData.title_ar}
                                    onChange={e => setFormData({ ...formData, title_ar: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Content (Arabic HTML)</Label>
                                <Textarea
                                    rows={10}
                                    value={formData.content_ar}
                                    onChange={e => setFormData({ ...formData, content_ar: e.target.value })}
                                    className="font-mono text-sm text-right"
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddSubtopic} className="h-8">
                                        <Plus className="w-4 h-4 ml-2" /> إضافة موضوع فرعي
                                    </Button>
                                    <Label className="uppercase text-slate-500 font-bold tracking-wider text-xs">المواضيع الفرعية (عربي)</Label>
                                </div>
                                <div className="space-y-6">
                                    {(formData.subtopics || []).map((subtopic, index) => (
                                        <Card key={subtopic.id} className="p-4 bg-slate-50 border-slate-200 relative">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-2 left-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                                                onClick={() => handleRemoveSubtopic(subtopic.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <div className="space-y-4 pl-8">
                                                <div className="space-y-2">
                                                    <Label>عنوان الموضوع الفرعي {index + 1}</Label>
                                                    <Input
                                                        className="text-right"
                                                        value={subtopic.title_ar}
                                                        onChange={e => handleUpdateSubtopic(subtopic.id, 'title_ar', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>محتوى الموضوع الفرعي {index + 1} (HTML)</Label>
                                                    <Textarea
                                                        rows={4}
                                                        value={subtopic.content_ar}
                                                        onChange={e => handleUpdateSubtopic(subtopic.id, 'content_ar', e.target.value)}
                                                        className="font-mono text-sm text-right"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {(!formData.subtopics || formData.subtopics.length === 0) && (
                                        <p className="text-sm text-slate-500 italic text-center py-4">لم يتم إضافة مواضيع فرعية بعد.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Card className="p-4 bg-slate-50">
                        <Label className="text-base font-semibold mb-4 block">Role Visibility</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(Object.keys(ROLES) as AppRole[]).map(roleId => (
                                <div key={roleId} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`role-${roleId}`}
                                        checked={formData.allowed_roles?.includes(roleId)}
                                        onCheckedChange={() => handleRoleToggle(roleId)}
                                    />
                                    <label
                                        htmlFor={`role-${roleId}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {ROLES[roleId].label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="active"
                            checked={formData.is_active}
                            onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="active">Active (Visible in Sidebar)</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-rose-600 hover:bg-rose-700">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
