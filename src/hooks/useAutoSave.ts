
import { getEncryptedLocalStorage, removeEncryptedLocalStorage, setEncryptedLocalStorage } from '@/lib/secureStorage'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface DraftRecord<TMetadata = unknown> {
    content: string
    metadata: TMetadata
    timestamp: string
}

function buildSnapshot(content: string, metadata: unknown): string {
    try {
        return JSON.stringify({ content, metadata })
    } catch {
        return `${content}::${String(metadata)}`
    }
}

export function useAutoSave(
    uniqueKey: string,
    content: string,
    metadata: unknown,
    interval: number = 30000
) {
    const [loadedDraft, setLoadedDraft] = useState<DraftRecord | null>(null)
    const [lastSavedByKey, setLastSavedByKey] = useState<Record<string, Date | null>>({})
    const [savedSnapshotByKey, setSavedSnapshotByKey] = useState<Record<string, string>>({})
    const draftStorageKey = `draft_${uniqueKey}`
    const currentSnapshot = buildSnapshot(content, metadata)
    const lastSaved = lastSavedByKey[uniqueKey] ?? null

    const hasContent = content.trim().length > 0 || (metadata !== null && metadata !== undefined)
    const hasUnsavedChanges = hasContent && savedSnapshotByKey[uniqueKey] !== currentSnapshot

    // Load initial draft for this key so callers can decide whether to hydrate UI.
    useEffect(() => {
        let isActive = true
        const loadDraft = async () => {
            try {
                const savedData = await getEncryptedLocalStorage<DraftRecord>(draftStorageKey)
                if (!isActive) return

                setLoadedDraft(savedData ?? null)
                if (savedData) {
                    const loadedSnapshot = buildSnapshot(savedData.content, savedData.metadata)
                    setSavedSnapshotByKey(prev => ({ ...prev, [uniqueKey]: loadedSnapshot }))
                } else {
                    setSavedSnapshotByKey(prev => {
                        const next = { ...prev }
                        delete next[uniqueKey]
                        return next
                    })
                }
            } catch (error) {
                console.error('Failed to load draft from local storage:', error)
            }
        }

        void loadDraft()

        return () => {
            isActive = false
        }
    }, [draftStorageKey, uniqueKey])

    // Save function
    const saveDraft = useCallback(async (): Promise<boolean> => {
        if (!hasContent) return false

        const dataToSave = {
            content,
            metadata,
            timestamp: new Date().toISOString()
        }

        await setEncryptedLocalStorage(draftStorageKey, dataToSave)
        setSavedSnapshotByKey(prev => ({ ...prev, [uniqueKey]: currentSnapshot }))
        setLoadedDraft(dataToSave)
        setLastSavedByKey(prev => ({ ...prev, [uniqueKey]: new Date() }))
        return true
    }, [content, currentSnapshot, draftStorageKey, hasContent, metadata, uniqueKey])

    // Auto-save interval
    useEffect(() => {
        if (!hasUnsavedChanges) return

        const timer = setInterval(() => {
            void saveDraft().catch((error) => {
                console.error('Auto-save failed:', error)
            })
        }, interval)

        return () => clearInterval(timer)
    }, [interval, hasUnsavedChanges, saveDraft])

    // Manual trigger
    const triggerSave = async () => {
        try {
            const didSave = await saveDraft()
            if (didSave) {
                toast.success('Draft saved locally')
            }
        } catch (error) {
            console.error('Manual save failed:', error)
            toast.error('Failed to save draft locally')
        }
    }

    const clearDraft = useCallback(() => {
        removeEncryptedLocalStorage(draftStorageKey)
        setSavedSnapshotByKey(prev => {
            const next = { ...prev }
            delete next[uniqueKey]
            return next
        })
        setLoadedDraft(null)
        setLastSavedByKey(prev => ({ ...prev, [uniqueKey]: null }))
    }, [draftStorageKey, uniqueKey])

    return { lastSaved, hasUnsavedChanges, triggerSave, clearDraft, loadedDraft }
}
