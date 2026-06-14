import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useShiftHandover, type ShiftHandoverLog } from '@/hooks/useShiftHandover'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, m } from 'framer-motion'
import { CheckCircle2, Clock, MessageSquare, Send, Shell } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ShiftHandoverWidget() {
    const { t, i18n } = useTranslation('dashboard')
    const { logs, isLoading, createLog, acknowledgeLog } = useShiftHandover()
    const [message, setMessage] = useState('')
    const [urgency, setUrgency] = useState<ShiftHandoverLog['urgency']>('medium')
    const isRTL = i18n.dir() === 'rtl'

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return
        createLog.mutate({ message, urgency }, {
            onSuccess: () => setMessage('')
        })
    }

    const urgencyColors = {
        low: 'bg-slate-100 text-slate-600 border-slate-200',
        medium: 'bg-blue-50 text-blue-600 border-blue-200',
        high: 'bg-amber-50 text-amber-600 border-amber-200',
        critical: 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
    }

    return (
        <Card className="h-full border-slate-200/60 shadow-lg flex flex-col overflow-hidden rounded-2xl bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        {t('handover.title', 'Supervisor Handover')}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-white font-bold">
                        {t('handover.live', 'Live Feed')}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
                <ScrollArea className="flex-1 max-h-[350px]">
                    <div className="p-4 space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                                <Shell className="w-6 h-6 animate-spin" />
                                <span className="text-xs font-medium italic">Syncing logs...</span>
                            </div>
                        ) : logs?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-6 h-6 text-slate-300" />
                                </div>
                                <h6 className="text-sm font-bold text-slate-800">{t('handover.empty', 'Clean Slate')}</h6>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {t('handover.empty_desc', 'No critical handover notes for this shift. Have a great duty!')}
                                </p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {logs?.map((log) => (
                                    <m.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={cn(
                                            "p-3 rounded-xl border relative group transition-all",
                                            log.is_acknowledged ? "bg-slate-50/50 border-slate-100 opacity-80" : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border uppercase font-black", urgencyColors[log.urgency])}>
                                                        {t(`handover.urgency.${log.urgency}`, log.urgency)}
                                                    </Badge>
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-800 leading-relaxed break-words">
                                                    {log.message}
                                                </p>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">
                                                            {log.created_by?.full_name?.charAt(0)}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">
                                                            {log.created_by?.full_name}
                                                        </span>
                                                    </div>

                                                    {!log.is_acknowledged && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                                            onClick={() => acknowledgeLog.mutate(log.id)}
                                                            disabled={acknowledgeLog.isPending}
                                                        >
                                                            {t('handover.acknowledge', 'Acknowledge')}
                                                        </Button>
                                                    )}

                                                    {log.is_acknowledged && (
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {t('handover.received', 'Seen')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </m.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="flex gap-2">
                            {(['low', 'medium', 'high', 'critical'] as const).map((lvl) => (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setUrgency(lvl)}
                                    className={cn(
                                        "flex-1 py-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all",
                                        urgency === lvl
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('handover.placeholder', 'Important notes for next shift...')}
                                className="min-h-[80px] bg-white border-slate-200 text-xs font-semibold focus:ring-1 focus:ring-slate-400 rounded-xl resize-none pe-10"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!message.trim() || createLog.isPending}
                                className="absolute bottom-2 end-2 h-7 w-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                aria-label={t('accessibility.send_handover', 'Send handover message')}
                            >
                                <Send className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </form>
                </div>
            </CardContent>
        </Card>
    )
}
