/**
 * RequestContentDialog
 * 
 * Allows users to request documentation that doesn't exist yet.
 * Creates a notification/task for admins to create the content.
 */

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { Lightbulb, Loader2, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface RequestContentDialogProps {
    isOpen: boolean
    onClose: () => void
    searchQuery?: string // Pre-fill if coming from empty search results
}

export function RequestContentDialog({ isOpen, onClose, searchQuery = '' }: RequestContentDialogProps) {
    const { t } = useTranslation('knowledge')
    const { user, profile } = useAuth()
    const { currentProperty, propertyIds } = useProperty()
    const [title, setTitle] = useState(searchQuery)
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setTitle(searchQuery || '')
            setDescription('')
        }
    }, [isOpen, searchQuery])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !user) return

        setIsSubmitting(true)
        try {
            const propertyId = isRealPropertyId(currentProperty?.id) ? currentProperty.id : (propertyIds[0] ?? null)
            const departmentId = profile?.departments?.[0]?.id ?? null

            const { error: requestError } = await supabase.rpc('request_knowledge_content', {
                p_title: title.trim(),
                p_description: description?.trim() || null,
                p_property_id: propertyId,
                p_department_id: departmentId
            })

            if (requestError) throw requestError

            toast.success(t('request_content.success', 'Content request submitted! Admin team will review.'))
            setTitle('')
            setDescription('')
            onClose()
        } catch (error) {
            console.error('Failed to submit content request:', error)
            toast.error(t('request_content.error', 'Failed to submit request. Please try again.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        {t('request_content.title', 'Request Missing Documentation')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('request_content.description', 'Can\'t find what you\'re looking for? Let us know and we\'ll create it!')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="request-title">
                            {t('request_content.topic_label', 'What topic do you need documentation for?')}
                        </Label>
                        <Input
                            id="request-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('request_content.topic_placeholder', 'e.g., Late Checkout Procedure for VIP Guests')}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="request-description">
                            {t('request_content.details_label', 'Additional details (optional)')}
                        </Label>
                        <Textarea
                            id="request-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('request_content.details_placeholder', 'Describe what information you need or why this would be helpful...')}
                            rows={4}
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={!title.trim() || isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                    {t('request_content.submitting', 'Submitting...')}
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 me-2" />
                                    {t('request_content.submit', 'Submit Request')}
                                </>
                            )}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default RequestContentDialog
