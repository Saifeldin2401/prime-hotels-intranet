import { FloatingAdminAI } from '@/components/admin/AdminAIAssistant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMotivationalContent, type MotivationalContent, type MotivationCategory } from '@/hooks/hr/useMotivationalContent'
import { Award, BookOpen, Crown, Heart, Plus, Quote, Target, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function MotivationalContentEditor() {
    const { t } = useTranslation(['common'])
    const { data: quotes, isLoading, createContent, updateContent, deleteContent, toggleStatus } = useMotivationalContent()

    const [selectedQuote, setSelectedQuote] = useState<Partial<MotivationalContent> | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const categories: { value: MotivationCategory; label: string; icon: React.ReactNode }[] = [
        { value: 'general', label: 'General Motivation', icon: <Heart className="h-4 w-4" /> },
        { value: 'leadership', label: 'Leadership', icon: <Crown className="h-4 w-4" /> },
        { value: 'service', label: 'Hospitality Service', icon: <Award className="h-4 w-4" /> },
        { value: 'wellness', label: 'Wellness & Health', icon: <Target className="h-4 w-4" /> },
        { value: 'sales', label: 'Sales & Drive', icon: <BookOpen className="h-4 w-4" /> }
    ]

    const handleCreateNew = () => {
        setSelectedQuote({
            content_en: '',
            content_ar: '',
            author_en: '',
            author_ar: '',
            category: 'general',
            is_active: true
        })
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!selectedQuote?.content_en || !selectedQuote?.content_ar) return

        if (selectedQuote.id) {
            updateContent.mutate(selectedQuote as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedQuote(null)
                }
            })
        } else {
            createContent.mutate(selectedQuote as any, {
                onSuccess: () => {
                    setIsEditing(false)
                    setSelectedQuote(null)
                }
            })
        }
    }

    const handleDelete = (id: string) => {
        if (window.confirm(t('common:actions.delete', 'Are you sure you want to delete this quote?'))) {
            deleteContent.mutate(id)
            if (selectedQuote?.id === id) {
                setIsEditing(false)
                setSelectedQuote(null)
            }
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-hotel-slate">
                        Motivational Content Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Curate inspiring quotes and banners displayed across team dashboards globally.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={handleCreateNew} className="bg-brand-purple hover:bg-brand-purple/90 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Quote
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: List of Quotes */}
                <div className={`lg:col-span-4 space-y-4 ${isEditing ? 'hidden lg:block opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-2 pb-10">
                        {isLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Loading quotes...</p>
                        ) : !quotes || quotes.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <Quote className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">No quotes published yet.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            quotes.map(quote => {
                                const categorySetting = categories.find(c => c.value === quote.category)
                                return (
                                    <Card 
                                        key={quote.id} 
                                        className="relative overflow-hidden transition-all hover:shadow-md cursor-pointer group min-h-[120px] bg-white" 
                                        onClick={() => { setSelectedQuote(quote); setIsEditing(true); }}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${quote.is_active ? 'bg-hotel-gold' : 'bg-slate-300'}`} />
                                        <CardHeader className="p-4 pb-0">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="flex items-center gap-1 bg-slate-50 text-[10px] py-0 h-5">
                                                    {categorySetting?.icon}
                                                    <span className="capitalize">{quote.category || 'general'}</span>
                                                </Badge>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDelete(quote.id); }} aria-label={t('common:accessibility.delete', 'Delete')}>
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-3 flex flex-col h-full">
                                            <div className="flex-grow space-y-2">
                                                <p className="text-sm italic font-medium text-slate-800 line-clamp-2 leading-snug">
                                                    "{quote.content_en || 'No English content'}"
                                                </p>
                                                <p dir="rtl" className="text-xs italic font-medium text-slate-600 font-arabic line-clamp-2 leading-relaxed text-right border-r-2 border-slate-100 pr-2">
                                                    "{quote.content_ar || 'لا يوجد محتوى عربي'}"
                                                </p>
                                            </div>
                                            
                                            <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-muted-foreground flex justify-between items-center">
                                                <span className="font-medium">— {quote.author_en || quote.author_ar || 'Unknown Author'}</span>
                                                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                                    <Switch 
                                                        checked={quote.is_active} 
                                                        onCheckedChange={(checked) => toggleStatus.mutate({ id: quote.id, is_active: checked })}
                                                        className="scale-75 origin-right"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className={`lg:col-span-8 ${!isEditing ? 'hidden lg:block' : ''}`}>
                    {isEditing && selectedQuote ? (
                        <Card className="shadow-lg border-t-4 border-t-hotel-gold">
                            <CardHeader>
                                <CardTitle className="flex flex-row items-center gap-2">
                                    <Quote className="w-5 h-5 text-hotel-gold" />
                                    {selectedQuote.id ? 'Edit Quote' : 'Publish New Quote'}
                                </CardTitle>
                                <CardDescription>Dual-language support is mandatory. Quotes will appear dynamically on dashboards for selected categories.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                
                                <div className="space-y-3">
                                    <Label>Content Category</Label>
                                    <Select value={selectedQuote.category} onValueChange={(v: MotivationCategory) => setSelectedQuote({...selectedQuote, category: v})}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* English Pane */}
                                <div className="p-4 bg-slate-50 border rounded-xl space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge>English (LTR)</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quote Body</Label>
                                        <Textarea 
                                            value={selectedQuote.content_en || ''} 
                                            onChange={e => setSelectedQuote({...selectedQuote, content_en: e.target.value})} 
                                            placeholder="Ex: The only way to do great work is to love what you do..." 
                                            className="text-base min-h-[100px]" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Author / Speaker</Label>
                                        <Input 
                                            value={selectedQuote.author_en || ''} 
                                            onChange={e => setSelectedQuote({...selectedQuote, author_en: e.target.value})} 
                                            placeholder="Steve Jobs" 
                                        />
                                    </div>
                                </div>

                                {/* Arabic Pane */}
                                <div className="p-4 bg-amber-50/50 border rounded-xl space-y-4">
                                    <div className="flex items-center gap-2 mb-2 justify-end">
                                        <Badge className="bg-hotel-gold">Arabic (RTL)</Badge>
                                    </div>
                                    <div className="space-y-2 flex flex-col items-end">
                                        <Label className="font-arabic font-bold">نص المقولة</Label>
                                        <Textarea 
                                            dir="rtl"
                                            value={selectedQuote.content_ar || ''} 
                                            onChange={e => setSelectedQuote({...selectedQuote, content_ar: e.target.value})} 
                                            placeholder="اكتب المقولة التحفيزية هنا..." 
                                            className="font-arabic text-base text-right min-h-[100px]" 
                                        />
                                    </div>
                                    <div className="space-y-2 flex flex-col items-end">
                                        <Label className="font-arabic font-bold">اسم القائل</Label>
                                        <Input 
                                            dir="rtl"
                                            value={selectedQuote.author_ar || ''} 
                                            onChange={e => setSelectedQuote({...selectedQuote, author_ar: e.target.value})} 
                                            placeholder="ستيف جوبز" 
                                            className="font-arabic text-right"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="activeQuote"
                                            checked={Boolean(selectedQuote.is_active)}
                                            onCheckedChange={checked => setSelectedQuote({...selectedQuote, is_active: checked})}
                                        />
                                        <Label htmlFor="activeQuote">Push to Live Dashboard immediately</Label>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setIsEditing(false); setSelectedQuote(null) }}>
                                            Discard
                                        </Button>
                                        <Button onClick={handleSave} disabled={createContent.isPending || updateContent.isPending || !selectedQuote.content_en || !selectedQuote.content_ar} className="bg-hotel-gold hover:bg-hotel-gold/90 text-white">
                                            {createContent.isPending || updateContent.isPending ? 'Saving...' : 'Publish Quote'}
                                        </Button>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 text-muted-foreground p-8">
                            <Quote className="w-12 h-12 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-700">Content Engine</h3>
                            <p className="text-sm text-center max-w-sm mt-2">Select a quote from the bank to refine its translation or toggle its visibility logic on the employee homepages.</p>
                        </div>
                    )}
                </div>
            </div>
            <FloatingAdminAI />
        </div>
    )
}
