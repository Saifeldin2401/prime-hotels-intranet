import {
    ImagePlus,
    Video,
    Table,
    Minus,
    X,
    Sparkles
} from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface QuickInsertMenuProps {
    editor: Editor
    position: { x: number; y: number }
    onClose: () => void
    onUploadImage: () => void
    onOpenAiPanel: () => void
}

export function QuickInsertMenu({
    editor,
    position,
    onClose,
    onUploadImage,
    onOpenAiPanel
}: QuickInsertMenuProps) {
    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        onClose()
    }

    const insertHr = () => {
        editor.chain().focus().setHorizontalRule().run()
        onClose()
    }

    const handleAction = (cb: () => void) => {
        cb()
        onClose()
    }

    return (
        <div
            className="quick-insert-menu fixed z-[100] w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in zoom-in duration-200"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -100%) translateY(-10px)'
            }}
        >
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Insert</span>
                <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-white">
                    <X className="h-3 w-3" />
                </button>
            </div>

            <div className="p-1">
                <button
                    onClick={() => handleAction(onUploadImage)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400">
                        <ImagePlus className="h-3.5 w-3.5" />
                    </div>
                    <span>Upload Image</span>
                </button>

                <button
                    onClick={() => handleAction(onOpenAiPanel)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
                        <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span>AI Assistant</span>
                </button>

                <button
                    onClick={insertTable}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
                        <Table className="h-3.5 w-3.5" />
                    </div>
                    <span>Insert Table</span>
                </button>

                <button
                    onClick={insertHr}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
                        <Minus className="h-3.5 w-3.5" />
                    </div>
                    <span>Divider Line</span>
                </button>
            </div>
        </div>
    )
}
