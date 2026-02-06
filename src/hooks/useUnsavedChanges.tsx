import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog'

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * 
 * @param isDirty - Boolean indicating if the form/page has unsaved changes
 * @returns Dialog component that should be rendered in the component tree
 */
export function useUnsavedChanges(isDirty: boolean) {
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    )

    useEffect(() => {
        if (blocker.state === 'blocked' && !isDirty) {
            blocker.reset()
        }
    }, [blocker, isDirty])

    return {
        Dialog: () => (
            <UnsavedChangesDialog
                open={blocker.state === 'blocked'}
                onContinue={() => blocker.proceed && blocker.proceed()}
                onCancel={() => blocker.reset && blocker.reset()}
            />
        )
    }
}
