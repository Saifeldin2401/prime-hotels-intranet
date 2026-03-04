
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getEncryptedLocalStorage, removeEncryptedLocalStorage, setEncryptedLocalStorage } from '@/lib/secureStorage'

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
        let isActive = true
        const loadDraft = async () => {
            const savedData = await getEncryptedLocalStorage<{ content: string; metadata: any }>(`draft_${uniqueKey}`)
            if (!isActive || !savedData) return
            // We don't automatically overwrite to avoid conflicts,
            // but we return it so the component can decide.
            // For now, we mainly use this hook to SAVE.
        }
        void loadDraft()

        return () => {
            isActive = false
        }
    }, [uniqueKey])

    // Mark as unsaved when content changes
    useEffect(() => {
        setHasUnsavedChanges(true)
    }, [content, metadata])

    // Save function
    const saveDraft = useCallback(async () => {
        if (!content && !metadata) return

        const dataToSave = {
            content,
            metadata,
            timestamp: new Date().toISOString()
        }

        await setEncryptedLocalStorage(`draft_${uniqueKey}`, dataToSave)
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
    }, [uniqueKey, content, metadata])

    // Auto-save interval
    useEffect(() => {
        const timer = setInterval(() => {
            if (hasUnsavedChanges) {
                void saveDraft()
            }
        }, interval)

        return () => clearInterval(timer)
    }, [interval, hasUnsavedChanges, saveDraft])

    // Manual trigger
    const triggerSave = async () => {
        await saveDraft()
        toast.success("Draft saved locally")
    }

    const clearDraft = useCallback(() => {
        removeEncryptedLocalStorage(`draft_${uniqueKey}`)
        setLastSaved(null)
        setHasUnsavedChanges(false)
    }, [uniqueKey])

    return { lastSaved, hasUnsavedChanges, triggerSave, clearDraft }
}
