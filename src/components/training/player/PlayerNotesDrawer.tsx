import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    BookOpen,
    Bookmark,
    Download,
    Trash2,
    Save,
    X,
    Check,
    FileText,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteEntry {
    blockId: string
    blockTitle: string
    content: string
    updatedAt: string
}

interface PlayerNotesDrawerProps {
    isOpen: boolean
    onClose: () => void
    moduleId: string
    moduleTitle?: string
    activeBlockId?: string
    activeBlockTitle?: string
    isRTL?: boolean
}

export function PlayerNotesDrawer({
    isOpen,
    onClose,
    moduleId,
    moduleTitle,
    activeBlockId,
    activeBlockTitle,
    isRTL = false
}: PlayerNotesDrawerProps) {
    const storageKey = `altus_training_notes_${moduleId}`
    const bookmarkKey = `altus_training_bookmarks_${moduleId}`

    const [notes, setNotes] = useState<Record<string, NoteEntry>>({})
    const [currentNoteText, setCurrentNoteText] = useState('')
    const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
    const [isSaved, setIsSaved] = useState(false)

    // Load notes & bookmarks from localStorage
    useEffect(() => {
        try {
            const rawNotes = localStorage.getItem(storageKey)
            if (rawNotes) {
                setNotes(JSON.parse(rawNotes))
            }
            const rawBookmarks = localStorage.getItem(bookmarkKey)
            if (rawBookmarks) {
                setBookmarks(new Set(JSON.parse(rawBookmarks)))
            }
        } catch (e) {
            console.warn('Error loading notes from localStorage:', e)
        }
    }, [storageKey, bookmarkKey])

    // Sync active block note to textarea
    useEffect(() => {
        if (activeBlockId && notes[activeBlockId]) {
            setCurrentNoteText(notes[activeBlockId].content)
        } else {
            setCurrentNoteText('')
        }
    }, [activeBlockId, notes])

    const handleSaveCurrentNote = () => {
        if (!activeBlockId) return

        const updated: Record<string, NoteEntry> = {
            ...notes,
            [activeBlockId]: {
                blockId: activeBlockId,
                blockTitle: activeBlockTitle || 'Section Note',
                content: currentNoteText,
                updatedAt: new Date().toISOString()
            }
        }

        if (!currentNoteText.trim()) {
            delete updated[activeBlockId]
        }

        setNotes(updated)
        try {
            localStorage.setItem(storageKey, JSON.stringify(updated))
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 2000)
        } catch (e) {
            console.error('Error saving notes:', e)
        }
    }

    const toggleBookmark = () => {
        if (!activeBlockId) return
        const next = new Set(bookmarks)
        if (next.has(activeBlockId)) {
            next.delete(activeBlockId)
        } else {
            next.add(activeBlockId)
        }
        setBookmarks(next)
        try {
            localStorage.setItem(bookmarkKey, JSON.stringify(Array.from(next)))
        } catch (e) {
            console.error('Error saving bookmarks:', e)
        }
    }

    const handleDeleteNote = (blockId: string) => {
        const updated = { ...notes }
        delete updated[blockId]
        setNotes(updated)
        if (blockId === activeBlockId) {
            setCurrentNoteText('')
        }
        localStorage.setItem(storageKey, JSON.stringify(updated))
    }

    const handleExportNotes = () => {
        const noteValues = Object.values(notes)
        if (noteValues.length === 0) return

        let doc = `# Study Notes & Key Takeaways\n`
        doc += `Module: ${moduleTitle || 'Altus Training Module'}\n`
        doc += `Exported: ${new Date().toLocaleDateString()}\n\n`
        doc += `---\n\n`

        noteValues.forEach((n, idx) => {
            doc += `### ${idx + 1}. ${n.blockTitle}\n`
            doc += `${n.content}\n\n`
        })

        const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Study-Notes-${moduleTitle || 'Module'}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const isCurrentBookmarked = activeBlockId ? bookmarks.has(activeBlockId) : false
    const totalNotesCount = Object.keys(notes).length

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                onClick={onClose}
                className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed inset-y-0 z-[100] w-full sm:w-[440px] bg-slate-950 text-slate-100 shadow-2xl border-s border-slate-800 flex flex-col transition-transform duration-300 animate-in slide-in-from-right",
                    isRTL ? "left-0 border-r border-s-0 slide-in-from-left" : "right-0"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-white whitespace-nowrap">
                                    {isRTL ? 'مفكرتي الدراسية' : 'Personal Study Notes'}
                                </h3>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] h-4 px-1.5">
                                    {totalNotesCount} {isRTL ? 'ملاحظات' : 'Notes'}
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {moduleTitle || (isRTL ? 'ملاحظات التدريب' : 'Course Notes')}
                            </p>
                        </div>
                    </div>

                <div className="flex items-center gap-1">
                    {totalNotesCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExportNotes}
                            title={isRTL ? 'تصدير الملاحظات' : 'Export Notes'}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Current Section Editor */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400 truncate max-w-[260px]">
                        📝 {activeBlockTitle || (isRTL ? 'القسم الحالي' : 'Current Section')}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleBookmark}
                        className={cn(
                            "h-7 px-2 text-xs gap-1 transition-colors",
                            isCurrentBookmarked
                                ? "text-amber-400 bg-amber-500/20 border border-amber-500/40"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <Bookmark className={cn("h-3.5 w-3.5", isCurrentBookmarked && "fill-current")} />
                        <span>{isCurrentBookmarked ? (isRTL ? 'محفوظ' : 'Saved') : (isRTL ? 'حفظ علامة' : 'Bookmark')}</span>
                    </Button>
                </div>

                <Textarea
                    value={currentNoteText}
                    onChange={(e) => setCurrentNoteText(e.target.value)}
                    placeholder={isRTL ? 'اكتب ملاحظتك الشخصية لهذا الدرس للرجوع إليها لاحقاً...' : 'Jot down personal notes or key takeaways for this section...'}
                    className="min-h-[100px] bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-500 focus-visible:ring-amber-500 resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                        {isSaved && <span className="text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" /> {isRTL ? 'تم الحفظ' : 'Saved'}</span>}
                    </span>
                    <Button
                        size="sm"
                        onClick={handleSaveCurrentNote}
                        className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5"
                    >
                        <Save className="h-3.5 w-3.5" />
                        <span>{isRTL ? 'حفظ الملاحظة' : 'Save Note'}</span>
                    </Button>
                </div>
            </div>

            {/* All Notes List */}
            <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                    {isRTL ? 'كافة ملاحظات الدورة' : 'All Module Notes'}
                </span>
            </div>

            <ScrollArea className="flex-1 p-4">
                {totalNotesCount === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500 space-y-2">
                        <BookOpen className="h-8 w-8 opacity-40 text-amber-400" />
                        <p className="text-xs">
                            {isRTL ? 'لم تقم بتدوين ملاحظات بعد.' : 'No notes written yet.'}
                        </p>
                        <p className="text-[11px] text-slate-600 max-w-[220px]">
                            {isRTL ? 'اكتب ملاحظاتك أثناء القراءة لتتذكر أهم المعايير.' : 'Take notes during your lesson to easily reference on shift.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {Object.values(notes).map((n) => (
                            <div
                                key={n.blockId}
                                className={cn(
                                    "p-3 rounded-xl border bg-slate-900/90 transition-all group",
                                    n.blockId === activeBlockId
                                        ? "border-amber-500/50 shadow-md shadow-amber-500/5"
                                        : "border-slate-800 hover:border-slate-700"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[260px]">
                                        {n.blockTitle}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteNote(n.blockId)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-400"
                                        title={isRTL ? 'حذف' : 'Delete'}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {n.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
            </div>
        </>
    )
}
