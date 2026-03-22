import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Command } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function KeyboardShortcutsModal() {
    const [open, setOpen] = useState(false)
    const { t } = useTranslation('common')
    const navigate = useNavigate()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            // Don't trigger if typing in an input or textarea
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

            // "?" key for help (Shift + /)
            if (e.key === '?') {
                e.preventDefault()
                setOpen(true)
            }

            // "n" key for new task
            if (e.key && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                navigate('/tasks?create=true')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [navigate])

    const shortcuts = [
        { keys: ['⌘ / Ctrl', 'K'], action: t('shortcuts.command_palette', 'Command palette'), desc: 'Search everything quickly' },
        { keys: ['/'], action: t('shortcuts.search', 'Search'), desc: 'Focus the search bar directly' },
        { keys: ['N'], action: t('shortcuts.new_task', 'New task'), desc: 'Create a new task instantly' },
        { keys: ['?'], action: t('shortcuts.help', 'Keyboard shortcuts'), desc: 'Show this shortcuts menu' },
    ]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                        <Command className="w-5 h-5 text-blue-600" />
                        {t('shortcuts.title', 'Keyboard Shortcuts')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        {t('shortcuts.desc', 'Boost your productivity with these quick keystrokes.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 mt-4">
                    {shortcuts.map((shortcut, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors group">
                            <div>
                                <div className="font-semibold text-slate-700 text-sm group-hover:text-slate-900 transition-colors">{shortcut.action}</div>
                                <div className="text-xs text-slate-500">{shortcut.desc}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {shortcut.keys.map((key, j) => (
                                    <kbd key={j} className="h-7 min-w-7 px-2 inline-flex items-center justify-center font-sans font-bold text-[12px] text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm shadow-slate-200/50">
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
