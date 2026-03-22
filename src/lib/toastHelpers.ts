import { toast } from 'sonner';

// ─── Duration Presets ────────────────────────────────
const DURATION = {
    brief: 3000,
    normal: 4000,
    long: 6000,
    persistent: 10000,
} as const

// ─── Core Toast Helpers ──────────────────────────────

/** Success toast with optional description and action */
export function showSuccessToast(
    message: string,
    description?: string,
    opts?: { duration?: number; action?: { label: string; onClick: () => void } }
) {
    toast.success(message, {
        description,
        duration: opts?.duration ?? DURATION.normal,
        action: opts?.action,
    })
}

/** Error toast — stays longer by default so user can read */
export function showErrorToast(
    message: string,
    description?: string,
    opts?: { duration?: number }
) {
    toast.error(message, {
        description,
        duration: opts?.duration ?? DURATION.long,
    })
}

/** Warning toast */
export function showWarningToast(
    message: string,
    description?: string,
    opts?: { duration?: number }
) {
    toast.warning(message, {
        description,
        duration: opts?.duration ?? DURATION.long,
    })
}

/** Info toast */
export function showInfoToast(
    message: string,
    description?: string,
    opts?: { duration?: number }
) {
    toast.info(message, {
        description,
        duration: opts?.duration ?? DURATION.normal,
    })
}

/** Loading toast — returns an ID you can later dismiss or update */
export function showLoadingToast(message: string) {
    return toast.loading(message)
}

/** Dismiss a toast by id */
export function dismissToast(toastId: string | number) {
    toast.dismiss(toastId)
}

// ─── CRUD Toasts ─────────────────────────────────────
// Consistent one-liner toasts for common CRUD operations.

export const crudToasts = {
    create: {
        success: (item: string, customMessage?: string) =>
            showSuccessToast(`${item} created`, customMessage || 'The item has been created successfully.'),
        error: (item: string, customMessage?: string) =>
            showErrorToast(`Failed to create ${item}`, customMessage || 'Please check your input and try again.'),
    },
    update: {
        success: (item: string, customMessage?: string) =>
            showSuccessToast(`${item} updated`, customMessage || 'Your changes have been saved.'),
        error: (item: string, customMessage?: string) =>
            showErrorToast(`Failed to update ${item}`, customMessage || 'Please try again.'),
    },
    delete: {
        success: (item: string, undoFn?: () => void) =>
            toast.success(`${item} deleted`, {
                description: 'The item has been removed.',
                duration: undoFn ? DURATION.persistent : DURATION.normal,
                ...(undoFn && { action: { label: 'Undo', onClick: undoFn } }),
            }),
        error: (item: string) =>
            showErrorToast(`Failed to delete ${item}`, 'Please try again.'),
    },
    submit: {
        success: (item: string) =>
            showSuccessToast(`${item} submitted`, 'Your submission has been received.'),
        error: (item: string) =>
            showErrorToast(`Failed to submit ${item}`, 'Please check your input and try again.'),
    },
    approve: {
        success: (item: string) =>
            showSuccessToast(`${item} approved`, 'The item has been approved.'),
        error: (item: string) =>
            showErrorToast(`Failed to approve ${item}`, 'Please try again.'),
    },
    reject: {
        success: (item: string) =>
            showSuccessToast(`${item} rejected`, 'The item has been rejected.'),
        error: (item: string) =>
            showErrorToast(`Failed to reject ${item}`, 'Please try again.'),
    },
    cancel: {
        success: (item: string) =>
            showSuccessToast(`${item} cancelled`, 'The item has been cancelled.'),
        error: (item: string) =>
            showErrorToast(`Failed to cancel ${item}`, 'Please try again.'),
    },
    restore: {
        success: (item: string) =>
            showSuccessToast(`${item} restored`, 'The item has been restored from trash.'),
        error: (item: string) =>
            showErrorToast(`Failed to restore ${item}`, 'Please try again.'),
    },
    archive: {
        success: (item: string) =>
            showSuccessToast(`${item} archived`, 'The item has been archived.'),
        error: (item: string) =>
            showErrorToast(`Failed to archive ${item}`, 'Please try again.'),
    },
    assign: {
        success: (item: string) =>
            showSuccessToast(`${item} assigned`, 'The assignment has been saved.'),
        error: (item: string) =>
            showErrorToast(`Failed to assign ${item}`, 'Please try again.'),
    },
    duplicate: {
        success: (item: string) =>
            showSuccessToast(`${item} duplicated`, 'A copy has been created.'),
        error: (item: string) =>
            showErrorToast(`Failed to duplicate ${item}`, 'Please try again.'),
    },
    publish: {
        success: (item: string) =>
            showSuccessToast(`${item} published`, 'The item is now live.'),
        error: (item: string) =>
            showErrorToast(`Failed to publish ${item}`, 'Please try again.'),
    },
}

// ─── Async CRUD Toasts ───────────────────────────────
// Promise-based toasts that show loading → success / error.

export async function asyncToast<T>(
    promise: Promise<T>,
    messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: unknown) => string)
    }
): Promise<T> {
    const toastId = toast.loading(messages.loading)

    try {
        const result = await promise
        const successMessage = typeof messages.success === 'function'
            ? messages.success(result)
            : messages.success
        toast.success(successMessage, { id: toastId, duration: DURATION.normal })
        return result
    } catch (error) {
        const errorMessage = typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error
        toast.error(errorMessage, { id: toastId, duration: DURATION.long })
        throw error
    }
}

export const asyncCrudToasts = {
    create: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Creating ${item}...`,
            success: `${item} created successfully`,
            error: `Failed to create ${item}`,
        }),
    update: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Updating ${item}...`,
            success: `${item} updated successfully`,
            error: `Failed to update ${item}`,
        }),
    delete: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Deleting ${item}...`,
            success: `${item} deleted successfully`,
            error: `Failed to delete ${item}`,
        }),
    submit: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Submitting ${item}...`,
            success: `${item} submitted successfully`,
            error: `Failed to submit ${item}`,
        }),
}

// ─── Clipboard Toast ─────────────────────────────────
// For copy-to-clipboard actions.

export function showCopyToast(label = 'Link') {
    toast.success(`${label} copied to clipboard`, { duration: DURATION.brief })
}

// ─── Network / Offline Toast ─────────────────────────

export function showOfflineToast() {
    toast.warning('You are offline', {
        description: 'Some features may be unavailable until you reconnect.',
        duration: DURATION.persistent,
        id: 'network-status',
    })
}

export function showOnlineToast() {
    toast.success('Back online', {
        description: 'Your connection has been restored.',
        duration: DURATION.brief,
        id: 'network-status',
    })
}
