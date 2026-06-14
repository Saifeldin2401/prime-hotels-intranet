import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { domAnimation, LazyMotion, m } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, Crown, Eye, Play, Trophy, UserCheck, XCircle, Building2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Property {
    id: string
    name: string
}

interface PendingSelection {
    id: string
    property_id: string
    user_id: string
    month: number
    year: number
    total_score: number
    selection_reason_en: string
    selection_reason_ar: string
    status: 'pending' | 'approved' | 'rejected' | 'announced'
    reviewed_by: string | null
    reviewed_at: string | null
    review_notes: string | null
    scoring_history_id: string | null
    created_at: string
    profile: {
        full_name: string
        avatar_url: string | null
        job_title: string | null
    }
}

interface EOMPendingReviewProps {
    onReviewed?: () => void
}

export function EOMPendingReview({ onReviewed }: EOMPendingReviewProps) {
    const { t } = useTranslation('dashboard')
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const { toast } = useToast()

    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [pendingSelections, setPendingSelections] = useState<PendingSelection[]>([])
    const [properties, setProperties] = useState<Property[]>([])
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

    // Fetch all properties for Head Office
    useEffect(() => {
        async function fetchProperties() {
            const { data } = await supabase.from('properties').select('id, name').order('name')
            if (data) setProperties(data)
        }
        if (!isRealPropertyId(currentProperty?.id)) {
            fetchProperties()
        }
    }, [currentProperty?.id])

    const fetchPending = useCallback(async (propertyId?: string) => {
        const targetPropertyId = propertyId || currentProperty?.id
        if (!targetPropertyId || !isRealPropertyId(targetPropertyId)) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('eom_auto_selections')
                .select(`
                    *,
                    profile:user_id (
                        full_name,
                        avatar_url,
                        job_title
                    )
                `)
                .eq('property_id', targetPropertyId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error
            setPendingSelections(data as PendingSelection[] || [])
        } catch (err) {
            console.error('Error fetching pending selections:', err)
        } finally {
            setLoading(false)
        }
    }, [currentProperty?.id])

    useEffect(() => {
        if (isRealPropertyId(currentProperty?.id)) {
            fetchPending()
        }
    }, [fetchPending, currentProperty?.id])

    const handleApprove = async (selectionId: string) => {
        if (!user?.id) return

        setProcessing(selectionId)
        try {
            const { data, error } = await supabase
                .rpc('approve_eom_selection', {
                    p_selection_id: selectionId,
                    p_approved_by: user.id,
                    p_notes: null
                })

            if (error) throw error

            toast({
                title: 'Selection Approved',
                description: 'The Employee of the Month has been announced',
            })

            fetchPending()
            onReviewed?.()
        } catch (err) {
            toast({
                title: 'Approval Failed',
                description: err instanceof Error ? err.message : 'Failed to approve selection',
                variant: 'destructive'
            })
        } finally {
            setProcessing(null)
        }
    }

    const handleReject = async (selectionId: string) => {
        if (!user?.id) return

        setProcessing(selectionId)
        try {
            const { error } = await supabase
                .from('eom_auto_selections')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectionId)

            if (error) throw error

            toast({
                title: 'Selection Rejected',
                description: 'The automated selection has been rejected',
            })

            fetchPending()
            onReviewed?.()
        } catch (err) {
            toast({
                title: 'Action Failed',
                description: err instanceof Error ? err.message : 'Failed to reject selection',
                variant: 'destructive'
            })
        } finally {
            setProcessing(null)
        }
    }

    const formatMonth = (month: number, year: number) => {
        return new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }

    const handlePropertySelect = (propertyId: string) => {
        setSelectedPropertyId(propertyId)
        fetchPending(propertyId)
    }

    // Head Office view - show property selector
    if (!isRealPropertyId(currentProperty?.id)) {
        return (
            <Card className="border-amber-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" />
                        Pending Review
                    </CardTitle>
                    <CardDescription>
                        Review automated EOM selections across properties
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-amber-600" />
                            Select Property
                        </Label>
                        <Select value={selectedPropertyId || ''} onValueChange={handlePropertySelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a property..." />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading && (
                        <div className="animate-pulse space-y-4 pt-4">
                            <div className="h-4 bg-amber-200 rounded w-1/3" />
                            <div className="h-20 bg-amber-200 rounded" />
                        </div>
                    )}

                    {!loading && pendingSelections.length > 0 && (
                        <div className="pt-4 border-t border-amber-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                    {pendingSelections.length} pending
                                </Badge>
                            </div>
                            <div className="space-y-4">
                                {pendingSelections.map((selection) => (
                                    <div key={selection.id} className="bg-amber-50 rounded-lg p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={selection.profile?.avatar_url || undefined} />
                                                <AvatarFallback>{selection.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{selection.profile?.full_name}</p>
                                                <p className="text-xs text-amber-600">{formatMonth(selection.month, selection.year)} • Score: {selection.total_score}/100</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleApprove(selection.id)}
                                                disabled={processing === selection.id}
                                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                                size="sm"
                                            >
                                                <CheckCircle className="h-4 w-4 me-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(selection.id)}
                                                disabled={processing === selection.id}
                                                variant="outline"
                                                size="sm"
                                                className="border-red-200 text-red-600"
                                            >
                                                <XCircle className="h-4 w-4 me-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && selectedPropertyId && pendingSelections.length === 0 && (
                        <div className="pt-4 text-center text-sm text-slate-500">
                            No pending selections for this property.
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (loading) {
        return (
            <Card className="border-hotel-gold/20">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-hotel-gold/20 rounded w-1/3" />
                        <div className="h-20 bg-hotel-gold/20 rounded" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (pendingSelections.length === 0) {
        return null
    }

    return (
        <LazyMotion features={domAnimation}>
            <Card className="border-amber-200 shadow-lg overflow-hidden bg-gradient-to-br from-amber-50/50 to-white">
                <CardHeader className="border-b border-amber-100 bg-amber-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Pending Review
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                    {pendingSelections.length}
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Automated selections awaiting HR approval
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-amber-100">
                        {pendingSelections.map((selection, index) => (
                            <m.div
                                key={selection.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-6"
                            >
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Winner Info */}
                                    <div className="flex items-center gap-4 md:w-72 shrink-0">
                                        <div className="relative">
                                            <Avatar className="h-16 w-16 border-2 border-amber-200">
                                                <AvatarImage src={selection.profile?.avatar_url || undefined} />
                                                <AvatarFallback className="bg-amber-100 text-amber-600 text-lg font-bold">
                                                    {selection.profile?.full_name?.charAt(0) || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -bottom-1 -end-1 bg-amber-500 text-white p-1 rounded-full shadow-sm">
                                                <Crown className="h-3 w-3" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-hotel-charcoal">
                                                {selection.profile?.full_name}
                                            </p>
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">
                                                {selection.profile?.job_title || 'Employee'}
                                            </p>
                                            <p className="text-sm text-amber-600 font-medium mt-1">
                                                {formatMonth(selection.month, selection.year)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Score & Reason */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-100 px-3 py-1.5 rounded-lg">
                                                <span className="text-sm font-bold text-amber-700">
                                                    Score: {selection.total_score}/100
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-amber-600 border-amber-200">
                                                <Trophy className="h-3 w-3 me-1" />
                                                Auto-Selected
                                            </Badge>
                                        </div>

                                        <div className="bg-white rounded-lg p-4 border border-amber-100">
                                            <p className="text-sm text-slate-600 italic">
                                                "{selection.selection_reason_en}"
                                            </p>
                                        </div>

                                        <p className="text-xs text-slate-500">
                                            Selected on {new Date(selection.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 md:w-40 shrink-0 justify-center">
                                        <Button
                                            onClick={() => handleApprove(selection.id)}
                                            disabled={processing === selection.id}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            size="sm"
                                        >
                                            {processing === selection.id ? (
                                                <Clock className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4 me-1.5" />
                                            )}
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(selection.id)}
                                            disabled={processing === selection.id}
                                            variant="outline"
                                            size="sm"
                                            className="border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle className="h-4 w-4 me-1.5" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </m.div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </LazyMotion>
    )
}
