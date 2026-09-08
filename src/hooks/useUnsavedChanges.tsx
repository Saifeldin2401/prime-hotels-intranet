import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog'
import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * 
 * @param isDirty - Boolean indicating if the form/page has unsaved changes
 * @returns Dialog component and blocker controls
 */
export function useUnsavedChanges(isDirty: boolean) {
    const isProceedingRef = useRef(false)

    // Only block if the form is dirty AND we haven't already approved proceeding
    const shouldBlock = useCallback(
        ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
            if (isProceedingRef.current) return false
            return currentLocation.pathname !== nextLocation.pathname
        },
        []
    )

    const blocker = useBlocker(isDirty ? shouldBlock : false)

    useEffect(() => {
        if (!isDirty) {
            isProceedingRef.current = false
            if (blocker.state === 'blocked' && typeof blocker.reset === 'function') {
                blocker.reset()
            }
        }
    }, [blocker, isDirty])

    const handleContinue = useCallback(() => {
        isProceedingRef.current = true
        if (blocker.state === 'blocked' && typeof blocker.proceed === 'function') {
            blocker.proceed()
        }
    }, [blocker])

    const handleCancel = useCallback(() => {
        isProceedingRef.current = false
        if (blocker.state === 'blocked' && typeof blocker.reset === 'function') {
            blocker.reset()
        }
    }, [blocker])

    const Dialog = useCallback(
        () => (
            <UnsavedChangesDialog
                open={blocker.state === 'blocked'}
                onContinue={handleContinue}
                onCancel={handleCancel}
            />
        ),
        [blocker.state, handleContinue, handleCancel]
    )

    return {
        Dialog,
        blocker,
        isBlocked: blocker.state === 'blocked',
        proceed: handleContinue,
        reset: handleCancel,
    }
}
