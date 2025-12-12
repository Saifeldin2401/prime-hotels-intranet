
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export function useAutoSave(
    uniqueKey: string,
    content: string,
    metadata: any,
    interval: number = 30000
) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Load initial draft
    useEffect(() => {
        const savedData = localStorage.getItem(`draft_${uniqueKey}`)
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData)
                // We don't automatically overwrite to avoid conflicts, 
                // but we return it so the component can decide.
                // For now, we mainly use this hook to SAVE.
            } catch (e) {
                console.error("Failed to parse draft", e)
            }
        }
    }, [uniqueKey])

    // Mark as unsaved when content changes
    useEffect(() => {
        setHasUnsavedChanges(true)
    }, [content, metadata])

    // Save function
    const saveDraft = useCallback(() => {
        if (!content && !metadata) return

        const dataToSave = {
            content,
            metadata,
            timestamp: new Date().toISOString()
        }

        localStorage.setItem(`draft_${uniqueKey}`, JSON.stringify(dataToSave))
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
    }, [uniqueKey, content, metadata])

    // Auto-save interval
    useEffect(() => {
        const timer = setInterval(() => {
            if (hasUnsavedChanges) {
                saveDraft()
            }
        }, interval)

        return () => clearInterval(timer)
    }, [interval, hasUnsavedChanges, saveDraft])

    // Manual trigger
    const triggerSave = () => {
        saveDraft()
        toast.success("Draft saved locally")
    }

    const clearDraft = useCallback(() => {
        localStorage.removeItem(`draft_${uniqueKey}`)
        setLastSaved(null)
        setHasUnsavedChanges(false)
    }, [uniqueKey])

    return { lastSaved, hasUnsavedChanges, triggerSave, clearDraft }
}
