/**
 * AITriageSuggestions - Display AI classification suggestions for tickets
 * 
 * Shows suggested category, priority, department with confidence level
 * and similar past tickets.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Loader2,
    ChevronRight,
    Lightbulb,
    History
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimilarTicket {
    id: string
    title: string
    status: string
    resolved_at?: string
}

interface TriageSuggestion {
    category: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    department: string
    confidence: number
    suggestedTitle?: string
    roomNumber?: string
    similarTickets: SimilarTicket[]
}

interface AITriageSuggestionsProps {
    suggestion: TriageSuggestion | null
    loading: boolean
    onApply?: (suggestion: TriageSuggestion) => void
    onDismiss?: () => void
}

const priorityConfig = {
    critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    low: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 }
}

export function AITriageSuggestions({
    suggestion,
    loading,
    onApply,
    onDismiss
}: AITriageSuggestionsProps) {

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100"
            >
                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                </div>
                <div>
                    <p className="text-sm font-medium text-violet-900">AI is analyzing your request...</p>
                    <p className="text-xs text-violet-600">Finding best classification and similar tickets</p>
                </div>
            </motion.div>
        )
    }

    if (!suggestion) return null

    const PriorityIcon = priorityConfig[suggestion.priority].icon

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="rounded-xl bg-gradient-to-br from-violet-50 via-white to-blue-50 border border-violet-100 overflow-hidden shadow-sm"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-100/50 to-blue-100/50 border-b border-violet-100">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-violet-900">AI Suggestion</p>
                            <p className="text-[10px] text-violet-600">{suggestion.confidence}% confidence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onApply && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onApply(suggestion)}
                                className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Apply
                            </Button>
                        )}
                        {onDismiss && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={onDismiss}
                                className="h-8 text-violet-600 hover:text-violet-800 hover:bg-violet-100"
                            >
                                Dismiss
                            </Button>
                        )}
                    </div>
                </div>

                {/* Suggested Title */}
                {suggestion.suggestedTitle && (
                    <div className="px-4 pb-2">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Suggested Title</p>
                        <p className="text-sm font-medium text-gray-800 bg-white/80 rounded-lg px-3 py-2 border border-gray-100">
                            {suggestion.suggestedTitle}
                        </p>
                    </div>
                )}

                {/* Suggestions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                    {/* Category */}
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Category</p>
                        <Badge variant="outline" className="bg-white font-medium">
                            {suggestion.category}
                        </Badge>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Priority</p>
                        <Badge className={cn("gap-1 capitalize", priorityConfig[suggestion.priority].color)}>
                            <PriorityIcon className="h-3 w-3" />
                            {suggestion.priority}
                        </Badge>
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Assign To</p>
                        <Badge variant="outline" className="bg-white font-medium">
                            {suggestion.department}
                        </Badge>
                    </div>

                    {/* Room Number */}
                    {suggestion.roomNumber && (
                        <div className="space-y-1">
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Room</p>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 font-medium">
                                {suggestion.roomNumber}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Similar Tickets */}
                {suggestion.similarTickets.length > 0 && (
                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <History className="h-3.5 w-3.5 text-amber-600" />
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Similar Past Tickets</p>
                        </div>
                        <div className="space-y-2">
                            {suggestion.similarTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-sm"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="truncate text-gray-700">{ticket.title}</span>
                                    </div>
                                    <Badge variant="outline" className="ml-2 text-[10px] bg-white flex-shrink-0">
                                        {ticket.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}
