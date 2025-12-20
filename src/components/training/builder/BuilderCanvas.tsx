import {
    Plus,
    Trash2,
    GripVertical,
    ChevronDown,
    ChevronUp,
    FileText,
    Image,
    Video,
    Link,
    FileQuestion,
    BookOpen
} from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// Reuse types from TrainingBuilder or distinct types if extracted
// For now we will define interface here compatible with TrainingBuilder

type ContentType = 'text' | 'image' | 'video' | 'document_link' | 'audio' | 'quiz' | 'interactive' | 'sop_reference'

interface ContentBlockForm {
    id: string
    type: ContentType
    content: string
    content_url: string
    content_data: Record<string, unknown>
    is_mandatory: boolean
    title: string
    duration?: number
    points?: number
    order: number
}

interface TrainingSection {
    id: string
    title: string
    description?: string
    items: ContentBlockForm[]
    order: number
}

interface BuilderCanvasProps {
    sections: TrainingSection[]
    activeSection: string | null
    onSectionClick: (id: string | null) => void
    onAddSection: () => void
    onDeleteSection: (id: string) => void
    onAddContent: (type: ContentType, sectionId: string) => void
    onEditContent: (sectionId: string, contentId: string) => void
    onDeleteContent: (sectionId: string, contentId: string) => void
    onReorderSection: (dragIndex: number, hoverIndex: number) => void
    onReorderContent: (sectionId: string, dragIndex: number, hoverIndex: number) => void
}

export const BuilderCanvas = ({
    sections,
    activeSection,
    onSectionClick,
    onAddSection,
    onDeleteSection,
    onAddContent,
    onEditContent,
    onDeleteContent,
    onReorderSection,
    onReorderContent
}: BuilderCanvasProps) => {
    const { t, i18n } = useTranslation('training')
    const isRTL = i18n.dir() === 'rtl'

    const getContentIcon = (type: ContentType) => {
        switch (type) {
            case 'text': return <FileText className="w-4 h-4" />
            case 'image': return <Image className="w-4 h-4" />
            case 'video': return <Video className="w-4 h-4" />
            case 'document_link': return <Link className="w-4 h-4" />
            case 'quiz': return <FileQuestion className="w-4 h-4" />
            case 'sop_reference': return <BookOpen className="w-4 h-4" />
            default: return <FileText className="w-4 h-4" />
        }
    }

    const handleDragStartSection = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('type', 'section')
        e.dataTransfer.setData('index', index.toString())
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragStartContent = (e: React.DragEvent, sectionId: string, index: number) => {
        e.stopPropagation()
        e.dataTransfer.setData('type', 'content')
        e.dataTransfer.setData('sectionId', sectionId)
        e.dataTransfer.setData('index', index.toString())
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDropSection = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        const type = e.dataTransfer.getData('type')
        if (type !== 'section') return

        const dragIndex = parseInt(e.dataTransfer.getData('index'))
        if (isNaN(dragIndex) || dragIndex === dropIndex) return

        onReorderSection(dragIndex, dropIndex)
    }

    const handleDropContent = (e: React.DragEvent, dropSectionId: string, dropIndex: number) => {
        e.preventDefault()
        e.stopPropagation()
        const type = e.dataTransfer.getData('type')
        if (type !== 'content') return

        const dragSectionId = e.dataTransfer.getData('sectionId')
        if (dragSectionId !== dropSectionId) return // Simple reorder within section only

        const dragIndex = parseInt(e.dataTransfer.getData('index'))
        if (isNaN(dragIndex) || dragIndex === dropIndex) return

        onReorderContent(dropSectionId, dragIndex, dropIndex)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    return (
        <div className="flex-1 p-6 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-lg font-semibold text-slate-800">{t('builder.courseStructure')}</h3>
                    <Button onClick={onAddSection} size="sm" className={cn("bg-hotel-gold text-white hover:bg-hotel-gold-dark shadow-sm", isRTL ? 'flex-row-reverse' : '')}>
                        <Plus className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                        {t('builder.addSection')}
                    </Button>
                </div>

                {sections.length === 0 ? (
                    <Card className="border-dashed border-2 bg-slate-50/50">
                        <CardContent className="text-center py-16 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Plus className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="text-lg font-medium text-slate-700 mb-2">{t('builder.startCreating')}</h4>
                            <p className="text-slate-500 mb-6 max-w-sm">{t('builder.noContent')}</p>
                            <Button onClick={onAddSection} variant="outline" className={cn("border-dashed border-slate-300 hover:border-hotel-gold hover:text-hotel-gold hover:bg-hotel-gold/5", isRTL ? 'flex-row-reverse' : '')}>
                                <Plus className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                                {t('builder.addSection')}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sections.map((section, sectionIndex) => (
                            <Card
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleDragStartSection(e, sectionIndex)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropSection(e, sectionIndex)}
                                className={cn(
                                    "overflow-hidden transition-all duration-200 border-l-4",
                                    activeSection === section.id ? "border-l-hotel-navy shadow-md ring-1 ring-hotel-navy/5" : "border-l-transparent hover:border-l-slate-300"
                                )}
                            >
                                <CardHeader
                                    className="cursor-pointer bg-white hover:bg-slate-50/80 transition-colors py-4 px-6 select-none"
                                    onClick={() => onSectionClick(activeSection === section.id ? null : section.id)}
                                >
                                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded text-slate-400">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-semibold text-slate-800">{section.title}</h4>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                                {section.items.length} {t('builder.items')}
                                            </Badge>
                                        </div>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDeleteSection(section.id)
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <div className="h-8 w-8 flex items-center justify-center text-slate-400">
                                                {activeSection === section.id ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className={cn("w-4 h-4", isRTL && "rotate-180")} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>

                                {activeSection === section.id && (
                                    <CardContent className="pt-2 pb-6 px-6 bg-slate-50/30 border-t border-slate-100">
                                        {/* Content Items */}
                                        <div className="space-y-3 mt-4">
                                            {section.items.length === 0 ? (
                                                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-white/50">
                                                    <p className="text-sm text-slate-500 mb-4">{t('builder.emptySection')}</p>
                                                    <div className={`flex flex-wrap gap-2 justify-center max-w-lg mx-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        {(['text', 'video', 'image', 'document_link', 'quiz', 'sop_reference'] as ContentType[]).map((type) => (
                                                            <Button
                                                                key={type}
                                                                size="sm"
                                                                variant="outline"
                                                                className={cn("bg-white hover:bg-hotel-gold/5 hover:border-hotel-gold hover:text-hotel-gold text-xs h-8", isRTL ? 'flex-row-reverse' : '')}
                                                                onClick={() => onAddContent(type, section.id)}
                                                            >
                                                                {getContentIcon(type)}
                                                                <span className={isRTL ? "mr-2 capitalize" : "ml-2 capitalize"}>{t(`wizard.type_${type}`, type.replace('_', ' '))}</span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {section.items.map((item, itemIndex) => (
                                                        <div
                                                            key={item.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStartContent(e, section.id, itemIndex)}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDropContent(e, section.id, itemIndex)}
                                                            className={cn("group flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-hotel-navy/30 hover:shadow-sm transition-all", isRTL ? 'flex-row-reverse' : '')}
                                                        >
                                                            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                                                <GripVertical className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-500 shrink-0">
                                                                {getContentIcon(item.type)}
                                                            </div>
                                                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                                <p className="font-medium text-sm text-slate-900 truncate">
                                                                    {item.title || `(${t('builder.untitled')})`}
                                                                </p>
                                                                <p className="text-xs text-slate-500 truncate">
                                                                    {t(`wizard.type_${item.type}`, item.type)} • {item.is_mandatory ? t('builder.mandatory') : t('builder.optional')}
                                                                </p>
                                                            </div>
                                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => onEditContent(section.id, item.id)}
                                                                >
                                                                    {t('common:actions.edit')}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => onDeleteContent(section.id, item.id)}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="mt-4 pt-2 flex justify-center">
                                                        <div className={`flex flex-wrap gap-2 justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className={cn("text-slate-500 hover:text-hotel-gold", isRTL ? 'flex-row-reverse' : '')}
                                                                onClick={() => onAddContent('text', section.id)}
                                                            >
                                                                <Plus className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} /> {t('builder.addContent')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
